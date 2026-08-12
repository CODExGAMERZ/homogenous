import assert from "node:assert";
import test from "node:test";
import { ProviderRegistry, FREE_TIER_TASKS } from "../../src/inference/ProviderRegistry.js";

test("ProviderRegistry initializes all 11 providers", () => {
  const registry = ProviderRegistry.getInstance();
  assert.ok(registry.getProvider("anthropic"));
  assert.ok(registry.getProvider("openai"));
  assert.ok(registry.getProvider("groq"));
  assert.ok(registry.getProvider("nvidia"));
  assert.ok(registry.getProvider("deepseek"));
  assert.ok(registry.getProvider("openrouter"));
  assert.ok(registry.getProvider("mistral"));
  assert.ok(registry.getProvider("together"));
  assert.ok(registry.getProvider("ollama"));
  assert.ok(registry.getProvider("lmstudio"));
  assert.ok(registry.getProvider("mock"));
});

test("FREE_TIER_TASKS list contains fileSearch, lintSummary, compaction, embedding", () => {
  assert.ok(FREE_TIER_TASKS.includes("fileSearch"));
  assert.ok(FREE_TIER_TASKS.includes("lintSummary"));
  assert.ok(FREE_TIER_TASKS.includes("compaction"));
  assert.ok(FREE_TIER_TASKS.includes("embedding"));
});

test("Regression: Anthropic, OpenAI, and Groq behave identically post-refactor", () => {
  const registry = ProviderRegistry.getInstance();

  const anthropic = registry.getProvider("anthropic");
  assert.strictEqual(anthropic?.id, "anthropic");

  const openai = registry.getProvider("openai");
  assert.strictEqual(openai?.id, "openai");

  const groq = registry.getProvider("groq");
  assert.strictEqual(groq?.id, "groq");

  process.env.ANTHROPIC_API_KEY = "sk-ant-regression-test";
  process.env.OPENAI_API_KEY = "sk-proj-regression-test";
  process.env.GROQ_API_KEY = "gsk_regression-test";

  assert.strictEqual((anthropic as any).getClient?.().apiKey || (anthropic as any).getApiKey?.(), "sk-ant-regression-test");
  assert.strictEqual((openai as any).getApiKey(), "sk-proj-regression-test");
  assert.strictEqual((groq as any).getApiKey(), "gsk_regression-test");

  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.OPENAI_API_KEY;
  delete process.env.GROQ_API_KEY;
});

test("OpenAIProvider convertMessages correctly serializes assistant tool_use and multi-tool results", () => {
  const registry = ProviderRegistry.getInstance();
  const openai = registry.getProvider("openai") as any;

  const messages = [
    { role: "user", content: "Inspect codebase" },
    {
      role: "assistant",
      content: [
        { type: "text", text: "I will read two files." },
        {
          type: "tool_use",
          toolCall: {
            id: "call_1",
            name: "read_file",
            input: { path: "a.ts" },
          },
        },
        {
          type: "tool_use",
          toolCall: {
            id: "call_2",
            name: "read_file",
            input: { path: "b.ts" },
          },
        },
      ],
    },
    {
      role: "user",
      content: [
        {
          type: "tool_result",
          toolCallId: "call_1",
          content: "file a content",
        },
        {
          type: "tool_result",
          toolCallId: "call_2",
          content: "file b content",
        },
      ],
    },
  ];

  const converted = openai.convertMessages(messages);

  assert.strictEqual(converted.length, 4);
  assert.strictEqual(converted[0].role, "user");
  assert.strictEqual(converted[1].role, "assistant");
  assert.ok(converted[1].tool_calls);
  assert.strictEqual(converted[1].tool_calls.length, 2);
  assert.strictEqual(converted[1].tool_calls[0].id, "call_1");
  assert.strictEqual(converted[1].tool_calls[1].id, "call_2");

  assert.strictEqual(converted[2].role, "tool");
  assert.strictEqual(converted[2].tool_call_id, "call_1");
  assert.strictEqual(converted[2].content, "file a content");

  assert.strictEqual(converted[3].role, "tool");
  assert.strictEqual(converted[3].tool_call_id, "call_2");
  assert.strictEqual(converted[3].content, "file b content");
});

