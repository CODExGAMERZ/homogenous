import assert from "node:assert";
import test from "node:test";
import { SlashCommandRegistry } from "../../src/cli/slash/SlashCommandRegistry.js";
import { doctorCommand } from "../../src/cli/slash/builtin/doctor.js";

test("/doctor slash command is registered and reports system diagnostics", async () => {
  const registry = SlashCommandRegistry.getInstance();
  const cmd = registry.getCommand("doctor");
  assert.ok(cmd, "Doctor command should be registered in SlashCommandRegistry");
  assert.strictEqual(cmd?.name, "doctor");

  const mockCtx: any = {
    workspacePath: process.cwd(),
    sessionMemory: { getHistory: () => [] },
  };

  const res = await doctorCommand.execute([], mockCtx);
  assert.ok(res.output);
  assert.match(res.output, /Homogenous System Diagnostics/);
  assert.match(res.output, /Node\.js Runtime:/);
  assert.match(res.output, /Operating System:/);
  assert.match(res.output, /Terminal \/ TTY:/);
  assert.match(res.output, /Workspace Path:/);
  assert.match(res.output, /Fast Search \(rg\):/);
  assert.match(res.output, /GPU \/ VRAM:/);
  assert.match(res.output, /Local Ollama:/);
  assert.match(res.output, /Local LM Studio:/);
  assert.match(res.output, /Diagnostics complete\. System is healthy\./);
});

test("/doctor handles non-git directories gracefully", async () => {
  const mockCtx: any = {
    workspacePath: "C:/non_existent_folder_test_path",
  };

  const res = await doctorCommand.execute([], mockCtx);
  assert.ok(res.output);
  assert.match(res.output, /Node\.js Runtime:/);
});
