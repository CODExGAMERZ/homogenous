import { z } from "zod";
import { BaseTool, type ToolResult } from "./BaseTool.js";
import { execCommand } from "../../platform/shell.js";
import { promptCommandApproval } from "../../cli/ui/ConfirmPrompt.js";

import { resolveWorkspacePath, normalizePath } from "../../platform/paths.js";

// Commands that are purely informational with no file target arguments
const PURE_SAFE_COMMANDS = [
  "git status",
  "git diff",
  "git log",
  "git branch",
  "node -v",
  "npm -v",
  "npm list",
  "whoami",
  "pwd",
  "date",
  "time",
  "date /t",
  "time /t",
  "echo",
];

// Commands that read files or directories from filesystem
const FILE_INSPECT_COMMANDS = ["cat", "ls", "dir", "head", "tail", "type"];

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
   * Evaluates whether a command is strictly a safe read-only operation AND contained within the workspace.
   * Rejects any command containing shell chaining, redirection, variable expansion, or path traversal escaping root.
   */
  public isSafeCommand(cmd: string, workspaceRoot: string = process.cwd()): boolean {
    if (!cmd || typeof cmd !== "string") return false;

    // 1. Immediately reject commands containing shell chaining or expansion metacharacters
    if (SHELL_METACHARS_REGEX.test(cmd)) {
      return false;
    }

    const trimmed = cmd.trim();
    const lower = trimmed.toLowerCase();

    // 2. Pure safe commands (no target path arguments)
    if (PURE_SAFE_COMMANDS.some((safe) => lower === safe || lower.startsWith(`${safe} `))) {
      return true;
    }

    // 3. File inspection commands: verify all arguments stay within workspace containment
    for (const fileCmd of FILE_INSPECT_COMMANDS) {
      if (lower === fileCmd) {
        return true; // e.g. "ls" or "dir" with no args targets cwd, which is contained
      }
      if (lower.startsWith(`${fileCmd} `)) {
        // Parse arguments: flags start with - or on Windows /s, /w, /b, /a etc (single-character or word flag)
        const rawArgs = trimmed.slice(fileCmd.length).trim().split(/\s+/);
        const pathArgs = rawArgs.filter((arg) => {
          if (arg.startsWith("-")) return false;
          // Windows flag e.g. /s, /a, /b, /q (not an absolute path like /root or /etc)
          if (/^\/[a-zA-Z](\:.*)?$/.test(arg) || /^\/(on|oe|og|os|od|ad|ah|ar|as|aa)$/i.test(arg)) return false;
          return true;
        });

        if (pathArgs.length === 0) {
          return true;
        }

        // Validate each target path against workspace containment
        for (const targetPath of pathArgs) {
          try {
            resolveWorkspacePath(workspaceRoot, targetPath);
          } catch {
            // Target path escapes workspace root or contains traversal!
            return false;
          }
        }
        return true;
      }
    }

    return false;
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
