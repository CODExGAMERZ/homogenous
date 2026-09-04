import type { SlashCommand, CommandContext, CommandResult } from "./SlashCommand.js";
import { sessionCommands } from "./builtin/session.js";
import { modelCommands } from "./builtin/model.js";
import { memoryCommands } from "./builtin/memory.js";
import { skillsCommands } from "./builtin/skills.js";
import { mcpCommands } from "./builtin/mcp.js";
import { modeCommands } from "./builtin/mode.js";
import { budgetCommands } from "./builtin/budget.js";
import { diffCommands } from "./builtin/diff.js";
import { metaCommands } from "./builtin/meta.js";
import { copyCommand } from "./builtin/copy.js";
import { doctorCommand } from "./builtin/doctor.js";
import { themeCommand } from "./builtin/theme.js";
import { UserDefinedCommandLoader } from "./userDefined.js";

export class SlashCommandRegistry {
  private static instance: SlashCommandRegistry;
  private commandsMap: Map<string, SlashCommand>;

  private constructor() {
    this.commandsMap = new Map();
    this.registerBuiltInCommands();
  }

  public static getInstance(): SlashCommandRegistry {
    if (!SlashCommandRegistry.instance) {
      SlashCommandRegistry.instance = new SlashCommandRegistry();
    }
    return SlashCommandRegistry.instance;
  }

  public registerCommand(command: SlashCommand) {
    this.commandsMap.set(command.name.toLowerCase(), command);
  }

  public getCommand(name: string): SlashCommand | undefined {
    return this.commandsMap.get(name.toLowerCase().replace(/^\//, ""));
  }

  public listCommands(): SlashCommand[] {
    return Array.from(this.commandsMap.values());
  }

  /**
   * Tab-completion / autocomplete matching for partial input (e.g. '/mo' -> '/model', '/memory').
   */
  public autocomplete(partialInput: string): string[] {
    if (!partialInput.startsWith("/")) return [];
    const term = partialInput.slice(1).toLowerCase();
    return Array.from(this.commandsMap.keys())
      .filter((k) => k.startsWith(term))
      .map((k) => `/${k}`);
  }

  /**
   * Dispatches and executes a user input if it is a slash command.
   */
  public async dispatch(
    input: string,
    context: CommandContext
  ): Promise<CommandResult | null> {
    if (!input.trim().startsWith("/")) return null;

    // Load any user-defined custom commands dynamically before dispatching
    const userCmds = UserDefinedCommandLoader.loadCustomCommands(context.workspacePath);
    for (const cmd of userCmds) {
      this.registerCommand(cmd);
    }

    const parts = input.trim().slice(1).split(/\s+/);
    const cmdName = parts[0].toLowerCase();
    const args = parts.slice(1);

    const cmd = this.commandsMap.get(cmdName);
    if (!cmd) {
      return {
        output: `Unknown slash command '/${cmdName}'. Type /help to view available commands.`,
      };
    }

    try {
      return await cmd.execute(args, context);
    } catch (err) {
      return {
        output: `Error executing /${cmdName}: ${(err as Error).message}`,
      };
    }
  }

  private registerBuiltInCommands() {
    const allBuiltins = [
      ...sessionCommands,
      ...modelCommands,
      ...memoryCommands,
      ...skillsCommands,
      ...mcpCommands,
      ...modeCommands,
      ...budgetCommands,
      ...diffCommands,
      ...metaCommands,
      copyCommand,
      doctorCommand,
      themeCommand,
    ];

    for (const cmd of allBuiltins) {
      this.registerCommand(cmd);
    }
  }
}
