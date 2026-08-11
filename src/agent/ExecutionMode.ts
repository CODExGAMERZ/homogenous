import chalk from "chalk";
import { PlanningMode } from "./PlanningMode.js";
import { AgentLoop } from "./AgentLoop.js";
import { promptCommandApproval } from "../cli/ui/ConfirmPrompt.js";
import type { InferenceProvider, Message } from "../inference/InferenceProvider.js";

export class ExecutionMode {
  /**
   * Executes user request with optional PlanningMode dry-run pre-approval.
   */
  public static async executeWithPlan(
    provider: InferenceProvider,
    model: string,
    prompt: string,
    messages: Message[],
    requirePlan: boolean = true
  ): Promise<string> {
    if (requirePlan) {
      console.log(chalk.bold.yellow("\n📋 Planning Mode Active — Generating dry-run proposal..."));
      const plan = await PlanningMode.generatePlan(provider, model, prompt, messages);
      PlanningMode.printPlan(plan);

      const approved = await promptCommandApproval(`Approve & execute proposal for: "${prompt}"`);
      if (!approved) {
        return "Execution cancelled by user during plan review.";
      }
    }

    console.log(chalk.bold.green("\n▶ Launching Agent Execution Loop..."));
    const agent = new AgentLoop({ provider, model });
    messages.push({ role: "user", content: prompt });
    return agent.run(messages);
  }
}
