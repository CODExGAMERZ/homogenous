import assert from "node:assert";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { KeychainService } from "../../src/inference/keychain.js";
import { ConfigResolver } from "../../src/config/ConfigResolver.js";
import { ProviderRegistry } from "../../src/inference/ProviderRegistry.js";
import { UserStateService } from "../../src/platform/UserState.js";
import { SlashCommandRegistry } from "../../src/cli/slash/SlashCommandRegistry.js";
import { MockProvider } from "../../src/inference/providers/MockProvider.js";

const testTmpDir = path.join(os.tmpdir(), `homogenous-test-${Date.now()}`);

test("Setup temporary isolated test environment", () => {
  if (!fs.existsSync(testTmpDir)) {
    fs.mkdirSync(testTmpDir, { recursive: true });
  }
  process.env.HOMOGENOUS_HOME = testTmpDir;
});

test("API keys are securely persisted and reloaded across KeychainService and ConfigResolver", async () => {
  const testKey = "gsk_test_persistent_key_abcdef123456";
  const openaiKey = "sk-proj-test_persistent_openai_999";

  // 1. Save keys via KeychainService
  await KeychainService.setApiKey("groq", testKey);
  await KeychainService.setApiKey("openai", openaiKey);

  // 2. Verify KeychainService gets them synchronously
  assert.strictEqual(KeychainService.getApiKey("groq"), testKey);
  assert.strictEqual(KeychainService.getApiKey("openai"), openaiKey);

  // 3. Verify getStoredKeyMap has them
  const storedMap = KeychainService.getStoredKeyMap();
  assert.strictEqual(storedMap.groq, testKey);
  assert.strictEqual(storedMap.openai, openaiKey);

  // 4. Verify ConfigResolver merges the stored keys
  ConfigResolver.getInstance().loadConfig();
  const config = ConfigResolver.getInstance().getConfig();
  assert.strictEqual(config.apiKeys.groq, testKey);
  assert.strictEqual(config.apiKeys.openai, openaiKey);

  // 5. Verify listConfiguredProviders includes them
  const configured = KeychainService.listConfiguredProviders();
  assert.ok(configured.includes("groq"));
  assert.ok(configured.includes("openai"));
});

test("UserStateService persists and reloads lastUsed model, execution mode, and prompt history", () => {
  const userState = UserStateService.getInstance();

  // Test lastUsed
  userState.setLastUsed("groq", "llama-3.3-70b-versatile");
  const lastUsed = userState.getLastUsed();
  assert.strictEqual(lastUsed.provider, "groq");
  assert.strictEqual(lastUsed.model, "llama-3.3-70b-versatile");

  // Test execution mode
  userState.setExecutionMode("auto");
  assert.strictEqual(userState.getExecutionMode(), "auto");

  userState.setExecutionMode("plan");
  assert.strictEqual(userState.getExecutionMode(), "plan");

  // Test prompt history
  userState.clearHistory();
  userState.addPromptToHistory("first test command");
  userState.addPromptToHistory("second test command");
  // Duplicate adjacent should be ignored
  userState.addPromptToHistory("second test command");

  const history = userState.getPromptHistory();
  assert.strictEqual(history.length, 2);
  assert.strictEqual(history[0], "first test command");
  assert.strictEqual(history[1], "second test command");

  // Verify reload from disk
  const freshState = userState.getState(true);
  assert.strictEqual(freshState.lastUsedProvider, "groq");
  assert.strictEqual(freshState.lastUsedModel, "llama-3.3-70b-versatile");
  assert.strictEqual(freshState.executionMode, "plan");
  assert.strictEqual(freshState.promptHistory?.length, 2);
});

test("Slash /login and /logout commands manage credentials and UserState correctly", async () => {
  const slashRegistry = SlashCommandRegistry.getInstance();
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

  // 1. /login
  const loginRes = await slashRegistry.dispatch("/login mistral test-mistral-key-12345", testCtx);
  assert.ok(loginRes?.output.includes("Successfully saved and registered API key for 'mistral'"));
  assert.strictEqual(KeychainService.getApiKey("mistral"), "test-mistral-key-12345");

  // 2. /logout mistral
  const logoutRes = await slashRegistry.dispatch("/logout mistral", testCtx);
  assert.ok(logoutRes?.output.includes("Successfully unregistered"));
  assert.strictEqual(KeychainService.getApiKey("mistral"), undefined);

  // Other keys should still exist
  assert.strictEqual(KeychainService.getApiKey("groq"), "gsk_test_persistent_key_abcdef123456");

  // 3. /logout without args lists remaining
  const listRes = await slashRegistry.dispatch("/logout", testCtx);
  assert.ok(listRes?.output.includes("groq"));

  // 4. /logout all
  const logoutAllRes = await slashRegistry.dispatch("/logout all", testCtx);
  assert.ok(logoutAllRes?.output.includes("Successfully unregistered and removed all stored API keys"));
  assert.strictEqual(KeychainService.getApiKey("groq"), undefined);
  assert.strictEqual(KeychainService.getApiKey("openai"), undefined);
  assert.strictEqual(KeychainService.listConfiguredProviders().length, 0);
});

test("Cleanup test environment", () => {
  delete process.env.HOMOGENOUS_HOME;
  try {
    fs.rmSync(testTmpDir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup error
  }
});
