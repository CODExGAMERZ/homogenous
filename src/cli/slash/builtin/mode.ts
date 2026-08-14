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
  {
    name: "mode",
    description: "Inspect or set the global agent execution mode (auto, plan, or normal)",
    category: "edits",
    usage: "/mode [auto|plan|normal]",
    execute: async (args, ctx) => {
      if (args.length === 0) {
        let currentMode = "normal";
        if (ctx.planModeEnabled) currentMode = "plan";
        else if (ctx.autoApproveEnabled) currentMode = "auto";
        return {
          output: `✦ Current Execution Mode: ${currentMode.toUpperCase()}\n` +
            `  • normal : Prompts execute directly; all shell commands require user approval.\n` +
            `  • auto   : Non-destructive allowlisted inspection commands auto-execute; all other commands remain strictly gated.\n` +
            `  • plan   : Prompts generate dry-run implementation plans requiring explicit /apply approval.\n\n` +
            `To change mode, type: /mode [auto|plan|normal]`,
        };
      }

      const targetMode = args[0].toLowerCase();
      if (targetMode === "auto") {
        ctx.setPlanModeEnabled?.(false);
        ctx.setAutoApproveEnabled?.(true);
        return { output: "✓ Switched mode to AUTO-APPROVE. Safe allowlisted commands will execute automatically." };
      } else if (targetMode === "plan") {
        ctx.setPlanModeEnabled?.(true);
        ctx.setAutoApproveEnabled?.(false);
        return { output: "✓ Switched mode to PLANNING. Prompts will generate dry-run implementation plans requiring /apply." };
      } else if (targetMode === "normal") {
        ctx.setPlanModeEnabled?.(false);
        ctx.setAutoApproveEnabled?.(false);
        return { output: "✓ Switched mode to NORMAL. All shell commands require interactive user approval." };
      }

      return { output: "Usage: /mode [auto|plan|normal]" };
    },
  },
];
