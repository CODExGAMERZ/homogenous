import assert from "node:assert";
import test from "node:test";
import fs from "node:fs";
import { ReadFileTool, WriteFileTool, ReplaceFileContentTool } from "../../src/agent/tools/fileTools.js";
import { GitStatusTool } from "../../src/agent/tools/gitTools.js";
import { resolvePath } from "../../src/platform/paths.js";

test("WriteFileTool and ReadFileTool roundtrip", async () => {
  const writeTool = new WriteFileTool();
  const readTool = new ReadFileTool();
  const testPath = "test/scratch_test_file.txt";

  // Write file
  const writeRes = await writeTool.execute({
    path: testPath,
    content: "Line 1: Hello Homogenous\nLine 2: Phase 1 Tool Testing\nLine 3: End of file",
  });
  assert.strictEqual(writeRes.ok, true);

  // Read file
  const readRes = await readTool.execute({
    path: testPath,
    startLine: 1,
    endLine: 2,
  });
  assert.strictEqual(readRes.ok, true);
  assert.match(readRes.content, /Line 1: Hello Homogenous/);
  assert.match(readRes.content, /Line 2: Phase 1 Tool Testing/);

  // Cleanup
  const absPath = resolvePath(process.cwd(), testPath);
  if (fs.existsSync(absPath)) fs.unlinkSync(absPath);
});

test("ReplaceFileContentTool replaces text cleanly", async () => {
  const writeTool = new WriteFileTool();
  const replaceTool = new ReplaceFileContentTool();
  const readTool = new ReadFileTool();
  const testPath = "test/scratch_replace_test.txt";

  await writeTool.execute({
    path: testPath,
    content: "const version = '1.0';\nconsole.log(version);",
  });

  const replaceRes = await replaceTool.execute({
    path: testPath,
    targetContent: "const version = '1.0';",
    replacementContent: "const version = '2.0';",
  });
  assert.strictEqual(replaceRes.ok, true);

  const readRes = await readTool.execute({ path: testPath });
  assert.match(readRes.content, /const version = '2.0';/);

  // Cleanup
  const absPath = resolvePath(process.cwd(), testPath);
  if (fs.existsSync(absPath)) fs.unlinkSync(absPath);
});

test("GitStatusTool returns working directory status", async () => {
  const gitStatusTool = new GitStatusTool();
  const res = await gitStatusTool.execute({});
  assert.strictEqual(res.ok, true);
  assert.ok(typeof res.content === "string");
});
