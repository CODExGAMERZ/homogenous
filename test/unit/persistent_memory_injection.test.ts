import assert from "node:assert";
import test from "node:test";
import { buildBaseSystemPrompt } from "../../src/agent/systemPrompt.js";
import { PersistentMemory } from "../../src/memory/PersistentMemory.js";

test("Persistent Memory: buildBaseSystemPrompt includes full workspace tools and persistent facts", () => {
  const memory = PersistentMemory.getInstance();
  const testFactText = `Unique convention check ${Date.now()}`;
  const fact = memory.addFact(testFactText, "convention", "test-user");

  try {
    const prompt = buildBaseSystemPrompt(process.cwd());

    // 1. Tool execution directives
    assert.match(prompt, /shell_execute/);
    assert.match(prompt, /git_status/);
    assert.match(prompt, /git_diff/);
    assert.match(prompt, /git_log/);
    assert.match(prompt, /web_fetch/);
    assert.match(prompt, /delegate_task/);

    // 2. Persistent Memory fact injection
    assert.match(prompt, /Persistent Project Memory:/);
    assert.ok(prompt.includes(testFactText), "Prompt must include the active persistent memory fact");
  } finally {
    memory.removeFact(fact.id);
  }
});
