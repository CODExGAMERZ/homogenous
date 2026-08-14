import chalk from "chalk";
import { PersistentMemory } from "./PersistentMemory.js";

export function runMemoryList(): void {
  const memory = PersistentMemory.getInstance();
  const facts = memory.listFacts();

  if (facts.length === 0) {
    console.log(chalk.yellow("No persistent facts currently stored in .agentmemory/facts.json"));
    return;
  }

  console.log(chalk.bold.cyan("\n--- Persistent Project Memory Facts ---"));
  for (const f of facts) {
    console.log(`- ${chalk.bold.green(f.id)} [${chalk.magenta(f.category)}]: ${f.fact}`);
    console.log(`  ${chalk.dim(`Updated by ${f.updated_by} on ${f.updated_at}`)}`);
  }
  console.log();
}

export function runRemember(fact: string, category: "architecture" | "convention" | "preference" | "general" = "general"): void {
  const memory = PersistentMemory.getInstance();
  const newFact = memory.addFact(fact, category);
  console.log(chalk.green(`✓ Fact saved to .agentmemory/facts.json with ID '${newFact.id}'`));
}

export function runForget(id: string): void {
  const memory = PersistentMemory.getInstance();
  const success = memory.removeFact(id);
  if (success) {
    console.log(chalk.green(`✓ Fact '${id}' removed from .agentmemory/facts.json`));
  } else {
    console.log(chalk.red(`✗ Fact with ID '${id}' not found.`));
  }
}

export function runMemoryClear(): void {
  const memory = PersistentMemory.getInstance();
  memory.clearFacts();
  console.log(chalk.green("✓ All persistent facts cleared from .agentmemory/facts.json"));
}

