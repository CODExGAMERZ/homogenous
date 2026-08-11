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
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;

    let timer: NodeJS.Timeout | undefined;
    if (options.timeoutMs && options.timeoutMs > 0) {
      timer = setTimeout(() => {
        timedOut = true;
        child.kill("SIGTERM");
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
    const res = await execCommand("git rev-parse --abbrev-ref HEAD", { cwd, timeoutMs: 1000 });
    if (res.exitCode === 0 && res.stdout.trim()) {
      return res.stdout.trim();
    }
  } catch {
    // Git not available
  }
  return "main";
}
