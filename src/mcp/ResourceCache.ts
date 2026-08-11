import { ToolOutputTruncator } from "../token-budget/ToolOutputTruncator.js";
import { BudgetLedger } from "../token-budget/BudgetLedger.js";

export class ResourceCache {
  private static cache: Map<string, { content: string; timestamp: number }> = new Map();

  public static get(resourceUri: string, maxAgeMs: number = 60000): string | undefined {
    const entry = ResourceCache.cache.get(resourceUri);
    if (!entry) return undefined;
    if (Date.now() - entry.timestamp > maxAgeMs) {
      ResourceCache.cache.delete(resourceUri);
      return undefined;
    }
    return entry.content;
  }

  public static set(resourceUri: string, rawContent: string): string {
    const truncated = ToolOutputTruncator.truncate(rawContent, 4000);
    ResourceCache.cache.set(resourceUri, {
      content: truncated.content,
      timestamp: Date.now(),
    });

    BudgetLedger.getInstance().recordCall({
      provider: "mcp-resource",
      model: resourceUri,
      inputTokens: truncated.elidedTokens,
      outputTokens: 0,
      isLocal: true,
    });

    return truncated.content;
  }
}
