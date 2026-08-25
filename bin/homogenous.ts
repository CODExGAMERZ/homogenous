#!/usr/bin/env node
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import chalk from "chalk";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runRepl } from "../src/cli/repl.js";
import { runOneshot } from "../src/cli/oneshot.js";
import { runInit } from "../src/cli/init.js";
import { runMemoryList, runRemember, runForget, runMemoryClear } from "../src/memory/commands.js";
import { SkillRegistry } from "../src/skills/SkillRegistry.js";
import { SkillInstaller } from "../src/skills/SkillInstaller.js";
import { McpConfigResolver } from "../src/mcp/config.js";
import { McpClientManager } from "../src/mcp/McpClientManager.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let pkgVersion = "4.2.6";
try {
  const pkgPath = path.resolve(__dirname, "../../package.json");
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
    if (pkg.version) pkgVersion = pkg.version;
  } else {
    const altPkgPath = path.resolve(__dirname, "../package.json");
    if (fs.existsSync(altPkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(altPkgPath, "utf-8"));
      if (pkg.version) pkgVersion = pkg.version;
    }
  }
} catch {
  // Fallback default
}

yargs(hideBin(process.argv))
  .scriptName("homogenous")
  .usage("$0 <command> [options]")
  .command(
    ["$0", "chat"],
    "Start an interactive REPL chat session",
    (y) =>
      y.option("model", {
        type: "string",
        alias: "m",
        describe: "Model identifier override",
      }),
    async (argv) => {
      await runRepl({ model: argv.model });
    }
  )
  .command(
    "oneshot <prompt>",
    "Run a non-interactive single prompt command",
    (y) =>
      y
        .positional("prompt", {
          type: "string",
          describe: "Prompt to execute",
          demandOption: true,
        })
        .option("model", {
          type: "string",
          alias: "m",
          describe: "Model identifier override",
        }),
    async (argv) => {
      await runOneshot(argv.prompt as string, { model: argv.model });
    }
  )
  .command(
    "init",
    "Initialize Homogenous config and memory in current project directory",
    {},
    async () => {
      await runInit();
    }
  )
  .command(
    "memory <action> [args..]",
    "Manage persistent project memory facts",
    (y) =>
      y
        .positional("action", {
          type: "string",
          describe: "Memory action: list, add/remember, remove/forget, or clear",
          choices: ["list", "add", "remember", "remove", "forget", "delete", "clear"],
          demandOption: true,
        })
        .positional("args", {
          type: "string",
          array: true,
          describe: "Fact string or ID parameter",
        }),
    async (argv) => {
      const action = (argv.action as string).toLowerCase();
      const argsArr = (argv.args as string[]) || [];

      if (action === "list") {
        runMemoryList();
      } else if (action === "remember" || action === "add") {
        const factStr = argsArr.join(" ");
        if (!factStr) {
          console.error("Usage: homogenous memory add \"fact text\"");
        } else {
          runRemember(factStr);
        }
      } else if (action === "forget" || action === "remove" || action === "delete") {
        const idStr = argsArr[0];
        if (!idStr) {
          console.error("Usage: homogenous memory remove <fact-id>");
        } else {
          runForget(idStr);
        }
      } else if (action === "clear") {
        runMemoryClear();
      }
    }
  )
  .command(
    "skills <action> [target]",
    "Manage dynamic skills packs",
    (y) =>
      y
        .positional("action", {
          type: "string",
          describe: "Action: list, create, install, or remove",
          choices: ["list", "create", "install", "remove", "uninstall"],
          demandOption: true,
        })
        .positional("target", {
          type: "string",
          describe: "Skill pack name, local path, or registry name",
        })
        .option("global", {
          type: "boolean",
          alias: "g",
          describe: "Install skill globally into ~/.homogenous/skills/",
        }),
    async (argv) => {
      const action = (argv.action as string).toLowerCase();
      const target = argv.target as string | undefined;
      const isGlobal = argv.global as boolean | undefined;
      const registry = SkillRegistry.getInstance();

      if (action === "list") {
        const skills = registry.listSkills();
        console.log(chalk.bold.cyan("\n--- Installed Dynamic Skill Packs ---"));
        for (const s of skills) {
          console.log(
            `- ${chalk.bold.green(s.metadata.name)} (v${s.metadata.version || "1.0.0"}): ${s.metadata.description}`
          );
          console.log(
            `  ${chalk.dim(`Triggers: [${s.metadata.triggers?.keywords?.join(", ") || "none"}]`)}`
          );
        }
        console.log();
      } else if (action === "create") {
        if (!target) {
          console.error("Usage: homogenous skills create <skill-name>");
        } else {
          try {
            const pathCreated = registry.createSkillScaffold(target);
            console.log(chalk.green(`✓ Skill scaffolded at: ${pathCreated}`));
          } catch (err) {
            console.error(chalk.red(`Error: ${(err as Error).message}`));
          }
        }
      } else if (action === "install") {
        if (!target) {
          console.error("Usage: homogenous skills install <local-path | registry-name>");
        } else {
          await SkillInstaller.installSkill(target, isGlobal);
        }
      } else if (action === "remove" || action === "uninstall") {
        if (!target) {
          console.error("Usage: homogenous skills remove <skill-name>");
        } else {
          SkillInstaller.removeSkill(target, isGlobal);
        }
      }
    }
  )
  .command(
    "mcp <action>",
    "Manage configured Model Context Protocol (MCP) servers",
    (y) =>
      y.positional("action", {
        type: "string",
        describe: "Action: list or reload",
        choices: ["list", "reload"],
        demandOption: true,
      }),
    async (argv) => {
      const action = (argv.action as string).toLowerCase();
      if (action === "list") {
        const servers = McpConfigResolver.loadMcpConfig();
        console.log(chalk.bold.cyan("\n--- Configured MCP Servers (.mcp.json) ---"));
        const entries = Object.entries(servers);
        if (entries.length === 0) {
          console.log(chalk.yellow("No MCP servers configured in .mcp.json"));
        } else {
          for (const [sName, cfg] of entries) {
            console.log(
              `- ${chalk.bold.green(sName)}: ${cfg.command} ${(cfg.args || []).join(" ")}`
            );
          }
        }
        console.log();
      } else if (action === "reload") {
        const servers = McpConfigResolver.loadMcpConfig();
        const tools = await McpClientManager.getInstance().reloadServers();
        console.log(chalk.green(`✓ Reloaded MCP configuration (${Object.keys(servers).length} servers, ${tools.length} active tools)`));
      }
    }
  )
  .strict()
  .help()
  .alias("h", "help")
  .version(pkgVersion)
  .alias("v", "version")
  .parse();
