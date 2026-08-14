import dns from "node:dns/promises";
import net from "node:net";
import { z } from "zod";
import { BaseTool, type ToolResult } from "./BaseTool.js";
import { ToolOutputTruncator } from "../../token-budget/ToolOutputTruncator.js";

/**
 * Validates whether an IPv4 numeric representation (or octets) falls in private/loopback/link-local ranges.
 */
function isPrivateIPv4(ip: string): boolean {
  let num: number | null = null;

  // Decimal integer representation (e.g. 2130706433)
  if (/^\d+$/.test(ip)) {
    const val = Number(ip);
    if (val >= 0 && val <= 0xffffffff) {
      num = val;
    }
  } else if (/^0x[0-9a-fA-F]+$/i.test(ip)) {
    // Hex integer representation (e.g. 0x7f000001)
    const val = Number(ip);
    if (val >= 0 && val <= 0xffffffff) {
      num = val;
    }
  } else if (/^\d{1,3}(\.\d{1,3}){1,3}$/.test(ip)) {
    // Standard or short-form dotted decimal (e.g. 127.0.0.1, 127.1)
    const parts = ip.split(".").map((p) => parseInt(p, 10));
    if (parts.length === 2) {
      num = (parts[0] << 24) | (parts[1] & 0x00ffffff);
    } else if (parts.length === 3) {
      num = (parts[0] << 24) | ((parts[1] & 0xff) << 16) | (parts[2] & 0x0000ffff);
    } else if (parts.length === 4) {
      num = ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
    }
  }

  if (num !== null) {
    const b1 = (num >>> 24) & 0xff;
    const b2 = (num >>> 16) & 0xff;

    // 0.0.0.0/8 (Current network)
    if (b1 === 0) return true;
    // 127.0.0.0/8 (Loopback)
    if (b1 === 127) return true;
    // 10.0.0.0/8 (Private)
    if (b1 === 10) return true;
    // 169.254.0.0/16 (Link-local / Cloud metadata)
    if (b1 === 169 && b2 === 254) return true;
    // 172.16.0.0/12 (Private)
    if (b1 === 172 && b2 >= 16 && b2 <= 31) return true;
    // 192.168.0.0/16 (Private)
    if (b1 === 192 && b2 === 168) return true;
  }

  return false;
}

/**
 * Extracts embedded IPv4 addresses from IPv4-mapped or compatible IPv6 addresses.
 */
function extractEmbeddedIPv4(addr: string): string | null {
  const match = addr.match(/(?:^|:)(?:ffff:)?(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/i);
  if (match) {
    return match[1];
  }
  // Check hex-encoded IPv4 in IPv6 e.g. ::ffff:7f00:0001
  const hexMatch = addr.match(/^(?:0*:)*ffff:([0-9a-fA-F]{1,4}):([0-9a-fA-F]{1,4})$/i);
  if (hexMatch) {
    const high = parseInt(hexMatch[1], 16);
    const low = parseInt(hexMatch[2], 16);
    const b1 = (high >> 8) & 0xff;
    const b2 = high & 0xff;
    const b3 = (low >> 8) & 0xff;
    const b4 = low & 0xff;
    return `${b1}.${b2}.${b3}.${b4}`;
  }
  return null;
}

/**
 * Checks if a hostname, resolved IP, or encoded address is a forbidden internal/cloud-metadata address (SSRF protection).
 */
async function isForbiddenHost(hostname: string): Promise<boolean> {
  const lower = hostname.toLowerCase().trim();

  // Strip IPv6 brackets if present (e.g. [::1])
  const unbracketed = lower.startsWith("[") && lower.endsWith("]") ? lower.slice(1, -1) : lower;

  if (
    unbracketed === "localhost" ||
    unbracketed === "::1" ||
    unbracketed === "::" ||
    unbracketed === "0.0.0.0" ||
    unbracketed === "169.254.169.254" || // AWS / GCP / Azure instance metadata
    unbracketed === "metadata.google.internal" ||
    unbracketed.endsWith(".localhost") ||
    unbracketed.endsWith(".local") ||
    unbracketed.endsWith(".internal")
  ) {
    return true;
  }

  // Check IPv4-mapped IPv6 representations (e.g. ::ffff:127.0.0.1, ::ffff:7f00:1)
  const embeddedIpv4 = extractEmbeddedIPv4(unbracketed);
  if (embeddedIpv4 && isPrivateIPv4(embeddedIpv4)) {
    return true;
  }

  // Check direct IPv4 formats (decimal, hex, dotted, short-form)
  if (isPrivateIPv4(unbracketed)) {
    return true;
  }

  // Check IPv6 loopback / unique local / link-local
  if (net.isIPv6(unbracketed)) {
    if (unbracketed === "::1" || unbracketed === "::") return true;
    if (unbracketed.startsWith("fc") || unbracketed.startsWith("fd") || unbracketed.startsWith("fe80")) return true;
  }

  // Resolve DNS to verify the actual destination IP (prevents DNS rebinding / custom DNS SSRF)
  try {
    const addresses = await dns.lookup(unbracketed, { all: true });
    for (const record of addresses) {
      if (record.family === 4) {
        if (isPrivateIPv4(record.address)) return true;
      } else if (record.family === 6) {
        const addr6 = record.address.toLowerCase();
        const embeddedDns = extractEmbeddedIPv4(addr6);
        if (embeddedDns && isPrivateIPv4(embeddedDns)) return true;
        if (addr6 === "::1" || addr6 === "::" || addr6.startsWith("fc") || addr6.startsWith("fd") || addr6.startsWith("fe80")) {
          return true;
        }
      }
    }
  } catch {
    // DNS resolution failure will be handled by fetch
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
        if (await isForbiddenHost(parsedUrl.hostname)) {
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
            "User-Agent": "Homogenous-CLI/3.7.0",
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
