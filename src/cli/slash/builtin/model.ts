import type { SlashCommand } from "../SlashCommand.js";
import { ProviderRegistry } from "../../../inference/ProviderRegistry.js";
import { OllamaProvider } from "../../../inference/providers/OllamaProvider.js";
import { ConfigResolver } from "../../../config/ConfigResolver.js";
import { KeychainService, type KeyProvider } from "../../../inference/keychain.js";

export const modelCommands: SlashCommand[] = [
  {
    name: "model",
    description: "View or select active LLM provider and model mid-session",
    category: "model",
    usage: "/model [number | provider/model]",
    execute: async (args, ctx) => {
      const registry = ProviderRegistry.getInstance();
      await registry.detectLocalProviders();

      const availableModels: Array<{ id: string; providerId: string; modelName: string; tag: string; ready: boolean }> = [];
      const configurableProviders: Array<{ id: string; name: string; envVar: string }> = [];

      // 1. Check local Ollama and LM Studio installed models
      const ollamaP = registry.getProvider("ollama") as OllamaProvider;
      if (ollamaP) {
        await ollamaP.ping();
        const installed = ollamaP.getInstalledModels();
        for (const m of installed) {
          availableModels.push({
            id: `ollama/${m}`,
            providerId: "ollama",
            modelName: m,
            tag: "Local Ollama",
            ready: true,
          });
        }
      }

      const lmStudioP = registry.getProvider("lmstudio") as any;
      if (lmStudioP) {
        if (typeof lmStudioP.ping === "function") await lmStudioP.ping();
        if (typeof lmStudioP.getInstalledModels === "function") {
          const lmModels = lmStudioP.getInstalledModels();
          for (const m of lmModels) {
            availableModels.push({
              id: `lmstudio/${m}`,
              providerId: "lmstudio",
              modelName: m,
              tag: "Local LM Studio",
              ready: true,
            });
          }
        }
      }

      // 2. Cloud & Frontier Providers check via KeychainService
      const cloudDefs: Array<{ id: KeyProvider; name: string; defaultModels: Array<{ name: string; tag: string }> }> = [
        {
          id: "anthropic",
          name: "Anthropic Claude",
          defaultModels: [
            { name: "claude-3-5-sonnet-20241022", tag: "Frontier Cloud" },
            { name: "claude-3-5-haiku-20241022", tag: "Fast Cloud" },
          ],
        },
        {
          id: "openai",
          name: "OpenAI",
          defaultModels: [
            { name: "gpt-4o", tag: "Frontier Cloud" },
            { name: "gpt-4o-mini", tag: "Fast Cloud" },
          ],
        },
        {
          id: "groq",
          name: "Groq",
          defaultModels: [
            { name: "openai/gpt-oss-120b", tag: "GPT-OSS 120B (Free Tier)" },
            { name: "openai/gpt-oss-20b", tag: "GPT-OSS 20B (Free Tier)" },
            { name: "llama-3.3-70b-versatile", tag: "Llama 3.3 70B (Free Tier)" },
            { name: "llama-3.1-8b-instant", tag: "Llama 3.1 8B Instant (Free Tier)" },
            { name: "qwen/qwen3.6-27b", tag: "Qwen 3.6 27B (Free Tier)" },
            { name: "groq/compound", tag: "Groq Compound (Free Tier)" },
          ],
        },
        {
          id: "nvidia",
          name: "NVIDIA NIM",
          defaultModels: [
            { name: "meta/llama-3.3-70b-instruct", tag: "Llama 3.3 70B (Frontier)" },
            { name: "meta/llama-3.1-70b-instruct", tag: "Llama 3.1 70B" },
            { name: "nvidia/llama-3.1-nemotron-70b-instruct", tag: "Nemotron 70B" },
            { name: "deepseek-ai/deepseek-r1", tag: "DeepSeek R1 Reasoning" },
            { name: "mistralai/mistral-large-2-instruct", tag: "Mistral Large 2" },
            { name: "mistralai/codestral-22b-instruct-v0.1", tag: "Codestral 22B" },
          ],
        },
        {
          id: "deepseek",
          name: "DeepSeek",
          defaultModels: [
            { name: "deepseek-chat", tag: "Frontier V3" },
            { name: "deepseek-reasoner", tag: "Reasoning R1" },
          ],
        },
        {
          id: "openrouter",
          name: "OpenRouter",
          defaultModels: [
            { name: "anthropic/claude-3.5-sonnet", tag: "Multi-Provider Router" },
            { name: "deepseek/deepseek-r1", tag: "Reasoning Router" },
          ],
        },
        {
          id: "mistral",
          name: "Mistral AI",
          defaultModels: [
            { name: "mistral-large-latest", tag: "Frontier Cloud" },
            { name: "codestral-latest", tag: "Coding Model" },
          ],
        },
        {
          id: "together",
          name: "Together AI",
          defaultModels: [
            { name: "meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo", tag: "405B Frontier" },
          ],
        },
      ];

      for (const def of cloudDefs) {
        const hasKey = !!KeychainService.getApiKey(def.id);
        if (hasKey) {
          for (const m of def.defaultModels) {
            const fullId = m.name.startsWith(`${def.id}/`) ? m.name : `${def.id}/${m.name}`;
            availableModels.push({
              id: fullId,
              providerId: def.id,
              modelName: m.name,
              tag: `${m.tag} (Key Ready)`,
              ready: true,
            });
          }
        } else {
          configurableProviders.push({
            id: def.id,
            name: def.name,
            envVar: `${def.id.toUpperCase()}_API_KEY`,
          });
        }
      }

      // Always include Mock Demo Mode
      availableModels.push({
        id: "mock/demo-mode",
        providerId: "mock",
        modelName: "demo-mode",
        tag: "Demo Mode",
        ready: true,
      });

      if (args.length === 0) {
        const lines = [
          `✦ Active Model: ${ctx.provider.id}/${ctx.model}`,
          "",
          "✦ Active & Ready Models to Select:",
        ];

        availableModels.forEach((item, idx) => {
          const isCurrent = `${ctx.provider.id}/${ctx.model}` === item.id;
          const marker = isCurrent ? " (active)" : "";
          lines.push(`  [${idx + 1}] ${item.id.padEnd(46)} (${item.tag})${marker}`);
        });

        if (configurableProviders.length > 0) {
          lines.push("\n✦ Additional Frontier Providers (Add API Key via /login <provider> <key>):");
          for (const cp of configurableProviders) {
            lines.push(`  • ${cp.id.padEnd(12)} (${cp.name}) -> /login ${cp.id} <${cp.envVar}>`);
          }
        }

        lines.push("\nTo select a model, type:");
        lines.push("  /model <number>  OR  /model <provider/model-name>");
        return { output: lines.join("\n") };
      }

      const targetArg = args[0];
      let targetItem: typeof availableModels[0] | undefined;

      const numIdx = parseInt(targetArg, 10);
      if (!isNaN(numIdx) && numIdx >= 1 && numIdx <= availableModels.length) {
        targetItem = availableModels[numIdx - 1];
      } else {
        if (targetArg.includes("/")) {
          const [pId, ...mParts] = targetArg.split("/");
          targetItem = {
            id: targetArg,
            providerId: pId,
            modelName: mParts.join("/"),
            tag: "Custom",
            ready: true,
          };
        } else {
          targetItem = availableModels.find((m) => m.modelName === targetArg || m.id.includes(targetArg));
        }
      }

      if (!targetItem) {
        return { output: `Model '${targetArg}' not found. Type /model to view available models.` };
      }

      const newP = registry.getProvider(targetItem.providerId);
      if (newP) {
        if (ctx.setProvider) ctx.setProvider(newP);
        ctx.setModel(targetItem.modelName);
        return { output: `✓ Switched active model to ${targetItem.providerId}/${targetItem.modelName}` };
      }

      ctx.setModel(targetItem.modelName);
      return { output: `Updated model to ${targetItem.modelName}` };
    },
  },
  {
    name: "provider",
    description: "Display status and health pings of all inference providers",
    category: "model",
    usage: "/provider [status|switch <name>]",
    execute: async (args, ctx) => {
      const registry = ProviderRegistry.getInstance();
      const action = args[0] || "status";

      if (action === "status") {
        const providers = ["anthropic", "openai", "groq", "nvidia", "deepseek", "openrouter", "mistral", "together", "ollama", "lmstudio", "mock"];
        const lines = ["✦ Inference Provider Status:"];
        for (const pId of providers) {
          const p = registry.getProvider(pId);
          if (!p) {
            lines.push(`  • ${pId.padEnd(12)} : [Not Registered]`);
            continue;
          }
          const res = await p.ping();
          const statusStr = res.ok ? "✓ Active" : `✗ Unavailable (${res.error || "no key/server"})`;
          lines.push(`  • ${pId.padEnd(12)} : ${statusStr}`);
        }
        return { output: lines.join("\n") };
      } else if (action === "switch") {
        const target = args[1];
        if (!target) return { output: "Usage: /provider switch [anthropic|openai|groq|nvidia|deepseek|openrouter|mistral|together|ollama|lmstudio|mock]" };
        const p = registry.getProvider(target);
        if (!p) return { output: `Provider '${target}' not found.` };
        ctx.setProvider?.(p);
        return { output: `Switched active provider to '${target}'` };
      }

      return { output: "Usage: /provider [status|switch <name>]" };
    },
  },
  {
    name: "routing",
    description: "Display current task-to-model routing table",
    category: "config",
    execute: async () => {
      const config = ConfigResolver.getInstance().getConfig();
      const entries = Object.entries(config.routing);
      const items = entries.map(([task, targetModel]) => `  • ${task.padEnd(14)} -> ${targetModel}`);
      return { output: `Dynamic Task Routing Table:\n${items.join("\n")}` };
    },
  },
];
