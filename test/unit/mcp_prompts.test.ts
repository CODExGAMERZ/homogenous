import assert from "node:assert";
import test from "node:test";
import { McpClientManager } from "../../src/mcp/McpClientManager.js";
import { ResourceCache } from "../../src/mcp/ResourceCache.js";
import { mcpCommands } from "../../src/cli/slash/builtin/mcp.js";

test("MCP Prompts & Resources: McpClientManager exposes methods", async () => {
  const manager = McpClientManager.getInstance();

  const prompts = await manager.listPrompts();
  assert.ok(Array.isArray(prompts));

  const resources = await manager.listResources();
  assert.ok(Array.isArray(resources));

  const servers = manager.getActiveServerNames();
  assert.ok(Array.isArray(servers));
});

test("MCP ResourceCache: caches content and retrieves correctly", () => {
  const testUri = "file:///project/docs/architecture.md";
  const content = "# Architecture Document\nThis is a cached test resource.";

  const cachedResult = ResourceCache.set(testUri, content);
  assert.strictEqual(cachedResult, content);

  const retrieved = ResourceCache.get(testUri);
  assert.strictEqual(retrieved, content);

  const nonExistent = ResourceCache.get("file:///project/non_existent.md");
  assert.strictEqual(nonExistent, undefined);
});

test("MCP Slash Command: supports /mcp prompts and /mcp resources gracefully", async () => {
  const mcpCmd = mcpCommands.find((c) => c.name === "mcp")!;
  assert.ok(mcpCmd);

  const mockCtx: any = {
    workspacePath: process.cwd(),
  };

  const promptsRes = await mcpCmd.execute(["prompts"], mockCtx);
  assert.ok(promptsRes.output);

  const resRes = await mcpCmd.execute(["resources"], mockCtx);
  assert.ok(resRes.output);
});
