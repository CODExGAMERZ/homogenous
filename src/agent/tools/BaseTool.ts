import type { ToolDefinition } from "../../inference/InferenceProvider.js";

export interface ToolResult {
  ok: boolean;
  content: string;
  isError?: boolean;
}

export abstract class BaseTool {
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly inputSchema: Record<string, unknown>;

  abstract execute(input: Record<string, unknown>): Promise<ToolResult>;

  toToolDefinition(): ToolDefinition {
    return {
      name: this.name,
      description: this.description,
      inputSchema: this.inputSchema,
    };
  }
}
