import chalk from "chalk";
import type { InferenceProvider, Message } from "../inference/InferenceProvider.js";

export interface PlanStep {
  component: string;
  action: "MODIFY" | "NEW" | "DELETE";
  filePath: string;
  description: string;
}

export interface PlanOutput {
  goal: string;
  steps: PlanStep[];
  rawPlan: string;
}

export class PlanningMode {
  /**
   * Generates a dry-run implementation plan without touching project workspace files.
   */
  public static async generatePlan(
    provider: InferenceProvider,
    model: string,
    prompt: string,
    contextMessages: Message[] = []
  ): Promise<PlanOutput> {
    const planningPrompt = `You are running in Planning Mode. Produce a structured, dry-run technical implementation plan for the following request.
Do NOT execute any tools or modify files. Outline exact components, file paths, and step-by-step actions.

User Request: ${prompt}

Format your plan clearly with headers:
# [Goal Description]
## Proposed Changes
### [Component Name]
- [MODIFY|NEW|DELETE] path/to/file: Short description
## Verification Plan
`;

    const msgs: Message[] = [
      ...contextMessages,
      { role: "user", content: planningPrompt },
    ];

    const response = await provider.chat({
      model,
      messages: msgs,
      maxTokens: 2048,
    });

    const rawPlan = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { text: string }).text)
      .join("\n");

    const steps: PlanStep[] = [];
    const lines = rawPlan.split(/\r?\n/);

    for (const line of lines) {
      const match = line.match(/- \[(MODIFY|NEW|DELETE)\]\s+([^:]+):\s*(.*)/);
      if (match) {
        steps.push({
          action: match[1] as PlanStep["action"],
          filePath: match[2].trim(),
          description: match[3].trim(),
          component: "workspace",
        });
      }
    }

    return {
      goal: prompt,
      steps,
      rawPlan,
    };
  }

  public static printPlan(plan: PlanOutput): void {
    console.log(chalk.bold.cyan("\n--- Proposed Implementation Plan ---"));
    console.log(plan.rawPlan);
    console.log(chalk.bold.yellow("------------------------------------\n"));
  }
}
