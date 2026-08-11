import assert from "node:assert";
import test from "node:test";
import fs from "node:fs";
import { SlashCommandRegistry } from "../../src/cli/slash/SlashCommandRegistry.js";
import { DiffEngine } from "../../src/token-budget/DiffEngine.js";
import { resolvePath } from "../../src/platform/paths.js";
import { ProviderRegistry } from "../../src/inference/ProviderRegistry.js";
import { SessionMemory } from "../../src/memory/SessionMemory.js";

test("SlashCommandRegistry registers built-in commands and tab-completes", () => {
  const registry = SlashCommandRegistry.getInstance();
  const matches = registry.autocomplete("/mo");
  assert.ok(matches.includes("/model"));

  const helpCmd = registry.getCommand("help");
  assert.ok(helpCmd);
  assert.strictEqual(helpCmd?.name, "help");
});

test("DiffEngine records edit snapshots and performs undo", () => {
  const testFile = "test/scratch_undo_test.txt";
  const absPath = resolvePath(process.cwd(), testFile);

  // Initial file write
  fs.writeFileSync(absPath, "Original line 1", "utf-8");

  // Record edit snapshot
  DiffEngine.recordFileEdit(testFile, "Modified line 1");
  fs.writeFileSync(absPath, "Modified line 1", "utf-8");

  // Revert modification
  const undoResult = DiffEngine.undoLastEdit();
  assert.strictEqual(undoResult.success, true);
  assert.strictEqual(fs.readFileSync(absPath, "utf-8"), "Original line 1");

  // Cleanup
  if (fs.existsSync(absPath)) fs.unlinkSync(absPath);
});

test("SlashCommandRegistry dispatches /cost and /memory commands", async () => {
  const registry = SlashCommandRegistry.getInstance();
  const provider = ProviderRegistry.getInstance().getProvider("mock")!;
  const sessionMemory = new SessionMemory("Base prompt");

  const context = {
    provider,
    model: "demo-model",
    setModel: () => {},
    sessionMemory,
    workspacePath: process.cwd(),
  };

  const costRes = await registry.dispatch("/cost", context);
  assert.ok(costRes);
  assert.match(costRes!.output, /Session Budget Breakdown/);

  const memRes = await registry.dispatch("/memory list", context);
  assert.ok(memRes);
  assert.match(memRes!.output, /Persistent Facts/);
});
