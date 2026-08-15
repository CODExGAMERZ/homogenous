import type { SlashCommand } from "../SlashCommand.js";
import { ProviderRegistry } from "../../../inference/ProviderRegistry.js";
import { OllamaProvider } from "../../../inference/providers/OllamaProvider.js";
import { ConfigResolver } from "../../../config/ConfigResolver.js";
import { KeychainService, type KeyProvider } from "../../../inference/keychain.js";

export function parseModelParams(idOrName: string): number {
  const lower = idOrName.toLowerCase();

  // 1. Check known frontier model parameter scales
  if (lower.includes("deepseek-r1") || lower.includes("deepseek-v3") || lower.includes("deepseek-reasoner") || lower.includes("deepseek-chat")) return 671;
  if (lower.includes("550b")) return 550;
  if (lower.includes("405b")) return 405;
  if (lower.includes("jamba-1.5-large") || lower.includes("398b")) return 398;
  if (lower.includes("nemotron-4-340b") || lower.includes("340b")) return 340;
  if (lower.includes("nemotron-ultra-253b") || lower.includes("253b")) return 253;
  if (lower.includes("claude-3-5-sonnet") || lower.includes("claude-3-opus") || (lower.includes("gpt-4o") && !lower.includes("mini"))) return 200;
  if (lower.includes("mixtral-8x22b") || lower.includes("8x22b")) return 176;
  if (lower.includes("dbrx") || lower.includes("132b")) return 132;
  if (lower.includes("mistral-large") || lower.includes("123b")) return 123;
  if (lower.includes("palmyra-creative-122b") || lower.includes("122b")) return 122;
  if (lower.includes("120b")) return 120;
  if (lower.includes("kimi-k2.6") || lower.includes("100b")) return 100;
  if (lower.includes("90b")) return 90;
  if (lower.includes("72b")) return 72;
  if (lower.includes("70b") || lower.includes("compound")) return 70;
  if (lower.includes("mixtral-8x7b") || lower.includes("8x7b")) return 56;
  if (lower.includes("51b")) return 51;
  if (lower.includes("49b")) return 49;
  if (lower.includes("34b") || lower.includes("yi-large")) return 34;
  if (lower.includes("32b")) return 32;
  if (lower.includes("31b")) return 31;
  if (lower.includes("30b")) return 30;
  if (lower.includes("27b")) return 27;
  if (lower.includes("24b") || lower.includes("mistral-small")) return 24;
  if (lower.includes("22b") || lower.includes("codestral")) return 22;
  if (lower.includes("20b")) return 20;
  if (lower.includes("15b") || lower.includes("starcoder2-15b")) return 15;
  if (lower.includes("14b")) return 14;
  if (lower.includes("13b")) return 13;
  if (lower.includes("12b")) return 12;
  if (lower.includes("11b")) return 11;
  if (lower.includes("9b")) return 9;
  if (lower.includes("8b") || lower.includes("gpt-4o-mini") || lower.includes("haiku")) return 8;
  if (lower.includes("7b")) return 7;
  if (lower.includes("6.7b")) return 6.7;
  if (lower.includes("4b")) return 4;
  if (lower.includes("3.8b") || lower.includes("3.5b")) return 3.5;
  if (lower.includes("3b")) return 3;
  if (lower.includes("2.7b")) return 2.7;
  if (lower.includes("2b")) return 2;
  if (lower.includes("1.5b") || lower.includes("1.1b")) return 1.5;
  if (lower.includes("1b")) return 1;
  if (lower.includes("0.5b") || lower.includes("500m")) return 0.5;
  if (lower.includes("800m")) return 0.8;
  if (lower.includes("135m")) return 0.135;

  // 2. Generic regex for MoE like 8x22b or 8x7b
  const moeMatch = lower.match(/(\d+)x(\d+(?:\.\d+)?)b/);
  if (moeMatch) {
    return parseFloat(moeMatch[1]) * parseFloat(moeMatch[2]);
  }

  // 3. Generic regex for parameters ending with 'b' (e.g. 70b, 1.5b, 8b, 550b)
  const bMatch = lower.match(/(\d+(?:\.\d+)?)b/);
  if (bMatch) {
    return parseFloat(bMatch[1]);
  }

  // 4. Generic regex for parameters ending with 'm' (e.g. 800m, 350m)
  const mMatch = lower.match(/(\d+(?:\.\d+)?)m/);
  if (mMatch) {
    return parseFloat(mMatch[1]) / 1000;
  }

  return 0;
}

export const modelCommands: SlashCommand[] = [
  {
    name: "model",
    description: "View or select active LLM provider and model mid-session",
    category: "model",
    usage: "/model [number | provider/model]",
    execute: async (args, ctx) => {
      const registry = ProviderRegistry.getInstance();
      await registry.detectLocalProviders();

      const availableModels: Array<{ id: string; providerId: string; modelName: string; tag: string; ready: boolean; params: number }> = [];
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
            params: parseModelParams(m),
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
              params: parseModelParams(m),
            });
          }
        }
      }

      // 2. Cloud & Frontier Providers check via KeychainService
      const cloudDefs: Array<{ id: KeyProvider; name: string; defaultModels: Array<{ name: string; tag: string }> }> = [
        {
          id: "deepseek",
          name: "DeepSeek",
          defaultModels: [
            { name: "deepseek-reasoner", tag: "Reasoning R1 (671B)" },
            { name: "deepseek-chat", tag: "Frontier V3 (671B)" },
          ],
        },
        {
          id: "together",
          name: "Together AI",
          defaultModels: [
            { name: "meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo", tag: "405B Frontier" },
            { name: "mistralai/Mixtral-8x22B-Instruct-v0.1", tag: "Mixtral 8x22B MoE (176B)" },
            { name: "meta-llama/Llama-3.3-70B-Instruct-Turbo", tag: "Llama 3.3 (70B)" },
          ],
        },
        {
          id: "nvidia",
          name: "NVIDIA NIM",
          defaultModels: [
            { name: "nvidia/nemotron-3-ultra-550b-a55b", tag: "Nemotron 3 Ultra (550B)" },
            { name: "nvidia/nemotron-4-340b-instruct", tag: "Nemotron 4 (340B)" },
            { name: "nvidia/llama-3.1-nemotron-ultra-253b-v1", tag: "Nemotron Ultra (253B)" },
            { name: "mistralai/mixtral-8x22b-v0.1", tag: "Mixtral 8x22B MoE (176B)" },
            { name: "databricks/dbrx-instruct", tag: "DBRX Instruct (132B)" },
            { name: "mistralai/mistral-large-2-instruct", tag: "Mistral Large 2 (123B)" },
            { name: "openai/gpt-oss-120b", tag: "GPT-OSS (120B)" },
            { name: "meta/llama-3.2-90b-vision-instruct", tag: "Llama 3.2 Vision (90B)" },
            { name: "meta/llama-3.3-70b-instruct", tag: "Llama 3.3 Frontier (70B)" },
            { name: "nvidia/llama-3.1-nemotron-70b-instruct", tag: "Nemotron (70B)" },
            { name: "meta/llama-3.1-70b-instruct", tag: "Llama 3.1 (70B)" },
            { name: "nvidia/llama-3.3-nemotron-super-49b-v1.5", tag: "Nemotron Super (49B)" },
            { name: "ibm/granite-34b-code-instruct", tag: "Granite 34B Code (34B)" },
            { name: "google/gemma-4-31b-it", tag: "Gemma 4 (31B)" },
            { name: "nvidia/nemotron-3-nano-30b-a3b", tag: "Nemotron 3 Nano (30B)" },
            { name: "mistralai/codestral-22b-instruct-v0.1", tag: "Codestral (22B Coding)" },
            { name: "openai/gpt-oss-20b", tag: "GPT-OSS (20B)" },
            { name: "bigcode/starcoder2-15b", tag: "StarCoder 2 (15B)" },
            { name: "google/gemma-3-12b-it", tag: "Gemma 3 (12B)" },
            { name: "nv-mistralai/mistral-nemo-12b-instruct", tag: "Mistral NeMo (12B)" },
            { name: "meta/llama-3.1-8b-instruct", tag: "Llama 3.1 (8B)" },
            { name: "mistralai/mistral-7b-instruct-v0.3", tag: "Mistral (7B)" },
            { name: "deepseek-ai/deepseek-coder-6.7b-instruct", tag: "DeepSeek Coder (6.7B)" },
            { name: "nvidia/nemotron-mini-4b-instruct", tag: "Nemotron Mini (4B)" },
            { name: "meta/llama-3.2-3b-instruct", tag: "Llama 3.2 (3B)" },
            { name: "meta/llama-3.2-1b-instruct", tag: "Llama 3.2 (1B)" },
          ],
        },
        {
          id: "openrouter",
          name: "OpenRouter",
          defaultModels: [
            { name: "deepseek/deepseek-r1", tag: "Reasoning Router (671B)" },
            { name: "anthropic/claude-3.5-sonnet", tag: "Multi-Provider Router (200B)" },
          ],
        },
        {
          id: "anthropic",
          name: "Anthropic Claude",
          defaultModels: [
            { name: "claude-3-7-sonnet-20250219", tag: "Claude 3.7 Sonnet Hybrid Reasoning (200B)" },
            { name: "claude-3-5-sonnet-20241022", tag: "Claude 3.5 Sonnet v2 (200B)" },
            { name: "claude-3-5-haiku-20241022", tag: "Claude 3.5 Haiku (8B)" },
            { name: "claude-3-opus-20240229", tag: "Claude 3 Opus (200B)" },
          ],
        },
        {
          id: "openai",
          name: "OpenAI",
          defaultModels: [
            { name: "gpt-4o", tag: "GPT-4o Frontier (200B)" },
            { name: "o1", tag: "o1 Frontier Reasoning (200B)" },
            { name: "o3-mini", tag: "o3-mini Reasoning (8B)" },
            { name: "o1-mini", tag: "o1-mini Fast Reasoning (8B)" },
            { name: "gpt-4o-mini", tag: "GPT-4o Mini Fast (8B)" },
            { name: "chatgpt-4o-latest", tag: "ChatGPT-4o Latest (200B)" },
          ],
        },
        {
          id: "mistral",
          name: "Mistral AI",
          defaultModels: [
            { name: "mistral-large-latest", tag: "Mistral Large (123B)" },
            { name: "codestral-latest", tag: "Codestral (22B Coding)" },
          ],
        },
        {
          id: "groq",
          name: "Groq",
          defaultModels: [
            { name: "llama-3.3-70b-versatile", tag: "Llama 3.3 70B (Free Tier)" },
            { name: "llama-3.3-70b-specdec", tag: "Llama 3.3 70B SpecDec (Free Tier)" },
            { name: "deepseek-r1-distill-llama-70b", tag: "DeepSeek R1 70B Distill (Free Tier)" },
            { name: "qwen-2.5-coder-32b", tag: "Qwen 2.5 Coder 32B (Free Tier)" },
            { name: "qwen/qwen3.6-27b", tag: "Qwen 3.6 27B (Free Tier)" },
            { name: "llama-3.1-8b-instant", tag: "Llama 3.1 8B Instant (Free Tier)" },
            { name: "openai/gpt-oss-120b", tag: "GPT-OSS 120B (Free Tier)" },
            { name: "groq/compound", tag: "Groq Compound 70B (Free Tier)" },
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
              params: parseModelParams(m.name),
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
        params: 0,
      });

      // Sort all available models from highest parameter count to lowest
      availableModels.sort((a, b) => {
        if (b.params !== a.params) {
          return b.params - a.params; // Highest parameter size first
        }
        return a.id.localeCompare(b.id);
      });

      if (args.length === 0) {
        const lines = [
          `✦ Active Model: ${ctx.provider.id}/${ctx.model}`,
          "",
          "✦ Active & Ready Models to Select (Sorted by Parameter Size: Highest → Lowest):",
        ];

        availableModels.forEach((item, idx) => {
          const isCurrent = `${ctx.provider.id}/${ctx.model}` === item.id;
          const marker = isCurrent ? " (active)" : "";
          const paramStr = item.params > 0 ? (item.params >= 1 ? `[${item.params}B]` : `[${Math.round(item.params * 1000)}M]`) : "[-]";
          lines.push(`  [${idx + 1}] ${item.id.padEnd(46)} ${paramStr.padEnd(8)} (${item.tag})${marker}`);
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
            params: parseModelParams(targetArg),
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
