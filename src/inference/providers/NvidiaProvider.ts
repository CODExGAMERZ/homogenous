import { OpenAIProvider } from "./OpenAIProvider.js";
import { KeychainService } from "../keychain.js";
import type { ProviderCapabilities, ChatRequest } from "../InferenceProvider.js";

export class NvidiaProvider extends OpenAIProvider {
  override readonly id = "nvidia" as const;
  private installedModels: string[] = [];

  constructor() {
    super("https://integrate.api.nvidia.com/v1");
  }

  public getInstalledModels(): string[] {
    return this.installedModels;
  }

  override async ping(): Promise<{ ok: boolean; models?: string[]; error?: string }> {
    try {
      const apiKey = this.getApiKey();
      const res = await fetch("https://integrate.api.nvidia.com/v1/models", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) return { ok: false, error: `HTTP ${res.status}: ${res.statusText}` };
      const data = (await res.json()) as { data?: Array<{ id: string }> };
      const models =
        data.data
          ?.filter((m) => !m.id.includes("embed") && !m.id.includes("guard") && !m.id.includes("parse"))
          .map((m) => m.id) || [
          "meta/llama-3.3-70b-instruct",
          "meta/llama-3.1-70b-instruct",
          "nvidia/llama-3.1-nemotron-70b-instruct",
          "deepseek-ai/deepseek-r1",
          "mistralai/mistral-large-2-instruct",
          "mistralai/codestral-22b-instruct-v0.1",
        ];
      this.installedModels = models;
      return { ok: true, models };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  }

  private normalizeModel(model: string): string {
    if (!model) return "nvidia/llama-3.1-nemotron-70b-instruct";
    return model.replace(/^nvidia\/nvidia\//, "nvidia/");
  }

  override async chat(request: ChatRequest) {
    return super.chat({ ...request, model: this.normalizeModel(request.model) });
  }

  override async *stream(request: ChatRequest) {
    yield* super.stream({ ...request, model: this.normalizeModel(request.model) });
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
