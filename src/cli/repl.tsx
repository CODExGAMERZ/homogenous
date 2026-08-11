import React from "react";
import { render } from "ink";
import chalk from "chalk";
import { App } from "./ui/App.js";
import { ProviderRegistry } from "../inference/ProviderRegistry.js";
import type { InferenceProvider } from "../inference/InferenceProvider.js";
import { execCommand } from "../platform/shell.js";
import { HOMOGENOUS_BANNER } from "./ui/LogoBanner.js";

export interface ReplOptions {
  model?: string;
}

export async function runRepl(options: ReplOptions = {}): Promise<void> {
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

  // Detect active git branch
  let gitBranch = "main";
  try {
    const res = await execCommand("git branch --show-current", { timeoutMs: 3000 });
    if (res.exitCode === 0 && res.stdout.trim()) {
      gitBranch = res.stdout.trim();
    }
  } catch {
    // Fallback if not a git repository
  }

  // 1. Clear terminal screen cleanly for TUI rendering
  process.stdout.write("\x1Bc");

  // 2. Print HOMOGENOUS ASCII block logo banner ONCE upon tool initialization
  console.log(chalk.bold.cyan(HOMOGENOUS_BANNER));
  console.log(chalk.bold.magenta("       ✦ LOCAL-FIRST AGENTIC CODING ASSISTANT ✦\n"));

  // 3. Render interactive Ink React App workspace right below banner
  const { waitUntilExit } = render(
    <App
      provider={provider}
      model={model}
      workspacePath={process.cwd()}
      gitBranch={gitBranch}
    />
  );

  await waitUntilExit();
}
