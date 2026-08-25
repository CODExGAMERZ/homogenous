import fs from "node:fs";
import path from "node:path";
import { getGlobalConfigDir, resolvePath } from "./paths.js";

export interface UserStateData {
  lastUsedProvider?: string;
  lastUsedModel?: string;
  executionMode?: "normal" | "auto" | "plan";
  promptHistory?: string[];
  theme?: string;
  lastUpdated?: string;
}

const MAX_PROMPT_HISTORY = 100;

export class UserStateService {
  private static instance: UserStateService;
  private stateCache: UserStateData | null = null;

  private constructor() {}

  public static getInstance(): UserStateService {
    if (!UserStateService.instance) {
      UserStateService.instance = new UserStateService();
    }
    return UserStateService.instance;
  }

  private getStateFilePath(): string {
    const dir = getGlobalConfigDir();
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch {
        // Ignore mkdir error
      }
    }
    return resolvePath(dir, "state.json");
  }

  public getState(forceReload = false): UserStateData {
    if (this.stateCache && !forceReload) {
      return this.stateCache;
    }
    const filePath = this.getStateFilePath();
    if (fs.existsSync(filePath)) {
      try {
        const raw = fs.readFileSync(filePath, "utf-8");
        const parsed = JSON.parse(raw);
        this.stateCache = {
          lastUsedProvider: parsed.lastUsedProvider,
          lastUsedModel: parsed.lastUsedModel,
          executionMode: parsed.executionMode || "normal",
          promptHistory: Array.isArray(parsed.promptHistory) ? parsed.promptHistory : [],
          theme: parsed.theme,
          lastUpdated: parsed.lastUpdated,
        };
        return this.stateCache;
      } catch {
        // Corrupted state file fallback
      }
    }
    this.stateCache = {
      executionMode: "normal",
      promptHistory: [],
    };
    return this.stateCache;
  }

  public saveState(partialState: Partial<UserStateData>): void {
    const current = this.getState();
    const updated: UserStateData = {
      ...current,
      ...partialState,
      lastUpdated: new Date().toISOString(),
    };
    if (updated.promptHistory && updated.promptHistory.length > MAX_PROMPT_HISTORY) {
      updated.promptHistory = updated.promptHistory.slice(-MAX_PROMPT_HISTORY);
    }
    this.stateCache = updated;

    try {
      const filePath = this.getStateFilePath();
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(filePath, JSON.stringify(updated, null, 2), { encoding: "utf-8" });
    } catch {
      // Non-fatal if filesystem is temporarily readonly
    }
  }

  public getLastUsed(): { provider?: string; model?: string } {
    const state = this.getState();
    return {
      provider: state.lastUsedProvider,
      model: state.lastUsedModel,
    };
  }

  public setLastUsed(provider: string, model: string): void {
    this.saveState({
      lastUsedProvider: provider,
      lastUsedModel: model,
    });
  }

  public getExecutionMode(): "normal" | "auto" | "plan" {
    return this.getState().executionMode || "normal";
  }

  public setExecutionMode(mode: "normal" | "auto" | "plan"): void {
    this.saveState({ executionMode: mode });
  }

  public getPromptHistory(): string[] {
    return this.getState().promptHistory || [];
  }

  public addPromptToHistory(prompt: string): void {
    if (!prompt || !prompt.trim()) return;
    const trimmed = prompt.trim();
    const currentHistory = [...this.getPromptHistory()];
    // Avoid duplicate adjacent prompts
    if (currentHistory.length === 0 || currentHistory[currentHistory.length - 1] !== trimmed) {
      currentHistory.push(trimmed);
      this.saveState({ promptHistory: currentHistory });
    }
  }

  public clearHistory(): void {
    this.saveState({ promptHistory: [] });
  }
}
