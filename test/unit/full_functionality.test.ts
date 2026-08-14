import assert from "node:assert";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { SlashCommandRegistry } from "../../src/cli/slash/SlashCommandRegistry.js";
import { PersistentMemory } from "../../src/memory/PersistentMemory.js";
import { McpClientManager } from "../../src/mcp/McpClientManager.js";
import { SkillRegistry } from "../../src/skills/SkillRegistry.js";
import { ShellExecuteTool, getAuditLog } from "../../src/agent/tools/shellTool.js";
import { SessionMemory } from "../../src/memory/SessionMemory.js";
import { MockProvider } from "../../src/inference/providers/MockProvider.js";

const mockCtx: any = {
  provider: new MockProvider(),
  model: "demo-mode",
  setModel: () => {},
  setProvider: () => {},
  sessionMemory: new SessionMemory("test prompt"),
  workspacePath: process.cwd(),
  planModeEnabled: false,
  setPlanModeEnabled: function (val: boolean) {
    this.planModeEnabled = val;
  },
  autoApproveEnabled: false,
  setAutoApproveEnabled: function (val: boolean) {
    this.autoApproveEnabled = val;
  },
};

test("Slash Command /mode: switches between normal, auto, and plan modes", async () => {
  const registry = SlashCommandRegistry.getInstance();

  // Test /mode auto
  const autoRes = await registry.dispatch("/mode auto", mockCtx);
  assert.ok(autoRes?.output.includes("AUTO-APPROVE"));
  assert.strictEqual(mockCtx.autoApproveEnabled, true);
  assert.strictEqual(mockCtx.planModeEnabled, false);

  // Test /mode plan
  const planRes = await registry.dispatch("/mode plan", mockCtx);
  assert.ok(planRes?.output.includes("PLANNING"));
  assert.strictEqual(mockCtx.planModeEnabled, true);
  assert.strictEqual(mockCtx.autoApproveEnabled, false);

  // Test /mode normal
  const normalRes = await registry.dispatch("/mode normal", mockCtx);
  assert.ok(normalRes?.output.includes("NORMAL"));
  assert.strictEqual(mockCtx.planModeEnabled, false);
  assert.strictEqual(mockCtx.autoApproveEnabled, false);

  // Test /mode status inquiry
  const statusRes = await registry.dispatch("/mode", mockCtx);
  assert.ok(statusRes?.output.includes("Current Execution Mode: NORMAL"));
});

test("Slash Command /memory: supports list, add, remove, and clear aliases", async () => {
  const registry = SlashCommandRegistry.getInstance();

  // 1. Add fact via /memory add
  const addRes = await registry.dispatch("/memory add 'Use React 19 for TUI components'", mockCtx);
  assert.ok(addRes?.output.includes("Saved fact with ID"));

  // 2. List facts
  const listRes = await registry.dispatch("/memory list", mockCtx);
  assert.ok(listRes?.output.includes("Use React 19"));

  // 3. Clear facts
  const clearRes = await registry.dispatch("/memory clear", mockCtx);
  assert.ok(clearRes?.output.includes("cleared from .agentmemory/facts.json"));

  // 4. Verify list is empty
  const emptyRes = await registry.dispatch("/memory list", mockCtx);
  assert.ok(emptyRes?.output.includes("No persistent facts"));
});

test("Slash Command /mcp: supports /mcp reload", async () => {
  const registry = SlashCommandRegistry.getInstance();
  const res = await registry.dispatch("/mcp reload", mockCtx);
  assert.ok(res?.output.includes("Reloaded MCP configuration"));
});

test("Skills Management: supports create, list, and remove lifecycle", async () => {
  const registry = SlashCommandRegistry.getInstance();
  const testSkillName = "temp-unit-test-skill";

  // Create
  const createRes = await registry.dispatch(`/skills create ${testSkillName}`, mockCtx);
  assert.ok(createRes?.output.includes("Scaffolded skill"));

  // Verify list
  const listRes = await registry.dispatch("/skills list", mockCtx);
  assert.ok(listRes?.output.includes(testSkillName));

  // Remove
  const removeRes = await registry.dispatch(`/skills remove ${testSkillName}`, mockCtx);
  assert.ok(removeRes?.output.includes("successfully removed"));

  // Verify removed
  const listAfterRes = await registry.dispatch("/skills list", mockCtx);
  assert.strictEqual(listAfterRes?.output.includes(testSkillName), false);
});

test("ShellExecuteTool: executes allowlisted commands under autoApprove and logs audit events", async () => {
  const shellTool = new ShellExecuteTool({ autoApprove: true, workspaceRoot: process.cwd() });

  // Read-only node -v should execute cleanly via execFileDirect
  const result = await shellTool.execute({ command: "node -v" });
  assert.strictEqual(result.ok, true);
  assert.match(result.content, /^v\d+/);

  // Node-native file inspection for package.json
  const fileInspectRes = await shellTool.execute({ command: "cat package.json" });
  assert.strictEqual(fileInspectRes.ok, true);
  assert.ok(fileInspectRes.content.includes("@codexgamerz/homogenous"));

  // Verify structured audit log entry was created
  const logEntries = getAuditLog();
  assert.ok(logEntries.length > 0);
  assert.ok(logEntries.some((e) => e.command.includes("package.json") && e.autoApproved));
});
