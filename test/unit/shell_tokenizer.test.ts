import assert from "node:assert";
import test from "node:test";
import { tokenizeCommandLine, resolveLocalOrPathBinary } from "../../src/platform/shell.js";

test("Shell Tokenizer: correctly splits plain command strings", () => {
  const res = tokenizeCommandLine("node -v");
  assert.notStrictEqual(res, null);
  assert.strictEqual(res!.binary, "node");
  assert.deepStrictEqual(res!.args, ["-v"]);
});

test("Shell Tokenizer: correctly parses double-quoted arguments with spaces", () => {
  const res = tokenizeCommandLine('cat "foo bar.txt" "second file.md"');
  assert.notStrictEqual(res, null);
  assert.strictEqual(res!.binary, "cat");
  assert.deepStrictEqual(res!.args, ["foo bar.txt", "second file.md"]);
});

test("Shell Tokenizer: correctly parses single-quoted arguments with spaces", () => {
  const res = tokenizeCommandLine("cat 'it is a file.txt'");
  assert.notStrictEqual(res, null);
  assert.strictEqual(res!.binary, "cat");
  assert.deepStrictEqual(res!.args, ["it is a file.txt"]);
});

test("Shell Tokenizer: handles escaped spaces outside quotes", () => {
  const res = tokenizeCommandLine("cat foo\\ bar.txt");
  assert.notStrictEqual(res, null);
  assert.strictEqual(res!.binary, "cat");
  assert.deepStrictEqual(res!.args, ["foo bar.txt"]);
});

test("Shell Tokenizer: rejects unterminated quotes and trailing backslashes", () => {
  assert.strictEqual(tokenizeCommandLine('cat "unterminated string'), null);
  assert.strictEqual(tokenizeCommandLine("cat 'unclosed single quote"), null);
  assert.strictEqual(tokenizeCommandLine("cat trailing_escape\\"), null);
});

test("Shell Tokenizer: rejects shell metacharacters", () => {
  assert.strictEqual(tokenizeCommandLine("npm test && evil"), null);
  assert.strictEqual(tokenizeCommandLine("git log; rm -rf ."), null);
  assert.strictEqual(tokenizeCommandLine("git log | grep fix"), null);
  assert.strictEqual(tokenizeCommandLine("cat $(whoami)"), null);
  assert.strictEqual(tokenizeCommandLine("cat `whoami`"), null);
  assert.strictEqual(tokenizeCommandLine("cat file > out.txt"), null);
  assert.strictEqual(tokenizeCommandLine("cat file < in.txt"), null);
  assert.strictEqual(tokenizeCommandLine("cat %USERPROFILE%"), null);
});

test("Local Binary Resolver: resolves local binaries or falls back to PATH", () => {
  const resolved = resolveLocalOrPathBinary("tsc", process.cwd());
  assert.ok(typeof resolved === "string" && resolved.length > 0);
});
