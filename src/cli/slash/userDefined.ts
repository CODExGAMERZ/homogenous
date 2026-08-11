import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import yaml from "yaml";
import type { SlashCommand, CommandContext, CommandResult } from "./SlashCommand.js";
import { AgentLoop } from "../../agent/AgentLoop.js";

export class UserDefinedCommandLoader {
  public static loadCustomCommands(workspacePath: string): SlashCommand[] {
    const commands: SlashCommand[] = [];
    const dirsToScan = [
      path.join(os.homedir(), ".homogenous", "commands"),
      path.join(workspacePath, ".homogenous", "commands"),
    ];

    for (const dir of dirsToScan) {
      if (!fs.existsSync(dir)) continue;

      try {
        const files = fs.readdirSync(dir).filter((f) => f.endsWith(".md"));
        for (const file of files) {
          const cmdName = path.basename(file, ".md").toLowerCase();
          const filePath = path.join(dir, file);
          const content = fs.readFileSync(filePath, "utf-8");

          let description = `Custom user command /${cmdName}`;
          let usage = `/${cmdName} [args]`;
          let template = content;

          // Check for YAML frontmatter
          const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
          if (fmMatch) {
            try {
              const meta = yaml.parse(fmMatch[1]) as Record<string, string>;
              if (meta.description) description = meta.description;
              if (meta.usage) usage = meta.usage;
              template = fmMatch[2].trim();
            } catch {
              template = content;
            }
          } else {
            const lines = content.split("\n");
            if (lines[0] && lines[0].startsWith("#")) {
              description = lines[0].replace(/^#+\s*/, "").trim();
              template = lines.slice(1).join("\n").trim();
            }
          }

          commands.push({
            name: cmdName,
            description,
            category: "config",
            usage,
            execute: async (args: string[], ctx: CommandContext): Promise<CommandResult> => {
              let prompt = template;
              args.forEach((arg, idx) => {
                prompt = prompt.replace(new RegExp(`\\$${idx + 1}`, "g"), arg);
              });
              prompt = prompt.replace(/\$@/g, args.join(" "));

              ctx.sessionMemory.addMessage({ role: "user", content: prompt });
              const agent = new AgentLoop({ provider: ctx.provider, model: ctx.model });
              const answer = await agent.run(ctx.sessionMemory.getMessages());
              return { output: answer };
            },
          });
        }
      } catch {
        // Non-blocking fallback if scanning fails
      }
    }

    return commands;
  }
}
