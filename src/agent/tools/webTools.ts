import { z } from "zod";
import { BaseTool, type ToolResult } from "./BaseTool.js";
import { ToolOutputTruncator } from "../../token-budget/ToolOutputTruncator.js";

/**
 * Checks if a hostname or IP is a forbidden internal/cloud-metadata address (SSRF protection).
 */
function isForbiddenHost(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (
    lower === "localhost" ||
    lower === "127.0.0.1" ||
    lower === "::1" ||
    lower === "0.0.0.0" ||
    lower === "169.254.169.254" || // AWS / GCP / Azure instance metadata
    lower === "metadata.google.internal" ||
    lower.endsWith(".localhost") ||
    lower.endsWith(".local") ||
    lower.endsWith(".internal")
  ) {
    return true;
  }

  // IPv4 private address ranges: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 127.0.0.0/8, 169.254.0.0/16
  const ipMatch = lower.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipMatch) {
    const octets = ipMatch.slice(1, 5).map((s) => parseInt(s, 10));
    if (octets[0] === 127 || octets[0] === 10 || octets[0] === 0) return true;
    if (octets[0] === 169 && octets[1] === 254) return true;
    if (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) return true;
    if (octets[0] === 192 && octets[1] === 168) return true;
  }

  return false;
}

export class WebFetchTool extends BaseTool {
  readonly name = "web_fetch";
  readonly description = "Fetch text content from a public web URL.";
  readonly zodSchema = z.object({
    url: z.string().min(1, "URL must not be empty"),
  });
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
    const rawUrl = input.url as string;

    if (!rawUrl || typeof rawUrl !== "string") {
      return {
        ok: false,
        isError: true,
        content: "Error: A valid URL string must be provided.",
      };
    }

    let currentUrlStr = rawUrl;
    let redirectCount = 0;
    const MAX_REDIRECTS = 5;
    const MAX_BYTES = 500 * 1024; // 500 KB streaming cap

    try {
      while (redirectCount <= MAX_REDIRECTS) {
        let parsedUrl: URL;
        try {
          parsedUrl = new URL(currentUrlStr);
        } catch {
          return {
            ok: false,
            isError: true,
            content: `Error: Invalid URL format '${currentUrlStr}'.`,
          };
        }

        if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
          return {
            ok: false,
            isError: true,
            content: `Error: Unsupported protocol '${parsedUrl.protocol}'. Only http and https URLs are permitted.`,
          };
        }

        // Validate hostname at initial request and on every redirect hop to prevent redirect-based SSRF
        if (isForbiddenHost(parsedUrl.hostname)) {
          return {
            ok: false,
            isError: true,
            content: `Error: Access to internal or metadata address '${parsedUrl.hostname}' is blocked for security (SSRF prevention).`,
          };
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(currentUrlStr, {
          signal: controller.signal,
          redirect: "manual",
          headers: {
            "User-Agent": "Homogenous-CLI/3.3.1",
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.5",
          },
        });
        clearTimeout(timeoutId);

        // Handle redirects manually to inspect Location header for SSRF
        if (response.status >= 300 && response.status < 400) {
          const location = response.headers.get("location");
          if (!location) {
            return {
              ok: false,
              isError: true,
              content: `Error: Received HTTP redirect ${response.status} without Location header.`,
            };
          }
          currentUrlStr = new URL(location, currentUrlStr).toString();
          redirectCount++;
          if (redirectCount > MAX_REDIRECTS) {
            return {
              ok: false,
              isError: true,
              content: `Error: Exceeded maximum allowed redirect hops (${MAX_REDIRECTS}).`,
            };
          }
          continue;
        }

        if (!response.ok) {
          return {
            ok: false,
            isError: true,
            content: `Web fetch failed with HTTP ${response.status}: ${response.statusText}`,
          };
        }

        // Stream reader to cap body memory consumption at 500KB without buffering full response
        const chunks: Uint8Array[] = [];
        let totalBytes = 0;

        if (response.body) {
          const reader = response.body.getReader();
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              if (value) {
                totalBytes += value.byteLength;
                if (totalBytes > MAX_BYTES) {
                  const allowed = value.byteLength - (totalBytes - MAX_BYTES);
                  if (allowed > 0) {
                    chunks.push(value.slice(0, allowed));
                  }
                  await reader.cancel();
                  break;
                }
                chunks.push(value);
              }
            }
          } catch {
            // Stream read ended
          }
        }

        const combined = new Uint8Array(chunks.reduce((acc, c) => acc + c.byteLength, 0));
        let offset = 0;
        for (const chunk of chunks) {
          combined.set(chunk, offset);
          offset += chunk.byteLength;
        }

        const htmlText = new TextDecoder("utf-8").decode(combined);

        // Strip HTML tags for clean text content
        const plainText = htmlText
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
          .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/&nbsp;/g, " ")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/\s+/g, " ")
          .trim();

        const truncated = ToolOutputTruncator.truncate(plainText, 4000);

        return {
          ok: true,
          content: `Fetched URL: ${currentUrlStr}\n\n${truncated.content}`,
        };
      }

      return {
        ok: false,
        isError: true,
        content: `Error: Exceeded maximum allowed redirect hops (${MAX_REDIRECTS}).`,
      };
    } catch (err) {
      const isAbort = (err as Error).name === "AbortError";
      return {
        ok: false,
        isError: true,
        content: isAbort
          ? `Web fetch request to '${rawUrl}' timed out after 10000ms.`
          : `Web fetch exception for '${rawUrl}': ${(err as Error).message}`,
      };
    }
  }
}
