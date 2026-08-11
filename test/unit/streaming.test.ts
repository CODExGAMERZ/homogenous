import assert from "node:assert";
import test from "node:test";
import { AgentLoop } from "../../src/agent/AgentLoop.js";
import { MockProvider } from "../../src/inference/providers/MockProvider.js";

test("AgentLoop.run emits word-by-word text deltas via onTextDelta callback", async () => {
  const provider = new MockProvider();
  const agent = new AgentLoop({ provider, model: "demo-mode" });

  const deltas: string[] = [];
  const fullResult = await agent.run(
    [{ role: "user", content: "Hello streaming" }],
    (delta) => {
      deltas.push(delta);
    }
  );

  assert.ok(deltas.length > 0, "Deltas should be emitted during agent run");
  assert.strictEqual(deltas.join(""), fullResult, "Recombined deltas should equal final answer text");
});
