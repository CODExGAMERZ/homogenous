import assert from "node:assert";
import test from "node:test";
import { PersistentMemory } from "../../src/memory/PersistentMemory.js";

test("PersistentMemory adds, lists, and removes facts with metadata", () => {
  const memory = PersistentMemory.getInstance();
  const initialCount = memory.listFacts().length;

  const added = memory.addFact("Always use ESM module resolution.", "convention");
  assert.ok(added.id);
  assert.ok(added.updated_at);
  assert.ok(added.updated_by);
  assert.strictEqual(added.category, "convention");

  const list = memory.listFacts();
  assert.strictEqual(list.length, initialCount + 1);

  const removed = memory.removeFact(added.id);
  assert.strictEqual(removed, true);
  assert.strictEqual(memory.listFacts().length, initialCount);
});
