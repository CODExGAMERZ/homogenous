import fs from "node:fs";
import type { SlashCommand, CommandContext } from "../SlashCommand.js";
import { resolvePath, getProjectMemoryDir } from "../../../platform/paths.js";
import { SlashCommandRegistry } from "../SlashCommandRegistry.js";

export const sessionCommands: SlashCommand[] = [
  {
    name: "help",
    description: "List all available slash commands and usage",
    category: "session",
    execute: async () => {
      const registry = SlashCommandRegistry.getInstance();
      const cmds = registry.listCommands();
      const lines = ["✦ Available Slash Commands:"];
      for (const c of cmds) {
        lines.push(`  /${c.name.padEnd(14)} - ${c.description}`);
      }
      return { output: lines.join("\n") };
    },
  },
  {
    name: "exit",
    description: "Exit the interactive REPL session cleanly",
    category: "session",
    execute: async () => ({ output: "Goodbye!", exitSession: true }),
  },
  {
    name: "quit",
    description: "Exit the interactive REPL session cleanly",
    category: "session",
    execute: async () => ({ output: "Goodbye!", exitSession: true }),
  },
  {
    name: "clear",
    description: "Reset active conversation session chat history",
    category: "session",
    execute: async (_, ctx) => {
      ctx.sessionMemory.clear();
      ctx.setFeed?.([]);
      return { output: "Session chat history cleared." };
    },
  },
  {
    name: "save",
    description: "Save session conversation state to .agentmemory/sessions/",
    category: "session",
    usage: "/save [session-name]",
    execute: async (args, ctx) => {
      const name = args[0] || `session-${Date.now()}`;
      const sessionsDir = resolvePath(getProjectMemoryDir(ctx.workspacePath), "sessions");
      if (!fs.existsSync(sessionsDir)) fs.mkdirSync(sessionsDir, { recursive: true });

      const sessionPath = resolvePath(sessionsDir, `${name}.json`);
      fs.writeFileSync(sessionPath, JSON.stringify(ctx.sessionMemory.getMessages(), null, 2), "utf-8");
      return { output: `Saved session state to ${sessionPath}` };
    },
  },
  {
    name: "resume",
    description: "Resume saved session conversation state from .agentmemory/sessions/",
    category: "session",
    usage: "/resume [session-name]",
    execute: async (args, ctx) => {
      const name = args[0];
      if (!name) return { output: "Usage: /resume [session-name]" };
      const sessionsDir = resolvePath(getProjectMemoryDir(ctx.workspacePath), "sessions");
      const sessionPath = resolvePath(sessionsDir, `${name}.json`);

      if (!fs.existsSync(sessionPath)) return { output: `Saved session '${name}' not found at ${sessionPath}` };

      try {
        const raw = fs.readFileSync(sessionPath, "utf-8");
        const msgs = JSON.parse(raw);
        ctx.sessionMemory.setMessages(msgs);
        return { output: `Resumed session '${name}' (${msgs.length} messages loaded)` };
      } catch (err) {
        return { output: `Error loading session '${name}': ${(err as Error).message}` };
      }
    },
  },
];
