import { BaseTool, type ToolResult } from "./BaseTool.js";
import { ToolOutputTruncator } from "../../token-budget/ToolOutputTruncator.js";

export class WebFetchTool extends BaseTool {
  readonly name = "web_fetch";
  readonly description = "Fetch text content from a public web URL.";
  readonly inputSchema = {
    type: "object",
    properties: {
      url: {
        type: "string",
        description: "Public HTTP or HTTPS URL to fetch content from.",
      },
    },
    required: ["url"],
  };

  async execute(input: Record<string, unknown>): Promise<ToolResult> {
    const url = input.url as string;

    try {
      const response = await fetch(url, {
        headers: { "User-Agent": "Homogenous-CLI/0.1.0" },
      });

      if (!response.ok) {
        return {
          ok: false,
          isError: true,
          content: `Web fetch failed with HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const htmlText = await response.text();
      // Strip HTML tags for clean text content
      const plainText = htmlText
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      const truncated = ToolOutputTruncator.truncate(plainText, 4000);

      return {
        ok: true,
        content: `Fetched URL: ${url}\n\n${truncated.content}`,
      };
    } catch (err) {
      return {
        ok: false,
        isError: true,
        content: `Web fetch exception for '${url}': ${(err as Error).message}`,
      };
    }
  }
}
