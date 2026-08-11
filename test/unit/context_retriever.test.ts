import assert from "node:assert";
import test from "node:test";
import { ContextRetriever } from "../../src/token-budget/ContextRetriever.js";

test("ContextRetriever.extractTerms filters stop words and extracts symbols", () => {
  const terms = ContextRetriever.extractTerms("Find the AuthProvider class in src/auth.ts");
  assert.ok(terms.includes("AuthProvider"));
  assert.ok(!terms.includes("the"));
  assert.ok(!terms.includes("in"));
});

test("ContextRetriever.hybridRank sorts spans by term match score", () => {
  const spans = [
    { filePath: "src/a.ts", startLine: 1, endLine: 10, content: "function foo() {}", score: 0.5 },
    { filePath: "src/b.ts", startLine: 1, endLine: 10, content: "class AuthProvider { login() {} }", score: 0.5 },
  ];

  const ranked = ContextRetriever.hybridRank(spans, ["AuthProvider"], 5);
  assert.strictEqual(ranked[0].filePath, "src/b.ts");
});
