import { z } from "zod";
import { BaseTool, type ToolResult } from "./BaseTool.js";
import { execCommand } from "../../platform/shell.js";
import { promptCommandApproval } from "../../cli/ui/ConfirmPrompt.js";

const SAFE_READ_COMMANDS = [
  "git status",
  "git diff",
  "git log",
  "git branch",
  "ls",
  "dir",
  "cat",
  "echo",
  "date",
  "time",
  "date /t",
  "time /t",
  "node -v",
  "npm -v",
  "npm list",
  "whoami",
  "pwd",
];

// Shell metacharacters and control operators that allow chaining, redirection, or expansion
const SHELL_METACHARS_REGEX = /[;&|`$()<>\n\r%^]/;

export class ShellExecuteTool extends BaseTool {
  readonly name = "shell_execute";
  readonly description =
    "Execute terminal shell command. Safe read-only commands auto-execute; state-modifying actions prompt for user approval.";
  readonly zodSchema = z.object({
    command: z.string().min(1, "Command must not be empty"),
  });
  readonly inputSchema = {
    type: "object",
    properties: {
      command: {
        type: "string",
        description: "Exact shell command line to execute.",
      },
    },
    required: ["command"],
  };

  /**
   * Evaluates whether a command is strictly a safe read-only operation.
   * Rejects any command containing shell chaining, redirection, or variable expansion operators.
   */
  public isSafeCommand(cmd: string): boolean {
    if (!cmd || typeof cmd !== "string") return false;

    // 1. Immediately reject commands containing shell chaining or expansion metacharacters
    if (SHELL_METACHARS_REGEX.test(cmd)) {
      return false;
    }

    const trimmed = cmd.trim().toLowerCase();
    return SAFE_READ_COMMANDS.some(
      (safe) => trimmed === safe || trimmed.startsWith(`${safe} `)
    );
  }

  async execute(input: Record<string, unknown>): Promise<ToolResult> {
    let command = input.command as string;

    if (!command || !command.trim()) {
      return {
        ok: false,
        isError: true,
        content: "Error: No command provided to execute.",
      };
    }

    // Normalize Windows date and time commands to non-interactive /t mode so they don't prompt for input
    if (process.platform === "win32") {
      const lower = command.trim().toLowerCase();
      if (lower === "date") command = "date /t";
      if (lower === "time") command = "time /t";
    }

    const safe = this.isSafeCommand(command);

    if (!safe) {
      const approved = await promptCommandApproval(command);
      if (!approved) {
        return {
          ok: false,
          isError: true,
          content: `Execution rejected: User explicitly declined execution of command '${command}'. Do NOT retry this command or request approval again for this turn. Answer the user directly using existing knowledge or proceed to the next step.`,
        };
      }
    }

    try {
      const result = await execCommand(command, { timeoutMs: 30000 });
      const combinedOutput = (result.stdout + "\n" + result.stderr).trim();

      if (result.exitCode === 0) {
        return {
          ok: true,
          content: combinedOutput || "Command executed successfully with no stdout output.",
        };
      } else {
        return {
          ok: false,
          isError: true,
          content: `Command exited with non-zero status code ${result.exitCode}:\n\n${combinedOutput}`,
        };
      }
    } catch (err) {
      return {
        ok: false,
        isError: true,
        content: `Command execution exception: ${(err as Error).message}`,
      };
    }
  }
}
