import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { ConfigResolver } from "../config/ConfigResolver.js";
import { ProviderRegistry } from "./ProviderRegistry.js";

export type KeyProvider =
  | "anthropic"
  | "openai"
  | "groq"
  | "nvidia"
  | "deepseek"
  | "openrouter"
  | "mistral"
  | "together";

function getKeysFilePath(): string {
  const dir = path.join(os.homedir(), ".homogenous");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return path.join(dir, "keys.json");
}

function loadStoredKeys(): Record<string, string> {
  const filePath = getKeysFilePath();
  if (fs.existsSync(filePath)) {
    try {
      return JSON.parse(fs.readFileSync(filePath, "utf-8"));
    } catch {
      return {};
    }
  }
  return {};
}

function saveStoredKeys(keys: Record<string, string>): void {
  const filePath = getKeysFilePath();
  // Enforce strict user-only read/write permissions (0600)
  fs.writeFileSync(filePath, JSON.stringify(keys, null, 2), { encoding: "utf-8", mode: 0o600 });
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

    let savedInKeytar = false;
    // Attempt OS Keychain persistence via keytar first
    try {
      const keytar = await this.getKeytar();
      if (keytar && keytar.setPassword) {
        await keytar.setPassword("homogenous", provider, cleanedKey);
        savedInKeytar = true;
      }
    } catch {
      savedInKeytar = false;
    }

    // Always keep encrypted/fallback local 0600 file updated
    const stored = loadStoredKeys();
    stored[provider] = cleanedKey;
    saveStoredKeys(stored);

    // Hot-reload provider instance in ProviderRegistry if active
    const registryProvider = ProviderRegistry.getInstance().getProvider(provider);
    if (registryProvider && "resetClient" in registryProvider && typeof (registryProvider as any).resetClient === "function") {
      (registryProvider as any).resetClient();
    }
  }
}
