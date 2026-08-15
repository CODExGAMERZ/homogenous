import assert from "node:assert";
import test from "node:test";
import { parseEmbeddedToolCalls } from "../../src/inference/toolParser.js";

test("parseEmbeddedToolCalls extracts JSON tool call with parameters object", () => {
  const input = `{"type": "function", "name": "write_file", "parameters": {"path": "index.html", "content": "<html></html>"}}`;
  const result = parseEmbeddedToolCalls(input);

  assert.strictEqual(result.toolCalls.length, 1);
  assert.strictEqual(result.toolCalls[0].name, "write_file");
  assert.deepStrictEqual(result.toolCalls[0].input, { path: "index.html", content: "<html></html>" });
});

test("parseEmbeddedToolCalls extracts fenced JSON markdown blocks", () => {
  const input = `I will create the file for you:
\`\`\`json
{
  "name": "write_file",
  "arguments": {
    "path": "app.js",
    "content": "console.log('hello');"
  }
}
\`\`\`
Done!`;
  const result = parseEmbeddedToolCalls(input);

  assert.strictEqual(result.toolCalls.length, 1);
  assert.strictEqual(result.toolCalls[0].name, "app.js" ? "write_file" : "");
  assert.strictEqual((result.toolCalls[0].input as any).path, "app.js");
});

test("parseEmbeddedToolCalls extracts XML <tool_call> tags", () => {
  const input = `<tool_call>
{"name": "read_file", "parameters": {"path": "package.json"}}
</tool_call>`;
  const result = parseEmbeddedToolCalls(input);

  assert.strictEqual(result.toolCalls.length, 1);
  assert.strictEqual(result.toolCalls[0].name, "read_file");
  assert.strictEqual((result.toolCalls[0].input as any).path, "package.json");
});
