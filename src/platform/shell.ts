import fs from "node:fs";
import path from "node:path";
import spawn from "cross-spawn";
import os from "node:os";

export interface ShellExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
}

export interface ShellExecOptions {
  cwd?: string;
  env?: Record<string, string>;
  timeoutMs?: number;
  shell?: boolean | string;
}

/**
 * Tokenizes a command line string into binary and arguments array without shell interpretation.
 * Handles double quotes, single quotes, and escaped characters.
 * Returns null if the command contains syntax errors (unterminated quotes, trailing backslash)
 * or dangerous shell metacharacters.
 */
export function tokenizeCommandLine(commandStr: string): { binary: string; args: string[] } | null {
  if (!commandStr || typeof commandStr !== "string") return null;

  const trimmed = commandStr.trim();
  if (!trimmed) return null;

  // Reject raw shell metacharacters at boundary
  if (/[;&|`$()<>\n\r%^]/.test(trimmed)) {
    return null;
  }

  const tokens: string[] = [];
  let currentToken = "";
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let isEscaped = false;
  let hasTokenChar = false;

  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i];

    if (isEscaped) {
      currentToken += char;
      hasTokenChar = true;
      isEscaped = false;
      continue;
    }

    if (char === "\\") {
      if (inSingleQuote) {
        // In POSIX single quotes, backslash is literal
        currentToken += char;
        hasTokenChar = true;
      } else if (i === trimmed.length - 1) {
        // Trailing backslash is an unclosed escape
        isEscaped = true;
      } else if (os.platform() === "win32") {
        const nextChar = trimmed[i + 1];
        // On Windows, escape if followed by quote, space, or another backslash
        if (nextChar === '"' || nextChar === "'" || /\s/.test(nextChar) || nextChar === "\\") {
          isEscaped = true;
        } else {
          currentToken += char;
          hasTokenChar = true;
        }
      } else {
        isEscaped = true;
      }
      continue;
    }

    if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      hasTokenChar = true;
      continue;
    }

    if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      hasTokenChar = true;
      continue;
    }

    if (/\s/.test(char) && !inSingleQuote && !inDoubleQuote) {
      if (hasTokenChar) {
        tokens.push(currentToken);
        currentToken = "";
        hasTokenChar = false;
      }
      continue;
    }

    currentToken += char;
    hasTokenChar = true;
  }

  // If ended in an escape or unclosed quote, fail tokenization
  if (isEscaped || inSingleQuote || inDoubleQuote) {
    return null;
  }

  if (hasTokenChar) {
    tokens.push(currentToken);
  }

  if (tokens.length === 0) return null;

  return {
    binary: tokens[0],
    args: tokens.slice(1),
  };
}

/**
 * Resolves a binary command from workspace node_modules/.bin (or .cmd on Windows)
 * before falling back to system PATH.
 */
export function resolveLocalOrPathBinary(binary: string, workspaceRoot: string = process.cwd()): string {
  const isWindows = os.platform() === "win32";
  const localBinDir = path.join(workspaceRoot, "node_modules", ".bin");

  if (isWindows) {
    const candidateCmd = path.join(localBinDir, `${binary}.cmd`);
    if (fs.existsSync(candidateCmd)) return candidateCmd;
    const candidateExe = path.join(localBinDir, `${binary}.exe`);
    if (fs.existsSync(candidateExe)) return candidateExe;
    const candidatePs1 = path.join(localBinDir, `${binary}.ps1`);
    if (fs.existsSync(candidatePs1)) return candidatePs1;
  } else {
    const candidate = path.join(localBinDir, binary);
    if (fs.existsSync(candidate)) return candidate;
  }

  return binary;
}

/**
 * Determines default shell launcher for current operating system.
 */
export function getDefaultShell(): string {
  if (os.platform() === "win32") {
    return process.env.COMSPEC || "cmd.exe";
  }
  return process.env.SHELL || "/bin/bash";
}

/**
 * Executes a shell command synchronously or asynchronously with timeout protection and cross-platform escaping.
 */
export function execCommand(
  command: string,
  options: ShellExecOptions = {}
): Promise<ShellExecResult> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const cwd = options.cwd || process.cwd();
    const isWindows = os.platform() === "win32";

    let shellCmd: string;
    let args: string[];

    if (isWindows) {
      shellCmd = process.env.COMSPEC || "cmd.exe";
      args = ["/d", "/s", "/c", command];
    } else {
      shellCmd = process.env.SHELL || "/bin/sh";
      args = ["-c", command];
    }

    const child = spawn(shellCmd, args, {
      cwd,
      env: { ...process.env, ...options.env },
      windowsVerbatimArguments: true,
      stdio: ["pipe", "pipe", "pipe"],
    });

    // Close stdin immediately so subprocesses don't hang waiting for input
    try {
      child.stdin?.end();
    } catch {
      // Ignore
    }

    let stdout = "";
    let stderr = "";
    let timedOut = false;

    let timer: NodeJS.Timeout | undefined;
    if (options.timeoutMs && options.timeoutMs > 0) {
      timer = setTimeout(() => {
        timedOut = true;
        if (child.pid) {
          if (isWindows) {
            try {
              spawn("taskkill", ["/pid", child.pid.toString(), "/T", "/F"]);
            } catch {
              child.kill("SIGTERM");
            }
          } else {
            child.kill("SIGTERM");
          }
        } else {
          child.kill("SIGTERM");
        }
      }, options.timeoutMs);
    }

    child.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf-8");
    });

    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf-8");
    });

    child.on("error", (err) => {
      if (timer) clearTimeout(timer);
      resolve({
        stdout,
        stderr: stderr + `\nProcess execution error: ${err.message}`,
        exitCode: 1,
        durationMs: Date.now() - startTime,
      });
    });

    child.on("close", (code) => {
      if (timer) clearTimeout(timer);
      const durationMs = Date.now() - startTime;
      if (timedOut) {
        resolve({
          stdout,
          stderr: stderr + `\nProcess timed out after ${options.timeoutMs}ms`,
          exitCode: 124,
          durationMs,
        });
      } else {
        resolve({
          stdout,
          stderr,
          exitCode: code ?? 0,
          durationMs,
        });
      }
    });
  });
}

/**
 * Executes an executable directly with argv array arguments without shell interpretation.
 * Eliminates shell command injection and argument parsing vulnerabilities.
 */
export function execFileDirect(
  file: string,
  args: string[],
  options: ShellExecOptions = {}
): Promise<ShellExecResult> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const cwd = options.cwd || process.cwd();
    const isWindows = os.platform() === "win32";

    const child = spawn(file, args, {
      cwd,
      env: { ...process.env, ...options.env },
      stdio: ["pipe", "pipe", "pipe"],
    });

    try {
      child.stdin?.end();
    } catch {
      // Ignore
    }

    let stdout = "";
    let stderr = "";
    let timedOut = false;

    let timer: NodeJS.Timeout | undefined;
    if (options.timeoutMs && options.timeoutMs > 0) {
      timer = setTimeout(() => {
        timedOut = true;
        if (child.pid) {
          if (isWindows) {
            try {
              spawn("taskkill", ["/pid", child.pid.toString(), "/T", "/F"]);
            } catch {
              child.kill("SIGTERM");
            }
          } else {
            child.kill("SIGTERM");
          }
        } else {
          child.kill("SIGTERM");
        }
      }, options.timeoutMs);
    }

    child.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf-8");
    });

    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf-8");
    });

    child.on("error", (err) => {
      if (timer) clearTimeout(timer);
      resolve({
        stdout,
        stderr: stderr + `\nProcess execution error: ${err.message}`,
        exitCode: 1,
        durationMs: Date.now() - startTime,
      });
    });

    child.on("close", (code) => {
      if (timer) clearTimeout(timer);
      const durationMs = Date.now() - startTime;
      if (timedOut) {
        resolve({
          stdout,
          stderr: stderr + `\nProcess timed out after ${options.timeoutMs}ms`,
          exitCode: 124,
          durationMs,
        });
      } else {
        resolve({
          stdout,
          stderr,
          exitCode: code ?? 0,
          durationMs,
        });
      }
    });
  });
}

/**
 * Gets active git branch name for directory, defaulting to 'main'.
 */
export async function getGitBranch(cwd: string = process.cwd()): Promise<string> {
  try {
    const res = await execFileDirect("git", ["rev-parse", "--abbrev-ref", "HEAD", "--"], { cwd, timeoutMs: 1500 });
    if (res.exitCode === 0 && res.stdout.trim()) {
      return res.stdout.trim();
    }
  } catch {
    // Git not available
  }
  return "main";
}
