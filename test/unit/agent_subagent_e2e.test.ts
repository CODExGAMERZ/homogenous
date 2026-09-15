import assert from "node:assert";
import test from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DelegateTaskTool } from "../../src/agent/tools/subAgentTool.js";
import { SubAgent } from "../../src/agent/SubAgent.js";
import { AgentLoop } from "../../src/agent/AgentLoop.js";
import { MockProvider } from "../../src/inference/providers/MockProvider.js";
import { ReplaceFileContentTool, ReadFileTool, WriteFileTool, ListDirTool } from "../../src/agent/tools/fileTools.js";
import { GrepSearchTool, GlobFilesTool } from "../../src/agent/tools/searchTools.js";
import { GitStatusTool } from "../../src/agent/tools/gitTools.js";
import { CodeBlockStore } from "../../src/utils/CodeBlockStore.js";

test("DelegateTaskTool: coerces maxTurns from string to number", () => {
  const provider = new MockProvider();
  const tool = new DelegateTaskTool({ provider, model: "demo-mode" });

  const validCoerced = tool.validateInput({ task: "Analyze repo structure", maxTurns: "6" });
  assert.strictEqual(validCoerced.valid, true);
  assert.strictEqual((validCoerced.data as any).maxTurns, 6);

  const defaultTurns = tool.validateInput({ task: "Analyze repo structure" });
  assert.strictEqual(defaultTurns.valid, true);
  assert.strictEqual((defaultTurns.data as any).maxTurns, 8);
});

test("SubAgent: executes autonomous task with MockProvider and returns SubAgentResult", async () => {
  const provider = new MockProvider();
  const subAgent = new SubAgent(provider, "demo-mode");

  const result = await subAgent.executeTask("Examine config and document findings", 5, {
    silent: true,
    autoApprove: true,
  });

  assert.strictEqual(result.goal, "Examine config and document findings");
  assert.ok(result.summary.length > 0);
  assert.ok(result.turnsUsed > 0);
});

test("AgentLoop: runs end-to-end delegation tool call using MockProvider", async () => {
  const provider = new MockProvider();
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "homogenous-agent-test-"));

  try {
    const loop = new AgentLoop({
      provider,
      model: "demo-mode",
      workspaceRoot: tempDir,
      autoApprove: true,
      silent: true,
    });

    const messages = [
      {
        role: "user" as const,
        content: "Please delegate the task to inspect files",
      },
    ];

    const finalAnswer = await loop.run(messages);
    assert.ok(finalAnswer.length > 0);
    // Verified that delegate_task was invoked and handled
    const hasSubAgentResult = messages.some(
      (m) =>
        Array.isArray(m.content) &&
        m.content.some((b: any) => b.type === "tool_result" && b.content && b.content.includes("Sub-agent completed task"))
    );
    assert.strictEqual(hasSubAgentResult, true);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("Workspace tools: propagate and respect custom workspaceRoot", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "homogenous-ws-test-"));
  const subDir = path.join(tempDir, "nested");
  fs.mkdirSync(subDir, { recursive: true });

  const testFile = path.join(subDir, "example.txt");
  fs.writeFileSync(testFile, "line 1\r\nline 2\r\nline 3\r\n", "utf-8");

  try {
    const readTool = new ReadFileTool({ workspaceRoot: tempDir });
    const readRes = await readTool.execute({ path: "nested/example.txt" });
    assert.strictEqual(readRes.ok, true);
    assert.ok(readRes.content.includes("line 2"));

    const listTool = new ListDirTool({ workspaceRoot: tempDir });
    const listRes = await listTool.execute({ path: "." });
    assert.strictEqual(listRes.ok, true);
    assert.ok(listRes.content.includes("nested"));

    const grepTool = new GrepSearchTool({ workspaceRoot: tempDir });
    const grepRes = await grepTool.execute({ query: "line 2", path: "." });
    assert.strictEqual(grepRes.ok, true);
    assert.ok(grepRes.content.includes("nested/example.txt"));

    const globTool = new GlobFilesTool({ workspaceRoot: tempDir });
    const globRes = await globTool.execute({ pattern: "*.txt" });
    assert.strictEqual(globRes.ok, true);
    assert.ok(globRes.content.includes("example.txt"));

    const gitTool = new GitStatusTool({ workspaceRoot: tempDir });
    const gitRes = await gitTool.execute({});
    assert.strictEqual(gitRes.ok, true);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("ReplaceFileContentTool: handles CRLF vs LF line endings cleanly on Windows", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "homogenous-crlf-test-"));
  const filePath = path.join(tempDir, "crlf_file.ts");

  // File written with Windows CRLF endings
  const originalContent = "function test() {\r\n  const a = 1;\r\n  return a;\r\n}\r\n";
  fs.writeFileSync(filePath, originalContent, "utf-8");

  try {
    const replaceTool = new ReplaceFileContentTool({ workspaceRoot: tempDir });

    // LLM sends targetContent and replacementContent with standard LF (\n)
    const result = await replaceTool.execute({
      path: "crlf_file.ts",
      targetContent: "function test() {\n  const a = 1;\n  return a;\n}",
      replacementContent: "function test() {\n  const a = 2;\n  return a * 2;\n}",
    });

    assert.strictEqual(result.ok, true, result.content);

    const updatedContent = fs.readFileSync(filePath, "utf-8");
    // Verifies replacement was applied AND CRLF was preserved
    assert.ok(updatedContent.includes("\r\n"), "File should preserve CRLF line endings");
    assert.ok(updatedContent.includes("const a = 2;"));
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("CodeBlockStore: performs prefix deduplication during streaming and markdown extraction", () => {
  const store = CodeBlockStore.getInstance();

  // Simulate streaming tokens into store
  store.addBlock("typescript", "const x = 1;");
  store.addBlock("typescript", "const x = 1;\nconst y = 2;");

  const lastBlock = store.getLastBlock(1);
  assert.ok(lastBlock);
  assert.strictEqual(lastBlock.code, "const x = 1;\nconst y = 2;");

  // Markdown extraction
  const md = "Here is the code:\n```json\n{\n  \"version\": \"4.3.1\"\n}\n```";
  store.addBlocksFromMarkdown(md);

  const newest = store.getLastBlock(1);
  assert.ok(newest);
  assert.strictEqual(newest.lang, "json");
  assert.ok(newest.code.includes("4.3.1"));
});
