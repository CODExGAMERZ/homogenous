import type {
  InferenceProvider,
  ChatRequest,
  ChatResponse,
  StreamEvent,
  EmbedRequest,
  EmbedResponse,
  ProviderCapabilities,
  Message,
} from "../InferenceProvider.js";

export class OllamaProvider implements InferenceProvider {
  readonly id = "ollama" as const;
  private host: string;
  private installedModels: string[] = [];

  constructor(host: string = process.env.OLLAMA_HOST || "http://127.0.0.1:11434") {
    this.host = host;
  }

  async ping(): Promise<{ ok: boolean; models?: string[]; error?: string }> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);

      let res = await fetch(`${this.host}/api/tags`, { signal: controller.signal }).catch(() => null);
      if (!res || !res.ok) {
        res = await fetch("http://localhost:11434/api/tags", { signal: controller.signal }).catch(() => null);
      }
      clearTimeout(timeout);

      if (!res || !res.ok) return { ok: false, error: res ? `HTTP ${res.status}` : "Connection refused" };
      const data = (await res.json()) as { models?: Array<{ name: string }> };
      const models = data.models?.map((m) => m.name) || [];
      this.installedModels = models;
      return { ok: true, models };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  }

  public getInstalledModels(): string[] {
    return this.installedModels;
  }

  capabilities(model: string): ProviderCapabilities {
    const isSmall = model.includes("3b") || model.includes("1.5b") || model.includes("1b");
    return {
      supportsTools: true,
      supportsStreaming: true,
      supportsPromptCaching: false,
      supportsEmbeddings: true,
      isLocal: true,
      contextWindow: isSmall ? 32768 : 65536,
    };
  }

  supportsTools(model: string): boolean {
    return model.includes("qwen") || model.includes("llama3") || model.includes("coder");
  }

  async countTokens(text: string): Promise<number> {
    return Math.ceil(text.length / 4);
  }

  async embed(request: EmbedRequest): Promise<EmbedResponse> {
    let model = request.model || "nomic-embed-text";
    if (this.installedModels.length > 0 && !this.installedModels.includes(model)) {
      // Pick first installed model if specified embedding model is missing
      const embedModel = this.installedModels.find((m) => m.includes("embed")) || this.installedModels[0];
      model = embedModel;
    }

    const embeddings: number[][] = [];

    for (const inputStr of request.input) {
      const res = await fetch(`${this.host}/api/embeddings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, prompt: inputStr }),
      });

      if (!res.ok) {
        throw new Error(`Ollama embedding call failed with status ${res.status}`);
      }

      const data = (await res.json()) as { embedding: number[] };
      embeddings.push(data.embedding);
    }

    return {
      embeddings,
      dimensions: embeddings[0]?.length || 0,
    };
  }

  private convertMessages(messages: Message[]) {
    return messages.map((m) => {
      if (typeof m.content === "string") {
        return { role: m.role, content: m.content };
      }
      const textParts = m.content
        .filter((b) => b.type === "text")
        .map((b) => (b as { text: string }).text);
      return { role: m.role, content: textParts.join("\n") };
    });
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const formattedMsgs = this.convertMessages(request.messages);

    // Dynamic model resolution against actual installed models in Ollama
    let targetModel = request.model || "qwen2.5-coder:3b";
    if (this.installedModels.length > 0) {
      if (!this.installedModels.includes(targetModel)) {
        // Try finding a matching model variant (e.g. qwen2.5-coder:1.5b) or pick the first installed model
        const match = this.installedModels.find((m) => m.startsWith(targetModel.split(":")[0])) || this.installedModels[0];
        targetModel = match;
      }
    }

    let res = await fetch(`${this.host}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: targetModel,
        messages: formattedMsgs,
        stream: false,
      }),
    });

    if (!res.ok && res.status === 404 && this.installedModels.length > 0) {
      // Retry with first installed model if primary target returned 404
      targetModel = this.installedModels[0];
      res = await fetch(`${this.host}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: targetModel,
          messages: formattedMsgs,
          stream: false,
        }),
      });
    }

    if (!res.ok) {
      const available = this.installedModels.length > 0 ? `Installed models: [${this.installedModels.join(", ")}]` : "No models found in Ollama.";
      throw new Error(
        `Ollama chat call for '${request.model}' failed with status ${res.status}. ${available}`
      );
    }

    const data = (await res.json()) as { message?: { content?: string } };
    const textContent = data.message?.content || "";

    return {
      content: [{ type: "text", text: textContent }],
      stopReason: "end_turn",
      usage: {
        inputTokens: Math.ceil(JSON.stringify(formattedMsgs).length / 4),
        outputTokens: Math.ceil(textContent.length / 4),
      },
      raw: data,
    };
  }

  async *stream(request: ChatRequest): AsyncIterable<StreamEvent> {
    const response = await this.chat(request);
    for (const block of response.content) {
      if (block.type === "text") {
        yield { type: "text_delta", textDelta: block.text };
      }
    }
    yield { type: "message_stop", usage: response.usage };
  }
}
