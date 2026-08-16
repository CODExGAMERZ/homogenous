import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { BaseTool, type ToolResult } from "./BaseTool.js";
import { execFileDirect } from "../../platform/shell.js";
import { resolveWorkspacePath, isSensitiveSecurityPath } from "../../platform/paths.js";

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
        if (isSensitiveSecurityPath(fullPath)) {
          continue;
        }
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
      if (isSensitiveSecurityPath(absSearchDir)) {
        return {
          ok: false,
          isError: true,
          content: `Access denied: Searching restricted security/vault path '${searchPath}' is forbidden.`,
        };
      }
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
        const filteredLines = result.stdout
          .trim()
          .split(/\r?\n/)
          .filter((line) => {
            const filePathPart = line.split(":")[0];
            return !isSensitiveSecurityPath(filePathPart);
          });

        if (filteredLines.length > 0) {
          return {
            ok: true,
            content: `Search results for '${query}':\n\n${filteredLines.join("\n")}`,
          };
        }
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

export function globToRegExp(pattern: string): RegExp {
  const normalized = pattern.trim().replace(/\\/g, "/");
  if (
    !normalized ||
    normalized === "*" ||
    normalized === "**" ||
    normalized === "**/*" ||
    normalized === "*.*" ||
    normalized === "."
  ) {
    return /^.*$/i;
  }

  // If pattern starts with ./ strip it
  const cleanPattern = normalized.replace(/^\.\//, "");

  let regexStr = "^";
  let i = 0;
  while (i < cleanPattern.length) {
    const c = cleanPattern[i];
    if (c === "*") {
      if (cleanPattern[i + 1] === "*") {
        // **
        if (cleanPattern[i + 2] === "/") {
          regexStr += "(?:.*/)?";
          i += 3;
        } else {
          regexStr += ".*";
          i += 2;
        }
      } else {
        // * (matches everything except /)
        regexStr += "[^/]*";
        i++;
      }
    } else if (c === "?") {
      regexStr += "[^/]";
      i++;
    } else if (
      c === "[" ||
      c === "]" ||
      c === "{" ||
      c === "}" ||
      c === "(" ||
      c === ")" ||
      c === "+" ||
      c === "^" ||
      c === "$" ||
      c === "." ||
      c === "|"
    ) {
      regexStr += "\\" + c;
      i++;
    } else {
      regexStr += c;
      i++;
    }
  }
  regexStr += "$";

  try {
    return new RegExp(regexStr, "i");
  } catch {
    const escaped = cleanPattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(escaped, "i");
  }
}

export class GlobFilesTool extends BaseTool {
  readonly name = "glob_files";
  readonly description =
    "Find files matching glob pattern or filename in workspace (supports wildcards like '*', '**/*', '*.ts', '*.html').";
  readonly zodSchema = z.object({
    pattern: z.string().optional().default("*"),
  });
  readonly inputSchema = {
    type: "object",
    properties: {
      pattern: {
        type: "string",
        description:
          "Glob pattern or search term (e.g. '*', '**/*.ts', '*.html', 'config'). Defaults to '*' to list all workspace files.",
      },
    },
  };

  async execute(input: Record<string, unknown>): Promise<ToolResult> {
    const rawPattern = (input.pattern as string | undefined) || "*";
    const pattern = rawPattern.trim() || "*";
    const regexMatcher = globToRegExp(pattern);
    const lowerPattern = pattern.toLowerCase();
    const hasWildcards = /[*?{}[\]]/.test(pattern);

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
          if (isSensitiveSecurityPath(fullPath)) {
            continue;
          }
          if (entry.isDirectory()) {
            walkDir(fullPath, depth + 1);
          } else if (entry.isFile()) {
            const relPath = path.relative(process.cwd(), fullPath).replace(/\\/g, "/");
            const fileName = entry.name;

            const matchesPattern =
              regexMatcher.test(relPath) ||
              regexMatcher.test(fileName) ||
              (!hasWildcards && (fileName.toLowerCase().includes(lowerPattern) || relPath.toLowerCase().includes(lowerPattern)));

            if (matchesPattern) {
              matches.push(relPath);
            }
          }
        }
      }

      walkDir(process.cwd(), 0);

      if (matches.length === 0) {
        return {
          ok: true,
          content: `No files matching pattern '${pattern}' were found in workspace.`,
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

