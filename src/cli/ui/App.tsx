import React, { useState, useEffect, useRef, useMemo } from "react";
import { Box, Text, useApp, useInput, useStdout, Static } from "ink";
import Spinner from "ink-spinner";
import { PromptInput } from "./PromptInput.js";
import { ClaudeHeader } from "./ClaudeHeader.js";
import { ToolCard } from "./ToolCard.js";
import { MarkdownText } from "./MarkdownText.js";
import { ThemeProvider, useTheme } from "./themes/ThemeContext.js";
import type { InferenceProvider } from "../../inference/InferenceProvider.js";
import { ProviderRegistry } from "../../inference/ProviderRegistry.js";
import { SessionMemory } from "../../memory/SessionMemory.js";
import { AgentLoop, scrubSensitiveTokens } from "../../agent/AgentLoop.js";
import { SlashCommandRegistry } from "../slash/SlashCommandRegistry.js";
import { AutocompleteEngine, type AutocompleteItem } from "../slash/AutocompleteEngine.js";
import type { CommandContext, PendingPlan } from "../slash/SlashCommand.js";
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
  isChunk?: boolean;
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
  const [promptHistory, setPromptHistory] = useState<string[]>([]);

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

  const [selectedSuggestionIdx, setSelectedSuggestionIdx] = useState(0);
  const [isSuggestionsDismissed, setIsSuggestionsDismissed] = useState(false);

  // Compute suggestions with fuzzy and file matching
  const suggestions: AutocompleteItem[] = useMemo(() => {
    if (isProcessing || isSuggestionsDismissed) return [];
    if (inputVal.startsWith("/") || inputVal.includes("@")) {
      return AutocompleteEngine.getInstance().getSuggestions(inputVal, workspacePath);
    }
    return [];
  }, [inputVal, isProcessing, isSuggestionsDismissed, workspacePath]);

  const isShowingSuggestions = suggestions.length > 0;

  const handleInputChange = (newVal: string) => {
    setIsSuggestionsDismissed(false);
    setSelectedSuggestionIdx(0);
    setInputVal(newVal);
  };

  useEffect(() => {
    if (selectedSuggestionIdx >= suggestions.length) {
      setSelectedSuggestionIdx(Math.max(0, suggestions.length - 1));
    }
  }, [suggestions.length, selectedSuggestionIdx]);

  const handleNavigateSuggestions = (direction: "up" | "down") => {
    if (suggestions.length === 0) return;
    setSelectedSuggestionIdx((prev) => {
      if (direction === "up") {
        return (prev - 1 + suggestions.length) % suggestions.length;
      } else {
        return (prev + 1) % suggestions.length;
      }
    });
  };

  const handleSelectSuggestion = (indexToSelect?: number) => {
    const targetIdx = indexToSelect !== undefined ? indexToSelect : selectedSuggestionIdx;
    if (suggestions.length > 0 && suggestions[targetIdx]) {
      const selected = suggestions[targetIdx];
      // Replace @term or slash command
      if (inputVal.includes("@") && selected.type === "file") {
        const atIdx = inputVal.lastIndexOf("@");
        const nextVal = inputVal.slice(0, atIdx) + selected.value + " ";
        setInputVal(nextVal);
      } else {
        setInputVal(selected.value);
      }
      setIsSuggestionsDismissed(true);
      setSelectedSuggestionIdx(0);
    }
  };

  useInput(async (input, key) => {
    if (isProcessing) return;

    const isTab = key.tab || input === "\t" || input === "\x1b[Z";
    const isShiftTab = (key.tab && key.shift) || input === "\x1b[Z";

    // Tab / Shift+Tab cycling through suggestions
    if (isTab && isShowingSuggestions) {
      const nextIdx = isShiftTab
        ? (selectedSuggestionIdx - 1 + suggestions.length) % suggestions.length
        : (selectedSuggestionIdx + 1) % suggestions.length;
      setSelectedSuggestionIdx(nextIdx);
      const chosen = suggestions[nextIdx];
      if (inputVal.includes("@") && chosen.type === "file") {
        const atIdx = inputVal.lastIndexOf("@");
        setInputVal(inputVal.slice(0, atIdx) + chosen.value);
      } else {
        setInputVal(chosen.value);
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
    setIsSuggestionsDismissed(true);
    // Sanitize credentials from prompt history to prevent in-terminal exposure
    const historyEntry = trimmed.startsWith("/login ")
      ? trimmed.replace(/^(\/login\s+\S+\s+).+$/i, "$1●●●●●●●●")
      : trimmed;
    setPromptHistory((prev) => [...prev, historyEntry]);

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
        const agent = new AgentLoop({
          provider,
          model,
          autoApprove: autoApproveEnabled,
          workspaceRoot: workspacePath,
        });

        let isFirstChunk = true;
        let accumulated = "";
        let flushedLength = 0;
        let lastRenderTime = 0;
        let renderTimer: NodeJS.Timeout | null = null;

        // 60 FPS frame rate throttler (~16ms)
        const updateStreamingUI = (force = false) => {
          const now = Date.now();
          if (!force && now - lastRenderTime < 16) {
            if (!renderTimer) {
              renderTimer = setTimeout(() => {
                renderTimer = null;
                updateStreamingUI(true);
              }, 16);
            }
            return;
          }

          if (renderTimer) {
            clearTimeout(renderTimer);
            renderTimer = null;
          }
          lastRenderTime = now;

          const unflushed = accumulated.slice(flushedLength);
          const breakIdx = unflushed.lastIndexOf("\n\n");

          if (breakIdx !== -1) {
            const chunkToFlush = unflushed.slice(0, breakIdx + 2);
            flushedLength += chunkToFlush.length;
            const isFirst = isFirstChunk;
            isFirstChunk = false;

            setFeed((prev) => [
              ...prev,
              {
                id: `assistant-chunk-${Date.now()}-${Math.random()}`,
                type: "assistant",
                text: chunkToFlush,
                isChunk: !isFirst,
              },
            ]);
            setStreamingText(accumulated.slice(flushedLength));
          } else {
            setStreamingText(unflushed);
          }
        };

        const answer = await agent.run(sessionMemory.getMessages(), (delta) => {
          accumulated += delta;
          updateStreamingUI(false);
        });

        if (renderTimer) {
          clearTimeout(renderTimer);
          renderTimer = null;
        }

        const remainingUnflushed = answer.slice(flushedLength);
        setStreamingText("");
        if (remainingUnflushed.trim()) {
          const isFirst = isFirstChunk;
          setFeed((prev) => [
            ...prev,
            {
              id: `assistant-${Date.now()}`,
              type: "assistant",
              text: remainingUnflushed,
              isChunk: !isFirst,
            },
          ]);
        }

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
          text: `Error: ${scrubSensitiveTokens((err as Error).message)}`,
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  // Windowed visible suggestions list (up to 6 items centered near selection)
  const maxVisible = 6;
  const startIdx = Math.max(
    0,
    Math.min(
      selectedSuggestionIdx - Math.floor(maxVisible / 2),
      suggestions.length - maxVisible
    )
  );
  const visibleSuggestions = suggestions.slice(startIdx, startIdx + maxVisible);

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
              <Box key={item.id} flexDirection="column" marginY={item.isChunk ? 0 : 0.5}>
                {!item.isChunk && (
                  <Box flexDirection="row" marginBottom={0.5}>
                    <Text bold color={theme.primary}>
                      ✦ Assistant
                    </Text>
                    <Text color={theme.muted}> ────────────────────────────────────────────────────────────</Text>
                  </Box>
                )}
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
        <Box flexDirection="column" marginY={0.5}>
          {feed.length === 0 || feed[feed.length - 1]?.type !== "assistant" ? (
            <Box flexDirection="row" marginBottom={0.5}>
              <Text bold color={theme.primary}>
                ✦ Assistant
              </Text>
              <Text color={theme.muted}> ────────────────────────────────────────────────────────────</Text>
            </Box>
          ) : null}
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

      {/* Enhanced Boxed Autocomplete Suggestions Popup */}
      {isShowingSuggestions && (
        <Box flexDirection="column" borderStyle="round" borderColor={theme.warning} paddingX={1} marginY={0} marginTop={1}>
          <Box flexDirection="row" justifyContent="space-between" marginBottom={0.5}>
            <Text bold color={theme.warning}>
              ✦ Suggestions (↑/↓ to navigate, Enter/Tab to select, Esc to close):
            </Text>
            <Text color={theme.muted}>
              {selectedSuggestionIdx + 1}/{suggestions.length}
            </Text>
          </Box>
          {visibleSuggestions.map((item, relIdx) => {
            const actualIdx = startIdx + relIdx;
            const isSelected = actualIdx === selectedSuggestionIdx;
            const typeIcon = item.type === "file" ? "📁 " : item.type === "model" ? "🤖 " : "✦ ";
            return (
              <Box key={`${item.value}-${actualIdx}`} flexDirection="row">
                <Text color={isSelected ? theme.success : theme.muted}>
                  {isSelected ? "❯ " : "  "}
                </Text>
                <Text bold color={isSelected ? theme.success : theme.primary}>
                  {`${typeIcon}${item.display}`.padEnd(30)}
                </Text>
                <Text color={isSelected ? theme.primary : theme.muted}> - {item.description}</Text>
              </Box>
            );
          })}
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
          <PromptInput
            value={inputVal}
            onChange={handleInputChange}
            onSubmit={handleSubmit}
            isAutocompleteActive={isShowingSuggestions}
            onNavigateSuggestions={handleNavigateSuggestions}
            onSelectSuggestion={handleSelectSuggestion}
            onDismissSuggestions={() => setIsSuggestionsDismissed(true)}
            history={promptHistory}
          />
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
