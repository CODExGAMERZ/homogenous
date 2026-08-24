import assert from "node:assert";
import test from "node:test";
import { ProviderRegistry } from "../../src/inference/ProviderRegistry.js";
import { KeychainService } from "../../src/inference/keychain.js";
import { AutocompleteEngine } from "../../src/cli/slash/AutocompleteEngine.js";
import { SlashCommandRegistry } from "../../src/cli/slash/SlashCommandRegistry.js";
import { MockProvider } from "../../src/inference/providers/MockProvider.js";
import { ConfigResolver } from "../../src/config/ConfigResolver.js";

const testCtx: any = {
  provider: new MockProvider(),
  model: "demo-mode",
  setModel: function (m: string) {
    this.model = m;
  },
  setProvider: function (p: any) {
    this.provider = p;
  },
  workspacePath: process.cwd(),
};

const cloudKeys = [
  "ANTHROPIC_API_KEY",
  "OPENAI_API_KEY",
  "GROQ_API_KEY",
  "NVIDIA_API_KEY",
  "DEEPSEEK_API_KEY",
  "OPENROUTER_API_KEY",
  "MISTRAL_API_KEY",
  "TOGETHER_API_KEY",
];

function clearAllKeys(): Record<string, string | undefined> {
  const saved: Record<string, string | undefined> = {};
  for (const k of cloudKeys) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
  ConfigResolver.getInstance().loadConfig({ apiKeys: {} });
  ProviderRegistry.getInstance().invalidateModelCache();
  AutocompleteEngine.getInstance().invalidateCache();
  return saved;
}

function restoreKeys(saved: Record<string, string | undefined>): void {
  for (const k of cloudKeys) {
    if (saved[k]) process.env[k] = saved[k];
    else delete process.env[k];
  }
  ConfigResolver.getInstance().loadConfig();
  ProviderRegistry.getInstance().invalidateModelCache();
  AutocompleteEngine.getInstance().invalidateCache();
}

const originalFetch = globalThis.fetch;

function setupMockFetch(): void {
  globalThis.fetch = (async (url: any) => {
    const urlStr = url.toString();

    if (urlStr.includes("groq.com/openai/v1/models")) {
      return {
        ok: true,
        status: 200,
        statusText: "OK",
        json: async () => ({
          data: [
            { id: "llama-3.3-70b-versatile", active: true },
            { id: "llama-3.1-8b-instant", active: true },
            { id: "whisper-large-v3", active: true },
          ],
        }),
      };
    }

    if (urlStr.includes("api.mistral.ai/v1/models")) {
      return {
        ok: true,
        status: 200,
        statusText: "OK",
        json: async () => ({
          data: [
            { id: "mistral-large-latest" },
            { id: "codestral-latest" },
            { id: "mistral-embed" },
          ],
        }),
      };
    }

    if (urlStr.includes("api.openai.com/v1/models") || urlStr.includes("/v1/models")) {
      return {
        ok: true,
        status: 200,
        statusText: "OK",
        json: async () => ({
          data: [
            { id: "gpt-4o" },
            { id: "gpt-4o-mini" },
            { id: "text-embedding-3-small" },
          ],
        }),
      };
    }

    if (urlStr.includes("api.anthropic.com/v1/models")) {
      return {
        ok: true,
        status: 200,
        statusText: "OK",
        json: async () => ({
          data: [
            { id: "claude-3-7-sonnet-20250219" },
            { id: "claude-3-5-sonnet-20241022" },
          ],
        }),
      };
    }

    return {
      ok: false,
      status: 500,
      statusText: "Server Error",
      json: async () => ({ error: "Connection error" }),
    };
  }) as any;
}

function teardownMockFetch(): void {
  globalThis.fetch = originalFetch;
}

test("Zero-Key Invisibility: getActiveModels returns no cloud models when no API keys are configured", async () => {
  const saved = clearAllKeys();
  const registry = ProviderRegistry.getInstance();

  const originalGetApiKey = KeychainService.getApiKey;
  KeychainService.getApiKey = () => undefined;

  const activeModels = await registry.getActiveModels(true);
  const cloudActive = activeModels.filter(
    (m) => m.providerId !== "ollama" && m.providerId !== "lmstudio" && m.providerId !== "mock"
  );

  assert.strictEqual(
    cloudActive.length,
    0,
    "Expected 0 cloud models when no API keys are configured"
  );

  KeychainService.getApiKey = originalGetApiKey;
  restoreKeys(saved);
});

test("Autocomplete Zero-Key Invisibility: /model suggestions are empty when no keys exist", () => {
  const saved = clearAllKeys();
  const engine = AutocompleteEngine.getInstance();

  const originalGetApiKey = KeychainService.getApiKey;
  KeychainService.getApiKey = () => undefined;

  const suggestions = engine.getSuggestions("/model ");
  const cloudSuggestions = suggestions.filter(
    (s) =>
      !s.value.includes("ollama/") &&
      !s.value.includes("lmstudio/") &&
      !s.value.includes("mock/")
  );

  assert.strictEqual(
    cloudSuggestions.length,
    0,
    "Expected 0 cloud model autocomplete suggestions without API keys"
  );

  KeychainService.getApiKey = originalGetApiKey;
  restoreKeys(saved);
});

test("Slash Command /model displays zero-key guidance and /login instructions when no keys are configured", async () => {
  const saved = clearAllKeys();
  const slashRegistry = SlashCommandRegistry.getInstance();

  const originalGetApiKey = KeychainService.getApiKey;
  KeychainService.getApiKey = () => undefined;

  const res = await slashRegistry.dispatch("/model", testCtx);
  assert.ok(res?.output);

  assert.ok(res.output.includes("No active API keys") || res.output.includes("Demo Mode"));
  assert.ok(res.output.includes("/login anthropic"));
  assert.ok(res.output.includes("/login openai"));
  assert.ok(res.output.includes("/login groq"));

  KeychainService.getApiKey = originalGetApiKey;
  restoreKeys(saved);
});

test("Key-Scoped Discovery: only models returned on configured key are visible and non-chat models filtered", async () => {
  setupMockFetch();
  const saved = clearAllKeys();

  process.env.GROQ_API_KEY = "gsk_test_mock_key";

  const registry = ProviderRegistry.getInstance();
  const engine = AutocompleteEngine.getInstance();
  registry.invalidateModelCache();
  engine.invalidateCache();

  const activeModels = await registry.getActiveModels(true);
  const groqModels = activeModels.filter((m) => m.providerId === "groq");

  // Should have 2 models: llama-3.3-70b-versatile and llama-3.1-8b-instant, with whisper filtered out
  assert.strictEqual(groqModels.length, 2);
  assert.strictEqual(groqModels[0].id, "groq/llama-3.3-70b-versatile");
  assert.strictEqual(groqModels[1].id, "groq/llama-3.1-8b-instant");
  assert.strictEqual(groqModels.some((m) => m.id.includes("whisper")), false);

  teardownMockFetch();
  restoreKeys(saved);
});

test("Dynamic /login and /logout lifecycle invalidates caches and updates visible models", async () => {
  setupMockFetch();
  const saved = clearAllKeys();

  const slashRegistry = SlashCommandRegistry.getInstance();
  const registry = ProviderRegistry.getInstance();
  const testKey = "test-live-mistral-key-12345";

  // 1. Run /login mistral <key>
  const loginRes = await slashRegistry.dispatch(`/login mistral ${testKey}`, testCtx);
  assert.ok(loginRes?.output.includes("Successfully saved and registered API key for 'mistral'"));
  assert.strictEqual(KeychainService.getApiKey("mistral"), testKey);

  // 2. Verify mistral chat models are in active models (embedding filtered out)
  const activeAfterLogin = await registry.getActiveModels(true);
  const mistralModels = activeAfterLogin.filter((m) => m.providerId === "mistral");
  assert.strictEqual(mistralModels.length, 2);
  assert.strictEqual(mistralModels[0].id, "mistral/mistral-large-latest");
  assert.strictEqual(mistralModels[1].id, "mistral/codestral-latest");

  // 3. Run /logout mistral
  const logoutRes = await slashRegistry.dispatch("/logout mistral", testCtx);
  assert.ok(logoutRes?.output.includes("Successfully unregistered"));
  assert.strictEqual(KeychainService.getApiKey("mistral"), undefined);

  // 4. Verify mistral models are immediately removed
  const activeAfterLogout = await registry.getActiveModels(true);
  assert.strictEqual(activeAfterLogout.some((m) => m.providerId === "mistral"), false);

  teardownMockFetch();
  restoreKeys(saved);
});
