import assert from "node:assert";
import test from "node:test";
import { detectProjectStack } from "../../src/cli/init.js";
import { SkillInstaller } from "../../src/skills/SkillInstaller.js";

test("detectProjectStack detects Node.js / TypeScript stack for current project", () => {
  const stack = detectProjectStack(process.cwd());
  assert.strictEqual(stack, "Node.js / TypeScript");
});

test("SkillInstaller installs local skill folder cleanly", async () => {
  const installed = await SkillInstaller.installSkill("skills/commit-message-generator", false);
  assert.strictEqual(installed, true);
});
