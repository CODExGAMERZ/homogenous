import type { Message, CacheHint } from "../inference/InferenceProvider.js";
import { PersistentMemory } from "../memory/PersistentMemory.js";

export class PromptCacheManager {
  /**
   * Constructs the stable session prefix (System Prompt + Persistent Memory facts).
   */
  public static buildStablePrefix(baseSystemPrompt: string = ""): string {
    const memoryFacts = PersistentMemory.getInstance().getFormattedSystemFacts();
    return `${baseSystemPrompt}\n${memoryFacts}`.trim();
  }

  /**
   * Evaluates message array and computes CacheHint for ephemeral prompt caching.
   */
  public static computeCacheHint(messages: Message[]): CacheHint | undefined {
    if (messages.length === 0) return undefined;

    // Cache up to system prompt / stable prefix boundary (usually index 0 or system block)
    let cacheIdx = 0;
    for (let i = 0; i < messages.length; i++) {
      if (messages[i].role === "system") {
        cacheIdx = i;
      }
    }

    return {
      cacheableUpToIndex: cacheIdx,
    };
  }
}
