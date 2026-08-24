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

  public override async listModels(forceRefresh = false): Promise<string[]> {
    let apiKey: string;
    try {
      apiKey = this.getApiKey();
    } catch {
      this.installedModels = [];
      this.cachedModels = null;
      return [];
    }

    const now = Date.now();
    if (!forceRefresh && this.cachedModels && now - this.lastFetchTime < 30000) {
      return this.cachedModels;
    }

    try {
      const res = await fetch("https://integrate.api.nvidia.com/v1/models", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) {
        this.installedModels = [];
        this.cachedModels = null;
        return [];
      }
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
              !m.id.includes("calibrate") &&
              !m.id.includes("asr") &&
              !m.id.includes("tts")
          )
          .map((m) => m.id) || [];

      this.installedModels = models;
      this.cachedModels = models;
      this.lastFetchTime = now;
      return models;
    } catch {
      this.installedModels = [];
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
      const res = await fetch("https://integrate.api.nvidia.com/v1/models", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) return { ok: false, error: `HTTP ${res.status}: ${res.statusText}` };
      return { ok: true, models: [] };
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
