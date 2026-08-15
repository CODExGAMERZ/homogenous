import fs from "node:fs";
import path from "node:path";
import type { SlashCommand } from "../SlashCommand.js";
import { ConfigResolver } from "../../../config/ConfigResolver.js";
import { KeychainService, type KeyProvider } from "../../../inference/keychain.js";
import { ProviderRegistry } from "../../../inference/ProviderRegistry.js";
import { resolvePath, getProjectMemoryDir } from "../../../platform/paths.js";

export const metaCommands: SlashCommand[] = [
  {
    name: "config",
    description: "Display merged .toolrc.yaml configuration (credentials safely masked)",
    category: "config",
    execute: async () => {
      const config = ConfigResolver.getInstance().getConfig();
      const sanitized = JSON.parse(JSON.stringify(config));
      if (sanitized.apiKeys && typeof sanitized.apiKeys === "object") {
        for (const k of Object.keys(sanitized.apiKeys)) {
          if (sanitized.apiKeys[k]) {
            sanitized.apiKeys[k] = "●●●●●●●● (REDACTED)";
          }
        }
      }
      return { output: `Merged Configuration:\n${JSON.stringify(sanitized, null, 2)}` };
    },
  },
  {
    name: "login",
    description: "Set and save API key credential for provider (persisted until unregistered)",
    category: "config",
    usage: "/login [anthropic|openai|groq|nvidia|deepseek|openrouter|mistral|together] [api-key]",
    execute: async (args, ctx) => {
      const providerStr = args[0]?.toLowerCase() as KeyProvider;
      const key = args[1];

      const validProviders = ["anthropic", "openai", "groq", "nvidia", "deepseek", "openrouter", "mistral", "together"];

      if (!providerStr || !validProviders.includes(providerStr)) {
        return { output: `Usage: /login [${validProviders.join("|")}] [api-key]` };
      }

      if (!key) {
        return { output: `Please provide an API key. Usage: /login ${providerStr} <your-api-key>` };
      }

      // Persist key to OS Keychain and ~/.homogenous/keys.json immediately (Bring Your Own Key architecture)
      await KeychainService.setApiKey(providerStr, key);
      ConfigResolver.getInstance().loadConfig();

      try {
        const { AutocompleteEngine } = await import("../AutocompleteEngine.js");
        AutocompleteEngine.getInstance().invalidateCache();
      } catch {
        // Ignore
      }

      // Optional health ping check
      const registryProvider = ProviderRegistry.getInstance().getProvider(providerStr);
      const pingTarget = registryProvider || ctx.provider;
      let pingMsg = "";
      try {
        const pingResult = await pingTarget.ping();
        if (pingResult.ok) {
          pingMsg = " (Live connection verified ✓)";
        } else if (pingResult.error) {
          pingMsg = ` (Note: Ping test notice: ${pingResult.error})`;
        }
      } catch {
        // Ping error is non-fatal for persistent storage
      }

      // Auto-switch active session provider and compatible default model
      const defaultModels: Record<string, string> = {
        nvidia: "meta/llama-3.3-70b-instruct",
        groq: "llama-3.3-70b-versatile",
        anthropic: "claude-3-5-sonnet-20241022",
        openai: "gpt-4o",
        deepseek: "deepseek-chat",
        mistral: "mistral-large-latest",
        together: "meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo",
        openrouter: "anthropic/claude-3.5-sonnet",
      };
      const nextModel = defaultModels[providerStr] || "gpt-4o";

      if (registryProvider && ctx.setProvider) {
        ctx.setProvider(registryProvider);
      }
      if (ctx.setModel) {
        ctx.setModel(nextModel);
      }

      return {
        output: `✓ Successfully saved and registered API key for '${providerStr}'!${pingMsg}\n✦ Switched active provider to ${providerStr} (Model: ${nextModel})\nKey is permanently stored until you unregister it via '/logout ${providerStr}'.`,
      };
    },
  },
  {
    name: "logout",
    description: "Unregister and permanently delete a stored provider API key",
    category: "config",
    usage: "/logout [provider] or /unregister [provider]",
    execute: async (args) => {
      const providerStr = args[0]?.toLowerCase() as KeyProvider;
      const validProviders = ["anthropic", "openai", "groq", "nvidia", "deepseek", "openrouter", "mistral", "together"];

      if (!providerStr || !validProviders.includes(providerStr)) {
        return { output: `Usage: /logout [${validProviders.join("|")}]` };
      }

      await KeychainService.deleteApiKey(providerStr);
      ConfigResolver.getInstance().loadConfig();

      try {
        const { AutocompleteEngine } = await import("../AutocompleteEngine.js");
        AutocompleteEngine.getInstance().invalidateCache();
      } catch {
        // Ignore
      }

      return {
        output: `✓ Successfully unregistered and removed API key for '${providerStr}'.`,
      };
    },
  },
  {
    name: "unregister",
    description: "Alias for /logout: unregister and permanently delete a stored provider API key",
    category: "config",
    usage: "/unregister [provider]",
    execute: async (args) => {
      const providerStr = args[0]?.toLowerCase() as KeyProvider;
      const validProviders = ["anthropic", "openai", "groq", "nvidia", "deepseek", "openrouter", "mistral", "together"];

      if (!providerStr || !validProviders.includes(providerStr)) {
        return { output: `Usage: /unregister [${validProviders.join("|")}]` };
      }

      await KeychainService.deleteApiKey(providerStr);
      ConfigResolver.getInstance().loadConfig();

      try {
        const { AutocompleteEngine } = await import("../AutocompleteEngine.js");
        AutocompleteEngine.getInstance().invalidateCache();
      } catch {
        // Ignore
      }

      return {
        output: `✓ Successfully unregistered and removed API key for '${providerStr}'.`,
      };
    },
  },
  {
    name: "init",
    description: "Scaffold project configuration (.toolrc.yaml) and .agentmemory/ directory",
    category: "config",
    execute: async (_, ctx) => {
      const targetDir = ctx.workspacePath || process.cwd();
      const toolrcPath = path.join(targetDir, ".toolrc.yaml");
      const memoryDir = getProjectMemoryDir(targetDir);

      let createdAny = false;

      if (!fs.existsSync(toolrcPath)) {
        const exampleToolrc = `# Homogenous CLI Project Configuration
version: "1.0"
routing:
  fileSearch: groq/llama-3.1-8b-instant
  lintSummary: groq/llama-3.1-8b-instant
  compaction: groq/llama-3.1-8b-instant
  embedding: ollama/nomic-embed-text
  complexEdit: anthropic/claude-3-5-sonnet-20241022
  planning: anthropic/claude-3-5-sonnet-20241022
`;
        fs.writeFileSync(toolrcPath, exampleToolrc, "utf-8");
        createdAny = true;
      }

      if (!fs.existsSync(memoryDir)) {
        fs.mkdirSync(resolvePath(memoryDir, "sessions"), { recursive: true });
        const factsPath = resolvePath(memoryDir, "facts.json");
        if (!fs.existsSync(factsPath)) {
          fs.writeFileSync(factsPath, JSON.stringify([], null, 2), "utf-8");
        }
        createdAny = true;
      }

      return {
        output: createdAny
          ? `✓ Initialized project scaffold at ${targetDir} (.toolrc.yaml, .agentmemory/)`
          : `Project already initialized at ${targetDir}`,
      };
    },
  },
];
