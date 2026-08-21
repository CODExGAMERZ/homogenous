import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { BaseTool, type ToolResult } from "./BaseTool.js";
import { execCommand, execFileDirect, tokenizeCommandLine, resolveLocalOrPathBinary } from "../../platform/shell.js";
import { promptCommandApproval } from "../../cli/ui/ConfirmPrompt.js";
import { resolveWorkspacePath, normalizePath, getProjectMemoryDir, isSensitiveSecurityPath } from "../../platform/paths.js";

export interface ShellToolOptions {
  autoApprove?: boolean;
  workspaceRoot?: string;
}

export interface AuditLogEntry {
  timestamp: string;
  command: string;
  binary?: string;
  args?: string[];
  autoApproved: boolean;
  exitCode: number;
  durationMs: number;
}

const auditLogEntries: AuditLogEntry[] = [];

export function getAuditLog(): AuditLogEntry[] {
  return [...auditLogEntries];
}

function recordAuditLog(entry: AuditLogEntry, workspaceRoot: string = process.cwd()): void {
  auditLogEntries.push(entry);
  try {
    const memoryDir = getProjectMemoryDir(workspaceRoot);
    if (fs.existsSync(memoryDir)) {
      const logFile = path.join(memoryDir, "audit.log");
      // Sanitize log entry to prevent token and secret key exposure
      const safeCommand = entry.command
        .replace(
          /((?:postgres|postgresql|mysql|mongodb(?:\+srv)?|redis|amqp|mssql):\/\/[^:\s\/]+:)([^@\s]+)(@)/gi,
          "$1[REDACTED_PASSWORD]$3"
        )
        .replace(
          /(?:bearer\s+[A-Za-z0-9_.-]{16,}|sk-(?:proj-|ant-|svcacct-)?[A-Za-z0-9_.-]{16,}|gsk_[A-Za-z0-9_.-]{16,}|nvapi-[A-Za-z0-9_.-]{16,}|ghp_[A-Za-z0-9_.-]{16,}|gho_[A-Za-z0-9_.-]{16,}|github_pat_[A-Za-z0-9_.-]{20,}|glpat-[A-Za-z0-9_.-]{16,}|hf_[A-Za-z0-9]{16,}|xox[baprs]-[A-Za-z0-9_.-]{10,}|AKIA[0-9A-Z]{16}|enc:v1:[a-f0-9:]+|eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9-_./+=]{10,})/gi,
          "[REDACTED]"
        );
      const safeEntry = {
        ...entry,
        command: safeCommand,
      };
      fs.appendFileSync(logFile, JSON.stringify(safeEntry) + "\n", { encoding: "utf-8", mode: 0o600 });
    }
  } catch {
    // Non-blocking audit disk append
  }
}

export class ShellExecuteTool extends BaseTool {
  readonly name = "shell_execute";
  readonly description =
    "Execute terminal shell command. Non-destructive allowlisted inspection commands auto-execute in auto mode; other commands prompt for user approval.";
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

  public autoApprove: boolean;
  public workspaceRoot: string;

  constructor(options: ShellToolOptions = {}) {
    super();
    this.autoApprove = options.autoApprove ?? false;
    this.workspaceRoot = options.workspaceRoot ?? process.cwd();
  }

  /**
   * Evaluates whether a command matches the strict structural allowlist of safe read-only operations
   * and guarantees that all path arguments strictly reside inside the workspace root (no traversal, no ~).
   */
  public isSafeCommand(cmd: string, workspaceRoot: string = this.workspaceRoot): boolean {
    if (!cmd || typeof cmd !== "string") return false;

    // Reject commands containing unquoted tilde before or after tokenization
    if (/(?:^|\s)~(?:[\/\\]|\s|$)/.test(cmd)) {
      return false;
    }

    const tokenized = tokenizeCommandLine(cmd);
    if (!tokenized) {
      return false;
    }

    const bin = tokenized.binary.toLowerCase();
    const args = tokenized.args;

    // 1. File inspection commands: verify all arguments stay within workspace containment
    const FILE_INSPECT_BINS = ["cat", "type", "head", "tail", "ls", "dir"];
    if (FILE_INSPECT_BINS.includes(bin)) {
      // Parse non-flag path arguments
      const pathArgs = args.filter((arg) => {
        if (arg.startsWith("-")) return false;
        // Windows dir flags e.g. /s, /a, /b, /q
        if (/^\/[a-zA-Z](\:.*)?$/.test(arg) || /^\/(on|oe|og|os|od|ad|ah|ar|as|aa)$/i.test(arg)) return false;
        return true;
      });

      if (pathArgs.length === 0) {
        return true;
      }

      for (const targetPath of pathArgs) {
        if (targetPath.includes("~")) return false;
        if (isSensitiveSecurityPath(targetPath)) return false;
        try {
          const resolved = resolveWorkspacePath(workspaceRoot, targetPath);
          if (isSensitiveSecurityPath(resolved)) return false;
        } catch {
          return false;
        }
      }
      return true;
    }

    // 2. Pure read-only environment / version commands (no arguments or specific flag arguments)
    if (bin === "pwd" || bin === "whoami") {
      return args.length === 0;
    }

    if (bin === "date" || bin === "time") {
      return args.length === 0 || (args.length === 1 && args[0].toLowerCase() === "/t");
    }

    if (bin === "node") {
      return args.length === 1 && (args[0] === "-v" || args[0] === "--version");
    }

    if (bin === "npm") {
      if (args.length === 1 && (args[0] === "-v" || args[0] === "--version" || args[0] === "list")) {
        return true;
      }
      return false;
    }

    if (bin === "tsc") {
      if (args.length === 1 && (args[0] === "--noEmit" || args[0] === "-b")) {
        return true;
      }
      return false;
    }

    if (bin === "echo") {
      // Echo is safe only without redirection or subshells (already filtered by tokenizeCommandLine)
      return true;
    }

    return false;
  }

  /**
   * Executes Node-native file inspection for cat/type/head/tail/ls/dir with full symlink containment.
   */
  private executeNodeNativeInspect(bin: string, args: string[], workspaceRoot: string): ToolResult {
    const startTime = Date.now();
    try {
      const pathArgs = args.filter((arg) => {
        if (arg.startsWith("-")) return false;
        if (/^\/[a-zA-Z](\:.*)?$/.test(arg) || /^\/(on|oe|og|os|od|ad|ah|ar|as|aa)$/i.test(arg)) return false;
        return true;
      });

      if (bin === "ls" || bin === "dir") {
        const targetRel = pathArgs[0] || ".";
        const absTarget = resolveWorkspacePath(workspaceRoot, targetRel);
        if (isSensitiveSecurityPath(absTarget) || isSensitiveSecurityPath(targetRel)) {
          return { ok: false, isError: true, content: `Access denied: Directory '${targetRel}' is a restricted security path.` };
        }
        const entries = fs.readdirSync(absTarget, { withFileTypes: true });
        const lines = entries
          .filter((e) => !isSensitiveSecurityPath(path.join(absTarget, e.name)))
          .map((e) => `${e.isDirectory() ? "[DIR] " : "      "}${e.name}`);
        const content = lines.length > 0 ? lines.join("\n") : "(empty directory)";
        recordAuditLog({
          timestamp: new Date().toISOString(),
          command: `${bin} ${args.join(" ")}`,
          binary: bin,
          args,
          autoApproved: true,
          exitCode: 0,
          durationMs: Date.now() - startTime,
        }, workspaceRoot);
        return { ok: true, content };
      } else {
        // cat, type, head, tail
        if (pathArgs.length === 0) {
          return { ok: false, isError: true, content: `Error: No file specified for ${bin}.` };
        }
        const targetRel = pathArgs[0];
        const absTarget = resolveWorkspacePath(workspaceRoot, targetRel);
        if (isSensitiveSecurityPath(absTarget) || isSensitiveSecurityPath(targetRel)) {
          return { ok: false, isError: true, content: `Access denied: File '${targetRel}' is a protected security credential/vault path.` };
        }
        if (!fs.existsSync(absTarget)) {
          return { ok: false, isError: true, content: `Error: File '${targetRel}' does not exist.` };
        }
        const fileContent = fs.readFileSync(absTarget, "utf-8");
        const lines = fileContent.split(/\r?\n/);
        let outputLines = lines;
        if (bin === "head") {
          outputLines = lines.slice(0, 20);
        } else if (bin === "tail") {
          outputLines = lines.slice(Math.max(0, lines.length - 20));
        }
        const content = outputLines.join("\n");
        recordAuditLog({
          timestamp: new Date().toISOString(),
          command: `${bin} ${args.join(" ")}`,
          binary: bin,
          args,
          autoApproved: true,
          exitCode: 0,
          durationMs: Date.now() - startTime,
        }, workspaceRoot);
        return { ok: true, content };
      }
    } catch (err) {
      return { ok: false, isError: true, content: `Inspection error: ${(err as Error).message}` };
    }
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

    const trimmed = command.trim();
    const isSafe = this.isSafeCommand(trimmed, this.workspaceRoot);

    // Unconditional Rule: If autoApprove is false, ALL commands prompt for user approval.
    // If autoApprove is true, only allowlisted safe commands execute automatically.
    const canAutoExecute = this.autoApprove && isSafe;

    if (!canAutoExecute) {
      const approved = await promptCommandApproval(trimmed);
      if (!approved) {
        return {
          ok: false,
          isError: true,
          content: `Execution rejected: User explicitly declined execution of command '${trimmed}'. Do NOT retry this command or request approval again for this turn. Answer the user directly using existing knowledge or proceed to the next step.`,
        };
      }
    }

    const tokenized = tokenizeCommandLine(trimmed);
    const bin = tokenized ? tokenized.binary.toLowerCase() : "";
    const args = tokenized ? tokenized.args : [];

    // Safe execution path under autoApprove: true
    if (canAutoExecute && tokenized) {
      const FILE_INSPECT_BINS = ["cat", "type", "head", "tail", "ls", "dir"];
      if (FILE_INSPECT_BINS.includes(bin)) {
        return this.executeNodeNativeInspect(bin, args, this.workspaceRoot);
      }

      // Standalone allowlisted binary execution via execFileDirect
      const resolvedBinary = resolveLocalOrPathBinary(bin, this.workspaceRoot);
      const startTime = Date.now();
      const result = await execFileDirect(resolvedBinary, args, { cwd: this.workspaceRoot, timeoutMs: 30000 });
      const combinedOutput = (result.stdout + "\n" + result.stderr).trim();

      recordAuditLog({
        timestamp: new Date().toISOString(),
        command: trimmed,
        binary: resolvedBinary,
        args,
        autoApproved: true,
        exitCode: result.exitCode,
        durationMs: Date.now() - startTime,
      }, this.workspaceRoot);

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
    }

    // User-approved command execution via execCommand with timeout
    const startTime = Date.now();
    try {
      const result = await execCommand(trimmed, { cwd: this.workspaceRoot, timeoutMs: 30000 });
      const combinedOutput = (result.stdout + "\n" + result.stderr).trim();

      recordAuditLog({
        timestamp: new Date().toISOString(),
        command: trimmed,
        autoApproved: false,
        exitCode: result.exitCode,
        durationMs: Date.now() - startTime,
      }, this.workspaceRoot);

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
