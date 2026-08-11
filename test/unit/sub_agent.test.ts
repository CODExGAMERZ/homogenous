import assert from "node:assert";
import test from "node:test";
import { SubAgent } from "../../src/agent/SubAgent.js";
import { ProviderRegistry } from "../../src/inference/ProviderRegistry.js";

test("SubAgent initializes with target provider and model", () => {
  const provider = ProviderRegistry.getInstance().getProvider("anthropic")!;
  const subAgent = new SubAgent(provider, "claude-3-5-sonnet-20241022");
  assert.ok(subAgent);
});
