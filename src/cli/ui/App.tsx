import React, { useState, useEffect } from "react";
import { Box, Text, useApp, useInput, useStdout, Static } from "ink";
import Spinner from "ink-spinner";
import TextInput from "ink-text-input";
import { LogoBanner } from "./LogoBanner.js";
import { ClaudeHeader } from "./ClaudeHeader.js";
import { ToolCard } from "./ToolCard.js";
import { MarkdownText } from "./MarkdownText.js";
import { ThemeProvider, useTheme } from "./themes/ThemeContext.js";
import type { InferenceProvider } from "../../inference/InferenceProvider.js";
import { ProviderRegistry } from "../../inference/ProviderRegistry.js";
import { SessionMemory } from "../../memory/SessionMemory.js";
import { AgentLoop } from "../../agent/AgentLoop.js";
import { SlashCommandRegistry } from "../slash/SlashCommandRegistry.js";
import type { CommandContext, PendingPlan } from "../slash/SlashCommand.js";
import { ConfigResolver } from "../../config/ConfigResolver.js";
import { getGitBranch } from "../../platform/shell.js";
import { buildBaseSystemPrompt } from "../../agent/systemPrompt.js";

export interface AppProps {
  provider?: InferenceProvider;
  initialProvider?: InferenceProvider;
  model?: string;
  initialModel?: string;
  workspacePath?: string;
  gitBranch?: string;
}

export interface FeedItem {
  id: string;
  type: "user" | "assistant" | "system" | "tool";
  text: string;
  toolName?: string;
  toolInput?: Record<string, unknown>;
  toolStatus?: "pending" | "success" | "error";
  toolOutput?: string;
}

export function getShortcutTarget(input: string, key: any): string | null {
  if (!key) key = {};
  if (key.escape) return "/exit";
  if (key.return) return null;

  const raw = input || "";
  const code = raw.charCodeAt(0);

  if (key.ctrl || key.meta) {
    const keyChar = raw.toLowerCase();
    if (keyChar === "p") return "/plan";
    if (keyChar === "u") return "/undo";
    if (keyChar === "d") return "/diff";
    if (keyChar === "m" || keyChar === "o") return "/model";
    if (keyChar === "a") return "/auto";
    if (keyChar === "l") return "/clear";
    if (keyChar === "q" || keyChar === "x" || keyChar === "c") return "/exit";
  }

  // Handle ASCII control character codes 1-26, excluding 13 (\r Enter key)
  if (code >= 1 && code <= 26 && code !== 13) {
    const keyChar = String.fromCharCode(96 + code);
    if (keyChar === "p") return "/plan";
    if (keyChar === "u") return "/undo";
    if (keyChar === "d") return "/diff";
    if (keyChar === "m" || keyChar === "o") return "/model";
    if (keyChar === "a") return "/auto";
    if (keyChar === "l") return "/clear";
    if (keyChar === "q" || keyChar === "x" || keyChar === "c") return "/exit";
  }

  return null;
}

const AppContent: React.FC<AppProps> = ({
  provider: propProvider,
  initialProvider,
  model: propModel,
  initialModel = "claude-3-5-sonnet-20241022",
  workspacePath = process.cwd(),
  gitBranch: initialGitBranch = "main",
}) => {
  const { exit } = useApp();
  const theme = useTheme();
  const { stdout } = useStdout();
  const termRows = stdout?.rows ? stdout.rows : undefined;

  const [provider, setProvider] = useState<InferenceProvider>(() => {
    if (propProvider) return propProvider;
    if (initialProvider) return initialProvider;
    const reg = ProviderRegistry.getInstance();
    return reg.getProvider("anthropic") || reg.getProvider("mock")!;
  });

  const [model, setModel] = useState<string>(propModel || initialModel);
  const [inputVal, setInputVal] = useState("");
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [streamingText, setStreamingText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [sessionMemory] = useState<SessionMemory>(
    () => new SessionMemory(buildBaseSystemPrompt(workspacePath))
  );
  const [gitBranch, setGitBranch] = useState(initialGitBranch);

  const [pendingPlan, setPendingPlan] = useState<PendingPlan | null>(null);
  const [planModeEnabled, setPlanModeEnabled] = useState(false);
  const [autoApproveEnabled, setAutoApproveEnabled] = useState(false);
  const [hasToolError, setHasToolError] = useState(false);

  useEffect(() => {
    getGitBranch(workspacePath).then((branch) => {
      if (branch) setGitBranch(branch);
    });
  }, [workspacePath]);

  // Priority order for state-reactive border: error > warning > primary > muted
  let reactiveBorderColor = theme.muted;
  if (hasToolError) reactiveBorderColor = theme.error;
  else if (pendingPlan) reactiveBorderColor = theme.warning;
  else if (isProcessing) reactiveBorderColor = theme.primary;

  const slashTerm = inputVal.startsWith("/") ? inputVal.slice(1).trim().split(/\s+/)[0].toLowerCase() : "";
  const allCommands = SlashCommandRegistry.getInstance().listCommands();
  const matchingCmds = inputVal.startsWith("/")
    ? allCommands.filter((c) => c.name.toLowerCase().includes(slashTerm))
    : [];

  useInput(async (input, key) => {
    if (isProcessing) return;

    if (key.tab && inputVal.startsWith("/")) {
      const matches = SlashCommandRegistry.getInstance().autocomplete(inputVal);
      if (matches.length > 0) {
        setInputVal(matches[0] + " ");
      }
      return;
    }

    const slashTarget = getShortcutTarget(input, key);
    if (slashTarget) {
      setInputVal("");
      const commandContext: CommandContext = {
        provider,
        model,
        setModel: (newM) => setModel(newM),
        setProvider: (newP) => setProvider(newP),
        sessionMemory,
        workspacePath,
        pendingPlan,
        setPendingPlan: (plan) => setPendingPlan(plan),
        planModeEnabled,
        setPlanModeEnabled: (enabled) => setPlanModeEnabled(enabled),
        autoApproveEnabled,
        setAutoApproveEnabled: (enabled) => setAutoApproveEnabled(enabled),
        setFeed: (newFeed) => setFeed(newFeed),
      };

      const result = await SlashCommandRegistry.getInstance().dispatch(slashTarget, commandContext);
      if (result) {
        if (result.exitSession) {
          exit();
          return;
        }
        if (slashTarget === "/clear") {
          setFeed([]);
          return;
        }
        setFeed((prev) => [
          ...prev,
          { id: `shortcut-${Date.now()}`, type: "system", text: result.output },
        ]);
      }
    }
  });

  const handleSubmit = async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || isProcessing) return;
    setInputVal("");
    setHasToolError(false);

    const commandContext: CommandContext = {
      provider,
      model,
      setModel: (newM) => setModel(newM),
      setProvider: (newP) => setProvider(newP),
      sessionMemory,
      workspacePath,
      pendingPlan,
      setPendingPlan: (plan) => setPendingPlan(plan),
      planModeEnabled,
      setPlanModeEnabled: (enabled) => setPlanModeEnabled(enabled),
      autoApproveEnabled,
      setAutoApproveEnabled: (enabled) => setAutoApproveEnabled(enabled),
    };

    if (trimmed.startsWith("/")) {
      const slashResult = await SlashCommandRegistry.getInstance().dispatch(trimmed, commandContext);
      if (slashResult) {
        if (slashResult.exitSession) {
          exit();
          return;
        }
        setFeed((prev) => [
          ...prev,
          { id: `slash-${Date.now()}`, type: "system", text: slashResult.output },
        ]);
        return;
      }
    }

    const userItemId = `user-${Date.now()}`;
    setFeed((prev) => [
      ...prev,
      { id: userItemId, type: "user", text: trimmed },
    ]);

    setIsProcessing(true);

    try {
      if (planModeEnabled) {
        const { PlanningMode } = await import("../../agent/PlanningMode.js");
        const plan = await PlanningMode.generatePlan(provider, model, trimmed, sessionMemory.getMessages());
        setPendingPlan(plan);
        setFeed((prev) => [
          ...prev,
          {
            id: `plan-${Date.now()}`,
            type: "system",
            text: `${plan.rawPlan}\n\n✦ Plan Mode Active: Type /apply to execute this plan, or /reject to cancel.`,
          },
        ]);
      } else {
        sessionMemory.addMessage({ role: "user", content: trimmed });
        setStreamingText("");
        const agent = new AgentLoop({ provider, model });
        const answer = await agent.run(sessionMemory.getMessages(), (delta) => {
          setStreamingText((prev) => prev + delta);
        });

        setStreamingText("");
        setFeed((prev) => [
          ...prev,
          { id: `assistant-${Date.now()}`, type: "assistant", text: answer },
        ]);

        await sessionMemory.compactIfNeeded(0.7);
      }
    } catch (err) {
      setStreamingText("");
      setHasToolError(true);
      setFeed((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          type: "system",
          text: `Error: ${(err as Error).message}`,
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Box flexDirection="column" paddingX={1} paddingY={0}>
      <ClaudeHeader
        workspacePath={workspacePath}
        modelName={model}
        providerId={provider.id}
        gitBranch={gitBranch}
        autoApproveEnabled={autoApproveEnabled}
      />

      {/* Static Message Feed */}
      <Static items={feed}>
        {(item) => {
          if (item.type === "user") {
            return (
              <Box key={item.id} marginY={0}>
                <Text bold color={theme.success}>
                  ❯ {item.text}
                </Text>
              </Box>
            );
          } else if (item.type === "assistant") {
            return (
              <Box key={item.id} flexDirection="column" marginY={1}>
                <Text bold color={theme.primary}>
                  ✦ Assistant:
                </Text>
                <MarkdownText content={item.text} />
              </Box>
            );
          } else if (item.type === "tool") {
            return (
              <ToolCard
                key={item.id}
                toolName={item.toolName!}
                input={item.toolInput!}
                status={item.toolStatus}
                outputPreview={item.toolOutput}
              />
            );
          } else {
            return (
              <Box key={item.id} marginY={0}>
                <Text color={theme.warning}>{item.text}</Text>
              </Box>
            );
          }
        }}
      </Static>

      {/* Real-time Streaming Output Display */}
      {streamingText.length > 0 && (
        <Box flexDirection="column" marginY={1}>
          <Text bold color={theme.primary}>
            ✦ Assistant:
          </Text>
          <MarkdownText content={streamingText} />
        </Box>
      )}

      {/* Processing Spinner */}
      {isProcessing && streamingText.length === 0 && (
        <Box marginY={0} marginTop={1}>
          <Text color={theme.primary}>
            <Spinner type="dots" /> Thinking & executing tools...
          </Text>
        </Box>
      )}

      {/* Boxed Slash Command Autocomplete Suggestions Popup */}
      {!isProcessing && inputVal.startsWith("/") && matchingCmds.length > 0 && (
        <Box flexDirection="column" borderStyle="round" borderColor={theme.warning} paddingX={1} marginY={0} marginTop={1}>
          <Text bold color={theme.warning}>
            ✦ Slash Commands (Tab to autocomplete):
          </Text>
          {matchingCmds.slice(0, 5).map((cmd) => (
            <Box key={cmd.name}>
              <Text bold color={theme.primary}>
                /{cmd.name.padEnd(12)}
              </Text>
              <Text color={theme.muted}> - {cmd.description}</Text>
            </Box>
          ))}
        </Box>
      )}

      {/* Compact Single-Line Keyboard Shortcuts Legend Bar */}
      {!isProcessing && (
        <Box marginTop={1} paddingX={1}>
          <Text color={theme.muted}>
            ✦ <Text color={theme.primary}>Ctrl+P</Text>:Plan | <Text color={theme.primary}>Ctrl+U</Text>:Undo | <Text color={theme.primary}>Ctrl+D</Text>:Diff | <Text color={theme.primary}>Ctrl+O</Text>:Model | <Text color={theme.primary}>Ctrl+A</Text>:Auto | <Text color={theme.primary}>Ctrl+L</Text>:Clear | <Text color={theme.primary}>Esc</Text>:Exit
          </Text>
        </Box>
      )}

      {/* Boxed Input Prompt Bar with State-Reactive Border Color */}
      {!isProcessing && (
        <Box borderStyle="round" borderColor={reactiveBorderColor} paddingX={1} marginY={0} marginTop={0}>
          <Text bold color={theme.success}>
            {"homogenous > "}
          </Text>
          <TextInput value={inputVal} onChange={setInputVal} onSubmit={handleSubmit} />
        </Box>
      )}
    </Box>
  );
};

export const App: React.FC<AppProps> = (props) => (
  <ThemeProvider>
    <AppContent {...props} />
  </ThemeProvider>
);
