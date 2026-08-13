import assert from "node:assert";
import test from "node:test";
import { normalizeOllamaHost } from "../../src/inference/providers/OllamaProvider.js";

test("normalizeOllamaHost normalizes malformed, missing scheme, 0.0.0.0, and API path URLs", () => {
  assert.strictEqual(normalizeOllamaHost("0.0.0.0/api/chat"), "http://127.0.0.1:11434");
  assert.strictEqual(normalizeOllamaHost("0.0.0.0:11434"), "http://127.0.0.1:11434");
  assert.strictEqual(normalizeOllamaHost("127.0.0.1:11434"), "http://127.0.0.1:11434");
  assert.strictEqual(normalizeOllamaHost("localhost:11434"), "http://localhost:11434");
  assert.strictEqual(normalizeOllamaHost("http://0.0.0.0:11434/api/tags"), "http://127.0.0.1:11434");
  assert.strictEqual(normalizeOllamaHost("https://ollama.mycompany.internal:11434"), "https://ollama.mycompany.internal:11434");
});
