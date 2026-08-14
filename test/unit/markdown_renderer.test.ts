import assert from "node:assert";
import test from "node:test";
import {
  tokenizeInline,
  getVisibleLength,
  wrapCellText,
  parseMarkdownTable,
  parseMarkdownBlocks,
} from "../../src/cli/ui/MarkdownText.js";

test("MarkdownText.tokenizeInline correctly extracts bold, italic, code, and text tokens", () => {
  const sample = "Here is **bold** text, *italic* word, and `const x = 1` code.";
  const tokens = tokenizeInline(sample);

  assert.strictEqual(tokens.length, 7);
  assert.strictEqual(tokens[0].type, "text");
  assert.strictEqual(tokens[0].text, "Here is ");

  assert.strictEqual(tokens[1].type, "bold");
  assert.strictEqual(tokens[1].text, "bold");

  assert.strictEqual(tokens[2].type, "text");
  assert.strictEqual(tokens[2].text, " text, ");

  assert.strictEqual(tokens[3].type, "italic");
  assert.strictEqual(tokens[3].text, "italic");

  assert.strictEqual(tokens[4].type, "text");
  assert.strictEqual(tokens[4].text, " word, and ");

  assert.strictEqual(tokens[5].type, "code");
  assert.strictEqual(tokens[5].text, "const x = 1");

  assert.strictEqual(tokens[6].type, "text");
  assert.strictEqual(tokens[6].text, " code.");
});

test("MarkdownText.getVisibleLength strips markdown, html tags, and ANSI escape sequences correctly", () => {
  assert.strictEqual(getVisibleLength("**Domain**"), 6);
  assert.strictEqual(getVisibleLength("*italic*"), 6);
  assert.strictEqual(getVisibleLength("`code`"), 4);
  assert.strictEqual(getVisibleLength("<b>HTML</b>"), 4);
  assert.strictEqual(getVisibleLength("Plain text"), 10);
  assert.strictEqual(getVisibleLength("\u001b[38;2;255;46;209mPink Text\u001b[39m"), 9);
});

test("MarkdownText.wrapCellText handles <br> tags and wraps words within maxWidth", () => {
  const cell = "• **Training** – heavy and iterative<br>• **Inference** – lightweight";
  const wrapped = wrapCellText(cell, 30);

  assert.ok(wrapped.length >= 2, "Should split by <br> into multiple lines");
  assert.ok(wrapped[0].includes("Training"), "First line contains Training");
  assert.ok(wrapped.some((l) => l.includes("Inference")), "Contains Inference in wrapped lines");
});

test("MarkdownText.wrapCellText balances bold tags across line breaks", () => {
  const cell = "**Implementation complexity**";
  const wrapped = wrapCellText(cell, 16);

  assert.strictEqual(wrapped.length, 2);
  assert.strictEqual(wrapped[0], "**Implementation**");
  assert.strictEqual(wrapped[1], "**complexity**");
});

test("MarkdownText.parseMarkdownTable parses markdown tables with headers and rows", () => {
  const tableMarkdown = [
    "| Aspect | Description |",
    "|--------|-------------|",
    "| **Domain** | Machine-learning / deep-learning. |",
    "| **Goal** | Apply a trained model to new data. |",
  ];

  const parsed = parseMarkdownTable(tableMarkdown);
  assert.ok(parsed !== null, "Table should be successfully parsed");
  assert.deepStrictEqual(parsed.headers, ["Aspect", "Description"]);
  assert.strictEqual(parsed.rows.length, 2);
  assert.strictEqual(parsed.rows[0][0], "**Domain**");
  assert.strictEqual(parsed.rows[0][1], "Machine-learning / deep-learning.");
  assert.strictEqual(parsed.rows[1][0], "**Goal**");
  assert.strictEqual(parsed.rows[1][1], "Apply a trained model to new data.");
});

test("MarkdownText.parseMarkdownTable parses raw ASCII box tables and merges multi-line cell continuations", () => {
  const asciiTable = [
    "┌───────────────────────────┬──────────────┐",
    "│ Feature                   │ Array        │",
    "├───────────────────────────┼──────────────┤",
    "│ **Implementation          │ Simple: just │",
    "│ complexity**              │ allocate     │",
  ];

  const parsed = parseMarkdownTable(asciiTable);
  assert.ok(parsed !== null, "ASCII table should be parsed");
  assert.deepStrictEqual(parsed.headers, ["Feature", "Array"]);
  assert.strictEqual(parsed.rows.length, 1);
  assert.strictEqual(parsed.rows[0][0], "**Implementation complexity**");
  assert.strictEqual(parsed.rows[0][1], "Simple: just allocate");
});

test("MarkdownText.parseMarkdownBlocks parses headings, rules, tables, lists, and code blocks", () => {
  const content = `## 1. What “Inference” Means

| Aspect | Description |
|---|---|
| Domain | ML / AI |

---

> Key takeaway point

- Bullet 1
- Bullet 2

\`\`\`typescript
const greeting = "Hello world";
\`\`\`
`;

  const blocks = parseMarkdownBlocks(content);
  assert.ok(blocks.length >= 6, `Expected at least 6 blocks, got ${blocks.length}`);

  const headingBlock = blocks.find((b) => b.type === "heading");
  assert.ok(headingBlock && headingBlock.type === "heading");
  assert.strictEqual(headingBlock.level, 2);
  assert.strictEqual(headingBlock.text, "1. What “Inference” Means");

  const tableBlock = blocks.find((b) => b.type === "table");
  assert.ok(tableBlock && tableBlock.type === "table");
  assert.deepStrictEqual(tableBlock.tableData.headers, ["Aspect", "Description"]);

  const ruleBlock = blocks.find((b) => b.type === "rule");
  assert.ok(ruleBlock, "Rule block exists");

  const quoteBlock = blocks.find((b) => b.type === "blockquote");
  assert.ok(quoteBlock && quoteBlock.type === "blockquote");
  assert.strictEqual(quoteBlock.text, "Key takeaway point");

  const listItems = blocks.filter((b) => b.type === "list_item");
  assert.strictEqual(listItems.length, 2);

  const codeBlock = blocks.find((b) => b.type === "code");
  assert.ok(codeBlock && codeBlock.type === "code");
  assert.strictEqual(codeBlock.lang, "typescript");
  assert.strictEqual(codeBlock.text, 'const greeting = "Hello world";');
});

test("MarkdownText.parseMarkdownBlocks correctly handles indented and unclosed code blocks from Ollama", () => {
  const content = `3. Implementation:
    \`\`\`python
    class Node:
        def __init__(self, data):
            self.data = data
`;

  const blocks = parseMarkdownBlocks(content);
  const codeBlock = blocks.find((b) => b.type === "code");
  assert.ok(codeBlock && codeBlock.type === "code");
  assert.strictEqual(codeBlock.lang, "python");
  assert.ok(codeBlock.text.includes("class Node:"));
  assert.ok(codeBlock.text.includes("self.data = data"));
});

test("MarkdownText.wrapCellText cleanly handles inline code spans and trailing punctuation", () => {
  const cell = "Usually implemented as a simple table `next[state][symbol]`.";
  const wrapped = wrapCellText(cell, 40);

  // Must not orphan single punctuation dot onto its own line
  for (const line of wrapped) {
    assert.notStrictEqual(line.trim(), ".");
  }
  assert.ok(wrapped.length <= 2);
  assert.ok(wrapped.some((l) => l.includes("`next[state][symbol]`")));
});

