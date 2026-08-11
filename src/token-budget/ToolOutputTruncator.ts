import { TokenCounter } from "./TokenCounter.js";

export class ToolOutputTruncator {
  /**
   * Truncates large tool outputs using smart middle-elision if token count exceeds maxTokenCap.
   */
  public static truncate(content: string, maxTokenCap: number = 4000): { content: string; truncated: boolean; elidedTokens: number } {
    if (!content) return { content: "", truncated: false, elidedTokens: 0 };

    const totalTokens = TokenCounter.count(content);
    if (totalTokens <= maxTokenCap) {
      return { content, truncated: false, elidedTokens: 0 };
    }

    const lines = content.split(/\r?\n/);
    if (lines.length <= 10) {
      // Short line count, perform character-slice middle elision
      const headLen = Math.floor(content.length * 0.4);
      const tailLen = Math.floor(content.length * 0.4);
      const head = content.slice(0, headLen);
      const tail = content.slice(content.length - tailLen);

      const elidedTokens = totalTokens - (TokenCounter.count(head) + TokenCounter.count(tail));
      const marker = `\n… [${elidedTokens} tokens elided — showing head/tail; use specific line ranges to inspect omitted middle] …\n`;

      return {
        content: head + marker + tail,
        truncated: true,
        elidedTokens,
      };
    }

    // Line-based smart middle-elision
    const keepLineCount = Math.floor(lines.length * 0.4);
    const headLines = lines.slice(0, keepLineCount);
    const tailLines = lines.slice(lines.length - keepLineCount);

    const headText = headLines.join("\n");
    const tailText = tailLines.join("\n");

    const keptTokens = TokenCounter.count(headText) + TokenCounter.count(tailText);
    const elidedTokens = Math.max(0, totalTokens - keptTokens);

    const marker = `\n… [${elidedTokens} tokens elided — showing head (${headLines.length} lines) / tail (${tailLines.length} lines); use line ranges to inspect omitted middle] …\n`;

    return {
      content: headText + marker + tailText,
      truncated: true,
      elidedTokens,
    };
  }
}
