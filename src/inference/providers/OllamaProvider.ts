import type {
  InferenceProvider,
  ChatRequest,
  ChatResponse,
  StreamEvent,
  EmbedRequest,
  EmbedResponse,
  ProviderCapabilities,
  Message,
  ContentBlock,
} from "../InferenceProvider.js";
import { parseEmbeddedToolCalls } from "../toolParser.js";

export function normalizeOllamaHost(rawHost?: string): string {
  let h = (rawHost || process.env.OLLAMA_HOST || "http://127.0.0.1:11434").trim();
  if (!h) h = "http://127.0.0.1:11434";

  // Strip trailing API path segments if accidentally included in OLLAMA_HOST
  h = h.replace(/\/api\/(chat|tags|embeddings)\/?$/i, "").replace(/\/+$/, "");

  // Ensure scheme (http:// or https://)
  if (!/^https?:\/\//i.test(h)) {
    h = `http://${h}`;
  }

  // Map 0.0.0.0 bind address to 127.0.0.1 for client fetch requests
  h = h.replace(/:\/\/0\.0\.0\.0(?::|$|\/)/i, (m) => m.replace("0.0.0.0", "127.0.0.1"));

  try {
    const urlObj = new URL(h);
    if (!urlObj.port) {
      urlObj.port = "11434";
    }
    return urlObj.toString().replace(/\/+$/, "");
  } catch {
    return "http://127.0.0.1:11434";
  }
}

export class OllamaProvider implements InferenceProvider {
  readonly id = "ollama" as const;
  private host: string;
  private installedModels: string[] = [];

  constructor(host?: string) {
    this.host = normalizeOllamaHost(host);
  }

  async ping(): Promise<{ ok: boolean; models?: string[]; error?: string }> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 350);

      const urls = [
        `${this.host}/api/tags`,
        "http://127.0.0.1:11434/api/tags",
        "http://localhost:11434/api/tags",
      ];
      // Parallel probe to reduce latency
      const responses = await Promise.all(
        urls.map((u) => fetch(u, { signal: controller.signal }).catch(() => null))
      );
      clearTimeout(timeout);

      const res = responses.find((r) => r && r.ok);
      if (!res) return { ok: false, error: "Connection refused" };
      const data = (await res.json()) as { models?: Array<{ name: string }> };
      const models = data.models?.map((m) => m.name) || [];
      this.installedModels = models;
      return { ok: true, models };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  }

  public async listModels(forceRefresh = false): Promise<string[]> {
    if (!forceRefresh && this.installedModels.length > 0) {
      return this.installedModels;
    }
    const res = await this.ping();
    return res.ok && res.models ? res.models : [];
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
      if (m.role === "assistant") {
        const textParts = m.content.filter((b) => b.type === "text").map((b) => (b as { text: string }).text);
        const toolUse = m.content.filter((b) => b.type === "tool_use") as Array<{ type: "tool_use"; toolCall: { id: string; name: string; input: Record<string, unknown> } }>;
        if (toolUse.length > 0) {
          return {
            role: "assistant",
            content: textParts.join("\n"),
            tool_calls: toolUse.map((tu) => ({
              function: {
                name: tu.toolCall.name,
                arguments: tu.toolCall.input,
              },
            })),
          };
        }
        return { role: "assistant", content: textParts.join("\n") };
      }

      // User / tool_result
      const toolResults = m.content.filter((b) => b.type === "tool_result") as Array<{ type: "tool_result"; toolCallId: string; content: string }>;
      const textParts = m.content.filter((b) => b.type === "text").map((b) => (b as { text: string }).text);
      if (toolResults.length > 0) {
        return {
          role: "tool",
          content: toolResults.map((tr) => tr.content).join("\n"),
        };
      }
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

    const tools = request.tools?.map((t) => ({
      type: "function",
      function: {
        name: t.name,
        description: t.description,
        parameters: t.inputSchema,
      },
    }));

    const postChat = async (hostUrl: string, m: string) => {
      return fetch(`${hostUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: m,
          messages: formattedMsgs,
          tools: tools && tools.length > 0 ? tools : undefined,
          stream: false,
        }),
      }).catch(() => null);
    };

    let res = await postChat(this.host, targetModel);
    if (!res || !res.ok) {
      res = await postChat("http://127.0.0.1:11434", targetModel);
    }
    if (!res || !res.ok) {
      res = await postChat("http://localhost:11434", targetModel);
    }

    if (res && !res.ok && res.status === 404 && this.installedModels.length > 0) {
      targetModel = this.installedModels[0];
      res = await postChat(this.host, targetModel);
    }

    if (!res || !res.ok) {
      const statusText = res ? `status ${res.status}` : "Connection refused";
      const available = this.installedModels.length > 0 ? `Installed models: [${this.installedModels.join(", ")}]` : "No models found in Ollama.";
      throw new Error(
        `Ollama chat call for '${request.model}' failed with ${statusText}. ${available}`
      );
    }

    const data = (await res.json()) as { message?: { content?: string; tool_calls?: Array<{ function: { name: string; arguments: Record<string, unknown> } }> } };
    const textContent = data.message?.content || "";
    const contentBlocks: ContentBlock[] = [];

    if (data.message?.tool_calls && data.message.tool_calls.length > 0) {
      if (textContent) contentBlocks.push({ type: "text", text: textContent });
      for (const tc of data.message.tool_calls) {
        contentBlocks.push({
          type: "tool_use",
          toolCall: {
            id: `call_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            name: tc.function.name,
            input: tc.function.arguments || {},
          },
        });
      }
    } else if (textContent) {
      const extracted = parseEmbeddedToolCalls(textContent);
      if (extracted.toolCalls.length > 0) {
        if (extracted.remainingText) contentBlocks.push({ type: "text", text: extracted.remainingText });
        for (const tc of extracted.toolCalls) {
          contentBlocks.push({
            type: "tool_use",
            toolCall: {
              id: tc.id,
              name: tc.name,
              input: tc.input,
            },
          });
        }
      } else {
        contentBlocks.push({ type: "text", text: textContent });
      }
    }

    const hasTools = contentBlocks.some((b) => b.type === "tool_use");

    return {
      content: contentBlocks,
      stopReason: hasTools ? "tool_use" : "end_turn",
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
      } else if (block.type === "tool_use") {
        yield { type: "tool_call_start", toolCall: block.toolCall };
        yield { type: "tool_call_end", toolCall: block.toolCall };
      }
    }
    yield { type: "message_stop", usage: response.usage };
  }
}
