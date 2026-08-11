import type { SlashCommand } from "../SlashCommand.js";
import { DiffEngine } from "../../../token-budget/DiffEngine.js";
import { AgentLoop } from "../../../agent/AgentLoop.js";

export const diffCommands: SlashCommand[] = [
  {
    name: "diff",
    description: "Render combined unified diff of all file modifications in session",
    category: "edits",
    execute: async () => {
      const diffSummary = DiffEngine.getSessionDiffSummary();
      return { output: diffSummary };
    },
  },
  {
    name: "undo",
    description: "Revert the last applied file modification using DiffEngine undo stack",
    category: "edits",
    execute: async () => {
      const result = DiffEngine.undoLastEdit();
      return { output: result.message };
    },
  },
  {
    name: "apply",
    description: "Apply current pending plan by invoking AgentLoop to execute plan steps",
    category: "edits",
    execute: async (_, ctx) => {
      if (!ctx.pendingPlan) {
        return { output: "No pending plan to apply. Run /plan first or enable plan mode." };
      }

      const planToApply = ctx.pendingPlan;
      ctx.setPendingPlan?.(null);

      const applyPrompt = `Execute the following approved implementation plan:\n${planToApply.rawPlan}`;
      ctx.sessionMemory.addMessage({ role: "user", content: applyPrompt });

      const agent = new AgentLoop({ provider: ctx.provider, model: ctx.model });
      const resultText = await agent.run(ctx.sessionMemory.getMessages());

      return {
        output: `✓ Pending plan approved & applied.\n\nAgent Execution Result:\n${resultText}`,
      };
    },
  },
  {
    name: "reject",
    description: "Cancel current pending plan",
    category: "edits",
    execute: async (_, ctx) => {
      if (!ctx.pendingPlan) {
        return { output: "No pending plan to reject." };
      }
      ctx.setPendingPlan?.(null);
      return { output: "Pending plan cancelled." };
    },
  },
];
