import assert from "node:assert";
import test from "node:test";
import { isSensitiveSecurityPath } from "../../src/platform/paths.js";
import { ReadFileTool, WriteFileTool, ReplaceFileContentTool } from "../../src/agent/tools/fileTools.js";
import { GrepSearchTool, GlobFilesTool } from "../../src/agent/tools/searchTools.js";
import { scrubSensitiveTokens } from "../../src/agent/AgentLoop.js";
import { PersistentMemory } from "../../src/memory/PersistentMemory.js";
import { KeychainService } from "../../src/inference/keychain.js";

test("Security Leak Prevention: isSensitiveSecurityPath identifies credential vaults and private keys", () => {
  assert.strictEqual(isSensitiveSecurityPath(".homogenous/keys.json"), true);
  assert.strictEqual(isSensitiveSecurityPath("C:/Users/test/.homogenous/keys.json"), true);
  assert.strictEqual(isSensitiveSecurityPath(".ssh/id_rsa"), true);
  assert.strictEqual(isSensitiveSecurityPath(".ssh/id_ed25519"), true);
  assert.strictEqual(isSensitiveSecurityPath("C:/Users/test/.ssh/my_private.key"), true);
  assert.strictEqual(isSensitiveSecurityPath(".aws/credentials"), true);
  assert.strictEqual(isSensitiveSecurityPath(".aws/config"), true);
  assert.strictEqual(isSensitiveSecurityPath(".git-credentials"), true);
  assert.strictEqual(isSensitiveSecurityPath(".netrc"), true);
  assert.strictEqual(isSensitiveSecurityPath(".env"), true);
  assert.strictEqual(isSensitiveSecurityPath(".env.local"), true);
  assert.strictEqual(isSensitiveSecurityPath(".env.production"), true);
  assert.strictEqual(isSensitiveSecurityPath("subfolder/.env"), true);
  assert.strictEqual(isSensitiveSecurityPath("/etc/shadow"), true);
  assert.strictEqual(isSensitiveSecurityPath("/etc/sudoers"), true);
  assert.strictEqual(isSensitiveSecurityPath("certs/server.pem"), true);
  assert.strictEqual(isSensitiveSecurityPath("secrets/auth.pfx"), true);

  // Safe files must pass
  assert.strictEqual(isSensitiveSecurityPath("src/index.ts"), false);
  assert.strictEqual(isSensitiveSecurityPath("README.md"), false);
  assert.strictEqual(isSensitiveSecurityPath(".env.example"), false);
  assert.strictEqual(isSensitiveSecurityPath(".env.sample"), false);
  assert.strictEqual(isSensitiveSecurityPath(".ssh/id_rsa.pub"), false);
  assert.strictEqual(isSensitiveSecurityPath("package.json"), false);
});

test("Security Leak Prevention: ReadFileTool and WriteFileTool block sensitive vault files", async () => {
  const readTool = new ReadFileTool();
  const writeTool = new WriteFileTool();
  const replaceTool = new ReplaceFileContentTool();

  const readRes = await readTool.execute({ path: ".homogenous/keys.json" });
  assert.strictEqual(readRes.ok, false);
  assert.strictEqual(readRes.isError, true);
  assert.match(readRes.content, /protected security credential\/vault path/i);

  const envReadRes = await readTool.execute({ path: ".env" });
  assert.strictEqual(envReadRes.ok, false);
  assert.strictEqual(envReadRes.isError, true);
  assert.match(envReadRes.content, /protected security credential\/vault path/i);

  const writeRes = await writeTool.execute({ path: ".ssh/id_rsa", content: "fake_key" });
  assert.strictEqual(writeRes.ok, false);
  assert.strictEqual(writeRes.isError, true);
  assert.match(writeRes.content, /restricted/i);

  const replaceRes = await replaceTool.execute({
    path: ".aws/credentials",
    targetContent: "a",
    replacementContent: "b",
  });
  assert.strictEqual(replaceRes.ok, false);
  assert.strictEqual(replaceRes.isError, true);
  assert.match(replaceRes.content, /restricted/i);
});

test("Security Leak Prevention: scrubSensitiveTokens redacts registered API keys and secret patterns", async () => {
  await KeychainService.setApiKey("groq", "gsk_test_secret_key_1234567890abcdef");

  const rawOutput = "Tool executed with key gsk_test_secret_key_1234567890abcdef, GitHub PAT github_pat_11AAAAAA0000000000000000000000000000000000000000000000000000000000, Slack xoxb-1234567890-1234567890-abcdef123456, and DB postgres://admin:super_secret_password_123@db.example.com:5432/prod";
  const scrubbed = scrubSensitiveTokens(rawOutput);

  assert.ok(!scrubbed.includes("gsk_test_secret_key_1234567890abcdef"));
  assert.ok(!scrubbed.includes("github_pat_11AAAAAA0000000000000000000000000000000000000000000000000000000000"));
  assert.ok(!scrubbed.includes("xoxb-1234567890-1234567890-abcdef123456"));
  assert.ok(!scrubbed.includes("super_secret_password_123"));
  assert.ok(scrubbed.includes("[REDACTED"));
  assert.ok(scrubbed.includes("[REDACTED_PASSWORD]"));
});

test("Security Leak Prevention: PersistentMemory redacts sensitive tokens from facts", () => {
  const memory = PersistentMemory.getInstance();
  const factWithKey = "The API key for production is sk-proj-12345678901234567890abcdef and DB postgres://user:pass12345678@localhost/db";
  const added = memory.addFact(factWithKey, "convention");

  assert.ok(!added.fact.includes("sk-proj-12345678901234567890abcdef"));
  assert.ok(!added.fact.includes("pass12345678"));
  assert.ok(added.fact.includes("[REDACTED]"));
});
