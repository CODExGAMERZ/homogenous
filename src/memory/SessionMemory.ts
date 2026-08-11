import type { Message } from "../inference/InferenceProvider.js";
import { TokenCounter } from "../token-budget/TokenCounter.js";
import { ContextCompactor } from "../token-budget/ContextCompactor.js";

export class SessionMemory {
  private messages: Message[] = [];
  private contextWindow: number;

  constructor(systemPrompt: string, contextWindow: number = 200000) {
    this.contextWindow = contextWindow;
    this.messages.push({ role: "system", content: systemPrompt });
  }

  public getMessages(): Message[] {
    return this.messages;
  }

  public addMessage(message: Message) {
    this.messages.push(message);
  }

  public setMessages(messages: Message[]) {
    this.messages = [...messages];
  }

  public clear(systemPrompt?: string) {
    const sys = systemPrompt || (this.messages[0]?.role === "system" ? (this.messages[0].content as string) : "");
    this.messages = [{ role: "system", content: sys }];
  }

  public getTotalTokens(): number {
    return this.messages.reduce(
      (sum, m) =>
        sum +
        TokenCounter.count(
          typeof m.content === "string" ? m.content : JSON.stringify(m.content)
        ),
      0
    );
  }

  public async compactIfNeeded(thresholdRatio: number = 0.70): Promise<boolean> {
    const res = await ContextCompactor.checkAndCompact(
      this.messages,
      this.contextWindow,
      thresholdRatio
    );
    if (res.compacted) {
      this.messages = res.messages;
      return true;
    }
    return false;
  }
}
