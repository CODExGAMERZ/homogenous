import assert from "node:assert";
import test from "node:test";
import { DiffEngine } from "../../src/token-budget/DiffEngine.js";
import { MemoryRetriever } from "../../src/memory/MemoryRetriever.js";
import { SessionMemory } from "../../src/memory/SessionMemory.js";
import { WebFetchTool } from "../../src/agent/tools/webTools.js";
import { PersistentMemory } from "../../src/memory/PersistentMemory.js";

test("DiffEngine calculates line difference ratio for full rewrite threshold", () => {
  const diff = DiffEngine.evaluateDiff("package.json", '{"name": "homogenous-v2"}', 0.4);
  assert.ok(diff.targetPath);
  assert.strictEqual(typeof diff.isFullRewrite, "boolean");
});

test("MemoryRetriever selectively scores and retrieves facts matching terms", () => {
  const memory = PersistentMemory.getInstance();
  const added = memory.addFact("Database connections use PostgreSQL pool.", "architecture");

  const retrieved = MemoryRetriever.retrieveRelevantFacts("PostgreSQL database", 2);
  assert.ok(retrieved.length > 0);

  memory.removeFact(added.id);
});

test("SessionMemory manages turn state and total token count", () => {
  const session = new SessionMemory("Base system prompt");
  session.addMessage({ role: "user", content: "Hello assistant!" });
  assert.strictEqual(session.getMessages().length, 2);
  assert.ok(session.getTotalTokens() > 0);
});

test("WebFetchTool returns tool description and executes input schema", () => {
  const tool = new WebFetchTool();
  assert.strictEqual(tool.name, "web_fetch");
  assert.ok(tool.description.length > 0);
});

test("WebFetchTool blocks SSRF targets and invalid protocols", async () => {
  const tool = new WebFetchTool();

  // Test cloud metadata endpoint block
  const resMeta = await tool.execute({ url: "http://169.254.169.254/latest/meta-data/" });
  assert.strictEqual(resMeta.ok, false);
  assert.strictEqual(resMeta.isError, true);
  assert.match(resMeta.content, /SSRF prevention/);

  // Test localhost block
  const resLocal = await tool.execute({ url: "http://localhost:8080/admin" });
  assert.strictEqual(resLocal.ok, false);
  assert.match(resLocal.content, /SSRF prevention/);

  // Test private IP block
  const resPrivate = await tool.execute({ url: "http://192.168.1.1/router" });
  assert.strictEqual(resPrivate.ok, false);
  assert.match(resPrivate.content, /SSRF prevention/);

  // Test file:// protocol block
  const resFile = await tool.execute({ url: "file:///etc/passwd" });
  assert.strictEqual(resFile.ok, false);
  assert.match(resFile.content, /Unsupported protocol/);
});

