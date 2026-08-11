import { OpenAIProvider } from "./OpenAIProvider.js";
import { KeychainService } from "../keychain.js";
import type { ProviderCapabilities } from "../InferenceProvider.js";

export class TogetherProvider extends OpenAIProvider {
  override readonly id = "together" as const;

  constructor() {
    super("https://api.together.xyz/v1");
  }

  override async ping(): Promise<{ ok: boolean; models?: string[]; error?: string }> {
    try {
      const apiKey = this.getApiKey();
      const res = await fetch("https://api.together.xyz/v1/models", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) return { ok: false, error: `HTTP ${res.status}: ${res.statusText}` };
      const data = (await res.json()) as { data?: Array<{ id: string }> };
      const models = data.data?.slice(0, 10).map((m) => m.id) || ["meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo"];
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
      contextWindow: 131072,
    };
  }
}
