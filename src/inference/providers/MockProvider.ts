import type {
  InferenceProvider,
  ChatRequest,
  ChatResponse,
  StreamEvent,
  EmbedRequest,
  EmbedResponse,
  ProviderCapabilities,
} from "../InferenceProvider.js";

export class MockProvider implements InferenceProvider {
  readonly id = "mock" as const;

  async ping(): Promise<{ ok: boolean; models?: string[]; error?: string }> {
    return { ok: true, models: ["demo-model"] };
  }

  capabilities(_model: string): ProviderCapabilities {
    return {
      supportsTools: true,
      supportsStreaming: true,
      supportsPromptCaching: true,
      supportsEmbeddings: true,
      isLocal: true,
      contextWindow: 200000,
    };
  }

  supportsTools(_model: string): boolean {
    return true;
  }

  async countTokens(text: string): Promise<number> {
    return Math.ceil(text.length / 4);
  }

  async embed(_request: EmbedRequest): Promise<EmbedResponse> {
    return {
      embeddings: [[0.1, 0.2, 0.3]],
      dimensions: 3,
    };
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const lastUserMsg = request.messages.filter((m) => m.role === "user").pop();
    const promptText = typeof lastUserMsg?.content === "string" 
      ? lastUserMsg.content 
      : Array.isArray(lastUserMsg?.content)
      ? JSON.stringify(lastUserMsg.content)
      : "Hello";

    // Support simulated tool invocation if plan execution test requests file write
    const hasToolResults = request.messages.some(m => m.role === "user" && Array.isArray(m.content) && m.content.some(b => b.type === "tool_result"));
    if (request.tools && request.tools.some(t => t.name === "write_file") && promptText.includes("test_apply_plan.txt") && !hasToolResults) {
      const match = promptText.match(/(?:write|create)\s+([^\s\n]+\.txt)/i) || [null, "test_apply_plan.txt"];
      const filePath = match[1];
      return {
        content: [
          {
            type: "tool_use",
            toolCall: {
              id: "mock_tool_call_1",
              name: "write_file",
              input: {
                path: filePath,
                content: "Applied plan content created by AgentLoop",
              },
            },
          },
        ],
        stopReason: "tool_use",
        usage: { inputTokens: 100, outputTokens: 50 },
      };
    }

    return {
      content: [
        {
          type: "text",
          text: `[Demo Mode Output]\nReceived your query: "${promptText}". Homogenous CLI is fully functional! To execute real LLM inference, set your ANTHROPIC_API_KEY, OPENAI_API_KEY, GROQ_API_KEY, or run local Ollama ('ollama serve').`,
        },
      ],
      stopReason: "end_turn",
      usage: {
        inputTokens: 120,
        outputTokens: 45,
      },
    };
  }

  async *stream(request: ChatRequest): AsyncIterable<StreamEvent> {
    const response = await this.chat(request);
    const text = (response.content[0] as { text: string }).text;
    const words = text.split(" ");

    for (const word of words) {
      yield { type: "text_delta", textDelta: `${word} ` };
      await new Promise((r) => setTimeout(r, 40));
    }

    yield { type: "message_stop", usage: response.usage };
  }
}
