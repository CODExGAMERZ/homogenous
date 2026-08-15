import chalk from "chalk";
import type { InferenceProvider, Message, ContentBlock } from "../inference/InferenceProvider.js";
import { BaseTool } from "./tools/BaseTool.js";
import { ReadFileTool, WriteFileTool, ReplaceFileContentTool } from "./tools/fileTools.js";
import { GrepSearchTool, GlobFilesTool } from "./tools/searchTools.js";
import { GitStatusTool, GitDiffTool, GitLogTool } from "./tools/gitTools.js";
import { ShellExecuteTool } from "./tools/shellTool.js";
import { WebFetchTool } from "./tools/webTools.js";
import { ToolOutputTruncator } from "../token-budget/ToolOutputTruncator.js";
import { BudgetLedger } from "../token-budget/BudgetLedger.js";
import { SkillRegistry } from "../skills/SkillRegistry.js";
import { McpClientManager } from "../mcp/McpClientManager.js";
import { parseEmbeddedToolCalls } from "../inference/toolParser.js";
import { buildBaseSystemPrompt } from "./systemPrompt.js";
import { KeychainService, type KeyProvider } from "../inference/keychain.js";

/**
 * Scrubs all known active API keys and sensitive token patterns from text before appending to LLM memory.
 */
export function scrubSensitiveTokens(text: string): string {
  if (!text || typeof text !== "string") return text;
  let scrubbed = text;

  // 1. Scrub specific registered API keys
  const providers: KeyProvider[] = ["anthropic", "openai", "groq", "nvidia", "deepseek", "openrouter", "mistral", "together"];
  for (const p of providers) {
    const key = KeychainService.getApiKey(p);
    if (key && key.length > 5 && scrubbed.includes(key)) {
      scrubbed = scrubbed.split(key).join("[REDACTED_API_KEY]");
    }
  }

  // 2. Scrub standard regex token formats
  scrubbed = scrubbed.replace(
    /(?:bearer\s+[A-Za-z0-9_.-]{16,}|sk-[A-Za-z0-9_.-]{20,}|gsk_[A-Za-z0-9_.-]{20,}|nvapi-[A-Za-z0-9_.-]{20,}|ghp_[A-Za-z0-9_.-]{20,}|gho_[A-Za-z0-9_.-]{20,}|glpat-[A-Za-z0-9_.-]{20,}|AKIA[0-9A-Z]{16}|enc:v1:[a-f0-9:]+)/gi,
    "[REDACTED_SECRET]"
  );

  return scrubbed;
}

export interface AgentLoopOptions {
  provider: InferenceProvider;
  model: string;
  maxTurns?: number;
  autoApprove?: boolean;
  workspaceRoot?: string;
}

export class AgentLoop {
  private provider: InferenceProvider;
  private model: string;
  private maxTurns: number;
  private toolsMap: Map<string, BaseTool>;
  private options: AgentLoopOptions;

  constructor(options: AgentLoopOptions) {
    this.options = options;
    this.provider = options.provider;
    this.model = options.model;
    this.maxTurns = options.maxTurns || 15;

    // Register built-in tools
    const builtInTools: BaseTool[] = [
      new ReadFileTool(),
      new WriteFileTool(),
      new ReplaceFileContentTool(),
      new GrepSearchTool(),
      new GlobFilesTool(),
      new GitStatusTool(),
      new GitDiffTool(),
      new GitLogTool(),
      new ShellExecuteTool({
        autoApprove: options.autoApprove,
        workspaceRoot: options.workspaceRoot,
      }),
      new WebFetchTool(),
    ];

    this.toolsMap = new Map();
    for (const tool of builtInTools) {
      this.toolsMap.set(tool.name, tool);
    }

    // Register MCP tools if initialized
    const mcpTools = McpClientManager.getInstance().getDiscoveredTools();
    for (const tool of mcpTools) {
      this.toolsMap.set(tool.name, tool);
    }
  }

  public getToolDefinitions() {
    return Array.from(this.toolsMap.values()).map((t) => t.toToolDefinition());
  }

  public async run(
    messages: Message[],
    onTextDelta?: (delta: string) => void
  ): Promise<string> {
    let turnCount = 0;

    // Ensure system prompt is present for assistant identity and tool usage instructions
    const hasSystemMsg = messages.some((m) => m.role === "system");
    if (!hasSystemMsg) {
      messages.unshift({
        role: "system",
        content: buildBaseSystemPrompt(this.options?.workspaceRoot || process.cwd()),
      });
    }

    // Check for triggered skills in user prompt
    const lastUserMsg = messages.filter((m) => m.role === "user").pop();
    if (lastUserMsg && typeof lastUserMsg.content === "string") {
      const matchedSkill = SkillRegistry.getInstance().matchTrigger(lastUserMsg.content);
      if (matchedSkill) {
        console.log(chalk.bold.magenta(`⚡ Dynamic Skill Triggered: '${matchedSkill.metadata.name}' (${matchedSkill.origin || "global"})`));
        // Isolate project-local skills: inject as user-context boundary; keep system prompt only for trusted bundled/global skills
        if (matchedSkill.origin === "project") {
          messages.push({
            role: "user",
            content: `[Project-Local Skill: ${matchedSkill.metadata.name}]\n${matchedSkill.body}`,
          });
        } else {
          messages.push({
            role: "system",
            content: `[Skill Active: ${matchedSkill.metadata.name}]\n${matchedSkill.body}`,
          });
        }
      }
    }

    while (turnCount < this.maxTurns) {
      turnCount++;

      const toolDefs = this.getToolDefinitions();
      const response = await this.provider.chat({
        model: this.model,
        messages,
        tools: toolDefs,
        maxTokens: 4096,
      });

      // Record call metrics in BudgetLedger
      const caps = this.provider.capabilities(this.model);
      BudgetLedger.getInstance().recordCall({
        provider: this.provider.id,
        model: this.model,
        inputTokens: response.usage.inputTokens,
        outputTokens: response.usage.outputTokens,
        cacheReadTokens: response.usage.cacheReadTokens,
        cacheWriteTokens: response.usage.cacheWriteTokens,
        isLocal: caps.isLocal,
      });

      // Append assistant turn response
      messages.push({
        role: "assistant",
        content: response.content,
      });

      // Check if assistant called any tools
      let toolCalls = response.content.filter((b) => b.type === "tool_use");

      if (toolCalls.length === 0) {
        // Fallback: check if text blocks contain embedded tool calls (e.g. from open-weights models)
        const textBlocks = response.content
          .filter((b) => b.type === "text")
          .map((b) => (b as { text: string }).text);
        const fullText = textBlocks.join("\n").trim();

        if (fullText) {
          const extracted = parseEmbeddedToolCalls(fullText);
          if (extracted.toolCalls.length > 0) {
            for (const tc of extracted.toolCalls) {
              toolCalls.push({
                type: "tool_use",
                toolCall: {
                  id: tc.id,
                  name: tc.name,
                  input: tc.input,
                },
              });
            }
          }
        }
      }

      if (toolCalls.length === 0 || (response.stopReason !== "tool_use" && toolCalls.length === 0)) {
        // Conversation turn completed, return final text content
        const textBlocks = response.content
          .filter((b) => b.type === "text")
          .map((b) => (b as { text: string }).text);
        const fullText = textBlocks.join("\n").trim();

        if (onTextDelta && fullText) {
          // NOTE: Pacing timer fallback for turns provides UI-only word-by-word chunking animation
          // for visual output consistency across all providers. This is a frontend streaming UI effect.
          const words = fullText.match(/\S+|\s+/g) || [fullText];
          for (const word of words) {
            onTextDelta(word);
            await new Promise((resolve) => setTimeout(resolve, 18));
          }
        }

        return fullText;
      }

      // Execute each tool call and construct tool_result blocks
      const resultBlocks: ContentBlock[] = [];

      for (const block of toolCalls) {
        if (block.type !== "tool_use") continue;
        const { id, name, input } = block.toolCall;

        console.log(chalk.cyan(`  ⚙ Tool Executing: ${name}`));

        const tool = this.toolsMap.get(name);
        if (!tool) {
          resultBlocks.push({
            type: "tool_result",
            toolCallId: id,
            content: `Error: Tool '${name}' is not recognized or available.`,
            isError: true,
          });
          continue;
        }

        // Validate tool input against schema before executing
        const validation = tool.validateInput(input);
        if (!validation.valid) {
          resultBlocks.push({
            type: "tool_result",
            toolCallId: id,
            content: `Error: ${validation.error}`,
            isError: true,
          });
          continue;
        }

        try {
          const rawResult = await tool.execute(validation.data || input);
          const truncated = ToolOutputTruncator.truncate(rawResult.content, 4000);

          resultBlocks.push({
            type: "tool_result",
            toolCallId: id,
            content: scrubSensitiveTokens(truncated.content),
            isError: rawResult.isError ?? !rawResult.ok,
          });
        } catch (err) {
          resultBlocks.push({
            type: "tool_result",
            toolCallId: id,
            content: scrubSensitiveTokens(`Execution exception in tool '${name}': ${(err as Error).message}`),
            isError: true,
          });
        }
      }

      // Append tool execution results back to messages array for model observation
      messages.push({
        role: "user",
        content: resultBlocks,
      });
    }

    return "Agent loop reached maximum turns limit without finishing.";
  }
}
