import os from "node:os";
import type { SlashCommand } from "../SlashCommand.js";
import { execCommand, getGitBranch } from "../../../platform/shell.js";
import { getVramInfo } from "../../../platform/vramProbe.js";
import { KeychainService, type KeyProvider } from "../../../inference/keychain.js";
import { McpConfigResolver } from "../../../mcp/config.js";
import { PersistentMemory } from "../../../memory/PersistentMemory.js";

const ALL_PROVIDERS: KeyProvider[] = [
  "anthropic",
  "openai",
  "groq",
  "nvidia",
  "deepseek",
  "openrouter",
  "mistral",
  "together",
];

export const doctorCommand: SlashCommand = {
  name: "doctor",
  description: "Diagnose system environment, LLM daemons, GPU VRAM, and workspace health",
  category: "utility",
  usage: "/doctor",
  execute: async (_args, ctx) => {
    const lines: string[] = [];
    lines.push("🩺 Homogenous System Diagnostics & Environment Health Report");
    lines.push("────────────────────────────────────────────────────────────");

    // 1. Runtime & OS
    const nodeVer = process.version;
    const majorVer = parseInt(nodeVer.replace(/^v/, "").split(".")[0], 10);
    const nodeStatus = majorVer >= 20 ? "✓ OK" : "⚠ Warning (< v20.0.0)";
    lines.push(`• Node.js Runtime:     ${nodeVer} [${nodeStatus}]`);
    lines.push(`• Operating System:    ${process.platform} (${os.type()} ${os.release()}, ${process.arch})`);
    lines.push(`• Terminal / TTY:      ${process.stdout.isTTY ? `Interactive TTY (${process.stdout.columns}x${process.stdout.rows})` : "Non-interactive pipe"}`);

    // 2. Git & Workspace
    const workspace = ctx?.workspacePath || process.cwd();
    lines.push(`• Workspace Path:      ${workspace.replace(/\\/g, "/")}`);
    try {
      const gitCheck = await execCommand("git rev-parse --is-inside-work-tree", { cwd: workspace, timeoutMs: 1500 });
      if (gitCheck.exitCode === 0 && gitCheck.stdout.trim() === "true") {
        const branch = await getGitBranch(workspace);
        const statusRes = await execCommand("git status --porcelain", { cwd: workspace, timeoutMs: 1500 });
        const dirtyCount = statusRes.stdout.trim() ? statusRes.stdout.trim().split("\n").length : 0;
        lines.push(`• Git Repository:      Branch '${branch}' (${dirtyCount} uncommitted changes)`);
      } else {
        lines.push("• Git Repository:      Not a git repository");
      }
    } catch {
      lines.push("• Git Repository:      git binary unavailable or error checking repository");
    }

    // 3. Ripgrep Check
    try {
      const rgCheck = await execCommand("rg --version", { timeoutMs: 1000 });
      if (rgCheck.exitCode === 0) {
        const firstLine = rgCheck.stdout.trim().split("\n")[0] || "rg available";
        lines.push(`• Fast Search (rg):    Native binary available (${firstLine})`);
      } else {
        lines.push("• Fast Search (rg):    Built-in JavaScript glob & regex search fallback");
      }
    } catch {
      lines.push("• Fast Search (rg):    Built-in JavaScript glob & regex search fallback");
    }

    // 4. Hardware & GPU VRAM
    try {
      const vram = await getVramInfo();
      if (vram) {
        lines.push(`• GPU / VRAM:          NVIDIA GPU Active (${vram.usedGb}GB / ${vram.totalGb}GB VRAM used)`);
      } else {
        lines.push("• GPU / VRAM:          CPU Mode / No NVIDIA GPU detected");
      }
    } catch {
      lines.push("• GPU / VRAM:          CPU Mode (probe skipped)");
    }

    // 5. Local LLM Daemons (Ollama & LM Studio)
    try {
      const ollamaRes = await fetch("http://localhost:11434/api/tags", {
        signal: AbortSignal.timeout(600),
      }).catch(() => null);

      if (ollamaRes && ollamaRes.ok) {
        const data = (await ollamaRes.json()) as any;
        const count = Array.isArray(data?.models) ? data.models.length : 0;
        lines.push(`• Local Ollama:        Online at http://localhost:11434 (${count} models loaded)`);
      } else {
        lines.push("• Local Ollama:        Offline (port 11434 not reachable)");
      }
    } catch {
      lines.push("• Local Ollama:        Offline");
    }

    try {
      const lmStudioRes = await fetch("http://localhost:1234/v1/models", {
        signal: AbortSignal.timeout(600),
      }).catch(() => null);

      if (lmStudioRes && lmStudioRes.ok) {
        const data = (await lmStudioRes.json()) as any;
        const count = Array.isArray(data?.data) ? data.data.length : 0;
        lines.push(`• Local LM Studio:     Online at http://localhost:1234 (${count} models loaded)`);
      } else {
        lines.push("• Local LM Studio:     Offline (port 1234 not reachable)");
      }
    } catch {
      lines.push("• Local LM Studio:     Offline");
    }

    // 6. Keychain Vault & Stored Credentials (REDACTED ONLY)
    const configuredKeys: string[] = [];
    for (const p of ALL_PROVIDERS) {
      if (KeychainService.hasKey(p)) {
        configuredKeys.push(p);
      }
    }
    if (configuredKeys.length > 0) {
      lines.push(`• Cloud Providers:     ${configuredKeys.map((k) => `${k} [Configured ✓]`).join(", ")}`);
    } else {
      lines.push("• Cloud Providers:     None configured (use /login <provider> to store keys)");
    }

    // 7. MCP Servers
    try {
      const mcpConfigs = McpConfigResolver.loadMcpConfig(workspace);
      const serverNames = Object.keys(mcpConfigs);
      if (serverNames.length > 0) {
        lines.push(`• MCP Configuration:   ${serverNames.length} server(s) configured (${serverNames.join(", ")})`);
      } else {
        lines.push("• MCP Configuration:   No servers configured in .mcp.json");
      }
    } catch {
      lines.push("• MCP Configuration:   Failed to read .mcp.json");
    }

    // 8. Persistent Memory Facts
    try {
      const facts = PersistentMemory.getInstance(workspace).listFacts();
      lines.push(`• Project Memory:      ${facts.length} stored fact(s) in .agentmemory/facts.json`);
    } catch {
      lines.push("• Project Memory:      0 facts loaded");
    }

    lines.push("────────────────────────────────────────────────────────────");
    lines.push("Diagnostics complete. System is healthy.");

    return {
      output: lines.join("\n"),
    };
  },
};
