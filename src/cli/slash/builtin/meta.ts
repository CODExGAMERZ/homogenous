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
    description: "Display merged .toolrc.yaml configuration",
    category: "config",
    execute: async () => {
      const config = ConfigResolver.getInstance().getConfig();
      return { output: `Merged Configuration:\n${JSON.stringify(config, null, 2)}` };
    },
  },
  {
    name: "login",
    description: "Set and validate API key credential for provider mid-session",
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

      // Temporarily set key in process.env to ping test provider
      const envVarName = `${providerStr.toUpperCase()}_API_KEY`;
      const prevKey = process.env[envVarName];
      process.env[envVarName] = key;

      const registryProvider = ProviderRegistry.getInstance().getProvider(providerStr);
      if (registryProvider && "resetClient" in registryProvider && typeof (registryProvider as any).resetClient === "function") {
        (registryProvider as any).resetClient();
      }

      const pingTarget = registryProvider || ctx.provider;
      const pingResult = await pingTarget.ping();

      if (!pingResult.ok) {
        // Restore previous key state if validation fails
        if (prevKey) process.env[envVarName] = prevKey;
        else delete process.env[envVarName];

        return {
          output: `✗ Key validation failed for provider '${providerStr}': ${
            pingResult.error || "Invalid API key or network error."
          }`,
        };
      }

      // Key validated successfully -> persist via KeychainService and hot-reload
      await KeychainService.setApiKey(providerStr, key);
      ConfigResolver.getInstance().loadConfig();

      return {
        output: `✓ Successfully validated and saved API key for '${providerStr}'! Credentials persisted and hot-reloaded.`,
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
