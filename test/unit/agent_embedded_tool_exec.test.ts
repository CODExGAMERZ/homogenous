import assert from "node:assert";
import test from "node:test";
import fs from "node:fs";
import { AgentLoop } from "../../src/agent/AgentLoop.js";
import { resolvePath } from "../../src/platform/paths.js";
import type { InferenceProvider, ChatRequest, ChatResponse } from "../../src/inference/InferenceProvider.js";

class TextToolCallMockProvider implements InferenceProvider {
  readonly id = "mock" as const;
  private callCount = 0;

  async ping() { return { ok: true }; }
  capabilities() { return { supportsTools: true, supportsStreaming: false, isLocal: true, contextWindow: 4096 }; }
  supportsTools() { return true; }
  async countTokens(t: string) { return Math.ceil(t.length / 4); }
  async embed() { return { embeddings: [], dimensions: 0 }; }

  async chat(req: ChatRequest): Promise<ChatResponse> {
    this.callCount++;
    if (this.callCount === 1) {
      // Simulate open-weights model returning tool call directly as JSON text
      return {
        content: [
          {
            type: "text",
            text: `{"type": "function", "name": "write_file", "parameters": {"path": "test_agent_written.html", "content": "<!DOCTYPE html><html><body>TicTacToe</body></html>"}}`,
          },
        ],
        stopReason: "end_turn",
        usage: { inputTokens: 50, outputTokens: 50 },
      };
    }
    // Turn 2 after tool result
    return {
      content: [{ type: "text", text: "I have successfully created test_agent_written.html!" }],
      stopReason: "end_turn",
      usage: { inputTokens: 50, outputTokens: 50 },
    };
  }

  async *stream(req: ChatRequest) {
    const res = await this.chat(req);
    yield { type: "text_delta" as const, textDelta: (res.content[0] as any).text };
    yield { type: "message_stop" as const, usage: res.usage };
  }
}

test("AgentLoop automatically intercepts text-based tool calls and executes write_file", async () => {
  const filePath = resolvePath(process.cwd(), "test_agent_written.html");
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  const provider = new TextToolCallMockProvider();
  const agent = new AgentLoop({
    provider,
    model: "demo-model",
    workspaceRoot: process.cwd(),
  });

  const messages = [
    { role: "user" as const, content: "Create index.html with a tic-tac-toe game" },
  ];

  const answer = await agent.run(messages);

  assert.ok(fs.existsSync(filePath), "test_agent_written.html should have been written to disk by write_file tool");
  const content = fs.readFileSync(filePath, "utf-8");
  assert.ok(content.includes("TicTacToe"));
  assert.ok(answer.includes("successfully created"));

  // Cleanup
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
});
