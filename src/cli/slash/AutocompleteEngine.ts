import { SlashCommandRegistry } from "./SlashCommandRegistry.js";
import { ProviderRegistry } from "../../inference/ProviderRegistry.js";
import { KeychainService } from "../../inference/keychain.js";
import type { KeyProvider } from "../../inference/keychain.js";

export interface AutocompleteItem {
  value: string;
  display: string;
  description: string;
  type: "command" | "subcommand" | "model" | "provider";
}

export class AutocompleteEngine {
  private static instance: AutocompleteEngine;

  public static getInstance(): AutocompleteEngine {
    if (!this.instance) {
      this.instance = new AutocompleteEngine();
    }
    return this.instance;
  }

  /**
   * Retrieves intelligent autocomplete suggestions based on current prompt input.
   */
  public getSuggestions(input: string): AutocompleteItem[] {
    const trimmed = input.trimStart();
    if (!trimmed.startsWith("/")) return [];

    const parts = trimmed.slice(1).split(/\s+/);
    const cmdTerm = parts[0]?.toLowerCase() || "";
    const isSubcommandPhase = trimmed.includes(" ") || parts.length > 1;

    // 1. Phase 1: Command Name Autocomplete (e.g. "/m" or "/")
    if (!isSubcommandPhase) {
      const allCmds = SlashCommandRegistry.getInstance().listCommands();
      return allCmds
        .filter((c) => c.name.toLowerCase().startsWith(cmdTerm))
        .map((c) => ({
          value: `/${c.name} `,
          display: `/${c.name}`,
          description: c.description,
          type: "command" as const,
        }));
    }

    // 2. Phase 2: Subcommand & Argument Autocomplete (e.g. "/mode ", "/login ", "/model ")
    const cmdName = parts[0].toLowerCase();
    const argTerm = parts.slice(1).join(" ").toLowerCase();

    switch (cmdName) {
      case "mode": {
        const modes = [
          { name: "normal", desc: "Standard interactive prompt approval" },
          { name: "auto", desc: "Auto-approve non-destructive allowlisted inspection tools" },
          { name: "plan", desc: "Generate dry-run implementation plans requiring /apply" },
        ];
        return modes
          .filter((m) => m.name.startsWith(argTerm))
          .map((m) => ({
            value: `/mode ${m.name}`,
            display: m.name,
            description: m.desc,
            type: "subcommand",
          }));
      }

      case "plan": {
        const planOpts = [
          { name: "on", desc: "Enable standing planning mode" },
          { name: "off", desc: "Disable planning mode (return to normal)" },
        ];
        return planOpts
          .filter((p) => p.name.startsWith(argTerm))
          .map((p) => ({
            value: `/plan ${p.name}`,
            display: p.name,
            description: p.desc,
            type: "subcommand",
          }));
      }

      case "memory": {
        const memOpts = [
          { name: "list", desc: "List all persistent project memory facts" },
          { name: "add", desc: "Add a new persistent fact (/memory add <fact>)" },
          { name: "remove", desc: "Remove a persistent fact by ID (/memory remove <id>)" },
          { name: "clear", desc: "Clear all stored persistent facts" },
        ];
        return memOpts
          .filter((m) => m.name.startsWith(argTerm))
          .map((m) => ({
            value: `/memory ${m.name} `,
            display: m.name,
            description: m.desc,
            type: "subcommand",
          }));
      }

      case "skills": {
        const skillOpts = [
          { name: "list", desc: "List installed dynamic skill packs" },
          { name: "create", desc: "Scaffold a new dynamic skill (/skills create <name>)" },
          { name: "install", desc: "Install skill pack from directory (/skills install <path>)" },
          { name: "remove", desc: "Uninstall a dynamic skill (/skills remove <name>)" },
        ];
        return skillOpts
          .filter((s) => s.name.startsWith(argTerm))
          .map((s) => ({
            value: `/skills ${s.name} `,
            display: s.name,
            description: s.desc,
            type: "subcommand",
          }));
      }

      case "mcp": {
        const mcpOpts = [
          { name: "list", desc: "List connected Model Context Protocol servers & tools" },
          { name: "reload", desc: "Hot-reload .mcp.json server configurations" },
          { name: "prompts", desc: "List registered MCP prompt templates" },
        ];
        return mcpOpts
          .filter((m) => m.name.startsWith(argTerm))
          .map((m) => ({
            value: `/mcp ${m.name}`,
            display: m.name,
            description: m.desc,
            type: "subcommand",
          }));
      }

      case "login": {
        const providers: Array<{ id: KeyProvider; name: string }> = [
          { id: "nvidia", name: "NVIDIA NIM API key" },
          { id: "groq", name: "Groq free tier API key" },
          { id: "anthropic", name: "Anthropic Claude API key" },
          { id: "openai", name: "OpenAI GPT API key" },
          { id: "deepseek", name: "DeepSeek API key" },
          { id: "openrouter", name: "OpenRouter API key" },
          { id: "mistral", name: "Mistral AI API key" },
          { id: "together", name: "Together AI API key" },
        ];
        return providers
          .filter((p) => p.id.startsWith(argTerm))
          .map((p) => ({
            value: `/login ${p.id} `,
            display: p.id,
            description: p.name,
            type: "provider",
          }));
      }

      case "session": {
        const sessionOpts = [
          { name: "new", desc: "Start a fresh conversation session" },
          { name: "stats", desc: "Display current turn count and token statistics" },
        ];
        return sessionOpts
          .filter((s) => s.name.startsWith(argTerm))
          .map((s) => ({
            value: `/session ${s.name}`,
            display: s.name,
            description: s.desc,
            type: "subcommand",
          }));
      }

      case "provider": {
        const provOpts = [
          { name: "status", desc: "Display status and health pings of all inference providers" },
          { name: "switch", desc: "Switch active inference provider (/provider switch <name>)" },
        ];
        return provOpts
          .filter((p) => p.name.startsWith(argTerm))
          .map((p) => ({
            value: `/provider ${p.name} `,
            display: p.name,
            description: p.desc,
            type: "subcommand",
          }));
      }

      case "model": {
        // Collect available models
        const registry = ProviderRegistry.getInstance();
        const modelsList: Array<{ id: string; desc: string }> = [];

        // Local Ollama
        const ollamaP = registry.getProvider("ollama") as any;
        if (ollamaP && typeof ollamaP.getInstalledModels === "function") {
          for (const m of ollamaP.getInstalledModels()) {
            modelsList.push({ id: `ollama/${m}`, desc: "Local Ollama" });
          }
        }

        // Active Cloud Providers
        const cloudProviders: KeyProvider[] = ["nvidia", "groq", "anthropic", "openai", "deepseek", "openrouter", "mistral", "together"];
        for (const p of cloudProviders) {
          if (KeychainService.getApiKey(p)) {
            if (p === "nvidia") {
              modelsList.push(
                { id: "nvidia/meta/llama-3.3-70b-instruct", desc: "Llama 3.3 70B (Frontier)" },
                { id: "nvidia/llama-3.1-nemotron-70b-instruct", desc: "Nemotron 70B" },
                { id: "nvidia/mistralai/mixtral-8x22b-v0.1", desc: "Mixtral 8x22B MoE" },
                { id: "nvidia/mistralai/codestral-22b-instruct-v0.1", desc: "Codestral 22B Coding" }
              );
            } else if (p === "groq") {
              modelsList.push(
                { id: "groq/llama-3.3-70b-versatile", desc: "Llama 3.3 70B (Free Tier)" },
                { id: "groq/llama-3.3-70b-specdec", desc: "Llama 3.3 SpecDec (Free Tier)" },
                { id: "groq/deepseek-r1-distill-llama-70b", desc: "DeepSeek R1 70B Distill (Free Tier)" },
                { id: "groq/qwen-2.5-coder-32b", desc: "Qwen 2.5 Coder 32B (Free Tier)" },
                { id: "groq/llama-3.1-8b-instant", desc: "Llama 3.1 8B Instant (Free Tier)" },
                { id: "groq/openai/gpt-oss-120b", desc: "GPT-OSS 120B (Free Tier)" }
              );
            } else if (p === "anthropic") {
              modelsList.push(
                { id: "anthropic/claude-3-7-sonnet-20250219", desc: "Claude 3.7 Sonnet Hybrid Reasoning" },
                { id: "anthropic/claude-3-5-sonnet-20241022", desc: "Claude 3.5 Sonnet v2" },
                { id: "anthropic/claude-3-5-haiku-20241022", desc: "Claude 3.5 Haiku" },
                { id: "anthropic/claude-3-opus-20240229", desc: "Claude 3 Opus" }
              );
            } else if (p === "openai") {
              modelsList.push(
                { id: "openai/gpt-4o", desc: "GPT-4o Frontier" },
                { id: "openai/o1", desc: "o1 Frontier Reasoning" },
                { id: "openai/o3-mini", desc: "o3-mini Fast Reasoning" },
                { id: "openai/o1-mini", desc: "o1-mini Reasoning" },
                { id: "openai/gpt-4o-mini", desc: "GPT-4o Mini Fast" },
                { id: "openai/chatgpt-4o-latest", desc: "ChatGPT-4o Continuous" }
              );
            } else if (p === "deepseek") {
              modelsList.push(
                { id: "deepseek/deepseek-chat", desc: "DeepSeek V3 (671B MoE)" },
                { id: "deepseek/deepseek-reasoner", desc: "DeepSeek R1 (671B Reasoning)" }
              );
            }
          }
        }

        modelsList.push({ id: "mock/demo-mode", desc: "Demo Mode" });

        return modelsList
          .filter((m) => m.id.toLowerCase().includes(argTerm))
          .map((m) => ({
            value: `/model ${m.id}`,
            display: m.id,
            description: m.desc,
            type: "model",
          }));
      }

      default:
        return [];
    }
  }
}
