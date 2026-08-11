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

export class ProviderRegistry {
  private static instance: ProviderRegistry;
  private providers: Map<string, InferenceProvider>;
  private activeLocalProviders: Set<string>;

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
   * Resolves the appropriate provider and model for a given task type,
   * enforcing strict cost-tier isolation for local/free triage tasks,
   * dynamically picking installed models (e.g. qwen2.5-coder:1.5b),
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

    // Try preferred primary provider first
    const primaryProvider = this.providers.get(preferredProviderId);
    if (primaryProvider) {
      const pingRes = await primaryProvider.ping();
      if (pingRes.ok) {
        let activeModel = preferredModel;
        if (preferredProviderId === "ollama") {
          const installed = (primaryProvider as OllamaProvider).getInstalledModels();
          if (installed.length > 0 && !installed.includes(preferredModel)) {
            activeModel = installed[0];
          }
        }
        return {
          provider: primaryProvider,
          model: activeModel,
          isFreeTier: isFreeTask || primaryProvider.capabilities(activeModel).isLocal,
        };
      }
    }

    // Tier-isolated fallback resolution for free/local tasks
    if (isFreeTask) {
      const freeCandidates = ["ollama", "lmstudio", "groq"];
      for (const candId of freeCandidates) {
        const candProvider = this.providers.get(candId);
        if (!candProvider) continue;
        const pingRes = await candProvider.ping();
        if (pingRes.ok) {
          let defaultModel = "qwen2.5-coder:3b";
          if (candId === "ollama") {
            const installed = (candProvider as OllamaProvider).getInstalledModels();
            defaultModel = installed.length > 0 ? installed[0] : "qwen2.5-coder:3b";
          } else if (candId === "lmstudio") {
            defaultModel = "local-model";
          } else if (candId === "groq") {
            defaultModel = "llama-3.1-8b-instant";
          }

          return {
            provider: candProvider,
            model: defaultModel,
            isFreeTier: true,
          };
        }
      }
    }

    // Fallback resolution respect user's config.fallbackOrder priority
    const fallbackCandidates = config.fallbackOrder && config.fallbackOrder.length > 0
      ? config.fallbackOrder
      : ["ollama", "lmstudio", "groq", "openai", "anthropic", "nvidia", "deepseek", "openrouter", "mistral", "together"];

    for (const candId of fallbackCandidates) {
      const candProvider = this.providers.get(candId);
      if (!candProvider) continue;
      const pingRes = await candProvider.ping();
      if (pingRes.ok) {
        let defaultModel = "claude-3-5-sonnet-20241022";
        if (candId === "anthropic") defaultModel = "claude-3-5-sonnet-20241022";
        else if (candId === "openai") defaultModel = "gpt-4o";
        else if (candId === "deepseek") defaultModel = "deepseek-chat";
        else if (candId === "nvidia") defaultModel = "nvidia/llama-3.1-nemotron-70b-instruct";
        else if (candId === "openrouter") defaultModel = "anthropic/claude-3.5-sonnet";
        else if (candId === "mistral") defaultModel = "mistral-large-latest";
        else if (candId === "together") defaultModel = "meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo";
        else if (candId === "groq") defaultModel = "llama-3.1-8b-instant";
        else if (candId === "ollama") {
          const installed = (candProvider as OllamaProvider).getInstalledModels();
          defaultModel = installed.length > 0 ? installed[0] : "qwen2.5-coder:3b";
        } else if (candId === "lmstudio") defaultModel = "local-model";

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
