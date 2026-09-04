import assert from "node:assert";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { KeychainService, KeychainInternal } from "../../src/inference/keychain.js";
import { getGlobalConfigDir } from "../../src/platform/paths.js";

const testSandboxDir = path.join(os.tmpdir(), `homogenous-keychain-test-${Date.now()}-${process.pid}`);

test.before(() => {
  if (!fs.existsSync(testSandboxDir)) {
    fs.mkdirSync(testSandboxDir, { recursive: true });
  }
  process.env.HOMOGENOUS_HOME = testSandboxDir;
  KeychainService.clearMemoryCache();
});

test.after(() => {
  KeychainService.clearMemoryCache();
  try {
    fs.rmSync(testSandboxDir, { recursive: true, force: true });
  } catch {
    // Non-fatal
  }
});

test("Keychain Persistence: Test environment is completely isolated from user home", () => {
  const configDir = getGlobalConfigDir();
  const normalizedSandbox = testSandboxDir.replace(/\\/g, "/");
  assert.ok(configDir.toLowerCase().includes(normalizedSandbox.toLowerCase()));
  assert.ok(configDir.endsWith(".homogenous"));
});

test("Keychain Persistence: .vault_seed is created once and remains stable across memory clear", () => {
  KeychainService.clearMemoryCache();
  const seed1 = KeychainInternal.getMachineVaultSeed();
  assert.ok(seed1 instanceof Buffer);
  assert.strictEqual(seed1.length, 32);

  const seedPath = KeychainInternal.getVaultSeedFilePath();
  assert.ok(fs.existsSync(seedPath), ".vault_seed file must exist on disk");

  const rawSeedHex = fs.readFileSync(seedPath, "utf-8").trim();
  assert.strictEqual(rawSeedHex.length, 64, "Seed must be 64-character hex string");

  // Invalidate memory cache and re-read from disk
  KeychainService.clearMemoryCache();
  const seed2 = KeychainInternal.getMachineVaultSeed();
  assert.strictEqual(seed1.toString("hex"), seed2.toString("hex"), "Seed must be identical across reloads");
});

test("Keychain Persistence: Saved API keys remain readable across memory clears", async () => {
  KeychainService.clearMemoryCache();
  const testKey = "sk-test-permanent-vault-key-987654";
  await KeychainService.setApiKey("groq", testKey);

  // Read immediately from memory/cache
  assert.strictEqual(KeychainService.getApiKey("groq"), testKey);

  // Wipe memory cache to force reading and decrypting from disk
  KeychainService.clearMemoryCache();
  assert.strictEqual(KeychainService.getApiKey("groq"), testKey);

  const keysPath = KeychainInternal.getKeysFilePath();
  assert.ok(fs.existsSync(keysPath), "keys.json must exist");
  const rawDisk = JSON.parse(fs.readFileSync(keysPath, "utf-8"));
  assert.ok(rawDisk.groq.startsWith("enc:v1:"), "Stored key must be encrypted");
});

test("Keychain Persistence: Auto-migration seamlessly decrypts legacy keys and re-encrypts with .vault_seed", async () => {
  KeychainService.clearMemoryCache();

  // Create a legacy encrypted secret using historical hostname/username seed
  const legacyCandidates = KeychainInternal.getLegacyMachineKeyCandidates();
  assert.ok(legacyCandidates.length > 0, "Must have legacy candidates");
  const legacyKey = legacyCandidates[0];

  const plaintextSecret = "gsk_legacy_stored_api_key_554433";
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", legacyKey, iv);
  let encrypted = cipher.update(plaintextSecret, "utf8", "hex");
  encrypted += cipher.final("hex");
  const tag = cipher.getAuthTag().toString("hex");
  const legacyCiphertext = `enc:v1:${iv.toString("hex")}:${tag}:${encrypted}`;

  // Write directly to keys.json as if created by an older version of Homogenous
  const keysPath = KeychainInternal.getKeysFilePath();
  fs.writeFileSync(keysPath, JSON.stringify({ deepseek: legacyCiphertext }, null, 2), {
    encoding: "utf-8",
    mode: 0o600,
  });

  KeychainService.clearMemoryCache();

  // Fetching the key should detect legacy encryption, decrypt it, and auto-migrate
  const resolved = KeychainService.getApiKey("deepseek");
  assert.strictEqual(resolved, plaintextSecret, "Legacy ciphertext must be successfully decrypted");

  // Verify that keys.json on disk was re-encrypted with current .vault_seed
  const updatedDisk = JSON.parse(fs.readFileSync(keysPath, "utf-8"));
  const newCiphertext = updatedDisk.deepseek;
  assert.notStrictEqual(newCiphertext, legacyCiphertext, "Ciphertext must be re-encrypted");

  // Clear memory cache and verify it still decrypts with the permanent seed
  KeychainService.clearMemoryCache();
  const reloaded = KeychainService.getApiKey("deepseek");
  assert.strictEqual(reloaded, plaintextSecret, "Re-encrypted key must decrypt cleanly");

  await KeychainService.deleteApiKey("deepseek");
});

test("Keychain Persistence: Unknown/undecryptable ciphertexts are never wiped during saves", async () => {
  KeychainService.clearMemoryCache();

  const unknownCiphertext = "enc:v1:0123456789abcdef01234567:0123456789abcdef0123456789abcdef:deadbeef1234";
  const keysPath = KeychainInternal.getKeysFilePath();

  // Seed disk with an unknown ciphertext from an alien machine
  fs.writeFileSync(
    keysPath,
    JSON.stringify({ "foreign-provider": unknownCiphertext }, null, 2),
    { encoding: "utf-8", mode: 0o600 }
  );

  KeychainService.clearMemoryCache();

  // Save a new valid key
  await KeychainService.setApiKey("anthropic", "sk-ant-valid-key-112233");

  // Read raw disk file
  const onDisk = JSON.parse(fs.readFileSync(keysPath, "utf-8"));
  assert.ok(onDisk["foreign-provider"], "Foreign raw ciphertext must be preserved on disk");
  assert.strictEqual(onDisk["foreign-provider"], unknownCiphertext);
  assert.ok(onDisk.anthropic, "New key must be added");

  await KeychainService.deleteApiKey("anthropic");
});

test("Keychain Persistence: Automatic recovery from keys.bak.json if keys.json is corrupted or empty", async () => {
  KeychainService.clearMemoryCache();

  const primaryKey = "sk-valid-backup-recovery-key-778899";
  await KeychainService.setApiKey("openai", primaryKey);
  // Trigger a second save to ensure keys.bak.json is populated
  await KeychainService.setApiKey("mistral", "mistral-valid-test-key");

  const keysPath = KeychainInternal.getKeysFilePath();
  const backupPath = KeychainInternal.getBackupKeysFilePath();
  // Clear process.env so KeychainService must load and restore from disk
  delete process.env.OPENAI_API_KEY;
  delete process.env.MISTRAL_API_KEY;

  // Simulate catastrophic corruption or accidental wipe of keys.json to "{}"
  fs.writeFileSync(keysPath, "{}", { encoding: "utf-8" });

  KeychainService.clearMemoryCache();

  // KeychainService should automatically restore from keys.bak.json
  const restoredKey = KeychainService.getApiKey("openai");
  assert.strictEqual(restoredKey, primaryKey, "Key must be auto-recovered from keys.bak.json");

  // Primary file should be restored with recovered content
  const recoveredDisk = JSON.parse(fs.readFileSync(keysPath, "utf-8"));
  assert.ok(recoveredDisk.openai, "Primary keys.json must be restored from backup");

  await KeychainService.deleteApiKey("openai");
  await KeychainService.deleteApiKey("mistral");
});
