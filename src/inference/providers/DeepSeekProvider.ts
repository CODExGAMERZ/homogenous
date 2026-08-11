import { OpenAIProvider } from "./OpenAIProvider.js";
import { KeychainService } from "../keychain.js";
import type { ProviderCapabilities } from "../InferenceProvider.js";

export class DeepSeekProvider extends OpenAIProvider {
  override readonly id = "deepseek" as const;

  constructor() {
    super("https://api.deepseek.com/v1");
  }

  override async ping(): Promise<{ ok: boolean; models?: string[]; error?: string }> {
    try {
      const apiKey = this.getApiKey();
      const res = await fetch("https://api.deepseek.com/v1/models", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) return { ok: false, error: `HTTP ${res.status}: ${res.statusText}` };
      const data = (await res.json()) as { data?: Array<{ id: string }> };
      const models = data.data?.map((m) => m.id) || ["deepseek-chat", "deepseek-reasoner"];
      return { ok: true, models };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  }

  override capabilities(_model: string): ProviderCapabilities {
    return {
      supportsTools: true,
      supportsStreaming: true,
      supportsPromptCaching: true,
      supportsEmbeddings: false,
      isLocal: false,
      contextWindow: 64000,
    };
  }
}
