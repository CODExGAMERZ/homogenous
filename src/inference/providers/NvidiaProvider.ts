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
          "deepseek-ai/deepseek-r1",
          "nvidia/nemotron-4-340b-instruct",
          "mistralai/mixtral-8x22b-instruct-v0.1",
          "mistralai/mistral-large-2-instruct",
          "meta/llama-3.2-90b-vision-instruct",
          "qwen/qwen2.5-72b-instruct",
          "meta/llama-3.3-70b-instruct",
          "nvidia/llama-3.1-nemotron-70b-instruct",
          "meta/llama-3.1-70b-instruct",
          "nvidia/llama-3.3-nemotron-super-49b-v1.5",
          "qwen/qwen2.5-coder-32b-instruct",
          "google/gemma-2-27b-it",
          "mistralai/codestral-22b-instruct-v0.1",
          "google/gemma-2-9b-it",
          "meta/llama-3.1-8b-instruct",
          "mistralai/mistral-7b-instruct-v0.3",
          "nvidia/nemotron-mini-4b-instruct",
          "meta/llama-3.2-3b-instruct",
          "google/gemma-2-2b-it",
          "meta/llama-3.2-1b-instruct",
        ];
      this.installedModels = models;
      return { ok: true, models };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  }

  private normalizeModel(model: string): string {
    if (!model) return "meta/llama-3.3-70b-instruct";

    let clean = model.trim();

    if (clean === "nvidia/nemotron-3-ultra-550b-a55b" || clean === "nemotron-3-ultra-550b-a55b") {
      return "nvidia/nemotron-3-ultra-550b-a55b";
    }

    if (clean.startsWith("nvidia/nvidia/")) {
      clean = clean.slice(7);
    } else if (clean.startsWith("nvidia/")) {
      const rest = clean.slice(7);
      if (rest.includes("/")) {
        clean = rest;
      }
    }

    // Incompatible cross-provider models fallback
    if (
      clean.startsWith("claude") ||
      clean.startsWith("gpt-") ||
      clean.startsWith("chatgpt") ||
      clean.startsWith("o1") ||
      clean.startsWith("o3") ||
      clean.startsWith("deepseek-chat") ||
      clean.startsWith("deepseek-reasoner") ||
      clean.startsWith("qwen2.5-coder")
    ) {
      return "meta/llama-3.3-70b-instruct";
    }

    return clean;
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
