import { z } from "zod";

export const TaskRoutingSchema = z.object({
  fileSearch: z.string().default("ollama/qwen2.5-coder:3b"),
  lintSummary: z.string().default("ollama/qwen2.5-coder:3b"),
  compaction: z.string().default("groq/llama-3.1-8b-instant"),
  embedding: z.string().default("ollama/nomic-embed-text"),
  complexEdit: z.string().default("anthropic/claude-3-5-sonnet-20241022"),
  planning: z.string().default("anthropic/claude-3-5-sonnet-20241022"),
});

export type TaskRouting = z.infer<typeof TaskRoutingSchema>;

export const ApiKeysSchema = z.object({
  anthropic: z.string().optional(),
  openai: z.string().optional(),
  groq: z.string().optional(),
  nvidia: z.string().optional(),
  deepseek: z.string().optional(),
  openrouter: z.string().optional(),
  mistral: z.string().optional(),
  together: z.string().optional(),
});

export type ApiKeys = z.infer<typeof ApiKeysSchema>;

export const ToolRcSchema = z.object({
  defaultModel: z.string().default("anthropic/claude-3-5-sonnet-20241022"),
  maxSessionCostUSD: z.number().positive().optional(),
  compactionThreshold: z.number().min(0.1).max(0.95).default(0.7),
  keepRecentTurns: z.number().int().min(1).max(20).default(4),
  fullRewriteThreshold: z.number().min(0.1).max(0.9).default(0.4),
  toolOutputTokenCap: z.number().int().min(500).max(20000).default(4000),
  routing: TaskRoutingSchema.default({
    fileSearch: "ollama/qwen2.5-coder:3b",
    lintSummary: "ollama/qwen2.5-coder:3b",
    compaction: "groq/llama-3.1-8b-instant",
    embedding: "ollama/nomic-embed-text",
    complexEdit: "anthropic/claude-3-5-sonnet-20241022",
    planning: "anthropic/claude-3-5-sonnet-20241022",
  }),
  apiKeys: ApiKeysSchema.default({}),
  fallbackOrder: z
    .array(
      z.enum([
        "ollama",
        "lmstudio",
        "groq",
        "openai",
        "anthropic",
        "nvidia",
        "deepseek",
        "openrouter",
        "mistral",
        "together",
      ])
    )
    .default(["ollama", "lmstudio", "groq", "openai", "anthropic", "nvidia", "deepseek", "openrouter", "mistral", "together"]),
});

export type ToolRcConfig = z.infer<typeof ToolRcSchema>;
