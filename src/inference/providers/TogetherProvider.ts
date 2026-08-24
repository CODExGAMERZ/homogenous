import { OpenAIProvider } from "./OpenAIProvider.js";
import { KeychainService } from "../keychain.js";
import type { ProviderCapabilities } from "../InferenceProvider.js";

export class TogetherProvider extends OpenAIProvider {
  override readonly id = "together" as const;

  constructor() {
    super("https://api.together.xyz/v1");
  }

  public override async listModels(forceRefresh = false): Promise<string[]> {
    let apiKey: string;
    try {
      apiKey = this.getApiKey();
    } catch {
      this.cachedModels = null;
      return [];
    }

    const now = Date.now();
    if (!forceRefresh && this.cachedModels && now - this.lastFetchTime < 30000) {
      return this.cachedModels;
    }

    try {
      const res = await fetch("https://api.together.xyz/v1/models", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) {
        this.cachedModels = null;
        return [];
      }
      const data = (await res.json()) as { data?: Array<{ id: string; type?: string }> };
      const models =
        data.data
          ?.filter((m) => !m.id.includes("embed") && !m.id.includes("rerank") && !m.id.includes("flux") && !m.id.includes("sdxl"))
          .map((m) => m.id) || [];
      this.cachedModels = models;
      this.lastFetchTime = now;
      return models;
    } catch {
      this.cachedModels = null;
      return [];
    }
  }

  override async ping(): Promise<{ ok: boolean; models?: string[]; error?: string }> {
    try {
      const models = await this.listModels(true);
      if (models.length > 0) {
        return { ok: true, models };
      }
      const apiKey = this.getApiKey();
      const res = await fetch("https://api.together.xyz/v1/models", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) return { ok: false, error: `HTTP ${res.status}: ${res.statusText}` };
      return { ok: true, models: [] };
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
      contextWindow: 131072,
    };
  }
}
