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
import { KeychainService } from "../keychain.js";

export class OpenAIProvider implements InferenceProvider {
  readonly id: InferenceProvider["id"] = "openai";
  private baseUrl: string;

  constructor(baseUrl: string = "https://api.openai.com/v1") {
    this.baseUrl = baseUrl;
  }

  public resetClient(): void {
    // OpenAIProvider reads key dynamically per request via getApiKey()
  }

  protected getApiKey(): string {
    const providerKey = (this.id || "openai") as any;
    const key = KeychainService.getApiKey(providerKey);
    if (!key) {
      throw new Error(
        `${String(this.id).toUpperCase()} API key is missing. Set ${String(this.id).toUpperCase()}_API_KEY environment variable.`
      );
    }
    return key;
  }

  async ping(): Promise<{ ok: boolean; models?: string[]; error?: string }> {
    try {
      const apiKey = this.getApiKey();
      const res = await fetch(`${this.baseUrl}/models`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) return { ok: false, error: `HTTP ${res.status}: ${res.statusText}` };
      const data = (await res.json()) as { data?: Array<{ id: string }> };
      const models = data.data?.map((m) => m.id) || ["gpt-4o", "gpt-4o-mini"];
      return { ok: true, models };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  }

  capabilities(model: string): ProviderCapabilities {
    const isMini = model.includes("mini");
    return {
      supportsTools: true,
      supportsStreaming: true,
      supportsPromptCaching: false,
      supportsEmbeddings: true,
      isLocal: false,
      contextWindow: isMini ? 128000 : 128000,
    };
  }

  supportsTools(_model: string): boolean {
    return true;
  }

  async countTokens(text: string, _model: string): Promise<number> {
    return Math.ceil(text.length / 4);
  }

  async embed(request: EmbedRequest): Promise<EmbedResponse> {
    const apiKey = this.getApiKey();
    const res = await fetch(`${this.baseUrl}/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: request.model || "text-embedding-3-small",
        input: request.input,
      }),
    });

    if (!res.ok) {
      throw new Error(`OpenAI embedding failed with status ${res.status}`);
    }

    const data = (await res.json()) as { data: Array<{ embedding: number[] }> };
    const embeddings = data.data.map((d) => d.embedding);
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

      // Convert tool results & tool calls to OpenAI standard format
      const parts: any[] = [];
      for (const b of m.content) {
        if (b.type === "text") {
          parts.push({ type: "text", text: b.text });
        } else if (b.type === "tool_result") {
          return {
            role: "tool",
            tool_call_id: b.toolCallId,
            content: b.content,
          };
        }
      }
      return { role: m.role, content: parts.length === 1 ? parts[0].text : parts };
    });
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const apiKey = this.getApiKey();
    const formattedMsgs = this.convertMessages(request.messages);

    const tools = request.tools?.map((t) => ({
      type: "function",
      function: {
        name: t.name,
        description: t.description,
        parameters: t.inputSchema,
      },
    }));

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: request.model || "gpt-4o",
        messages: formattedMsgs,
        tools: tools && tools.length > 0 ? tools : undefined,
        max_tokens: request.maxTokens || 4096,
        temperature: request.temperature,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      if (res.status === 400 && errText.includes("tool_use_failed") && tools && tools.length > 0) {
        const fallbackRes = await fetch(`${this.baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: request.model || "gpt-4o",
            messages: formattedMsgs,
            max_tokens: request.maxTokens || 4096,
            temperature: request.temperature,
          }),
        });
        if (fallbackRes.ok) {
          const fallbackData = (await fallbackRes.json()) as any;
          const choice = fallbackData.choices[0];
          const contentBlocks: ContentBlock[] = [];
          if (choice.message.content) {
            contentBlocks.push({ type: "text", text: choice.message.content });
          }
          return {
            content: contentBlocks,
            stopReason: choice.finish_reason === "length" ? "max_tokens" : "end_turn",
            usage: {
              inputTokens: fallbackData.usage?.prompt_tokens || 0,
              outputTokens: fallbackData.usage?.completion_tokens || 0,
            },
            raw: fallbackData,
          };
        }
      }
      throw new Error(`${String(this.id).toUpperCase()} API error ${res.status}: ${errText}`);
    }

    const data = (await res.json()) as any;
    const choice = data.choices[0];
    const contentBlocks: ContentBlock[] = [];

    if (choice.message.content) {
      contentBlocks.push({ type: "text", text: choice.message.content });
    }

    if (choice.message.tool_calls) {
      for (const tc of choice.message.tool_calls) {
        contentBlocks.push({
          type: "tool_use",
          toolCall: {
            id: tc.id,
            name: tc.function.name,
            input: JSON.parse(tc.function.arguments || "{}"),
          },
        });
      }
    }

    let stopReason: ChatResponse["stopReason"] = "end_turn";
    if (choice.finish_reason === "tool_calls") stopReason = "tool_use";
    else if (choice.finish_reason === "length") stopReason = "max_tokens";

    return {
      content: contentBlocks,
      stopReason,
      usage: {
        inputTokens: data.usage?.prompt_tokens || 0,
        outputTokens: data.usage?.completion_tokens || 0,
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
