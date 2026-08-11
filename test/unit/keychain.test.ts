import assert from "node:assert";
import test from "node:test";
import { KeychainService, type KeyProvider } from "../../src/inference/keychain.js";
import { ProviderRegistry } from "../../src/inference/ProviderRegistry.js";
import { ConfigResolver } from "../../src/config/ConfigResolver.js";

test("KeychainService resolves API keys for all 8 providers via environment variables", () => {
  const providers: KeyProvider[] = [
    "anthropic",
    "openai",
    "groq",
    "nvidia",
    "deepseek",
    "openrouter",
    "mistral",
    "together",
  ];

  for (const provider of providers) {
    const envVarName = `${provider.toUpperCase()}_API_KEY`;
    const dummyKey = `test-key-${provider}-123`;
    process.env[envVarName] = dummyKey;

    const resolvedKey = KeychainService.getApiKey(provider);
    assert.strictEqual(resolvedKey, dummyKey, `Key for ${provider} should match process.env[${envVarName}]`);

    delete process.env[envVarName];
  }
});

test("KeychainService resolves API keys for all providers via ConfigResolver", () => {
  const providers: KeyProvider[] = [
    "anthropic",
    "openai",
    "groq",
    "nvidia",
    "deepseek",
    "openrouter",
    "mistral",
    "together",
  ];

  const customApiKeys: Record<string, string> = {};
  for (const p of providers) {
    customApiKeys[p] = `cfg-key-${p}-456`;
  }

  ConfigResolver.getInstance().loadConfig({ apiKeys: customApiKeys });

  for (const provider of providers) {
    const key = KeychainService.getApiKey(provider);
    assert.strictEqual(key, `cfg-key-${provider}-456`, `Config key for ${provider} should match config`);
  }

  // Reset config
  ConfigResolver.getInstance().loadConfig({ apiKeys: {} });
});

test("OpenAIProvider subclasses resolve their respective provider API keys dynamically", () => {
  const registry = ProviderRegistry.getInstance();
  const testCases: Array<{ id: string; envVar: string }> = [
    { id: "openai", envVar: "OPENAI_API_KEY" },
    { id: "groq", envVar: "GROQ_API_KEY" },
    { id: "deepseek", envVar: "DEEPSEEK_API_KEY" },
    { id: "nvidia", envVar: "NVIDIA_API_KEY" },
    { id: "openrouter", envVar: "OPENROUTER_API_KEY" },
    { id: "mistral", envVar: "MISTRAL_API_KEY" },
    { id: "together", envVar: "TOGETHER_API_KEY" },
  ];

  for (const tc of testCases) {
    const p = registry.getProvider(tc.id);
    assert.ok(p, `Provider ${tc.id} should be registered`);

    const keyVal = `sk-${tc.id}-mock-key`;
    process.env[tc.envVar] = keyVal;

    const keyInUse = (p as any).getApiKey();
    assert.strictEqual(keyInUse, keyVal, `Provider ${tc.id} should use ${tc.envVar}`);

    delete process.env[tc.envVar];
  }
});
