import type { SlashCommand } from "../SlashCommand.js";
import { ProviderRegistry, type ActiveModelItem } from "../../../inference/ProviderRegistry.js";
import { ConfigResolver } from "../../../config/ConfigResolver.js";
import { KeychainService, type KeyProvider } from "../../../inference/keychain.js";
import { parseModelParams } from "../../../inference/modelParams.js";
import { UserStateService } from "../../../platform/UserState.js";

export { parseModelParams };

export const modelCommands: SlashCommand[] = [
  {
    name: "model",
    description: "View or select active LLM provider and model mid-session",
    category: "model",
    usage: "/model [number | provider/model]",
    execute: async (args, ctx) => {
      const registry = ProviderRegistry.getInstance();
      await registry.detectLocalProviders();

      // Dynamically fetch ONLY models available on configured keys or local servers
      const availableModels: ActiveModelItem[] = await registry.getActiveModels();

      const cloudDefs: Array<{ id: KeyProvider; name: string }> = [
        { id: "anthropic", name: "Anthropic Claude" },
        { id: "openai", name: "OpenAI" },
        { id: "groq", name: "Groq (Free Tier)" },
        { id: "nvidia", name: "NVIDIA NIM" },
        { id: "deepseek", name: "DeepSeek" },
        { id: "openrouter", name: "OpenRouter" },
        { id: "mistral", name: "Mistral AI" },
        { id: "together", name: "Together AI" },
      ];

      const configurableProviders: Array<{ id: string; name: string; envVar: string }> = [];
      for (const def of cloudDefs) {
        if (!KeychainService.getApiKey(def.id)) {
          configurableProviders.push({
            id: def.id,
            name: def.name,
            envVar: `${def.id.toUpperCase()}_API_KEY`,
          });
        }
      }

      const hasRealModels = availableModels.some((m) => m.id !== "mock/demo-mode");

      if (args.length === 0) {
        const lines = [
          `✦ Active Model: ${ctx.provider.id}/${ctx.model}`,
          "",
        ];

        if (!hasRealModels) {
          lines.push("✦ No active API keys or local LLM instances detected.");
          lines.push("✦ To enable models, authenticate with an API key:");
          for (const cp of configurableProviders) {
            lines.push(`  • ${cp.id.padEnd(12)} (${cp.name}) -> /login ${cp.id} <${cp.envVar}>`);
          }
          lines.push("  • Or start local Ollama with 'ollama serve'");
          lines.push("\nCurrently running in offline Demo Mode [mock/demo-mode].");
          return { output: lines.join("\n") };
        }

        lines.push("✦ Active & Ready Models on Configured Keys (Sorted by Parameter Size: Highest → Lowest):");

        availableModels.forEach((item, idx) => {
          const isCurrent = `${ctx.provider.id}/${ctx.model}` === item.id || ctx.model === item.modelName;
          const marker = isCurrent ? " (active)" : "";
          const paramStr = item.params > 0 ? (item.params >= 1 ? `[${item.params}B]` : `[${Math.round(item.params * 1000)}M]`) : "[-]";
          lines.push(`  [${idx + 1}] ${item.id.padEnd(48)} ${paramStr.padEnd(8)} (${item.tag})${marker}`);
        });

        if (configurableProviders.length > 0) {
          lines.push("\n✦ Additional Providers (Add API Key via /login <provider> <key>):");
          for (const cp of configurableProviders) {
            lines.push(`  • ${cp.id.padEnd(12)} (${cp.name}) -> /login ${cp.id} <${cp.envVar}>`);
          }
        }

        lines.push("\nTo select a model, type:");
        lines.push("  /model <number>  OR  /model <provider/model-name>");
        return { output: lines.join("\n") };
      }

      const targetArg = args[0];
      let targetItem: ActiveModelItem | undefined;

      const numIdx = parseInt(targetArg, 10);
      if (!isNaN(numIdx) && numIdx >= 1 && numIdx <= availableModels.length) {
        targetItem = availableModels[numIdx - 1];
      } else {
        if (targetArg.includes("/")) {
          const [pId, ...mParts] = targetArg.split("/");
          targetItem = availableModels.find((m) => m.id === targetArg) || {
            id: targetArg,
            providerId: pId,
            modelName: mParts.join("/"),
            tag: "Custom",
            ready: true,
            params: parseModelParams(targetArg),
          };
        } else {
          targetItem = availableModels.find((m) => m.modelName === targetArg || m.id.includes(targetArg));
        }
      }

      if (!targetItem) {
        return { output: `Model '${targetArg}' not found. Type /model to view available models on your configured keys.` };
      }

      const newP = registry.getProvider(targetItem.providerId);
      if (newP) {
        if (ctx.setProvider) ctx.setProvider(newP);
        ctx.setModel(targetItem.modelName);
        UserStateService.getInstance().setLastUsed(targetItem.providerId, targetItem.modelName);
        return { output: `✓ Switched active model to ${targetItem.providerId}/${targetItem.modelName}` };
      }

      ctx.setModel(targetItem.modelName);
      UserStateService.getInstance().setLastUsed(ctx.provider.id, targetItem.modelName);
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
        UserStateService.getInstance().setLastUsed(target, ctx.model);
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
