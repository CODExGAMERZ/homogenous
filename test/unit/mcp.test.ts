import assert from "node:assert";
import test from "node:test";
import fs from "node:fs";
import { McpConfigResolver } from "../../src/mcp/config.js";
import { resolvePath } from "../../src/platform/paths.js";

test("McpConfigResolver parses .mcp.json correctly", () => {
  const mcpPath = resolvePath(process.cwd(), ".mcp.json");
  const testConfig = {
    mcpServers: {
      testServer: {
        command: "node",
        args: ["--version"],
      },
    },
  };

  fs.writeFileSync(mcpPath, JSON.stringify(testConfig, null, 2), "utf-8");

  const loaded = McpConfigResolver.loadMcpConfig();
  assert.ok(loaded.testServer);
  assert.strictEqual(loaded.testServer.command, "node");

  // Cleanup
  if (fs.existsSync(mcpPath)) fs.unlinkSync(mcpPath);
});
