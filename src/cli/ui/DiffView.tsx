import chalk from "chalk";
import { getActiveTheme } from "./themes/ThemeContext.js";

export function renderDiffPreview(diffText: string): void {
  if (!diffText.trim()) return;
  const theme = getActiveTheme();

  console.log(chalk.hex(theme.primary).bold("\n--- Unified Diff Hunks ---"));
  const lines = diffText.split(/\r?\n/);

  for (const line of lines) {
    if (line.startsWith("+")) {
      console.log(chalk.hex(theme.diffAdd)(line));
    } else if (line.startsWith("-")) {
      console.log(chalk.hex(theme.diffRemove)(line));
    } else if (line.startsWith("@@") || line.startsWith("diff --git")) {
      console.log(chalk.hex(theme.warning)(line));
    } else {
      console.log(chalk.hex(theme.bodyText)(line));
    }
  }
  console.log();
}
