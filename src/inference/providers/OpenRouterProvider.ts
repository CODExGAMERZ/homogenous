import { OpenAIProvider } from "./OpenAIProvider.js";
import { KeychainService } from "../keychain.js";
import type { ProviderCapabilities } from "../InferenceProvider.js";

export class OpenRouterProvider extends OpenAIProvider {
  override readonly id = "openrouter" as const;

  constructor() {
    super("https://openrouter.ai/api/v1");
  }

  override async ping(): Promise<{ ok: boolean; models?: string[]; error?: string }> {
    try {
      const apiKey = this.getApiKey();
      const res = await fetch("https://openrouter.ai/api/v1/models", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) return { ok: false, error: `HTTP ${res.status}: ${res.statusText}` };
      const data = (await res.json()) as { data?: Array<{ id: string }> };
      const models = data.data?.slice(0, 10).map((m) => m.id) || [
        "anthropic/claude-3.5-sonnet",
        "deepseek/deepseek-r1",
        "google/gemini-2.0-flash-exp",
      ];
      return { ok: true, models };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  }

  override capabilities(_model: string): ProviderCapabilities {
    return {
      supportsTools: true,
      supportsStreaming: true,
      supportsPromptCaching: false,
      supportsEmbeddings: false,
      isLocal: false,
      contextWindow: 128000,
    };
  }
}
