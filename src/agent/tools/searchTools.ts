import fs from "node:fs";
import path from "node:path";
import { BaseTool, type ToolResult } from "./BaseTool.js";
import { execCommand } from "../../platform/shell.js";
import { resolvePath } from "../../platform/paths.js";

export class GrepSearchTool extends BaseTool {
  readonly name = "grep_search";
  readonly description =
    "Search for exact string pattern or regular expression across files in workspace using ripgrep.";
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

  async execute(input: Record<string, unknown>): Promise<ToolResult> {
    const query = input.query as string;
    const searchPath = (input.path as string) || ".";

    try {
      const command = `rg -nI --max-columns 200 -e ${JSON.stringify(query)} ${JSON.stringify(searchPath)}`;
      const result = await execCommand(command, { timeoutMs: 15000 });

      if (result.exitCode === 0 && result.stdout.trim()) {
        return {
          ok: true,
          content: `Search results for '${query}':\n\n${result.stdout.trim()}`,
        };
      }

      if (result.exitCode === 1 || !result.stdout.trim()) {
        return {
          ok: true,
          content: `No matches found for query '${query}'.`,
        };
      }

      return {
        ok: false,
        isError: true,
        content: `Search error: ${result.stderr}`,
      };
    } catch (err) {
      return {
        ok: false,
        isError: true,
        content: `Grep search execution failed: ${(err as Error).message}`,
      };
    }
  }
}

export class GlobFilesTool extends BaseTool {
  readonly name = "glob_files";
  readonly description = "Find files matching directory pattern or filename search in workspace.";
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

      function walkDir(dir: string) {
        if (matches.length > 200) return;
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
          if (entry.name === "node_modules" || entry.name === ".git" || entry.name === "dist") {
            continue;
          }
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            walkDir(fullPath);
          } else if (entry.isFile()) {
            if (entry.name.toLowerCase().includes(pattern) || fullPath.toLowerCase().includes(pattern)) {
              matches.push(fullPath.replace(/\\/g, "/"));
            }
          }
        }
      }

      walkDir(process.cwd());

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
