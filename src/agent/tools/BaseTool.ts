import { z } from "zod";
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
  readonly zodSchema?: z.ZodTypeAny;

  public validateInput(input: unknown): { valid: boolean; error?: string; data: Record<string, unknown> } {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      return {
        valid: false,
        error: `Invalid input for tool '${this.name}': input must be a JSON object.`,
        data: {},
      };
    }

    if (this.zodSchema) {
      const parsed = this.zodSchema.safeParse(input);
      if (!parsed.success) {
        const issues = parsed.error.issues.map((i) => `${i.path.join(".") || "root"}: ${i.message}`).join(", ");
        return {
          valid: false,
          error: `Schema validation failed for tool '${this.name}': ${issues}`,
          data: {},
        };
      }
      return { valid: true, data: parsed.data as Record<string, unknown> };
    }

    return { valid: true, data: input as Record<string, unknown> };
  }

  abstract execute(input: Record<string, unknown>): Promise<ToolResult>;

  toToolDefinition(): ToolDefinition {
    return {
      name: this.name,
      description: this.description,
      inputSchema: this.inputSchema,
    };
  }
}
