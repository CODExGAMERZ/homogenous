import assert from "node:assert";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { SlashCommandRegistry } from "../../src/cli/slash/SlashCommandRegistry.js";
import { ProviderRegistry } from "../../src/inference/ProviderRegistry.js";
import { SessionMemory } from "../../src/memory/SessionMemory.js";
import type { CommandContext } from "../../src/cli/slash/SlashCommand.js";

test("/plan and /apply workflow generates plan and executes file modification via AgentLoop", async () => {
  const registry = SlashCommandRegistry.getInstance();
  const provider = ProviderRegistry.getInstance().getProvider("mock")!;
  const sessionMemory = new SessionMemory("System prompt");
  const testFile = "test_apply_plan.txt";
  const absTestPath = path.resolve(process.cwd(), testFile);

  // Ensure clean test file state
  if (fs.existsSync(absTestPath)) {
    fs.unlinkSync(absTestPath);
  }

  let pendingPlanState: any = null;

  const context: CommandContext = {
    provider,
    model: "demo-model",
    setModel: () => {},
    sessionMemory,
    workspacePath: process.cwd(),
    get pendingPlan() {
      return pendingPlanState;
    },
    setPendingPlan: (plan) => {
      pendingPlanState = plan;
    },
  };

  // 1. Generate plan using /plan
  const planRes = await registry.dispatch(`/plan write file ${testFile}`, context);
  assert.ok(planRes);
  assert.ok(pendingPlanState, "pendingPlan should be populated after /plan");

  // 2. Execute plan using /apply
  const applyRes = await registry.dispatch("/apply", context);
  assert.ok(applyRes);
  assert.match(applyRes!.output, /Pending plan approved & applied/);
  assert.strictEqual(pendingPlanState, null, "pendingPlan should be cleared after /apply");

  // 3. Assert file was actually created on disk
  assert.ok(fs.existsSync(absTestPath), "File should be created on disk by /apply execution");

  // Cleanup test file
  if (fs.existsSync(absTestPath)) {
    fs.unlinkSync(absTestPath);
  }
});

test("/plan on toggle takes precedence over /auto on", async () => {
  const registry = SlashCommandRegistry.getInstance();
  const provider = ProviderRegistry.getInstance().getProvider("mock")!;
  const sessionMemory = new SessionMemory("System prompt");

  let planMode = false;
  let autoApprove = false;

  const context: CommandContext = {
    provider,
    model: "demo-model",
    setModel: () => {},
    sessionMemory,
    workspacePath: process.cwd(),
    get planModeEnabled() { return planMode; },
    setPlanModeEnabled: (v) => { planMode = v; },
    get autoApproveEnabled() { return autoApprove; },
    setAutoApproveEnabled: (v) => { autoApprove = v; },
  };

  await registry.dispatch("/plan on", context);
  await registry.dispatch("/auto on", context);

  assert.strictEqual(planMode, true, "Plan mode should be enabled");
  assert.strictEqual(autoApprove, true, "Auto approve should be enabled");
});
