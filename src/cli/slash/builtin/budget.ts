import type { SlashCommand } from "../SlashCommand.js";
import { BudgetLedger } from "../../../token-budget/BudgetLedger.js";
import { ConfigResolver } from "../../../config/ConfigResolver.js";

function renderProgressBar(ratio: number, width: number = 10): string {
  const filled = Math.min(width, Math.max(0, Math.round(ratio * width)));
  const empty = width - filled;
  return `[${"█".repeat(filled)}${"░".repeat(empty)}] ${(ratio * 100).toFixed(1)}%`;
}

export const budgetCommands: SlashCommand[] = [
  {
    name: "cost",
    description: "Print token budget ledger breakdown and cost accounting",
    category: "session",
    execute: async () => {
      const s = BudgetLedger.getInstance().getSummary();
      const cfg = ConfigResolver.getInstance().getConfig();
      const maxCost = cfg.maxSessionCostUSD || 5.0;
      const ratio = maxCost > 0 ? s.totalCostUSD / maxCost : 0;
      const bar = renderProgressBar(ratio);

      return {
        output: `Session Budget Breakdown:\n` +
          `  • Total Tokens: ${s.totalTokens} (↑${s.totalInput} ↓${s.totalOutput})\n` +
          `  • Cache Hits:   ${s.cacheHitRatio}%\n` +
          `  • Total Spend:  $${s.totalCostUSD.toFixed(4)} / $${maxCost.toFixed(2)} ${bar}\n` +
          `  • API Calls:    ${s.localCalls} local / ${s.cloudCalls} cloud`,
      };
    },
  },
  {
    name: "budget",
    description: "View token budget allocation and accounting report",
    category: "session",
    usage: "/budget [--report]",
    execute: async (args) => {
      const ledger = BudgetLedger.getInstance();
      const s = ledger.getSummary();
      const cfg = ConfigResolver.getInstance().getConfig();
      const maxCost = cfg.maxSessionCostUSD || 5.0;
      const ratio = maxCost > 0 ? s.totalCostUSD / maxCost : 0;
      const bar = renderProgressBar(ratio, 12);
      const isReport = args.includes("--report");

      if (isReport) {
        return {
          output: `✦ Comprehensive Token Budget Report:\n` +
            `  • Input Tokens:      ${s.totalInput}\n` +
            `  • Output Tokens:     ${s.totalOutput}\n` +
            `  • Total Tokens:      ${s.totalTokens}\n` +
            `  • Cache Hit Ratio:   ${s.cacheHitRatio}%\n` +
            `  • Local Calls:       ${s.localCalls}\n` +
            `  • Cloud Calls:       ${s.cloudCalls}\n` +
            `  • Estimated Cost:    $${s.totalCostUSD.toFixed(4)} USD\n` +
            `  • Max Session Limit: $${maxCost.toFixed(2)} USD\n` +
            `  • Utilization:       ${bar}`,
        };
      }

      return {
        output: `✦ Token Budget Accounting:\n` +
          `  Tokens Used: ${s.totalTokens} | Spend: $${s.totalCostUSD.toFixed(4)} / $${maxCost.toFixed(2)} ${bar}\n` +
          `  (Use '/budget --report' for full breakdown)`,
      };
    },
  },
];
