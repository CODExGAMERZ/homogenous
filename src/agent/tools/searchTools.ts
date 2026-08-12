import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { BaseTool, type ToolResult } from "./BaseTool.js";
import { execFileDirect } from "../../platform/shell.js";
import { resolveWorkspacePath } from "../../platform/paths.js";

export class GrepSearchTool extends BaseTool {
  readonly name = "grep_search";
  readonly description =
    "Search for exact string pattern or regular expression across files in workspace using ripgrep (with JS fallback).";
  readonly zodSchema = z.object({
    query: z.string().min(1, "query must not be empty"),
    path: z.string().optional(),
  });
  readonly inputSchema = {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Pattern or literal text to search for.",
      },
      path: {
        type: "string",
        description: "Optional directory path to restrict search (defaults to project root).",
      },
    },
    required: ["query"],
  };

  private jsGrepFallback(query: string, searchDir: string): string[] {
    const results: string[] = [];
    const lowerQuery = query.toLowerCase();
    const visited = new Set<string>();

    function walk(dir: string, depth: number) {
      if (depth > 15 || results.length >= 50) return;
      let real: string;
      try {
        real = fs.realpathSync(dir);
        if (visited.has(real)) return;
        visited.add(real);
      } catch {
        return;
      }

      let entries: fs.Dirent[];
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        return;
      }

      for (const entry of entries) {
        if (entry.name === "node_modules" || entry.name === ".git" || entry.name === "dist") {
          continue;
        }
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(fullPath, depth + 1);
        } else if (entry.isFile()) {
          try {
            const content = fs.readFileSync(fullPath, "utf-8");
            const lines = content.split(/\r?\n/);
            lines.forEach((line, idx) => {
              if (line.toLowerCase().includes(lowerQuery) && results.length < 50) {
                const rel = path.relative(process.cwd(), fullPath).replace(/\\/g, "/");
                results.push(`${rel}:${idx + 1}:${line.slice(0, 200)}`);
              }
            });
          } catch {
            // Ignore binary/unreadable files
          }
        }
      }
    }

    walk(searchDir, 0);
    return results;
  }

  async execute(input: Record<string, unknown>): Promise<ToolResult> {
    const query = input.query as string;
    const searchPath = (input.path as string) || ".";

    let absSearchDir: string;
    try {
      absSearchDir = resolveWorkspacePath(process.cwd(), searchPath);
    } catch (err) {
      return {
        ok: false,
        isError: true,
        content: (err as Error).message,
      };
    }

    try {
      // Direct argv execution terminates options with '--' to avoid argument injection / option confusion
      const args = ["-nI", "--max-columns", "200", "-e", query, "--", absSearchDir];
      const result = await execFileDirect("rg", args, { timeoutMs: 15000 });

      if (result.exitCode === 0 && result.stdout.trim()) {
        return {
          ok: true,
          content: `Search results for '${query}':\n\n${result.stdout.trim()}`,
        };
      }

      if (result.exitCode === 1) {
        return {
          ok: true,
          content: `No matches found for query '${query}'.`,
        };
      }

      // If ripgrep returned an error (or is not installed), use pure JS fallback
      const fallbackResults = this.jsGrepFallback(query, absSearchDir);
      if (fallbackResults.length > 0) {
        return {
          ok: true,
          content: `Search results for '${query}' (via fallback search):\n\n${fallbackResults.join("\n")}`,
        };
      }

      return {
        ok: true,
        content: `No matches found for query '${query}'.`,
      };
    } catch {
      // Graceful fallback to JS grep on execution error
      try {
        const fallbackResults = this.jsGrepFallback(query, absSearchDir);
        if (fallbackResults.length > 0) {
          return {
            ok: true,
            content: `Search results for '${query}' (via fallback search):\n\n${fallbackResults.join("\n")}`,
          };
        }
        return {
          ok: true,
          content: `No matches found for query '${query}'.`,
        };
      } catch (fallbackErr) {
        return {
          ok: false,
          isError: true,
          content: `Grep search execution failed: ${(fallbackErr as Error).message}`,
        };
      }
    }
  }
}

export class GlobFilesTool extends BaseTool {
  readonly name = "glob_files";
  readonly description = "Find files matching directory pattern or filename search in workspace.";
  readonly zodSchema = z.object({
    pattern: z.string().min(1, "pattern must not be empty"),
  });
  readonly inputSchema = {
    type: "object",
    properties: {
      pattern: {
        type: "string",
        description: "Search term or file extension pattern (e.g., '.ts', 'config').",
      },
    },
    required: ["pattern"],
  };

  async execute(input: Record<string, unknown>): Promise<ToolResult> {
    const pattern = (input.pattern as string).toLowerCase();

    try {
      const matches: string[] = [];
      const visitedRealPaths = new Set<string>();

      function walkDir(dir: string, depth: number = 0) {
        if (matches.length > 200 || depth > 20) return;

        let realPath: string;
        try {
          realPath = fs.realpathSync(dir);
          if (visitedRealPaths.has(realPath)) return;
          visitedRealPaths.add(realPath);
        } catch {
          return;
        }

        let entries: fs.Dirent[];
        try {
          entries = fs.readdirSync(dir, { withFileTypes: true });
        } catch {
          return;
        }

        for (const entry of entries) {
          if (entry.name === "node_modules" || entry.name === ".git" || entry.name === "dist") {
            continue;
          }
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            walkDir(fullPath, depth + 1);
          } else if (entry.isFile()) {
            if (entry.name.toLowerCase().includes(pattern) || fullPath.toLowerCase().includes(pattern)) {
              matches.push(fullPath.replace(/\\/g, "/"));
            }
          }
        }
      }

      walkDir(process.cwd(), 0);

      if (matches.length === 0) {
        return {
          ok: true,
          content: `No files matching pattern '${pattern}' were found.`,
        };
      }

      return {
        ok: true,
        content: `Found ${matches.length} matching files:\n\n${matches.slice(0, 100).join("\n")}`,
      };
    } catch (err) {
      return {
        ok: false,
        isError: true,
        content: `Glob search error: ${(err as Error).message}`,
      };
    }
  }
}
