import type { Message } from "../inference/InferenceProvider.js";
import { TokenCounter } from "./TokenCounter.js";
import { ProviderRegistry } from "../inference/ProviderRegistry.js";

export interface CompactResult {
  compacted: boolean;
  messages: Message[];
  tokensBefore: number;
  tokensAfter: number;
}

export class ContextCompactor {
  /**
   * Checks fill ratio and compacts oldest conversation turns if context threshold is exceeded.
   */
  public static async checkAndCompact(
    messages: Message[],
    contextWindow: number,
    thresholdRatio: number = 0.7,
    keepRecentTurns: number = 4
  ): Promise<CompactResult> {
    const totalTokensBefore = messages.reduce(
      (sum, m) =>
        sum +
        TokenCounter.count(
          typeof m.content === "string" ? m.content : JSON.stringify(m.content)
        ),
      0
    );

    if (totalTokensBefore / contextWindow < thresholdRatio || messages.length <= keepRecentTurns + 1) {
      return {
        compacted: false,
        messages,
        tokensBefore: totalTokensBefore,
        tokensAfter: totalTokensBefore,
      };
    }

    // Keep system prompt (idx 0) and recent N turns at tail
    const systemMsg = messages[0];
    const olderTurns = messages.slice(1, messages.length - keepRecentTurns);
    const recentTurns = messages.slice(messages.length - keepRecentTurns);

    const oldText = olderTurns
      .map((m) => `${m.role.toUpperCase()}: ${typeof m.content === "string" ? m.content : JSON.stringify(m.content)}`)
      .join("\n\n");

    const compactionPrompt = `Summarize the following conversation history into a concise, factual bulleted summary preserving:
1. Decisions made
2. Files touched/edited
3. Key technical facts discovered
4. Unresolved TODOs

Conversation history to summarize:
${oldText}`;

    // Route compaction to cheap/free triage provider (Groq or Local Ollama)
    let summaryText = "";
    try {
      const resolution = await ProviderRegistry.getInstance().routeFor("compaction");
      const res = await resolution.provider.chat({
        model: resolution.model,
        messages: [{ role: "user", content: compactionPrompt }],
        maxTokens: 1024,
      });
      summaryText = res.content.filter((b) => b.type === "text").map((b) => (b as any).text).join("\n");
    } catch {
      // Heuristic fallback if LLM compaction call fails
      summaryText = `Compacted ${olderTurns.length} older turns into summary: User & assistant modified workspace files and completed initial setup tasks.`;
    }

    const syntheticSummaryMsg: Message = {
      role: "assistant",
      content: `[compacted-summary]\n${summaryText}`,
    };

    const newMessages: Message[] = [systemMsg, syntheticSummaryMsg, ...recentTurns];

    const totalTokensAfter = newMessages.reduce(
      (sum, m) =>
        sum +
        TokenCounter.count(
          typeof m.content === "string" ? m.content : JSON.stringify(m.content)
        ),
      0
    );

    return {
      compacted: true,
      messages: newMessages,
      tokensBefore: totalTokensBefore,
      tokensAfter: totalTokensAfter,
    };
  }
}
