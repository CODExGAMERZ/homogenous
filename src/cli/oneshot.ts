import chalk from "chalk";
import { ProviderRegistry } from "../inference/ProviderRegistry.js";
import type { Message, InferenceProvider } from "../inference/InferenceProvider.js";

import { AgentLoop } from "../agent/AgentLoop.js";
import { buildBaseSystemPrompt } from "../agent/systemPrompt.js";

export interface OneshotOptions {
  model?: string;
  systemPrompt?: string;
  agent?: boolean;
}

/**
 * Runs a single non-interactive prompt request, streaming stdout to terminal.
 */
export async function runOneshot(prompt: string, options: OneshotOptions = {}): Promise<void> {
  const registry = ProviderRegistry.getInstance();
  await registry.detectLocalProviders();

  let provider: InferenceProvider;
  let model: string;

  try {
    if (options.model && options.model.includes("/")) {
      const [pId, ...mParts] = options.model.split("/");
      const resolvedP = registry.getProvider(pId);
      if (resolvedP) {
        provider = resolvedP;
        model = mParts.join("/");
      } else {
        const res = await registry.routeFor("complexEdit");
        provider = res.provider;
        model = res.model;
      }
    } else {
      const res = await registry.routeFor("complexEdit");
      provider = res.provider;
      model = options.model || res.model;
    }
  } catch (err) {
    console.error(chalk.red(`\n${(err as Error).message}\n`));
    process.exit(1);
  }

  const messages: Message[] = [];
  if (options.systemPrompt) {
    messages.push({ role: "system", content: options.systemPrompt });
  } else {
    messages.push({
      role: "system",
      content: buildBaseSystemPrompt(process.cwd()),
    });
  }

  messages.push({ role: "user", content: prompt });

  if (options.agent) {
    const agentLoop = new AgentLoop({
      provider,
      model,
      autoApprove: true,
      workspaceRoot: process.cwd(),
      onToolStart: (toolName, input) => {
        process.stdout.write(chalk.cyan(`\n⚙ [Tool: ${toolName}] ${JSON.stringify(input)}\n`));
      },
      onToolEnd: (toolName, result) => {
        const preview = result.content.slice(0, 160).replace(/\n/g, " ");
        process.stdout.write(chalk.gray(`  ✔ [${toolName}] ${preview}...\n`));
      },
    });

    try {
      await agentLoop.run(messages, (delta) => {
        process.stdout.write(delta);
      });
      process.stdout.write("\n");
      return;
    } catch (err) {
      console.error(chalk.red(`\nError executing oneshot agent: ${(err as Error).message}`));
      process.exit(1);
    }
  }

  try {
    const stream = provider.stream({
      model,
      messages,
      maxTokens: 4096,
    });

    for await (const event of stream) {
      if (event.type === "text_delta" && event.textDelta) {
        process.stdout.write(event.textDelta);
      }
    }
    process.stdout.write("\n");
  } catch (err) {
    console.error(chalk.red(`\nError executing oneshot command: ${(err as Error).message}`));
    process.exit(1);
  }
}
