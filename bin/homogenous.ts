#!/usr/bin/env node
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import chalk from "chalk";
import { runRepl } from "../src/cli/repl.js";
import { runOneshot } from "../src/cli/oneshot.js";
import { runInit } from "../src/cli/init.js";
import { runMemoryList, runRemember, runForget } from "../src/memory/commands.js";
import { SkillRegistry } from "../src/skills/SkillRegistry.js";
import { SkillInstaller } from "../src/skills/SkillInstaller.js";
import { McpConfigResolver } from "../src/mcp/config.js";

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
          describe: "Memory action: list, remember, or forget",
          choices: ["list", "remember", "forget"],
          demandOption: true,
        })
        .positional("args", {
          type: "string",
          array: true,
          describe: "Fact string or ID parameter",
        }),
    async (argv) => {
      const action = argv.action as string;
      const argsArr = (argv.args as string[]) || [];

      if (action === "list") {
        runMemoryList();
      } else if (action === "remember") {
        const factStr = argsArr.join(" ");
        if (!factStr) {
          console.error("Usage: homogenous memory remember \"fact text\"");
        } else {
          runRemember(factStr);
        }
      } else if (action === "forget") {
        const idStr = argsArr[0];
        if (!idStr) {
          console.error("Usage: homogenous memory forget <fact-id>");
        } else {
          runForget(idStr);
        }
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
          describe: "Action: list, create, or install",
          choices: ["list", "create", "install"],
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
      const action = argv.action as string;
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
          const pathCreated = registry.createSkillScaffold(target);
          console.log(chalk.green(`✓ Skill scaffolded at: ${pathCreated}`));
        }
      } else if (action === "install") {
        if (!target) {
          console.error("Usage: homogenous skills install <local-path | registry-name>");
        } else {
          await SkillInstaller.installSkill(target, isGlobal);
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
        describe: "Action: list",
        choices: ["list"],
        demandOption: true,
      }),
    async (argv) => {
      if (argv.action === "list") {
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
      }
    }
  )
  .strict()
  .help()
  .alias("h", "help")
  .version("3.3.1")
  .alias("v", "version")
  .parse();
