import assert from "node:assert";
import test from "node:test";
import { DelegateTaskTool } from "../../src/agent/tools/subAgentTool.js";
import { AgentLoop } from "../../src/agent/AgentLoop.js";
import { ProviderRegistry } from "../../src/inference/ProviderRegistry.js";

test("DelegateTaskTool: validates tool definition and schema", () => {
  const provider = ProviderRegistry.getInstance().getProvider("anthropic")!;
  const tool = new DelegateTaskTool({ provider, model: "claude-3-5-sonnet-20241022" });

  assert.strictEqual(tool.name, "delegate_task");
  assert.ok(tool.description.includes("sub-agent"));

  const def = tool.toToolDefinition();
  assert.strictEqual(def.name, "delegate_task");
  assert.ok(def.inputSchema);

  // Validation: valid input
  const valid = tool.validateInput({ task: "Audit dependencies", maxTurns: 5 });
  assert.strictEqual(valid.valid, true);

  // Validation: missing task
  const invalid = tool.validateInput({ maxTurns: 5 });
  assert.strictEqual(invalid.valid, false);

  // Validation: non-object
  const nonObj = tool.validateInput("invalid");
  assert.strictEqual(nonObj.valid, false);
});

test("DelegateTaskTool: recursion guard prevents delegate_task inside sub-agents", () => {
  const provider = ProviderRegistry.getInstance().getProvider("anthropic")!;

  // Default AgentLoop registers delegate_task
  const parentLoop = new AgentLoop({
    provider,
    model: "claude-3-5-sonnet-20241022",
  });
  const parentTools = parentLoop.getToolDefinitions().map((t) => t.name);
  assert.ok(parentTools.includes("delegate_task"), "Parent agent loop should have delegate_task");

  // Child AgentLoop with disableSubAgent: true omits delegate_task
  const childLoop = new AgentLoop({
    provider,
    model: "claude-3-5-sonnet-20241022",
    disableSubAgent: true,
  });
  const childTools = childLoop.getToolDefinitions().map((t) => t.name);
  assert.strictEqual(childTools.includes("delegate_task"), false, "Child sub-agent loop must NOT have delegate_task");
});
