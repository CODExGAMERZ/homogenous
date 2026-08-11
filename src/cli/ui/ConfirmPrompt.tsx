import readline from "node:readline/promises";
import chalk from "chalk";

/**
 * Prompts user in terminal for interactive confirmation before executing a potentially destructive command.
 */
export async function promptCommandApproval(command: string): Promise<boolean> {
  // If running in non-interactive CI mode, refuse by default unless auto-approved
  if (!process.stdin.isTTY) {
    console.log(chalk.yellow(`[non-interactive] Auto-rejecting command: ${command}`));
    return false;
  }

  console.log(`\n${chalk.bold.yellow("⚠️  Action Requires Confirmation:")}`);
  console.log(`Command to execute: ${chalk.bold.cyan(command)}`);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const answer = await rl.question(chalk.bold("Execute command? [y/N]: "));
    const normalized = answer.trim().toLowerCase();
    const approved = normalized === "y" || normalized === "yes";

    if (approved) {
      console.log(chalk.green("✓ Command approved.\n"));
    } else {
      console.log(chalk.red("✗ Command execution declined by user.\n"));
    }

    return approved;
  } finally {
    rl.close();
  }
}
