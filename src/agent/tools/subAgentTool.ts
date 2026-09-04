import { z } from "zod";
import { BaseTool, type ToolResult } from "./BaseTool.js";
import { SubAgent } from "../SubAgent.js";
import type { InferenceProvider } from "../../inference/InferenceProvider.js";

export class DelegateTaskTool extends BaseTool {
  readonly name = "delegate_task";
  readonly description =
    "Delegate an isolated or complex sub-task to an autonomous sub-agent with its own bounded execution loop.";

  readonly zodSchema = z.object({
    task: z.string().min(1, "Task description is required"),
    maxTurns: z.number().int().positive().optional().default(8),
  });

  readonly inputSchema = {
    type: "object",
    properties: {
      task: {
        type: "string",
        description: "Clear, concise objective or sub-task for the sub-agent to execute",
      },
      maxTurns: {
        type: "number",
        description: "Maximum execution turns allocated to the sub-agent (default: 8)",
      },
    },
    required: ["task"],
  };

  private provider: InferenceProvider;
  private model: string;
  private workspaceRoot?: string;

  constructor(options: { provider: InferenceProvider; model: string; workspaceRoot?: string }) {
    super();
    this.provider = options.provider;
    this.model = options.model;
    this.workspaceRoot = options.workspaceRoot;
  }

  async execute(input: Record<string, unknown>): Promise<ToolResult> {
    const validation = this.validateInput(input);
    if (!validation.valid) {
      return {
        ok: false,
        isError: true,
        content: validation.error || "Invalid input schema for delegate_task",
      };
    }

    const { task, maxTurns } = validation.data as { task: string; maxTurns: number };

    try {
      const subAgent = new SubAgent(this.provider, this.model);
      const result = await subAgent.executeTask(task, maxTurns, {
        silent: true,
        workspaceRoot: this.workspaceRoot,
        autoApprove: true,
      });

      return {
        ok: true,
        content: `Sub-agent completed task: "${result.goal}"\nExecution turns used: ${result.turnsUsed}\n\nSummary:\n${result.summary}`,
      };
    } catch (err) {
      return {
        ok: false,
        isError: true,
        content: `Sub-agent execution failed: ${(err as Error).message}`,
      };
    }
  }
}
