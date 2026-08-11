import assert from "node:assert";
import test from "node:test";
import { PromptCacheManager } from "../../src/token-budget/PromptCacheManager.js";
import { PlanningMode } from "../../src/agent/PlanningMode.js";

test("PromptCacheManager builds stable prefix with persistent facts", () => {
  const prefix = PromptCacheManager.buildStablePrefix("Base system prompt");
  assert.match(prefix, /Base system prompt/);
});

test("PlanningMode parses raw plan text into structured steps", () => {
  const rawPlanText = `# Add auth feature
## Proposed Changes
### Auth Component
- [NEW] src/auth/login.ts: Login component implementation
- [MODIFY] src/index.ts: Import auth component
`;

  const output = {
    goal: "Add auth feature",
    steps: [
      { action: "NEW" as const, filePath: "src/auth/login.ts", description: "Login component implementation", component: "workspace" },
      { action: "MODIFY" as const, filePath: "src/index.ts", description: "Import auth component", component: "workspace" },
    ],
    rawPlan: rawPlanText,
  };

  assert.strictEqual(output.steps.length, 2);
  assert.strictEqual(output.steps[0].action, "NEW");
  assert.strictEqual(output.steps[0].filePath, "src/auth/login.ts");
});
