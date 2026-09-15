import assert from "node:assert";
import test from "node:test";
import { doctorCommand } from "../../src/cli/slash/builtin/doctor.js";
import { mcpCommands } from "../../src/cli/slash/builtin/mcp.js";
import { AutocompleteEngine } from "../../src/cli/slash/AutocompleteEngine.js";

test("doctorCommand: executes cleanly and returns comprehensive diagnostics", async () => {
  const result = await doctorCommand.execute([], {
    workspacePath: process.cwd(),
  } as any);

  assert.ok(result.output);
  assert.ok(result.output.includes("Homogenous System Diagnostics"));
  assert.ok(result.output.includes("Node.js Runtime"));
  assert.ok(result.output.includes("Operating System"));
  assert.ok(result.output.includes("Workspace Path"));
});

test("mcpCommands: handles list, reload, prompts, and resources actions", async () => {
  const mcpCmd = mcpCommands[0];
  assert.strictEqual(mcpCmd.name, "mcp");

  // list
  const listRes = await mcpCmd.execute(["list"], {
    workspacePath: process.cwd(),
  } as any);
  assert.ok(listRes.output);

  // reload
  const reloadRes = await mcpCmd.execute(["reload"], {
    workspacePath: process.cwd(),
  } as any);
  assert.ok(reloadRes.output.includes("Reloaded MCP configuration"));

  // prompts
  const promptsRes = await mcpCmd.execute(["prompts"], {
    workspacePath: process.cwd(),
  } as any);
  assert.ok(promptsRes.output);

  // resources
  const resourcesRes = await mcpCmd.execute(["resources"], {
    workspacePath: process.cwd(),
  } as any);
  assert.ok(resourcesRes.output);
});

test("AutocompleteEngine: suggests prompts, prompt, and resources for /mcp", () => {
  const engine = AutocompleteEngine.getInstance();
  const suggestions = engine.getSuggestions("/mcp ");

  const values = suggestions.map((s) => s.value);
  assert.ok(values.includes("/mcp list"));
  assert.ok(values.includes("/mcp reload"));
  assert.ok(values.includes("/mcp prompts"));
  assert.ok(values.includes("/mcp prompt"));
  assert.ok(values.includes("/mcp resources"));
});
