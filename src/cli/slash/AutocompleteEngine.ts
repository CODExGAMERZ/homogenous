import fs from "node:fs";
import path from "node:path";
import { SlashCommandRegistry } from "./SlashCommandRegistry.js";
import { ProviderRegistry } from "../../inference/ProviderRegistry.js";
import { KeychainService } from "../../inference/keychain.js";
import type { KeyProvider } from "../../inference/keychain.js";
import { parseModelParams } from "./builtin/model.js";

export interface AutocompleteItem {
  value: string;
  display: string;
  description: string;
  type: "command" | "subcommand" | "model" | "provider" | "file";
}

export interface CachedModelItem {
  id: string;
  desc: string;
  params: number;
}

/**
 * Fuzzy score utility: tests if query characters appear sequentially in target.
 */
function fuzzyScore(target: string, query: string): number {
  target = target.toLowerCase();
  query = query.toLowerCase();

  if (target === query) return 1000;
  if (target.startsWith(query)) return 500 + (100 - query.length);
  if (target.includes(query)) return 200 + (100 - target.indexOf(query));

  let queryIdx = 0;
  let score = 0;
  let prevMatchIdx = -2;

  for (let i = 0; i < target.length && queryIdx < query.length; i++) {
    if (target[i] === query[queryIdx]) {
      queryIdx++;
      score += 10;
      if (i === prevMatchIdx + 1) {
        score += 20; // Consecutive bonus
      }
      prevMatchIdx = i;
    }
  }

  return queryIdx === query.length ? score : -1;
}

export class AutocompleteEngine {
  private static instance: AutocompleteEngine;
  private cachedModelsList: CachedModelItem[] | null = null;
  private lastModelCacheTime = 0;

  public static getInstance(): AutocompleteEngine {
    if (!this.instance) {
      this.instance = new AutocompleteEngine();
    }
    return this.instance;
  }

  /**
   * Clears in-memory caches when providers or files change.
   */
  public invalidateCache(): void {
    this.cachedModelsList = null;
    this.lastModelCacheTime = 0;
  }

  /**
   * Retrieves intelligent autocomplete suggestions based on current prompt input.
   */
  public getSuggestions(input: string, workspacePath: string = process.cwd()): AutocompleteItem[] {
    const trimmed = input.trimStart();

    // 1. Check for @file or @directory path autocompletion
    const atMatch = input.match(/(?:^|\s)@([^\s]*)$/);
    if (atMatch) {
      return this.getFileSuggestions(atMatch[1], workspacePath);
    }

    if (!trimmed.startsWith("/")) return [];

    const parts = trimmed.slice(1).split(/\s+/);
    const cmdTerm = parts[0]?.toLowerCase() || "";
    const isSubcommandPhase = trimmed.includes(" ") || parts.length > 1;

    // 2. Phase 1: Command Name Autocomplete (e.g. "/m" or "/" or fuzzy "/clr")
    if (!isSubcommandPhase) {
      const allCmds = SlashCommandRegistry.getInstance().listCommands();
      const scored: Array<{ item: AutocompleteItem; score: number }> = [];

      for (const c of allCmds) {
        const score = fuzzyScore(c.name, cmdTerm);
        if (score >= 0) {
          scored.push({
            item: {
              value: `/${c.name} `,
              display: `/${c.name}`,
              description: c.description,
              type: "command",
            },
            score,
          });
        }
      }

      scored.sort((a, b) => b.score - a.score);
      return scored.map((s) => s.item);
    }

    // 3. Phase 2: Subcommand & Argument Autocomplete
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
          .filter((m) => fuzzyScore(m.name, argTerm) >= 0)
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
          .filter((p) => fuzzyScore(p.name, argTerm) >= 0)
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
          .filter((m) => fuzzyScore(m.name, argTerm) >= 0)
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
        if (argTerm.startsWith("install ")) {
          const pathQuery = argTerm.slice("install ".length).trim();
          return this.getFileSuggestions(pathQuery, workspacePath, `/skills install `);
        }
        return skillOpts
          .filter((s) => fuzzyScore(s.name, argTerm) >= 0)
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
          .filter((m) => fuzzyScore(m.name, argTerm) >= 0)
          .map((m) => ({
            value: `/mcp ${m.name}`,
            display: m.name,
            description: m.desc,
            type: "subcommand",
          }));
      }

      case "theme": {
        const themes = [
          { name: "neon", desc: "Vibrant cyber neon theme (default)" },
          { name: "cyberpunk", desc: "Yellow & cyan high-contrast cyberpunk theme" },
          { name: "monokai", desc: "Warm pastel classic code editor theme" },
          { name: "dracula", desc: "Purple & pink gothic aesthetic theme" },
          { name: "nord", desc: "Arctic blue & cool slate theme" },
          { name: "plain", desc: "Clean monochrome theme (NO_COLOR compatible)" },
        ];
        return themes
          .filter((t) => fuzzyScore(t.name, argTerm) >= 0)
          .map((t) => ({
            value: `/theme ${t.name}`,
            display: t.name,
            description: t.desc,
            type: "subcommand",
          }));
      }

      case "diff": {
        const diffOpts = [
          { name: "show", desc: "Show recent file modification diffs" },
          { name: "undo", desc: "Undo most recent agent file modification" },
        ];
        return diffOpts
          .filter((d) => fuzzyScore(d.name, argTerm) >= 0)
          .map((d) => ({
            value: `/diff ${d.name}`,
            display: d.name,
            description: d.desc,
            type: "subcommand",
          }));
      }

      case "budget": {
        const budgetOpts = [
          { name: "status", desc: "Display current token & cost ledger statistics" },
          { name: "reset", desc: "Reset session budget counters to zero" },
        ];
        return budgetOpts
          .filter((b) => fuzzyScore(b.name, argTerm) >= 0)
          .map((b) => ({
            value: `/budget ${b.name}`,
            display: b.name,
            description: b.desc,
            type: "subcommand",
          }));
      }

      case "login": {
        const providers: Array<{ id: KeyProvider; name: string }> = [
          { id: "nvidia", name: "NVIDIA NIM API key (Free Tier & Frontier)" },
          { id: "groq", name: "Groq ultra-fast LPU inference (Free Tier)" },
          { id: "anthropic", name: "Anthropic Claude 3.7 Sonnet & Opus" },
          { id: "openai", name: "OpenAI GPT-4o & o1 / o3 reasoning" },
          { id: "deepseek", name: "DeepSeek V3 & R1 reasoning" },
          { id: "openrouter", name: "OpenRouter multi-provider gateway" },
          { id: "mistral", name: "Mistral AI & Codestral API key" },
          { id: "together", name: "Together AI inference API key" },
        ];
        return providers
          .filter((p) => fuzzyScore(p.id, argTerm) >= 0)
          .map((p) => ({
            value: `/login ${p.id} `,
            display: p.id,
            description: p.name,
            type: "provider",
          }));
      }

      case "logout":
      case "unregister": {
        const providers: Array<{ id: KeyProvider; name: string }> = [
          { id: "nvidia", name: "Unregister NVIDIA NIM API key" },
          { id: "groq", name: "Unregister Groq API key" },
          { id: "anthropic", name: "Unregister Anthropic API key" },
          { id: "openai", name: "Unregister OpenAI API key" },
          { id: "deepseek", name: "Unregister DeepSeek API key" },
          { id: "openrouter", name: "Unregister OpenRouter API key" },
          { id: "mistral", name: "Unregister Mistral API key" },
          { id: "together", name: "Unregister Together AI API key" },
        ];
        return providers
          .filter((p) => fuzzyScore(p.id, argTerm) >= 0)
          .map((p) => ({
            value: `/${cmdName} ${p.id}`,
            display: p.id,
            description: p.name,
            type: "provider",
          }));
      }

      case "session": {
        const sessionOpts = [
          { name: "new", desc: "Start a fresh conversation session" },
          { name: "stats", desc: "Display current turn count and token statistics" },
          { name: "clear", desc: "Clear screen and reset session history" },
        ];
        return sessionOpts
          .filter((s) => fuzzyScore(s.name, argTerm) >= 0)
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
          .filter((p) => fuzzyScore(p.name, argTerm) >= 0)
          .map((p) => ({
            value: `/provider ${p.name} `,
            display: p.name,
            description: p.desc,
            type: "subcommand",
          }));
      }

      case "model": {
        const modelsList = this.getAvailableModelsList();

        if (!argTerm) {
          // If no search filter, display all models pre-sorted by highest parameter scale first
          return modelsList.map((m) => ({
            value: `/model ${m.id}`,
            display: m.id,
            description: m.desc,
            type: "model",
          }));
        }

        // Rank by matching score, then parameter capacity descending, then alphabetical
        const scoredModels: Array<{ item: CachedModelItem; score: number }> = [];

        for (const m of modelsList) {
          const scoreId = fuzzyScore(m.id, argTerm);
          const scoreDesc = fuzzyScore(m.desc, argTerm);
          const bestScore = Math.max(scoreId, scoreDesc);

          if (bestScore >= 0) {
            scoredModels.push({
              item: m,
              score: bestScore,
            });
          }
        }

        scoredModels.sort((a, b) => {
          if (b.score !== a.score) {
            return b.score - a.score;
          }
          if (b.item.params !== a.item.params) {
            return b.item.params - a.item.params;
          }
          return a.item.id.localeCompare(b.item.id);
        });

        return scoredModels.map((s) => ({
          value: `/model ${s.item.id}`,
          display: s.item.id,
          description: s.item.desc,
          type: "model",
        }));
      }

      default:
        return [];
    }
  }

  /**
   * Dynamic models collector showing ONLY models for configured API keys and running local servers,
   * sorted from highest parameter capacity down to lowest.
   */
  private getAvailableModelsList(): CachedModelItem[] {
    const now = Date.now();
    if (this.cachedModelsList && now - this.lastModelCacheTime < 10000) {
      return this.cachedModelsList;
    }

    const registry = ProviderRegistry.getInstance();
    const list: CachedModelItem[] = [];

    // Trigger async discovery in background to refresh registry cache
    registry.getActiveModels().then((active) => {
      this.cachedModelsList = active
        .filter((m) => m.id !== "mock/demo-mode")
        .map((m) => ({
          id: m.id,
          desc: `${m.tag} [${m.params > 0 ? (m.params >= 1 ? `${m.params}B` : `${Math.round(m.params * 1000)}M`) : "Active"}]`,
          params: m.params,
        }));
      this.lastModelCacheTime = Date.now();
    }).catch(() => {});

    // If active models exist in registry cache:
    const activeFromRegistry = (registry as any).cachedActiveModels as Array<{ id: string; modelName: string; tag: string; params: number; providerId: string }> | null;
    if (activeFromRegistry && activeFromRegistry.length > 0) {
      for (const m of activeFromRegistry) {
        if (m.id === "mock/demo-mode") continue;
        const pStr = m.params > 0 ? (m.params >= 1 ? `${m.params}B` : `${Math.round(m.params * 1000)}M`) : "Active";
        list.push({
          id: m.id,
          desc: `${m.tag} [${pStr}]`,
          params: m.params,
        });
      }
    } else {
      // Synchronously scan only providers with active keys or running daemons
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

      for (const pId of cloudProviders) {
        if (!KeychainService.getApiKey(pId)) {
          continue; // Zero keys = Zero models
        }
        const prov = registry.getProvider(pId);
        const provModels = (prov as any)?.cachedModels || (prov as any)?.installedModels || [];
        for (const m of provModels) {
          const fullId = m.startsWith(`${pId}/`) ? m : `${pId}/${m}`;
          const cleanName = m.startsWith(`${pId}/`) ? m.slice(pId.length + 1) : m;
          const params = parseModelParams(cleanName);
          const pStr = params > 0 ? (params >= 1 ? `${params}B` : `${Math.round(params * 1000)}M`) : "Active";
          list.push({
            id: fullId,
            desc: `${pId.toUpperCase()} [${pStr}]`,
            params,
          });
        }
      }

      // Local Ollama
      const ollama = registry.getProvider("ollama") as any;
      if (ollama && ollama.getInstalledModels) {
        for (const m of ollama.getInstalledModels()) {
          const params = parseModelParams(m);
          list.push({
            id: `ollama/${m}`,
            desc: `Local Ollama [${params > 0 ? `${params}B` : "Local"}]`,
            params,
          });
        }
      }

      // Local LM Studio
      const lmstudio = registry.getProvider("lmstudio") as any;
      if (lmstudio && lmstudio.getInstalledModels) {
        for (const m of lmstudio.getInstalledModels()) {
          const params = parseModelParams(m);
          list.push({
            id: `lmstudio/${m}`,
            desc: `Local LM Studio [${params > 0 ? `${params}B` : "Local"}]`,
            params,
          });
        }
      }
    }

    // Sort models from highest parameter capacity down to lowest
    list.sort((a, b) => {
      if (b.params !== a.params) {
        return b.params - a.params;
      }
      return a.id.localeCompare(b.id);
    });

    this.cachedModelsList = list;
    this.lastModelCacheTime = now;
    return list;
  }

  /**
   * Suggests matching files and directories relative to the workspace.
   */
  public getFileSuggestions(
    rawQuery: string,
    workspacePath: string,
    prefixOverride?: string
  ): AutocompleteItem[] {
    try {
      const normalizedQuery = rawQuery.replace(/\\/g, "/");
      const dirPart = normalizedQuery.includes("/")
        ? normalizedQuery.slice(0, normalizedQuery.lastIndexOf("/"))
        : "";
      const searchTarget = path.join(workspacePath, dirPart);

      if (!fs.existsSync(searchTarget)) return [];

      const entries = fs.readdirSync(searchTarget, { withFileTypes: true });
      const suggestions: AutocompleteItem[] = [];

      for (const entry of entries) {
        if (entry.name.startsWith(".") && entry.name !== ".toolrc.yaml" && entry.name !== ".mcp.json") {
          continue;
        }
        if (entry.name === "node_modules" || entry.name === "dist") {
          continue;
        }

        const relativePath = dirPart ? `${dirPart}/${entry.name}` : entry.name;
        const formattedPath = entry.isDirectory() ? `${relativePath}/` : relativePath;

        if (fuzzyScore(formattedPath, normalizedQuery) >= 0) {
          const value = prefixOverride
            ? `${prefixOverride}${formattedPath}`
            : `@${formattedPath}`;

          suggestions.push({
            value,
            display: formattedPath,
            description: entry.isDirectory() ? "Directory" : "File",
            type: "file",
          });
        }
      }

      return suggestions.slice(0, 10);
    } catch {
      return [];
    }
  }
}
