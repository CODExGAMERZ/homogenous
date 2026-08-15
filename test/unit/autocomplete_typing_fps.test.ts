import assert from "node:assert";
import test from "node:test";
import { AutocompleteEngine } from "../../src/cli/slash/AutocompleteEngine.js";
import { KeychainService } from "../../src/inference/keychain.js";

test("AutocompleteEngine supports fuzzy matching for slash commands", () => {
  const engine = AutocompleteEngine.getInstance();

  // Exact & prefix match
  const modeSuggestions = engine.getSuggestions("/mod");
  assert.ok(modeSuggestions.length > 0);
  assert.ok(modeSuggestions.some((s) => s.value.includes("/mode") || s.value.includes("/model")));

  // Fuzzy match: /clr -> /clear
  const clearSuggestions = engine.getSuggestions("/clr");
  assert.ok(clearSuggestions.length > 0);
  assert.ok(clearSuggestions.some((s) => s.value.includes("/clear")));

  // Fuzzy match: /hlp -> /help
  const helpSuggestions = engine.getSuggestions("/hlp");
  assert.ok(helpSuggestions.length > 0);
  assert.ok(helpSuggestions.some((s) => s.value.includes("/help")));
});

test("AutocompleteEngine provides rich subcommands for /theme, /mode, /diff, and /budget", () => {
  const engine = AutocompleteEngine.getInstance();

  // /theme subcommands
  const themeSuggestions = engine.getSuggestions("/theme ");
  assert.ok(themeSuggestions.length >= 5);
  assert.ok(themeSuggestions.some((s) => s.value === "/theme neon"));
  assert.ok(themeSuggestions.some((s) => s.value === "/theme cyberpunk"));
  assert.ok(themeSuggestions.some((s) => s.value === "/theme monokai"));

  // /mode subcommands
  const modeSuggestions = engine.getSuggestions("/mode ");
  assert.ok(modeSuggestions.some((s) => s.value === "/mode normal"));
  assert.ok(modeSuggestions.some((s) => s.value === "/mode auto"));
  assert.ok(modeSuggestions.some((s) => s.value === "/mode plan"));

  // /diff subcommands
  const diffSuggestions = engine.getSuggestions("/diff ");
  assert.ok(diffSuggestions.some((s) => s.value === "/diff undo"));

  // /budget subcommands
  const budgetSuggestions = engine.getSuggestions("/budget ");
  assert.ok(budgetSuggestions.some((s) => s.value === "/budget status"));
});

test("AutocompleteEngine provides dynamic file suggestions with @ prefix", () => {
  const engine = AutocompleteEngine.getInstance();

  // Suggest files starting with package or src
  const pkgSuggestions = engine.getFileSuggestions("package", process.cwd());
  assert.ok(pkgSuggestions.length > 0);
  assert.ok(pkgSuggestions.some((s) => s.display.includes("package.json")));

  const srcSuggestions = engine.getFileSuggestions("src", process.cwd());
  assert.ok(srcSuggestions.length > 0);
  assert.ok(srcSuggestions.some((s) => s.display.startsWith("src")));
});

test("KeychainService uses in-memory cache for 0ms retrieval latency", () => {
  process.env.GROQ_API_KEY = "gsk-fast-test-key-12345";
  const start = performance.now();
  for (let i = 0; i < 1000; i++) {
    KeychainService.getApiKey("groq");
  }
  const duration = performance.now() - start;
  assert.ok(duration < 50, `1000 key lookups took ${duration}ms, expected under 50ms`);
  delete process.env.GROQ_API_KEY;
});

test("AutocompleteEngine sorts model suggestions from highest parameters to lowest", () => {
  const engine = AutocompleteEngine.getInstance();
  process.env.NVIDIA_API_KEY = "nvapi-test-key";
  process.env.GROQ_API_KEY = "gsk-test-key";
  engine.invalidateCache();

  const modelSuggestions = engine.getSuggestions("/model ");
  assert.ok(modelSuggestions.length > 0);

  // First item should be the highest parameter frontier model (671B DeepSeek, 550B Nemotron, 405B Llama, etc.)
  const first = modelSuggestions[0];
  assert.ok(first.value.includes("deepseek") || first.value.includes("550b") || first.value.includes("405b") || first.value.includes("340b"));

  delete process.env.NVIDIA_API_KEY;
  delete process.env.GROQ_API_KEY;
  engine.invalidateCache();
});

test("KeychainService persists BYOK keys permanently until unregistered", async () => {
  const provider = "mistral";
  const testKey = "test-mistral-byok-secret-key-999";

  // 1. Set key
  await KeychainService.setApiKey(provider, testKey);
  assert.strictEqual(KeychainService.getApiKey(provider), testKey);

  // 2. Verify deletion / unregister
  await KeychainService.deleteApiKey(provider);
  assert.strictEqual(KeychainService.getApiKey(provider), undefined);
});
