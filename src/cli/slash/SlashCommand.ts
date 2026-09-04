import type { InferenceProvider } from "../../inference/InferenceProvider.js";
import type { SessionMemory } from "../../memory/SessionMemory.js";

export type PendingPlan = any;

export interface CommandContext {
  provider: InferenceProvider;
  model: string;
  setModel: (model: string) => void;
  setProvider?: (provider: InferenceProvider) => void;
  sessionMemory: SessionMemory;
  workspacePath: string;
  pendingPlan?: PendingPlan;
  setPendingPlan?: (plan: PendingPlan) => void;
  planModeEnabled?: boolean;
  setPlanModeEnabled?: (enabled: boolean) => void;
  autoApproveEnabled?: boolean;
  setAutoApproveEnabled?: (enabled: boolean) => void;
  setFeed?: (feed: any[]) => void;
  setTheme?: (themeId: string) => void;
}

export interface CommandResult {
  output: string;
  exitSession?: boolean;
}

export interface SlashCommand {
  name: string;
  description: string;
  category: "session" | "navigation" | "edits" | "model" | "memory" | "config" | "utility";
  usage?: string;
  execute(args: string[], context: CommandContext): Promise<CommandResult>;
}
