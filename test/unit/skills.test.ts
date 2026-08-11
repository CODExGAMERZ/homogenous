import assert from "node:assert";
import test from "node:test";
import { SkillRegistry } from "../../src/skills/SkillRegistry.js";

test("SkillRegistry loads bundled skills and matches keywords", () => {
  const registry = SkillRegistry.getInstance();
  const skills = registry.listSkills();
  assert.ok(skills.length >= 3);

  const matched = registry.matchTrigger("Please generate a git commit message");
  assert.ok(matched);
  assert.strictEqual(matched?.metadata.name, "commit-message-generator");
});
