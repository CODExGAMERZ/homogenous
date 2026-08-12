import chalk from "chalk";
import { ProviderRegistry } from "../inference/ProviderRegistry.js";
import type { Message, InferenceProvider } from "../inference/InferenceProvider.js";

import { buildBaseSystemPrompt } from "../agent/systemPrompt.js";

export interface OneshotOptions {
  model?: string;
  systemPrompt?: string;
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
