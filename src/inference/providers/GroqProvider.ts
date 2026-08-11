import { OpenAIProvider } from "./OpenAIProvider.js";
import { KeychainService } from "../keychain.js";
import type { ProviderCapabilities } from "../InferenceProvider.js";

export class GroqProvider extends OpenAIProvider {
  override readonly id = "groq" as const;
  private installedModels: string[] = [];

  constructor() {
    super("https://api.groq.com/openai/v1");
  }

  public getInstalledModels(): string[] {
    return this.installedModels;
  }

  override async ping(): Promise<{ ok: boolean; models?: string[]; error?: string }> {
    try {
      const apiKey = this.getApiKey();
      const res = await fetch("https://api.groq.com/openai/v1/models", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) return { ok: false, error: `HTTP ${res.status}: ${res.statusText}` };
      const data = (await res.json()) as { data?: Array<{ id: string; active?: boolean }> };
      const models =
        data.data
          ?.filter((m) => m.active !== false && !m.id.includes("whisper") && !m.id.includes("guard"))
          .map((m) => m.id) || [
          "openai/gpt-oss-120b",
          "openai/gpt-oss-20b",
          "llama-3.3-70b-versatile",
          "llama-3.1-8b-instant",
          "qwen/qwen3.6-27b",
          "groq/compound",
        ];
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
      isLocal: false,
      contextWindow: 128000,
    };
  }
}
