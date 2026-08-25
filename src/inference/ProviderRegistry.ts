import chalk from "chalk";
import type { InferenceProvider } from "./InferenceProvider.js";
import { AnthropicProvider } from "./providers/AnthropicProvider.js";
import { OpenAIProvider } from "./providers/OpenAIProvider.js";
import { GroqProvider } from "./providers/GroqProvider.js";
import { NvidiaProvider } from "./providers/NvidiaProvider.js";
import { DeepSeekProvider } from "./providers/DeepSeekProvider.js";
import { OpenRouterProvider } from "./providers/OpenRouterProvider.js";
import { MistralProvider } from "./providers/MistralProvider.js";
import { TogetherProvider } from "./providers/TogetherProvider.js";
import { OllamaProvider } from "./providers/OllamaProvider.js";
import { LMStudioProvider } from "./providers/LMStudioProvider.js";
import { MockProvider } from "./providers/MockProvider.js";
import { ConfigResolver } from "../config/ConfigResolver.js";

export type TaskType =
  | "fileSearch"
  | "lintSummary"
  | "compaction"
  | "embedding"
  | "complexEdit"
  | "planning";

export const FREE_TIER_TASKS: TaskType[] = [
  "fileSearch",
  "lintSummary",
  "compaction",
  "embedding",
];

export interface ProviderResolution {
  provider: InferenceProvider;
  model: string;
  isFreeTier: boolean;
}

import { KeychainService, type KeyProvider } from "./keychain.js";
import { parseModelParams } from "./modelParams.js";
import { UserStateService } from "../platform/UserState.js";

export interface ActiveModelItem {
  id: string;
  providerId: string;
  modelName: string;
  tag: string;
  ready: boolean;
  params: number;
}

export class ProviderRegistry {
  private static instance: ProviderRegistry;
  private providers: Map<string, InferenceProvider>;
  private activeLocalProviders: Set<string>;
  private cachedActiveModels: ActiveModelItem[] | null = null;
  private lastModelDiscoveryTime = 0;

  private constructor() {
    this.providers = new Map();
    this.activeLocalProviders = new Set();

    // Register provider singletons
    this.providers.set("anthropic", new AnthropicProvider());
    this.providers.set("openai", new OpenAIProvider());
    this.providers.set("groq", new GroqProvider());
    this.providers.set("nvidia", new NvidiaProvider());
    this.providers.set("deepseek", new DeepSeekProvider());
    this.providers.set("openrouter", new OpenRouterProvider());
    this.providers.set("mistral", new MistralProvider());
    this.providers.set("together", new TogetherProvider());
    this.providers.set("ollama", new OllamaProvider());
    this.providers.set("lmstudio", new LMStudioProvider());
    this.providers.set("mock", new MockProvider());
  }

  public static getInstance(): ProviderRegistry {
    if (!ProviderRegistry.instance) {
      ProviderRegistry.instance = new ProviderRegistry();
    }
    return ProviderRegistry.instance;
  }

  /**
   * Clears cached active models list and resets client states.
   */
  public invalidateModelCache(): void {
    this.cachedActiveModels = null;
    this.lastModelDiscoveryTime = 0;
    for (const provider of this.providers.values()) {
      if ("resetClient" in provider && typeof (provider as any).resetClient === "function") {
        (provider as any).resetClient();
      }
    }
  }

  /**
   * Fast startup parallel probe (500ms max) detecting running local Ollama / LM Studio models.
   */
  public async detectLocalProviders(): Promise<void> {
    const localProbes = [
      { id: "ollama", provider: this.providers.get("ollama")! },
      { id: "lmstudio", provider: this.providers.get("lmstudio")! },
    ];

    await Promise.all(
      localProbes.map(async ({ id, provider }) => {
        try {
          const res = await provider.ping();
          if (res.ok) {
            this.activeLocalProviders.add(id);
          }
        } catch {
          // Silent non-blocking fallback if local daemon is not running
        }
      })
    );
  }

  public getProvider(id: string): InferenceProvider | undefined {
    return this.providers.get(id);
  }

  /**
   * Dynamically collects ONLY models that have active API keys or running local daemons.
   * If no API keys or local servers are detected, returns only the Demo Mode fallback.
   */
  public async getActiveModels(forceRefresh = false): Promise<ActiveModelItem[]> {
    const now = Date.now();
    if (!forceRefresh && this.cachedActiveModels && now - this.lastModelDiscoveryTime < 30000) {
      return this.cachedActiveModels;
    }

    const activeList: ActiveModelItem[] = [];

    // 1. Check local Ollama
    const ollama = this.providers.get("ollama");
    if (ollama) {
      try {
        const models = ollama.listModels ? await ollama.listModels(forceRefresh) : (await ollama.ping()).models || [];
        for (const m of models) {
          const params = parseModelParams(m);
          activeList.push({
            id: `ollama/${m}`,
            providerId: "ollama",
            modelName: m,
            tag: "Local Ollama",
            ready: true,
            params,
          });
        }
      } catch {
        // Local daemon not available
      }
    }

    // 2. Check local LM Studio
    const lmstudio = this.providers.get("lmstudio");
    if (lmstudio) {
      try {
        const models = lmstudio.listModels ? await lmstudio.listModels(forceRefresh) : (await lmstudio.ping()).models || [];
        for (const m of models) {
          const params = parseModelParams(m);
          activeList.push({
            id: `lmstudio/${m}`,
            providerId: "lmstudio",
            modelName: m,
            tag: "Local LM Studio",
            ready: true,
            params,
          });
        }
      } catch {
        // Local LM Studio not available
      }
    }

    // 3. Check cloud providers ONLY when an API key is fed into the system
    const cloudProviderDefs: Array<{ id: KeyProvider; name: string }> = [
      { id: "deepseek", name: "DeepSeek" },
      { id: "together", name: "Together AI" },
      { id: "nvidia", name: "NVIDIA NIM" },
      { id: "openrouter", name: "OpenRouter" },
      { id: "anthropic", name: "Anthropic Claude" },
      { id: "openai", name: "OpenAI" },
      { id: "mistral", name: "Mistral AI" },
      { id: "groq", name: "Groq" },
    ];

    for (const def of cloudProviderDefs) {
      const apiKey = KeychainService.getApiKey(def.id);
      if (!apiKey) {
        // Strictly skip providers without credentials - NO models shown
        continue;
      }

      const p = this.providers.get(def.id);
      if (!p) continue;

      try {
        const models = p.listModels ? await p.listModels(forceRefresh) : (await p.ping()).models || [];
        for (const m of models) {
          const fullId = m.startsWith(`${def.id}/`) ? m : `${def.id}/${m}`;
          const cleanModelName = m.startsWith(`${def.id}/`) ? m.slice(def.id.length + 1) : m;
          const params = parseModelParams(cleanModelName);
          activeList.push({
            id: fullId,
            providerId: def.id,
            modelName: cleanModelName,
            tag: `${def.name} (Key Ready)`,
            ready: true,
            params,
          });
        }
      } catch {
        // Skip on authentication or network error
      }
    }

    // 4. If no models available across all sources, add Demo Mode
    if (activeList.length === 0) {
      activeList.push({
        id: "mock/demo-mode",
        providerId: "mock",
        modelName: "demo-mode",
        tag: "Demo Mode (Offline)",
        ready: true,
        params: 0,
      });
    }

    // 5. Sort from highest parameter scale to lowest
    activeList.sort((a, b) => {
      if (b.params !== a.params) {
        return b.params - a.params;
      }
      return a.id.localeCompare(b.id);
    });

    this.cachedActiveModels = activeList;
    this.lastModelDiscoveryTime = now;
    return activeList;
  }

  /**
   * Resolves the appropriate provider and model for a given task type,
   * enforcing strict cost-tier isolation for local/free triage tasks,
   * dynamically picking installed models (e.g. qwen2.5-coder:1.5b),
   * remembering user's last chosen active model,
   * and falling back to Demo Mode if no API keys or local servers are detected.
   */
  public async routeFor(taskType: TaskType): Promise<ProviderResolution> {
    const config = ConfigResolver.getInstance().getConfig();
    const configuredTarget = config.routing[taskType];

    let preferredProviderId = "anthropic";
    let preferredModel = "claude-3-5-sonnet-20241022";

    if (configuredTarget && configuredTarget.includes("/")) {
      const parts = configuredTarget.split("/");
      preferredProviderId = parts[0];
      preferredModel = parts.slice(1).join("/");
    }

    const isFreeTask = FREE_TIER_TASKS.includes(taskType);

    // If this is a primary execution task and user previously selected a provider/model, prioritize it
    if (!isFreeTask && (!configuredTarget || preferredProviderId === "anthropic")) {
      try {
        const lastUsed = UserStateService.getInstance().getLastUsed();
        if (lastUsed.provider && lastUsed.model) {
          const lastProvider = this.providers.get(lastUsed.provider);
          if (lastProvider) {
            const isLocal = lastUsed.provider === "ollama" || lastUsed.provider === "lmstudio" || lastUsed.provider === "mock";
            const hasKey = isLocal || !!KeychainService.getApiKey(lastUsed.provider as KeyProvider);
            if (hasKey) {
              const pingRes = await lastProvider.ping();
              if (pingRes.ok) {
                return {
                  provider: lastProvider,
                  model: lastUsed.model,
                  isFreeTier: isFreeTask || lastProvider.capabilities(lastUsed.model).isLocal,
                };
              }
            }
          }
        }
      } catch {
        // Non-fatal
      }
    }

    // Try preferred primary provider first if key or server exists
    const primaryProvider = this.providers.get(preferredProviderId);
    if (primaryProvider) {
      const isLocal = preferredProviderId === "ollama" || preferredProviderId === "lmstudio" || preferredProviderId === "mock";
      const hasKey = isLocal || !!KeychainService.getApiKey(preferredProviderId as KeyProvider);

      if (hasKey) {
        const pingRes = await primaryProvider.ping();
        if (pingRes.ok) {
          let activeModel = preferredModel;
          const available = primaryProvider.listModels ? await primaryProvider.listModels() : pingRes.models || [];
          if (available.length > 0 && !available.includes(preferredModel)) {
            activeModel = available[0];
          }
          return {
            provider: primaryProvider,
            model: activeModel,
            isFreeTier: isFreeTask || primaryProvider.capabilities(activeModel).isLocal,
          };
        }
      }
    }

    // Tier-isolated fallback resolution for free/local tasks
    if (isFreeTask) {
      const freeCandidates = ["ollama", "lmstudio", "groq"];
      for (const candId of freeCandidates) {
        const candProvider = this.providers.get(candId);
        if (!candProvider) continue;
        const hasKey = candId === "ollama" || candId === "lmstudio" || !!KeychainService.getApiKey(candId as KeyProvider);
        if (!hasKey) continue;

        const pingRes = await candProvider.ping();
        if (pingRes.ok) {
          const available = candProvider.listModels ? await candProvider.listModels() : pingRes.models || [];
          const defaultModel = available.length > 0 ? available[0] : (candId === "groq" ? "llama-3.3-70b-versatile" : "local-model");

          return {
            provider: candProvider,
            model: defaultModel,
            isFreeTier: true,
          };
        }
      }
    }

    // Fallback resolution respecting user's config.fallbackOrder priority
    const fallbackCandidates = config.fallbackOrder && config.fallbackOrder.length > 0
      ? config.fallbackOrder
      : ["ollama", "lmstudio", "groq", "openai", "anthropic", "nvidia", "deepseek", "openrouter", "mistral", "together"];

    for (const candId of fallbackCandidates) {
      const candProvider = this.providers.get(candId);
      if (!candProvider) continue;
      const isLocal = candId === "ollama" || candId === "lmstudio" || candId === "mock";
      const hasKey = isLocal || !!KeychainService.getApiKey(candId as KeyProvider);
      if (!hasKey) continue;

      const pingRes = await candProvider.ping();
      if (pingRes.ok) {
        const available = candProvider.listModels ? await candProvider.listModels() : pingRes.models || [];
        let defaultModel = available.length > 0 ? available[0] : "gpt-4o";

        if (!isFreeTask && (candId === "ollama" || candId === "lmstudio" || candId === "groq")) {
          console.log(
            chalk.yellow(
              `[Routing Notice] Cloud API key missing for ${preferredProviderId}. Auto-routing '${taskType}' to active backend: ${candId}/${defaultModel}`
            )
          );
        }

        return {
          provider: candProvider,
          model: defaultModel,
          isFreeTier: candProvider.capabilities(defaultModel).isLocal || candId === "groq",
        };
      }
    }

    // Out-of-the-box fallback to Demo Mode if no keys or servers are active
    console.log(
      chalk.bold.yellow(
        `\n[Notice] No cloud API key or local model server detected. Launching in Demo Mode.\n` +
          `  • To use real Anthropic models: set ANTHROPIC_API_KEY=sk-ant-...\n` +
          `  • To use free Groq models:      set GROQ_API_KEY=gsk_...\n` +
          `  • To use zero-cost local LLM:   run 'ollama serve' in background\n`
      )
    );

    return {
      provider: this.providers.get("mock")!,
      model: "demo-mode",
      isFreeTier: true,
    };
  }
}
