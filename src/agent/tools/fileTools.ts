import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { BaseTool, type ToolResult } from "./BaseTool.js";
import { resolveWorkspacePath } from "../../platform/paths.js";
import { DiffEngine } from "../../token-budget/DiffEngine.js";

export class ReadFileTool extends BaseTool {
  readonly name = "read_file";
  readonly description =
    "Read the contents of a file from the workspace. Supports specifying StartLine and EndLine (1-indexed).";
  readonly zodSchema = z.object({
    path: z.string().min(1, "Path must not be empty"),
    startLine: z.number().int().positive().optional(),
    endLine: z.number().int().positive().optional(),
  });
  readonly inputSchema = {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Path to the file to read (relative to workspace).",
      },
      startLine: {
        type: "integer",
        description: "Optional 1-indexed line number to start reading from.",
      },
      endLine: {
        type: "integer",
        description: "Optional 1-indexed line number to end reading at.",
      },
    },
    required: ["path"],
  };

  async execute(input: Record<string, unknown>): Promise<ToolResult> {
    const filePath = input.path as string;
    const startLine = (input.startLine as number) || 1;
    const endLine = input.endLine as number | undefined;

    try {
      const absPath = resolveWorkspacePath(process.cwd(), filePath);
      if (!fs.existsSync(absPath)) {
        return {
          ok: false,
          isError: true,
          content: `Error: File not found at path '${filePath}'`,
        };
      }

      const fileContent = fs.readFileSync(absPath, "utf-8");
      const lines = fileContent.split(/\r?\n/);

      const targetEnd = endLine ? Math.min(endLine, lines.length) : lines.length;
      const targetStart = Math.max(1, Math.min(startLine, targetEnd));

      const selectedLines = lines.slice(targetStart - 1, targetEnd);
      const numberedLines = selectedLines
        .map((line, idx) => `${targetStart + idx} | ${line}`)
        .join("\n");

      return {
        ok: true,
        content: `File: ${filePath} (Lines ${targetStart}-${targetEnd} of ${lines.length}):\n\n${numberedLines}`,
      };
    } catch (err) {
      return {
        ok: false,
        isError: true,
        content: `Error reading file '${filePath}': ${(err as Error).message}`,
      };
    }
  }
}

export class WriteFileTool extends BaseTool {
  readonly name = "write_file";
  readonly description =
    "Create a new file or overwrite an existing file with complete content within the workspace. Automatically creates parent directories.";
  readonly zodSchema = z.object({
    path: z.string().min(1, "Path must not be empty"),
    content: z.string(),
  });
  readonly inputSchema = {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Target file path to write to (relative to workspace).",
      },
      content: {
        type: "string",
        description: "Full content to write into the file.",
      },
    },
    required: ["path", "content"],
  };

  async execute(input: Record<string, unknown>): Promise<ToolResult> {
    const filePath = input.path as string;
    const content = input.content as string;

    try {
      const absPath = resolveWorkspacePath(process.cwd(), filePath);
      const parentDir = path.dirname(absPath);

      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }

      // Record edit snapshot in DiffEngine undo stack
      DiffEngine.recordFileEdit(filePath, content);

      fs.writeFileSync(absPath, content, "utf-8");
      return {
        ok: true,
        content: `Successfully wrote ${Buffer.byteLength(content, "utf-8")} bytes to '${filePath}'.`,
      };
    } catch (err) {
      return {
        ok: false,
        isError: true,
        content: `Error writing file '${filePath}': ${(err as Error).message}`,
      };
    }
  }
}

export class ReplaceFileContentTool extends BaseTool {
  readonly name = "replace_file_content";
  readonly description =
    "Replace exact target text with new replacement text within a workspace file.";
  readonly zodSchema = z.object({
    path: z.string().min(1, "Path must not be empty"),
    targetContent: z.string().min(1, "targetContent must not be empty"),
    replacementContent: z.string(),
  });
  readonly inputSchema = {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Path to the file to modify (relative to workspace).",
      },
      targetContent: {
        type: "string",
        description: "Exact target substring to search for and replace.",
      },
      replacementContent: {
        type: "string",
        description: "New text to substitute in place of targetContent.",
      },
    },
    required: ["path", "targetContent", "replacementContent"],
  };

  async execute(input: Record<string, unknown>): Promise<ToolResult> {
    const filePath = input.path as string;
    const targetContent = input.targetContent as string;
    const replacementContent = input.replacementContent as string;

    try {
      const absPath = resolveWorkspacePath(process.cwd(), filePath);
      if (!fs.existsSync(absPath)) {
        return {
          ok: false,
          isError: true,
          content: `Error: Target file '${filePath}' does not exist.`,
        };
      }

      const fileContent = fs.readFileSync(absPath, "utf-8");
      if (!fileContent.includes(targetContent)) {
        return {
          ok: false,
          isError: true,
          content: `Error: Could not find targetContent in '${filePath}'. Make sure whitespace and line endings match exactly.`,
        };
      }

      // Use callback replacement to avoid special $1, $2, $$ pattern expansion bugs in JS string replace
      const newContent = fileContent.replace(targetContent, () => replacementContent);

      // Record edit snapshot in DiffEngine undo stack
      DiffEngine.recordFileEdit(filePath, newContent);

      fs.writeFileSync(absPath, newContent, "utf-8");

      return {
        ok: true,
        content: `Successfully replaced content in '${filePath}'.`,
      };
    } catch (err) {
      return {
        ok: false,
        isError: true,
        content: `Error replacing content in '${filePath}': ${(err as Error).message}`,
      };
    }
  }
}
