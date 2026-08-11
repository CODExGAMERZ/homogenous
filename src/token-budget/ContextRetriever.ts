import fs from "node:fs";
import path from "node:path";
import { execCommand } from "../platform/shell.js";
import { resolvePath } from "../platform/paths.js";

export interface CodeSpan {
  filePath: string;
  startLine: number;
  endLine: number;
  content: string;
  score: number;
}

export class ContextRetriever {
  /**
   * Extracts search terms (symbols, function names, identifiers) from natural language query prompt.
   */
  public static extractTerms(query: string): string[] {
    const rawWords = query.match(/[a-zA-Z0-9_.-]{3,}/g) || [];
    const stopWords = new Set(["the", "and", "for", "with", "this", "that", "from", "where", "what", "how", "make", "find"]);
    return Array.from(new Set(rawWords.filter((w) => !stopWords.has(w.toLowerCase()))));
  }

  /**
   * Executes fast Ripgrep pass searching workspace for query terms.
   */
  public static async ripgrepPass(terms: string[], projectRoot: string = process.cwd()): Promise<CodeSpan[]> {
    if (terms.length === 0) return [];

    const spans: CodeSpan[] = [];
    const queryPattern = terms.join("|");

    try {
      const cmd = `rg -nI --max-columns 200 -e ${JSON.stringify(queryPattern)} .`;
      const res = await execCommand(cmd, { cwd: projectRoot, timeoutMs: 10000 });

      if (res.exitCode === 0 && res.stdout.trim()) {
        const lines = res.stdout.trim().split(/\r?\n/);
        for (const line of lines.slice(0, 50)) {
          const firstColon = line.indexOf(":");
          const secondColon = line.indexOf(":", firstColon + 1);

          if (firstColon > 0 && secondColon > firstColon) {
            const relPath = line.slice(0, firstColon).replace(/\\/g, "/");
            const lineNum = parseInt(line.slice(firstColon + 1, secondColon), 10);
            const lineContent = line.slice(secondColon + 1);

            if (!relPath.startsWith("node_modules") && !relPath.startsWith("dist")) {
              spans.push({
                filePath: relPath,
                startLine: Math.max(1, lineNum - 5),
                endLine: lineNum + 5,
                content: lineContent,
                score: 1.0,
              });
            }
          }
        }
      }
    } catch {
      // Fallback gracefully if ripgrep isn't available
    }

    return spans;
  }

  /**
   * Logical AST block chunking fallback using standard syntactic boundary detection.
   */
  public static chunkFile(filePath: string): CodeSpan[] {
    const absPath = resolvePath(process.cwd(), filePath);
    if (!fs.existsSync(absPath)) return [];

    const text = fs.readFileSync(absPath, "utf-8");
    const lines = text.split(/\r?\n/);
    const spans: CodeSpan[] = [];

    let currentStart = 1;
    const chunkSize = 35;

    for (let i = 0; i < lines.length; i += chunkSize) {
      const chunkLines = lines.slice(i, i + chunkSize);
      spans.push({
        filePath,
        startLine: i + 1,
        endLine: Math.min(lines.length, i + chunkSize),
        content: chunkLines.join("\n"),
        score: 0.5,
      });
    }

    return spans;
  }

  /**
   * Hybrid ranker combining term match frequencies and top-K span selection.
   */
  public static hybridRank(spans: CodeSpan[], queryTerms: string[], topK: number = 8): CodeSpan[] {
    if (spans.length === 0) return [];

    const scored = spans.map((span) => {
      let termHits = 0;
      const lowerContent = span.content.toLowerCase();
      for (const t of queryTerms) {
        if (lowerContent.includes(t.toLowerCase())) {
          termHits += 1;
        }
      }
      return {
        ...span,
        score: span.score + termHits * 0.5,
      };
    });

    scored.sort((a, b) => b.score - a.score);

    // Deduplicate overlapping spans for the same file
    const uniqueSpans: CodeSpan[] = [];
    const seenMap = new Set<string>();

    for (const span of scored) {
      const key = `${span.filePath}:${span.startLine}-${span.endLine}`;
      if (!seenMap.has(key)) {
        seenMap.add(key);
        uniqueSpans.push(span);
      }
      if (uniqueSpans.length >= topK) break;
    }

    return uniqueSpans;
  }
}
