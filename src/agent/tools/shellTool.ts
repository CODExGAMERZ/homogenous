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
  "node -v",
  "npm -v",
  "npm list",
  "whoami",
  "pwd",
];

export class ShellExecuteTool extends BaseTool {
  readonly name = "shell_execute";
  readonly description =
    "Execute terminal shell command. Safe read-only commands auto-execute; state-modifying actions prompt for user approval.";
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

  private isSafeCommand(cmd: string): boolean {
    const trimmed = cmd.trim().toLowerCase();
    return SAFE_READ_COMMANDS.some(
      (safe) => trimmed === safe || trimmed.startsWith(`${safe} `)
    );
  }

  async execute(input: Record<string, unknown>): Promise<ToolResult> {
    const command = input.command as string;

    if (!command || !command.trim()) {
      return {
        ok: false,
        isError: true,
        content: "Error: No command provided to execute.",
      };
    }

    const safe = this.isSafeCommand(command);

    if (!safe) {
      const approved = await promptCommandApproval(command);
      if (!approved) {
        return {
          ok: false,
          isError: true,
          content: `Execution rejected: User declined execution of command '${command}'.`,
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
