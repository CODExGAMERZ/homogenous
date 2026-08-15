import Anthropic from "@anthropic-ai/sdk";
import type {
  InferenceProvider,
  ChatRequest,
  ChatResponse,
  StreamEvent,
  EmbedRequest,
  EmbedResponse,
  ProviderCapabilities,
  ContentBlock,
  Message,
} from "../InferenceProvider.js";
import { KeychainService } from "../keychain.js";
import { parseEmbeddedToolCalls } from "../toolParser.js";

export class AnthropicProvider implements InferenceProvider {
  readonly id = "anthropic" as const;
  private client: Anthropic | null = null;

  public resetClient(): void {
    this.client = null;
  }

  private getClient(): Anthropic {
    if (!this.client) {
      const apiKey = KeychainService.getApiKey("anthropic");
      if (!apiKey) {
        throw new Error(
          "Anthropic API key is missing. Set ANTHROPIC_API_KEY environment variable or add it to .toolrc.yaml."
        );
      }
      this.client = new Anthropic({ apiKey });
    }
    return this.client;
  }

  async ping(): Promise<{ ok: boolean; models?: string[]; error?: string }> {
    try {
      const client = this.getClient();
      // Light token count request to check API key validity without high latency/cost
      await client.messages.countTokens({
        model: "claude-3-haiku-20240307",
        messages: [{ role: "user", content: "ping" }],
      });
      return {
        ok: true,
        models: [
          "claude-3-5-sonnet-20241022",
          "claude-3-5-haiku-20241022",
          "claude-3-opus-20240229",
        ],
      };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  }

  capabilities(model: string): ProviderCapabilities {
    const isHaiku = model.includes("haiku");
    return {
      supportsTools: true,
      supportsStreaming: true,
      supportsPromptCaching: true,
      supportsEmbeddings: false,
      isLocal: false,
      contextWindow: isHaiku ? 200000 : 200000,
    };
  }

  supportsTools(_model: string): boolean {
    return true;
  }

  async countTokens(text: string, model: string = "claude-3-5-sonnet-20241022"): Promise<number> {
    try {
      const client = this.getClient();
      const res = await client.messages.countTokens({
        model,
        messages: [{ role: "user", content: text }],
      });
      return res.input_tokens;
    } catch {
      // Fallback character estimation if API call fails
      return Math.ceil(text.length / 4);
    }
  }

  async embed(_request: EmbedRequest): Promise<EmbedResponse> {
    throw new Error("Anthropic does not offer an embedding API. Route embeddings to Ollama.");
  }

  private convertMessages(messages: Message[], cacheHintIdx?: number): Anthropic.MessageParam[] {
    return messages
      .filter((m) => m.role !== "system")
      .map((m, idx) => {
        let content: string | Anthropic.ContentBlockParam[];

        if (typeof m.content === "string") {
          content = m.content;
        } else {
          content = m.content.map((b) => {
            if (b.type === "text") {
              return { type: "text", text: b.text };
            } else if (b.type === "tool_use") {
              return {
                type: "tool_use",
                id: b.toolCall.id,
                name: b.toolCall.name,
                input: b.toolCall.input,
              };
            } else if (b.type === "tool_result") {
              return {
                type: "tool_result",
                tool_use_id: b.toolCallId,
                content: b.content,
                is_error: b.isError,
              };
            } else {
              return {
                type: "image",
                source: {
                  type: "base64",
                  media_type: b.mimeType as any,
                  data: b.data,
                },
              };
            }
          });
        }

        const param: Anthropic.MessageParam = {
          role: m.role === "assistant" ? "assistant" : "user",
          content: content as any,
        };

        // Cache control injection if cache hint is active
        if (cacheHintIdx !== undefined && idx === cacheHintIdx && Array.isArray(param.content)) {
          const lastBlock = param.content[param.content.length - 1];
          if (lastBlock && typeof lastBlock === "object") {
            (lastBlock as any).cache_control = { type: "ephemeral" };
          }
        }

        return param;
      });
  }

  private extractSystemPrompt(messages: Message[]): string | undefined {
    const sysMsgs = messages.filter((m) => m.role === "system");
    if (sysMsgs.length === 0) return undefined;
    return sysMsgs
      .map((m) => (typeof m.content === "string" ? m.content : ""))
      .join("\n\n");
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const client = this.getClient();
    const system = this.extractSystemPrompt(request.messages);
    const convertedMsgs = this.convertMessages(
      request.messages,
      request.cacheHint?.cacheableUpToIndex
    );

    const tools: Anthropic.Tool[] | undefined = request.tools?.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.inputSchema as Anthropic.Tool.InputSchema,
    }));

    const maxRetries = 3;
    let res: Anthropic.Message | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        res = await client.messages.create({
          model: request.model || "claude-3-5-sonnet-20241022",
          max_tokens: request.maxTokens || 4096,
          temperature: request.temperature,
          system,
          messages: convertedMsgs,
          tools,
          stop_sequences: request.stopSequences,
        });
        break;
      } catch (err: any) {
        if ((err?.status === 429 || err?.message?.includes("rate_limit")) && attempt < maxRetries) {
          const delayMs = Math.min(1500 * (attempt + 1), 5000);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          continue;
        }
        throw err;
      }
    }

    if (!res) {
      throw new Error("Anthropic API error: No response received.");
    }

    const contentBlocks: ContentBlock[] = [];
    for (const b of res.content) {
      if (b.type === "text") {
        const extracted = parseEmbeddedToolCalls(b.text);
        if (extracted.toolCalls.length > 0) {
          if (extracted.remainingText) {
            contentBlocks.push({ type: "text", text: extracted.remainingText });
          }
          for (const tc of extracted.toolCalls) {
            contentBlocks.push({
              type: "tool_use",
              toolCall: {
                id: tc.id,
                name: tc.name,
                input: tc.input,
              },
            });
          }
        } else {
          contentBlocks.push({ type: "text", text: b.text });
        }
      } else if (b.type === "tool_use") {
        contentBlocks.push({
          type: "tool_use",
          toolCall: {
            id: b.id,
            name: b.name,
            input: b.input as Record<string, unknown>,
          },
        });
      }
    }

    const hasTools = contentBlocks.some((b) => b.type === "tool_use");

    let stopReason: ChatResponse["stopReason"] = hasTools ? "tool_use" : "end_turn";
    if (res.stop_reason === "tool_use") stopReason = "tool_use";
    else if (res.stop_reason === "max_tokens") stopReason = "max_tokens";
    else if (res.stop_reason === "stop_sequence") stopReason = "stop_sequence";

    return {
      content: contentBlocks,
      stopReason,
      usage: {
        inputTokens: res.usage.input_tokens,
        outputTokens: res.usage.output_tokens,
        cacheReadTokens: (res.usage as any).cache_read_input_tokens || 0,
        cacheWriteTokens: (res.usage as any).cache_creation_input_tokens || 0,
      },
      raw: res,
    };
  }

  async *stream(request: ChatRequest): AsyncIterable<StreamEvent> {
    const client = this.getClient();
    const system = this.extractSystemPrompt(request.messages);
    const convertedMsgs = this.convertMessages(
      request.messages,
      request.cacheHint?.cacheableUpToIndex
    );

    const tools: Anthropic.Tool[] | undefined = request.tools?.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.inputSchema as Anthropic.Tool.InputSchema,
    }));

    const stream = await client.messages.create({
      model: request.model || "claude-3-5-sonnet-20241022",
      max_tokens: request.maxTokens || 4096,
      temperature: request.temperature,
      system,
      messages: convertedMsgs,
      tools,
      stop_sequences: request.stopSequences,
      stream: true,
    });

    let currentToolCall: Partial<InferenceProvider> | any = null;

    for await (const chunk of stream) {
      if (chunk.type === "content_block_delta") {
        if (chunk.delta.type === "text_delta") {
          yield { type: "text_delta", textDelta: chunk.delta.text };
        } else if (chunk.delta.type === "input_json_delta") {
          yield {
            type: "tool_call_delta",
            toolCall: { input: chunk.delta.partial_json as any },
          };
        }
      } else if (chunk.type === "content_block_start") {
        if (chunk.content_block.type === "tool_use") {
          currentToolCall = {
            id: chunk.content_block.id,
            name: chunk.content_block.name,
            input: {},
          };
          yield {
            type: "tool_call_start",
            toolCall: currentToolCall,
          };
        }
      } else if (chunk.type === "content_block_stop") {
        if (currentToolCall) {
          yield { type: "tool_call_end", toolCall: currentToolCall };
          currentToolCall = null;
        }
      } else if (chunk.type === "message_delta") {
        yield {
          type: "message_stop",
          usage: {
            inputTokens: 0,
            outputTokens: chunk.usage.output_tokens,
          },
        };
      }
    }
  }
}
