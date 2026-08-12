import { z } from "zod";
import { BaseTool, type ToolResult } from "./BaseTool.js";
import { execFileDirect } from "../../platform/shell.js";

export class GitStatusTool extends BaseTool {
  readonly name = "git_status";
  readonly description = "Get repository working directory status (modified files, staged changes, untracked files).";
  readonly zodSchema = z.object({});
  readonly inputSchema = {
    type: "object",
    properties: {},
  };

  async execute(_input: Record<string, unknown>): Promise<ToolResult> {
    const res = await execFileDirect("git", ["status", "--short", "--"], { timeoutMs: 10000 });
    if (res.exitCode !== 0) {
      if (res.stderr.includes("not a git repository")) {
        return { ok: true, content: "Notice: Current workspace is not a git repository." };
      }
      return { ok: false, isError: true, content: `Git status error: ${res.stderr}` };
    }
    return {
      ok: true,
      content: res.stdout.trim() ? res.stdout.trim() : "Working directory clean. No modified files.",
    };
  }
}

export class GitDiffTool extends BaseTool {
  readonly name = "git_diff";
  readonly description = "Inspect uncommitted changes in current repository working directory.";
  readonly zodSchema = z.object({
    staged: z.boolean().optional(),
  });
  readonly inputSchema = {
    type: "object",
    properties: {
      staged: {
        type: "boolean",
        description: "Set to true to view staged diff instead of unstaged diff.",
      },
    },
  };

  async execute(input: Record<string, unknown>): Promise<ToolResult> {
    const staged = input.staged as boolean | undefined;
    const args = staged ? ["diff", "--staged", "--"] : ["diff", "--"];
    const res = await execFileDirect("git", args, { timeoutMs: 10000 });
    if (res.exitCode !== 0) {
      if (res.stderr.includes("not a git repository")) {
        return { ok: true, content: "Notice: Current workspace is not a git repository." };
      }
      return { ok: false, isError: true, content: `Git diff error: ${res.stderr}` };
    }
    return {
      ok: true,
      content: res.stdout.trim() ? res.stdout.trim() : "No git diff changes to show.",
    };
  }
}

export class GitLogTool extends BaseTool {
  readonly name = "git_log";
  readonly description = "View recent commit history (last N commits).";
  readonly zodSchema = z.object({
    count: z.number().int().positive().optional(),
  });
  readonly inputSchema = {
    type: "object",
    properties: {
      count: {
        type: "integer",
        description: "Number of commits to view (default 5).",
      },
    },
  };

  async execute(input: Record<string, unknown>): Promise<ToolResult> {
    const count = (input.count as number) || 5;
    const res = await execFileDirect("git", ["log", "-n", String(count), "--oneline", "--"], { timeoutMs: 10000 });
    if (res.exitCode !== 0) {
      if (res.stderr.includes("not a git repository") || res.stderr.includes("does not have any commits")) {
        return { ok: true, content: "Notice: Workspace has no git commits yet." };
      }
      return { ok: false, isError: true, content: `Git log error: ${res.stderr}` };
    }
    return {
      ok: true,
      content: res.stdout.trim(),
    };
  }
}
