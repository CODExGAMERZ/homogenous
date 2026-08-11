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
