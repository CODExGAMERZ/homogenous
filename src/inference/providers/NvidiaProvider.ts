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
      const headers: Record<string, string> = {};
      if (apiKey) {
        headers["Authorization"] = `Bearer ${apiKey}`;
      }
      const res = await fetch("https://integrate.api.nvidia.com/v1/models", {
        headers,
      });
      if (!res.ok) return { ok: false, error: `HTTP ${res.status}: ${res.statusText}` };
      const data = (await res.json()) as { data?: Array<{ id: string }> };
      const models =
        data.data
          ?.filter(
            (m) =>
              !m.id.includes("embed") &&
              !m.id.includes("guard") &&
              !m.id.includes("parse") &&
              !m.id.includes("safety") &&
              !m.id.includes("reward") &&
              !m.id.includes("clip") &&
              !m.id.includes("detector") &&
              !m.id.includes("calibrate")
          )
          .map((m) => m.id) || [
          "nvidia/nemotron-3-ultra-550b-a55b",
          "nvidia/nemotron-4-340b-instruct",
          "nvidia/llama-3.1-nemotron-ultra-253b-v1",
          "mistralai/mixtral-8x22b-v0.1",
          "databricks/dbrx-instruct",
          "mistralai/mistral-large-2-instruct",
          "openai/gpt-oss-120b",
          "meta/llama-3.2-90b-vision-instruct",
          "meta/llama-3.3-70b-instruct",
          "nvidia/llama-3.1-nemotron-70b-instruct",
          "meta/llama-3.1-70b-instruct",
          "nvidia/llama-3.3-nemotron-super-49b-v1.5",
          "ibm/granite-34b-code-instruct",
          "google/gemma-4-31b-it",
          "nvidia/nemotron-3-nano-30b-a3b",
          "mistralai/codestral-22b-instruct-v0.1",
          "openai/gpt-oss-20b",
          "bigcode/starcoder2-15b",
          "google/gemma-3-12b-it",
          "nv-mistralai/mistral-nemo-12b-instruct",
          "meta/llama-3.1-8b-instruct",
          "mistralai/mistral-7b-instruct-v0.3",
          "deepseek-ai/deepseek-coder-6.7b-instruct",
          "nvidia/nemotron-mini-4b-instruct",
          "meta/llama-3.2-3b-instruct",
          "meta/llama-3.2-1b-instruct",
        ];
      this.installedModels = models;
      return { ok: true, models };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  }

  private normalizeModel(model: string): string {
    if (!model) return "nvidia/llama-3.1-nemotron-70b-instruct";
    if (model.startsWith("nvidia/nvidia/")) {
      return model.slice(7);
    }
    if (model.startsWith("nvidia/")) {
      const rest = model.slice(7);
      if (rest.includes("/")) {
        return rest;
      }
    }
    return model;
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
