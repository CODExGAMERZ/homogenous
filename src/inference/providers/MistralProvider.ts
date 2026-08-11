import { OpenAIProvider } from "./OpenAIProvider.js";
import { KeychainService } from "../keychain.js";
import type { ProviderCapabilities } from "../InferenceProvider.js";

export class MistralProvider extends OpenAIProvider {
  override readonly id = "mistral" as const;

  constructor() {
    super("https://api.mistral.ai/v1");
  }

  override async ping(): Promise<{ ok: boolean; models?: string[]; error?: string }> {
    try {
      const apiKey = this.getApiKey();
      const res = await fetch("https://api.mistral.ai/v1/models", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) return { ok: false, error: `HTTP ${res.status}: ${res.statusText}` };
      const data = (await res.json()) as { data?: Array<{ id: string }> };
      const models = data.data?.map((m) => m.id) || ["mistral-large-latest", "codestral-latest"];
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
