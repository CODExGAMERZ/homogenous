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
import { parseEmbeddedToolCalls } from "../toolParser.js";

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
      const models = data.data?.map((m) => m.id) || [
        "gpt-4o",
        "gpt-4o-mini",
        "o3-mini",
        "o1",
        "o1-mini",
        "chatgpt-4o-latest",
        "gpt-4-turbo",
      ];
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

  private convertMessages(messages: Message[]): any[] {
    const formatted: any[] = [];

    for (const m of messages) {
      if (typeof m.content === "string") {
        formatted.push({ role: m.role, content: m.content });
        continue;
      }

      if (Array.isArray(m.content)) {
        if (m.role === "assistant") {
          const textBlocks = m.content.filter((b) => b.type === "text").map((b) => (b as { text: string }).text);
          const toolUseBlocks = m.content.filter((b) => b.type === "tool_use") as Array<{ type: "tool_use"; toolCall: { id: string; name: string; input: Record<string, unknown> } }>;

          const textContent = textBlocks.join("\n");
          if (toolUseBlocks.length > 0) {
            formatted.push({
              role: "assistant",
              content: textContent || null,
              tool_calls: toolUseBlocks.map((tu) => ({
                id: tu.toolCall.id,
                type: "function",
                function: {
                  name: tu.toolCall.name,
                  arguments: typeof tu.toolCall.input === "string" ? tu.toolCall.input : JSON.stringify(tu.toolCall.input || {}),
                },
              })),
            });
          } else {
            formatted.push({ role: "assistant", content: textContent });
          }
        } else {
          // User or Tool result message block array
          const toolResults = m.content.filter((b) => b.type === "tool_result") as Array<{ type: "tool_result"; toolCallId: string; content: string; isError?: boolean }>;
          const textBlocks = m.content.filter((b) => b.type === "text").map((b) => (b as { text: string }).text);

          if (toolResults.length > 0) {
            for (const tr of toolResults) {
              formatted.push({
                role: "tool",
                tool_call_id: tr.toolCallId,
                content: tr.content,
              });
            }
          }

          if (textBlocks.length > 0) {
            formatted.push({ role: m.role, content: textBlocks.join("\n") });
          }
        }
      }
    }

    return formatted;
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

    let currentMaxTokens = request.maxTokens || 2048;
    const maxRetries = 3;
    let res: Response | undefined;
    let errText = "";

    const isReasoning = request.model?.startsWith("o1") || request.model?.startsWith("o3");

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const payload: Record<string, any> = {
        model: request.model || "gpt-4o",
        messages: formattedMsgs,
        tools: tools && tools.length > 0 ? tools : undefined,
        tool_choice: tools && tools.length > 0 ? "auto" : undefined,
      };

      if (isReasoning) {
        payload.max_completion_tokens = currentMaxTokens;
      } else {
        payload.max_tokens = currentMaxTokens;
        if (request.temperature !== undefined) {
          payload.temperature = request.temperature;
        }
      }

      res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok && (res.status === 429 || res.status === 413) && attempt < maxRetries) {
        const retryHeader = res.headers.get("retry-after");
        const errBody = await res.clone().text().catch(() => "");
        
        // If TPM or token budget is exceeded, reduce max_tokens and retry
        if (errBody.includes("TPM") || errBody.includes("tokens per minute") || errBody.includes("Limit") || res.status === 413) {
          currentMaxTokens = Math.max(512, Math.floor(currentMaxTokens / 2));
        }

        let delayMs = retryHeader ? parseFloat(retryHeader) * 1000 : 1500 * (attempt + 1);
        if (isNaN(delayMs) || delayMs <= 0) delayMs = 1500 * (attempt + 1);
        delayMs = Math.min(delayMs, 5000);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }

      break;
    }

    if (!res || !res.ok) {
      errText = res ? await res.text() : "Network error";
      if (res && res.status === 400 && errText.includes("tool_use_failed") && tools && tools.length > 0) {
        const fallbackPayload: Record<string, any> = {
          model: request.model || "gpt-4o",
          messages: formattedMsgs,
        };
        if (isReasoning) {
          fallbackPayload.max_completion_tokens = request.maxTokens || 4096;
        } else {
          fallbackPayload.max_tokens = request.maxTokens || 4096;
          if (request.temperature !== undefined) {
            fallbackPayload.temperature = request.temperature;
          }
        }

        const fallbackRes = await fetch(`${this.baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(fallbackPayload),
        });
        if (fallbackRes.ok) {
          const fallbackData = (await fallbackRes.json()) as any;
          const choice = fallbackData.choices?.[0];
          const contentBlocks: ContentBlock[] = [];
          if (choice?.message?.content) {
            contentBlocks.push({ type: "text", text: choice.message.content });
          }
          return {
            content: contentBlocks,
            stopReason: choice?.finish_reason === "length" ? "max_tokens" : "end_turn",
            usage: {
              inputTokens: fallbackData.usage?.prompt_tokens || 0,
              outputTokens: fallbackData.usage?.completion_tokens || 0,
            },
            raw: fallbackData,
          };
        }
      }
      throw new Error(`${String(this.id).toUpperCase()} API error ${res?.status || 500}: ${errText}`);
    }

    const data = (await res.json()) as any;
    if (!data.choices || data.choices.length === 0) {
      return {
        content: [{ type: "text", text: data.error?.message || "No response returned from model." }],
        stopReason: "end_turn",
        usage: {
          inputTokens: data.usage?.prompt_tokens || 0,
          outputTokens: data.usage?.completion_tokens || 0,
        },
        raw: data,
      };
    }

    const choice = data.choices[0];
    const contentBlocks: ContentBlock[] = [];

    const rawContent = choice.message?.content || "";

    if (choice.message?.tool_calls && choice.message.tool_calls.length > 0) {
      if (rawContent) {
        contentBlocks.push({ type: "text", text: rawContent });
      }

      for (const tc of choice.message.tool_calls) {
        let parsedInput: Record<string, unknown> = {};
        try {
          parsedInput = typeof tc.function.arguments === "string" ? JSON.parse(tc.function.arguments || "{}") : tc.function.arguments || {};
        } catch {
          parsedInput = { raw: tc.function.arguments };
        }

        contentBlocks.push({
          type: "tool_use",
          toolCall: {
            id: tc.id,
            name: tc.function.name,
            input: parsedInput,
          },
        });
      }
    } else if (rawContent) {
      // Fallback parser for open-weights models (like Llama 3.3 on NIM/vLLM) that output tool calls directly as JSON text
      const extracted = parseEmbeddedToolCalls(rawContent);
      if (extracted.toolCalls.length > 0) {
        if (extracted.remainingText) {
          contentBlocks.push({ type: "text", text: extracted.remainingText });
        }
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
        contentBlocks.push({ type: "text", text: rawContent });
      }
    }

    let stopReason: ChatResponse["stopReason"] = "end_turn";
    if (choice.finish_reason === "tool_calls" || contentBlocks.some((b) => b.type === "tool_use")) {
      stopReason = "tool_use";
    } else if (choice.finish_reason === "length") {
      stopReason = "max_tokens";
    }

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
