import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { ConfigResolver } from "../config/ConfigResolver.js";
import { ProviderRegistry } from "./ProviderRegistry.js";
import { getGlobalConfigDir, resolvePath } from "../platform/paths.js";

export type KeyProvider =
  | "anthropic"
  | "openai"
  | "groq"
  | "nvidia"
  | "deepseek"
  | "openrouter"
  | "mistral"
  | "together";

function getMachineEncryptionKey(): Buffer {
  let username = "";
  try {
    username = os.userInfo()?.username || "";
  } catch {
    username = "";
  }
  if (!username) {
    username = process.env.USERNAME || process.env.USER || "default-user";
  }
  const home = os.homedir();
  const hostname = os.hostname();
  const seed = `${hostname}-${username}-${home}-homogenous-vault-key-v1`;
  return crypto.createHash("sha256").update(seed).digest();
}

function encryptSecret(plaintext: string): string {
  if (!plaintext) return "";
  try {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", getMachineEncryptionKey(), iv);
    let encrypted = cipher.update(plaintext, "utf8", "hex");
    encrypted += cipher.final("hex");
    const tag = cipher.getAuthTag().toString("hex");
    return `enc:v1:${iv.toString("hex")}:${tag}:${encrypted}`;
  } catch {
    return plaintext;
  }
}

function decryptSecret(cipherText: string): string {
  if (!cipherText || !cipherText.startsWith("enc:v1:")) {
    return cipherText || "";
  }
  try {
    const parts = cipherText.split(":");
    const iv = Buffer.from(parts[2], "hex");
    const tag = Buffer.from(parts[3], "hex");
    const encrypted = parts[4];
    const decipher = crypto.createDecipheriv("aes-256-gcm", getMachineEncryptionKey(), iv);
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch {
    return "";
  }
}

function getKeysFilePath(): string {
  const dir = getGlobalConfigDir();
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch {
      // Non-fatal
    }
  }
  return resolvePath(dir, "keys.json");
}

let cachedStoredKeys: Record<string, string> | null = null;

function loadStoredKeys(forceReload = false): Record<string, string> {
  if (cachedStoredKeys && !forceReload) {
    return cachedStoredKeys;
  }
  const filePath = getKeysFilePath();
  if (fs.existsSync(filePath)) {
    try {
      const raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      const decrypted: Record<string, string> = {};
      for (const [k, v] of Object.entries(raw)) {
        if (typeof v === "string") {
          const dec = decryptSecret(v);
          if (dec) {
            decrypted[k] = dec;
          }
        }
      }
      cachedStoredKeys = decrypted;
      return cachedStoredKeys;
    } catch {
      cachedStoredKeys = {};
      return {};
    }
  }
  cachedStoredKeys = {};
  return {};
}

function saveStoredKeys(keys: Record<string, string>): void {
  cachedStoredKeys = { ...keys };
  const filePath = getKeysFilePath();
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch {
      // Non-fatal
    }
  }
  const encryptedPayload: Record<string, string> = {};
  for (const [k, v] of Object.entries(keys)) {
    if (v) {
      encryptedPayload[k] = encryptSecret(v);
    }
  }
  fs.writeFileSync(filePath, JSON.stringify(encryptedPayload, null, 2), { encoding: "utf-8", mode: 0o600 });
  try {
    fs.chmodSync(filePath, 0o600);
  } catch {
    // Ignore chmod errors on systems without POSIX permissions
  }
}

function cleanApiKey(rawKey: string | undefined): string | undefined {
  if (!rawKey) return undefined;
  const cleaned = rawKey.trim().replace(/^[<"'\s]+|[>"\s]+$/g, "");
  return cleaned.length > 0 ? cleaned : undefined;
}

/**
 * Keychain service for fetching and storing API credentials securely.
 * Integrates process.env, OS keytar (primary), local keys file (0600 fallback), and instant hot-reloading.
 */
export class KeychainService {
  private static keytarModule: any = null;
  private static keytarAttempted = false;

  private static async getKeytar(): Promise<any> {
    if (!this.keytarAttempted) {
      this.keytarAttempted = true;
      try {
        // Dynamic optional import for OS keychain integration
        // @ts-ignore
        this.keytarModule = await import("keytar");
      } catch {
        this.keytarModule = null;
      }
    }
    return this.keytarModule;
  }

  /**
   * Resolves the API key for a given provider.
   */
  public static async getApiKeyAsync(provider: KeyProvider): Promise<string | undefined> {
    // 1. Direct environment variables check
    const envVarName = `${provider.toUpperCase()}_API_KEY`;
    if (process.env[envVarName]) {
      return cleanApiKey(process.env[envVarName]);
    }

    // 2. Primary: OS Keychain (keytar) check
    try {
      const keytar = await this.getKeytar();
      if (keytar && keytar.getPassword) {
        const pass = await keytar.getPassword("homogenous", provider);
        if (pass) return cleanApiKey(pass);
      }
    } catch {
      // Fall through to file fallback
    }

    // 3. ConfigResolver check
    const config = ConfigResolver.getInstance().getConfig();
    const configKey = config.apiKeys?.[provider as keyof typeof config.apiKeys];
    if (configKey) return cleanApiKey(configKey);

    // 4. Stored user keys file fallback (0600 permission file)
    const stored = loadStoredKeys();
    if (stored[provider]) {
      return cleanApiKey(stored[provider]);
    }

    return undefined;
  }

  /**
   * Synchronous fallback wrapper for getApiKeyAsync.
   */
  public static getApiKey(provider: KeyProvider): string | undefined {
    const envVarName = `${provider.toUpperCase()}_API_KEY`;
    if (process.env[envVarName]) return cleanApiKey(process.env[envVarName]);

    const config = ConfigResolver.getInstance().getConfig();
    const configKey = config.apiKeys?.[provider as keyof typeof config.apiKeys];
    if (configKey) return cleanApiKey(configKey);

    const stored = loadStoredKeys();
    return cleanApiKey(stored[provider]);
  }

  /**
   * Securely saves an API key for a provider and hot-reloads active provider clients.
   */
  public static async setApiKey(provider: KeyProvider, apiKey: string): Promise<void> {
    const cleanedKey = cleanApiKey(apiKey) || apiKey.trim();
    const envVarName = `${provider.toUpperCase()}_API_KEY`;
    process.env[envVarName] = cleanedKey;

    // 1. Always persist to user-restricted 0600 file for instantaneous 0ms synchronous lookups
    const stored = loadStoredKeys(true);
    stored[provider] = cleanedKey;
    saveStoredKeys(stored);

    // 2. Also persist to OS Keychain via keytar when available
    try {
      const keytar = await this.getKeytar();
      if (keytar && keytar.setPassword) {
        await keytar.setPassword("homogenous", provider, cleanedKey);
      }
    } catch {
      // keytar optional fallback
    }

    // 3. Hot-reload provider instance in ProviderRegistry if active
    const registryProvider = ProviderRegistry.getInstance().getProvider(provider);
    if (registryProvider && "resetClient" in registryProvider && typeof (registryProvider as any).resetClient === "function") {
      (registryProvider as any).resetClient();
    }
  }

  /**
   * Unregisters and removes a stored API key permanently across OS keychain, files, and process memory.
   */
  public static async deleteApiKey(provider: KeyProvider): Promise<void> {
    const envVarName = `${provider.toUpperCase()}_API_KEY`;
    delete process.env[envVarName];

    // 1. Remove from local keys file
    const stored = loadStoredKeys(true);
    if (stored[provider]) {
      delete stored[provider];
      saveStoredKeys(stored);
    }

    // 2. Remove from keytar OS keychain
    try {
      const keytar = await this.getKeytar();
      if (keytar && keytar.deletePassword) {
        await keytar.deletePassword("homogenous", provider);
      }
    } catch {
      // Optional fallback
    }

    // 3. Reset client in registry if active
    const registryProvider = ProviderRegistry.getInstance().getProvider(provider);
    if (registryProvider && "resetClient" in registryProvider && typeof (registryProvider as any).resetClient === "function") {
      (registryProvider as any).resetClient();
    }
  }

  /**
   * Returns all currently stored API keys from the secure keys vault file.
   */
  public static getStoredKeyMap(): Record<string, string> {
    return { ...loadStoredKeys() };
  }

  /**
   * Lists all cloud providers that currently have configured API keys.
   */
  public static listConfiguredProviders(): KeyProvider[] {
    const cloudProviders: KeyProvider[] = [
      "anthropic",
      "openai",
      "groq",
      "nvidia",
      "deepseek",
      "openrouter",
      "mistral",
      "together",
    ];
    return cloudProviders.filter((p) => !!this.getApiKey(p));
  }
}
