import chalk from "chalk";
import { AgentLoop } from "./AgentLoop.js";
import type { InferenceProvider, Message } from "../inference/InferenceProvider.js";
import { buildBaseSystemPrompt } from "./systemPrompt.js";

export interface SubAgentResult {
  goal: string;
  summary: string;
  turnsUsed: number;
}

export class SubAgent {
  private provider: InferenceProvider;
  private model: string;

  constructor(provider: InferenceProvider, model: string) {
    this.provider = provider;
    this.model = model;
  }

  /**
   * Spawns an isolated sub-agent execution with trimmed context for a focused sub-task.
   */
  public async executeTask(goal: string, maxTurns: number = 8): Promise<SubAgentResult> {
    console.log(chalk.bold.magenta(`\n🤖 Spawning Sub-Agent for sub-task: "${goal}"`));

    const agentLoop = new AgentLoop({
      provider: this.provider,
      model: this.model,
      maxTurns,
    });

    const messages: Message[] = [
      {
        role: "system",
        content: `${buildBaseSystemPrompt(process.cwd())}\n\nSpecialized Goal: You are running as an autonomous sub-agent. Focus strictly on achieving the assigned sub-task and report key findings concisely.`,
      },
      {
        role: "user",
        content: goal,
      },
    ];

    try {
      const summary = await agentLoop.run(messages);
      console.log(chalk.bold.magenta(`✔ Sub-Agent task completed.\n`));
      return {
        goal,
        summary,
        turnsUsed: messages.length,
      };
    } catch (err) {
      return {
        goal,
        summary: `Sub-agent task execution failed: ${(err as Error).message}`,
        turnsUsed: messages.length,
      };
    }
  }
}
