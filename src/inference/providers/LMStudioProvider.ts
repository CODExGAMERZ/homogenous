import { OpenAIProvider } from "./OpenAIProvider.js";
import type { ProviderCapabilities } from "../InferenceProvider.js";

export class LMStudioProvider extends OpenAIProvider {
  override readonly id = "lmstudio" as const;
  private installedModels: string[] = [];

  constructor(host: string = process.env.LMSTUDIO_HOST || "http://127.0.0.1:1234/v1") {
    super(host);
  }

  protected override getApiKey(): string {
    return process.env.LMSTUDIO_API_KEY || "lm-studio";
  }

  public override async listModels(forceRefresh = false): Promise<string[]> {
    if (!forceRefresh && this.installedModels.length > 0) {
      return this.installedModels;
    }
    const res = await this.ping();
    return res.ok && res.models ? res.models : [];
  }

  public getInstalledModels(): string[] {
    return this.installedModels;
  }

  override async ping(): Promise<{ ok: boolean; models?: string[]; error?: string }> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);

      let res = await fetch("http://127.0.0.1:1234/v1/models", { signal: controller.signal }).catch(() => null);
      if (!res || !res.ok) {
        res = await fetch("http://localhost:1234/v1/models", { signal: controller.signal }).catch(() => null);
      }
      clearTimeout(timeout);

      if (!res || !res.ok) return { ok: false, error: res ? `HTTP ${res.status}` : "Connection refused" };
      const data = (await res.json()) as { data?: Array<{ id: string }> };
      const models = data.data?.map((m) => m.id) || [];
      this.installedModels = models;
      return { ok: true, models };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  }

  override capabilities(model: string): ProviderCapabilities {
    return {
      supportsTools: true,
      supportsStreaming: true,
      supportsPromptCaching: false,
      supportsEmbeddings: false,
      isLocal: true,
      contextWindow: 32768,
    };
  }
}
