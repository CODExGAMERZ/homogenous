export type Role = "system" | "user" | "assistant" | "tool";

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>; // JSON Schema
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export type ContentBlock =
  | { type: "text"; text: string }
  | { type: "tool_use"; toolCall: ToolCall }
  | {
      type: "tool_result";
      toolCallId: string;
      content: string;
      isError?: boolean;
    }
  | { type: "image"; mimeType: string; data: string }; // base64

export interface Message {
  role: Role;
  content: string | ContentBlock[];
  toolCallId?: string; // set when role === "tool"
}

export interface CacheHint {
  cacheableUpToIndex: number;
}

export interface ChatRequest {
  model: string;
  messages: Message[];
  tools?: ToolDefinition[];
  maxTokens: number;
  temperature?: number;
  cacheHint?: CacheHint;
  stopSequences?: string[];
}

export interface ChatResponse {
  content: ContentBlock[];
  stopReason: "end_turn" | "tool_use" | "max_tokens" | "stop_sequence";
  usage: {
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens?: number;
    cacheWriteTokens?: number;
  };
  raw?: unknown;
}

export interface StreamEvent {
  type:
    | "text_delta"
    | "tool_call_start"
    | "tool_call_delta"
    | "tool_call_end"
    | "message_stop";
  textDelta?: string;
  toolCall?: Partial<ToolCall>;
  usage?: ChatResponse["usage"];
}

export interface EmbedRequest {
  model: string;
  input: string[];
}

export interface EmbedResponse {
  embeddings: number[][];
  dimensions: number;
}

export interface ProviderCapabilities {
  supportsTools: boolean;
  supportsStreaming: boolean;
  supportsPromptCaching: boolean;
  supportsEmbeddings: boolean;
  isLocal: boolean;
  contextWindow: number;
}

export interface InferenceProvider {
  readonly id:
    | "anthropic"
    | "openai"
    | "groq"
    | "nvidia"
    | "deepseek"
    | "openrouter"
    | "mistral"
    | "together"
    | "ollama"
    | "lmstudio"
    | "mock";

  ping(): Promise<{ ok: boolean; models?: string[]; error?: string }>;

  chat(request: ChatRequest): Promise<ChatResponse>;

  stream(request: ChatRequest): AsyncIterable<StreamEvent>;

  embed(request: EmbedRequest): Promise<EmbedResponse>;

  countTokens(text: string, model: string): Promise<number>;

  capabilities(model: string): ProviderCapabilities;

  supportsTools(model: string): boolean;
}
