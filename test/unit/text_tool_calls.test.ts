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
  assert.strictEqual(result.toolCalls[0].name, "write_file");
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

test("parseEmbeddedToolCalls extracts XML <invoke> format", () => {
  const input = `<invoke name="write_file">
<parameter name="path">src/main.ts</parameter>
<parameter name="content">console.log("ready");</parameter>
</invoke>`;
  const result = parseEmbeddedToolCalls(input);

  assert.strictEqual(result.toolCalls.length, 1);
  assert.strictEqual(result.toolCalls[0].name, "write_file");
  assert.strictEqual((result.toolCalls[0].input as any).path, "src/main.ts");
});

test("parseEmbeddedToolCalls extracts Llama 3 / Groq <function/write_file(...)> format", () => {
  const input = `<function/write_file({"path": "index.html", "content": "<!DOCTYPE html><html><body>TicTacToe</body></html>"})>`;
  const result = parseEmbeddedToolCalls(input);

  assert.strictEqual(result.toolCalls.length, 1);
  assert.strictEqual(result.toolCalls[0].name, "write_file");
  assert.strictEqual((result.toolCalls[0].input as any).path, "index.html");
  assert.ok((result.toolCalls[0].input as any).content.includes("TicTacToe"));
});

test("parseEmbeddedToolCalls extracts raw JSON embedded in conversational response", () => {
  const input = `Sure, I'll write that file for you right now:
{"type": "function", "name": "write_file", "parameters": {"path": "game.js", "content": "let x = 1;"}}
Let me know if you need any adjustments!`;
  const result = parseEmbeddedToolCalls(input);

  assert.strictEqual(result.toolCalls.length, 1);
  assert.strictEqual(result.toolCalls[0].name, "write_file");
  assert.strictEqual((result.toolCalls[0].input as any).path, "game.js");
});
