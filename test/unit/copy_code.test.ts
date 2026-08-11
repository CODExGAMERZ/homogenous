import { test } from "node:test";
import assert from "node:assert";
import { CodeBlockStore } from "../../src/utils/CodeBlockStore.js";
import { copyCommand } from "../../src/cli/slash/builtin/copy.js";

test("CodeBlockStore extracts and stores markdown code blocks", () => {
  const store = CodeBlockStore.getInstance();
  const sampleMarkdown = `
Here is a C program:
\`\`\`c
#include <stdio.stdio>
int main() { return 0; }
\`\`\`
`;
  store.addBlocksFromMarkdown(sampleMarkdown);
  const last = store.getLastBlock();
  assert.ok(last);
  assert.strictEqual(last.lang, "c");
  assert.ok(last.code.includes("#include <stdio.stdio>"));
});

test("Slash command /copy retrieves last code block", async () => {
  const store = CodeBlockStore.getInstance();
  store.addBlock("python", "print('hello world')");

  const result = await copyCommand.execute([], {
    provider: {} as any,
    model: "test",
    workspacePath: process.cwd(),
    setModel: () => {},
  });

  assert.ok(result);
  assert.ok(result.output.includes("PYTHON") || result.output.includes("clipboard"));
});
