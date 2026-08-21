import chalk from "chalk";

/**
 * Prompts user in terminal for interactive confirmation before executing a potentially destructive command.
 * Uses direct single-keypress listening compatible with Ink and raw terminal modes.
 */
export function promptCommandApproval(command: string): Promise<boolean> {
  // If running in non-interactive CI mode, refuse by default
  if (!process.stdin.isTTY) {
    console.log(chalk.yellow(`[non-interactive] Auto-rejecting command: ${command}`));
    return Promise.resolve(false);
  }

  process.stdout.write(`\n${chalk.bold.yellow("⚠️  Action Requires Confirmation:")}\n`);
  process.stdout.write(`Command: ${chalk.bold.cyan(command)}\n`);
  process.stdout.write(chalk.bold("Execute command? Press [y] to approve, or any other key to cancel: "));

  return new Promise<boolean>((resolve) => {
    const wasRaw = Boolean(process.stdin.isRaw);

    if (process.stdin.setRawMode) {
      process.stdin.setRawMode(true);
    }
    process.stdin.resume();

    const onData = (chunk: Buffer) => {
      process.stdin.removeListener("data", onData);

      const input = chunk.toString("utf-8");
      // Handle 'y' or 'Y' as approval
      const isApproved = input.toLowerCase().startsWith("y");

      if (isApproved) {
        process.stdout.write(chalk.green("y\n✓ Command approved.\n\n"));
      } else {
        process.stdout.write(chalk.red("n\n✗ Command execution declined by user.\n\n"));
      }

      if (process.stdin.setRawMode && !wasRaw) {
        process.stdin.setRawMode(false);
      }

      resolve(isApproved);
    };

    process.stdin.once("data", onData);
  });
}
