import { getEncoding } from "js-tiktoken";

export class TokenCounter {
  private static encoder: ReturnType<typeof getEncoding> | null = null;

  private static getEncoder() {
    if (!TokenCounter.encoder) {
      try {
        TokenCounter.encoder = getEncoding("cl100k_base");
      } catch {
        TokenCounter.encoder = null;
      }
    }
    return TokenCounter.encoder;
  }

  /**
   * Counts exact or heuristic tokens for a given text string.
   */
  public static count(text: string): number {
    if (!text) return 0;
    const encoder = TokenCounter.getEncoder();
    if (encoder) {
      try {
        return encoder.encode(text).length;
      } catch {
        // Fallback if encoding fails
      }
    }
    return Math.ceil(text.length / 4);
  }
}
