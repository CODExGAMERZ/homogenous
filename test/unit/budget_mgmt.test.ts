import assert from "node:assert";
import test from "node:test";
import { BudgetLedger } from "../../src/token-budget/BudgetLedger.js";
import { ConfigResolver } from "../../src/config/ConfigResolver.js";
import { budgetCommands } from "../../src/cli/slash/builtin/budget.js";

test("Budget Management: BudgetLedger reset clears records and counters", () => {
  const ledger = BudgetLedger.getInstance();

  ledger.recordCall({
    provider: "anthropic",
    model: "claude-3-5-sonnet-20241022",
    inputTokens: 5000,
    outputTokens: 1000,
    isLocal: false,
  });

  const before = ledger.getSummary();
  assert.strictEqual(before.totalTokens, 6000);
  assert.ok(before.totalCostUSD > 0);

  ledger.reset();

  const after = ledger.getSummary();
  assert.strictEqual(after.totalTokens, 0);
  assert.strictEqual(after.totalInput, 0);
  assert.strictEqual(after.totalOutput, 0);
  assert.strictEqual(after.totalCostUSD, 0);
  assert.strictEqual(after.cloudCalls, 0);
  assert.strictEqual(after.localCalls, 0);
});

test("Budget Management: ConfigResolver setSessionBudget updates spending limit", () => {
  const resolver = ConfigResolver.getInstance();
  resolver.setSessionBudget(25.5);
  assert.strictEqual(resolver.getConfig().maxSessionCostUSD, 25.5);
});

test("Budget Management: /budget set and /budget reset slash commands", async () => {
  const budgetCmd = budgetCommands.find((c) => c.name === "budget")!;
  assert.ok(budgetCmd);

  const mockCtx: any = {
    workspacePath: process.cwd(),
  };

  // 1. Set valid budget
  const setRes = await budgetCmd.execute(["set", "12.50"], mockCtx);
  assert.match(setRes.output, /Session budget limit updated to \$12\.50 USD/);
  assert.strictEqual(ConfigResolver.getInstance().getConfig().maxSessionCostUSD, 12.5);

  // 2. Set invalid budget
  const invalidRes = await budgetCmd.execute(["set", "not-a-number"], mockCtx);
  assert.match(invalidRes.output, /Usage: \/budget set <amount>/);

  // 3. Record call and then test reset
  BudgetLedger.getInstance().recordCall({
    provider: "openai",
    model: "gpt-4o",
    inputTokens: 2000,
    outputTokens: 500,
    isLocal: false,
  });
  assert.ok(BudgetLedger.getInstance().getSummary().totalTokens > 0);

  const resetRes = await budgetCmd.execute(["reset"], mockCtx);
  assert.match(resetRes.output, /Token budget ledger and session cost counters have been reset to 0/);
  assert.strictEqual(BudgetLedger.getInstance().getSummary().totalTokens, 0);

  // 4. Test --report still outputs comprehensive breakdown
  const reportRes = await budgetCmd.execute(["--report"], mockCtx);
  assert.match(reportRes.output, /Comprehensive Token Budget Report/);
  assert.match(reportRes.output, /Max Session Limit:/);
});
