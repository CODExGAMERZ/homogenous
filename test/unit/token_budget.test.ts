import assert from "node:assert";
import test from "node:test";
import { TokenCounter } from "../../src/token-budget/TokenCounter.js";
import { BudgetLedger } from "../../src/token-budget/BudgetLedger.js";
import { ToolOutputTruncator } from "../../src/token-budget/ToolOutputTruncator.js";

test("TokenCounter returns positive integer token count", () => {
  const count = TokenCounter.count("Hello Homogenous CLI tool!");
  assert.ok(count > 0);
});

test("BudgetLedger calculates cost and format string", () => {
  const ledger = BudgetLedger.getInstance();
  ledger.recordCall({
    provider: "anthropic",
    model: "claude-3-5-sonnet-20241022",
    inputTokens: 10000,
    outputTokens: 2000,
    isLocal: false,
  });

  const summary = ledger.getSummary();
  assert.strictEqual(summary.totalTokens, 12000);
  assert.ok(summary.totalCostUSD > 0);

  const meterStr = ledger.formatMeterString();
  assert.match(meterStr, /session:/);
  assert.match(meterStr, /cloud calls/);
});

test("ToolOutputTruncator performs middle elision on long text", () => {
  const longText = Array.from({ length: 500 }, (_, i) => `Line ${i + 1}: Some long log content`).join("\n");
  const result = ToolOutputTruncator.truncate(longText, 500);

  assert.strictEqual(result.truncated, true);
  assert.match(result.content, /tokens elided/);
  assert.match(result.content, /Line 1:/);
  assert.match(result.content, /Line 500:/);
});
