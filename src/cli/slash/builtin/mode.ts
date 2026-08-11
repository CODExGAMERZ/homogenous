import type { SlashCommand } from "../SlashCommand.js";
import { PlanningMode } from "../../../agent/PlanningMode.js";

export const modeCommands: SlashCommand[] = [
  {
    name: "plan",
    description: "Toggle standing plan mode or generate dry-run technical implementation plan",
    category: "edits",
    usage: "/plan [on|off|prompt]",
    execute: async (args, ctx) => {
      if (args.length === 0) {
        const nextState = !ctx.planModeEnabled;
        ctx.setPlanModeEnabled?.(nextState);
        return {
          output: `✦ Plan Mode is now ${
            nextState ? "ENABLED (All prompts will generate dry-run proposals requiring /apply)" : "DISABLED"
          }`,
        };
      }

      const arg0 = args[0].toLowerCase();
      if (arg0 === "on") {
        ctx.setPlanModeEnabled?.(true);
        return { output: "✓ Plan Mode ENABLED. All subsequent prompts will generate dry-run implementation proposals." };
      }
      if (arg0 === "off") {
        ctx.setPlanModeEnabled?.(false);
        return { output: "✓ Plan Mode DISABLED. Prompts will execute directly." };
      }

      // One-off plan generation for <prompt>
      const prompt = args.join(" ");
      const plan = await PlanningMode.generatePlan(ctx.provider, ctx.model, prompt, ctx.sessionMemory.getMessages());
      ctx.setPendingPlan?.(plan);
      return { output: `${plan.rawPlan}\n\n✦ Type /apply to execute this plan, or /reject to cancel.` };
    },
  },
  {
    name: "auto",
    description: "Toggle auto-approve mode for safe tool operations (destructive commands remain gated)",
    category: "edits",
    usage: "/auto [on|off]",
    execute: async (args, ctx) => {
      let newState = !ctx.autoApproveEnabled;
      if (args[0]) {
        const val = args[0].toLowerCase();
        if (val === "on") newState = true;
        else if (val === "off") newState = false;
      }

      ctx.setAutoApproveEnabled?.(newState);

      return {
        output: `✦ Auto-Approve Mode: ${newState ? "ENABLED" : "DISABLED"}\n` +
          `  • Safe read/edit actions will proceed automatically.\n` +
          `  • Destructive commands (rm -rf, git push --force, sudo, etc.) remain strictly gated for user approval.`,
      };
    },
  },
];
