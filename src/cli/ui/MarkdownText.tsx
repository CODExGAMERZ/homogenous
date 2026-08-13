import React, { useEffect } from "react";
import { Box, Text } from "ink";
import { highlight } from "cli-highlight";
import { useTheme } from "./themes/ThemeContext.js";
import { CodeBlockStore } from "../../utils/CodeBlockStore.js";
import type { ThemeDefinition } from "./themes/ThemeDefinition.js";

export interface MarkdownTextProps {
  content: string;
}

// ---------------------------------------------------------------------------
// Helpers: Visible text length & Inline Markdown Tokenizer
// ---------------------------------------------------------------------------

/**
 * Strips ANSI escape sequences, inline markdown tokens, and HTML tags to calculate visible character count in monospace.
 */
export function stripAnsi(str: string): string {
  if (!str) return "";
  return str.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=>]/g, "");
}

export function getVisibleLength(text: string): number {
  if (!text) return 0;
  return stripAnsi(text)
    .replace(/<[^>]+>/g, "")
    .replace(/\*\*\*([^*]+)\*\*\*/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/~~([^~]+)~~/g, "$1")
    .length;
}

export interface InlineToken {
  type: "text" | "bold" | "italic" | "bold_italic" | "code" | "strikethrough";
  text: string;
}

/**
 * Parses inline markdown formatted text into structured tokens for Ink styling.
 */
export function tokenizeInline(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  if (!text) return tokens;

  // Match bold-italic (*** or ___), bold (** or __), italic (* or _), code (`), strikethrough (~~)
  const pattern = /(\*\*\*[\s\S]+?\*\*\*|___[\s\S]+?___|\*\*[\s\S]+?\*\*|__[\s\S]+?__|(?<!\w)\*[\s\S]+?\*(?!\w)|(?<!\w)_[\s\S]+?_(?!\w)|`[^`\n]+`|~~[\s\S]+?~~)/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: "text", text: text.slice(lastIndex, match.index) });
    }

    const raw = match[0];
    if ((raw.startsWith("***") && raw.endsWith("***")) || (raw.startsWith("___") && raw.endsWith("___"))) {
      tokens.push({ type: "bold_italic", text: raw.slice(3, -3) });
    } else if ((raw.startsWith("**") && raw.endsWith("**")) || (raw.startsWith("__") && raw.endsWith("__"))) {
      tokens.push({ type: "bold", text: raw.slice(2, -2) });
    } else if ((raw.startsWith("*") && raw.endsWith("*")) || (raw.startsWith("_") && raw.endsWith("_"))) {
      tokens.push({ type: "italic", text: raw.slice(1, -1) });
    } else if (raw.startsWith("`") && raw.endsWith("`")) {
      tokens.push({ type: "code", text: raw.slice(1, -1) });
    } else if (raw.startsWith("~~") && raw.endsWith("~~")) {
      tokens.push({ type: "strikethrough", text: raw.slice(2, -2) });
    } else {
      tokens.push({ type: "text", text: raw });
    }

    lastIndex = match.index + raw.length;
  }

  if (lastIndex < text.length) {
    tokens.push({ type: "text", text: text.slice(lastIndex) });
  }

  return tokens;
}

export const InlineMarkdown: React.FC<{
  text: string;
  theme: ThemeDefinition;
  defaultColor?: string;
  defaultBold?: boolean;
}> = ({ text, theme, defaultColor, defaultBold }) => {
  const tokens = tokenizeInline(text);

  return (
    <Text color={defaultColor || theme.bodyText} bold={defaultBold}>
      {tokens.map((tok, i) => {
        switch (tok.type) {
          case "bold":
            return (
              <Text key={i} bold color={theme.primary}>
                {tok.text}
              </Text>
            );
          case "italic":
            return (
              <Text key={i} italic bold={defaultBold} color={defaultColor || theme.bodyText}>
                {tok.text}
              </Text>
            );
          case "bold_italic":
            return (
              <Text key={i} bold italic color={theme.primary}>
                {tok.text}
              </Text>
            );
          case "code":
            return (
              <Text key={i} bold color={theme.secondary}>
                `{tok.text}`
              </Text>
            );
          case "strikethrough":
            return (
              <Text key={i} strikethrough bold={defaultBold} color={theme.muted}>
                {tok.text}
              </Text>
            );
          default:
            return (
              <Text key={i} bold={defaultBold}>
                {tok.text}
              </Text>
            );
        }
      })}
    </Text>
  );
};

// ---------------------------------------------------------------------------
// Table Wrapping & Rendering
// ---------------------------------------------------------------------------

export interface StyledWord {
  text: string;
  type: InlineToken["type"];
}

/**
 * Word-wraps text containing potential inline markdown into lines of at most maxWidth visible length.
 * Preserves inline markdown formatting across line wraps without leaving unclosed delimiters.
 */
export function wrapCellText(rawText: string, maxWidth: number): string[] {
  if (!rawText) return [""];

  // Normalize <br> or <br/> tags to newlines, and unicode non-breaking hyphens/spaces
  const normalized = rawText
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/\u00A0/g, " ")
    .replace(/\u2011/g, "-");

  const paragraphs = normalized.split("\n");
  const resultLines: string[] = [];

  for (const para of paragraphs) {
    const trimmedPara = para.trim();
    if (!trimmedPara) {
      resultLines.push("");
      continue;
    }

    const tokens = tokenizeInline(trimmedPara);
    const styledWords: StyledWord[] = [];

    for (const tok of tokens) {
      if (!tok.text) continue;
      const words = tok.text.split(/(\s+)/);
      for (const w of words) {
        if (!w) continue;
        styledWords.push({ text: w, type: tok.type });
      }
    }

    let currentLineWords: StyledWord[] = [];
    let currentLen = 0;

    const flushLine = () => {
      if (currentLineWords.length === 0) return;

      let lineMarkdown = "";
      let pendingText = "";
      let pendingType: InlineToken["type"] | null = null;

      const flushPending = () => {
        if (pendingType === null || pendingText === "") return;
        switch (pendingType) {
          case "bold":
            lineMarkdown += `**${pendingText}**`;
            break;
          case "italic":
            lineMarkdown += `*${pendingText}*`;
            break;
          case "bold_italic":
            lineMarkdown += `***${pendingText}***`;
            break;
          case "code":
            lineMarkdown += `\`${pendingText}\``;
            break;
          case "strikethrough":
            lineMarkdown += `~~${pendingText}~~`;
            break;
          case "text":
          default:
            lineMarkdown += pendingText;
            break;
        }
        pendingText = "";
        pendingType = null;
      };

      for (const sw of currentLineWords) {
        if (sw.type === pendingType) {
          pendingText += sw.text;
        } else {
          flushPending();
          pendingType = sw.type;
          pendingText = sw.text;
        }
      }
      flushPending();

      resultLines.push(lineMarkdown.trimEnd());
      currentLineWords = [];
      currentLen = 0;
    };

    for (const sw of styledWords) {
      const isWhitespace = /^\s+$/.test(sw.text);
      const wordLen = sw.text.length;

      if (isWhitespace) {
        if (currentLineWords.length > 0) {
          currentLineWords.push(sw);
          currentLen += wordLen;
        }
        continue;
      }

      if (wordLen > maxWidth && maxWidth > 3) {
        flushLine();
        let remainder = sw.text;
        while (remainder.length > 0) {
          const chunk = remainder.slice(0, maxWidth);
          currentLineWords.push({ text: chunk, type: sw.type });
          currentLen = chunk.length;
          remainder = remainder.slice(maxWidth);
          if (remainder.length > 0) {
            flushLine();
          }
        }
      } else if (currentLen + wordLen <= maxWidth) {
        currentLineWords.push(sw);
        currentLen += wordLen;
      } else {
        while (
          currentLineWords.length > 0 &&
          /^\s+$/.test(currentLineWords[currentLineWords.length - 1].text)
        ) {
          currentLineWords.pop();
        }
        flushLine();
        currentLineWords.push(sw);
        currentLen = wordLen;
      }
    }

    if (currentLineWords.length > 0) {
      while (
        currentLineWords.length > 0 &&
        /^\s+$/.test(currentLineWords[currentLineWords.length - 1].text)
      ) {
        currentLineWords.pop();
      }
      flushLine();
    }
  }

  return resultLines.length > 0 ? resultLines : [""];
}

export interface MarkdownTableData {
  headers: string[];
  alignments: Array<"left" | "center" | "right">;
  rows: string[][];
}

export function parseMarkdownTable(lines: string[]): MarkdownTableData | null {
  if (lines.length < 1) return null;

  // Filter out top, divider, and bottom ASCII borders
  const contentLines: string[] = [];
  let rawSeparatorIdx = -1;

  for (const l of lines) {
    const trimmed = l.trim();
    if (!trimmed) continue;

    // Detect GFM Markdown separator row (e.g. |---|---:|)
    const isGfmSep = /^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?$/.test(trimmed);
    if (isGfmSep) {
      if (rawSeparatorIdx === -1) rawSeparatorIdx = contentLines.length;
      continue;
    }

    // Detect ASCII box borders (┌───┬───┐, ├───┼───┤, └───┴───┘, +---+---+)
    const isAsciiBorder = l.replace(/[┌├└┼┬┴┐┘┤│\+\=\-─\s]/g, "").length === 0;
    if (isAsciiBorder) {
      if (contentLines.length > 0 && rawSeparatorIdx === -1) {
        rawSeparatorIdx = contentLines.length;
      }
      continue;
    }

    contentLines.push(l);
  }

  if (contentLines.length === 0) return null;

  const parseRowCells = (line: string): string[] => {
    let trimmed = line.trim();
    if (trimmed.startsWith("|") || trimmed.startsWith("│")) trimmed = trimmed.slice(1);
    if (trimmed.endsWith("|") || trimmed.endsWith("│")) trimmed = trimmed.slice(0, -1);
    return trimmed.split(/[|│]/).map((c) => c.trim());
  };

  const rawRows = contentLines.map(parseRowCells);
  if (rawRows.length === 0) return null;

  const headerCells = rawRows[0];
  const colCount = headerCells.length;
  if (colCount === 0) return null;

  // Alignments (extract from GFM separator if present)
  let alignments: Array<"left" | "center" | "right"> = new Array(colCount).fill("left");
  for (const l of lines) {
    const trimmed = l.trim();
    if (/^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?$/.test(trimmed)) {
      const sepCells = parseRowCells(trimmed);
      alignments = sepCells.slice(0, colCount).map((c) => {
        const t = c.trim();
        if (t.startsWith(":") && t.endsWith(":")) return "center" as const;
        if (t.endsWith(":")) return "right" as const;
        return "left" as const;
      });
      break;
    }
  }

  // Merge pre-wrapped multi-line cell fragments (common in raw LLM ASCII tables)
  const isAsciiTable = lines.some((l) => /[┌├└┼┬┴┐┘┤│]/.test(l));
  const dataRows: string[][] = [];
  const rowsToProcess = rawRows.slice(1);

  if (rowsToProcess.length > 0) {
    let currentRow: string[] = [...rowsToProcess[0]];
    while (currentRow.length < colCount) currentRow.push("");
    currentRow = currentRow.slice(0, colCount);

    for (let r = 1; r < rowsToProcess.length; r++) {
      const row = rowsToProcess[r];
      while (row.length < colCount) row.push("");

      const isContinuation =
        isAsciiTable &&
        row.length >= colCount &&
        currentRow.length === colCount &&
        (row[0] === "" || /^[a-z0-9\)]/.test(row[0]));

      if (isContinuation) {
        for (let c = 0; c < colCount; c++) {
          const cellText = row[c] || "";
          if (cellText) {
            if (currentRow[c]) {
              currentRow[c] += " " + cellText;
            } else {
              currentRow[c] = cellText;
            }
          }
        }
      } else {
        dataRows.push(currentRow);
        currentRow = [...row.slice(0, colCount)];
      }
    }
    dataRows.push(currentRow);
  }

  return {
    headers: headerCells,
    alignments,
    rows: dataRows,
  };
}

export const MarkdownTableView: React.FC<{ table: MarkdownTableData; theme: ThemeDefinition }> = ({
  table,
  theme,
}) => {
  const colCount = table.headers.length;
  if (colCount === 0) return null;

  // Determine dynamic terminal column budget
  const termCols = typeof process !== "undefined" && process.stdout?.columns
    ? process.stdout.columns
    : 100;
  const maxTotalWidth = Math.max(60, Math.min(termCols - 4, 120));

  const colWidths = new Array(colCount).fill(8);

  // 1. Measure content lengths
  for (let col = 0; col < colCount; col++) {
    let maxContent = getVisibleLength(table.headers[col] || "");
    for (const row of table.rows) {
      const cell = row[col] || "";
      const cellLines = cell.replace(/<br\s*\/?>/gi, "\n").split("\n");
      for (const line of cellLines) {
        const len = getVisibleLength(line);
        if (len > maxContent) maxContent = len;
      }
    }
    colWidths[col] = Math.max(8, Math.min(maxContent + 2, 55));
  }

  // 2. Adjust if total width exceeds max budget (proportional reduction)
  const totalBorderChars = colCount + 1;
  const availableContentWidth = Math.max(20, maxTotalWidth - totalBorderChars);
  let totalContentWidth = colWidths.reduce((a, b) => a + b, 0);

  if (totalContentWidth > availableContentWidth) {
    const minColWidth = Math.max(10, Math.floor(availableContentWidth / colCount));
    while (totalContentWidth > availableContentWidth) {
      const shrinkableCols = colWidths.filter((w) => w > minColWidth);
      if (shrinkableCols.length === 0) break;

      const excess = totalContentWidth - availableContentWidth;
      const shrinkableSum = shrinkableCols.reduce((a, b) => a + b, 0);

      let reducedAny = false;
      for (let i = 0; i < colCount; i++) {
        if (colWidths[i] > minColWidth) {
          const share = Math.ceil((colWidths[i] / shrinkableSum) * excess);
          const newW = Math.max(minColWidth, colWidths[i] - share);
          if (newW < colWidths[i]) {
            colWidths[i] = newW;
            reducedAny = true;
          }
        }
      }
      totalContentWidth = colWidths.reduce((a, b) => a + b, 0);
      if (!reducedAny) break;
    }
  }

  // Box border strings
  const topBorder = `┌${colWidths.map((w) => "─".repeat(w)).join("┬")}┐`;
  const headerDivider = `├${colWidths.map((w) => "─".repeat(w)).join("┼")}┤`;
  const bottomBorder = `└${colWidths.map((w) => "─".repeat(w)).join("┴")}┘`;

  // Render rows with multi-line cell support & alignment
  const renderRow = (cells: string[], isHeader = false) => {
    const wrappedCells = cells.map((cell, colIdx) =>
      wrapCellText(cell, Math.max(4, colWidths[colIdx] - 2))
    );
    const rowHeight = Math.max(...wrappedCells.map((lines) => lines.length), 1);

    const renderedLines = [];
    for (let lineIdx = 0; lineIdx < rowHeight; lineIdx++) {
      renderedLines.push(
        <Box key={lineIdx} flexDirection="row">
          <Text color={theme.muted}>│</Text>
          {cells.map((_, colIdx) => {
            const lineText = wrappedCells[colIdx][lineIdx] || "";
            const visLen = getVisibleLength(lineText);
            const align = table.alignments[colIdx] || "left";

            const totalPadding = Math.max(0, colWidths[colIdx] - visLen);
            let leftPad = 1;
            let rightPad = Math.max(0, totalPadding - 1);

            if (align === "center") {
              leftPad = Math.max(1, Math.floor(totalPadding / 2));
              rightPad = Math.max(0, totalPadding - leftPad);
            } else if (align === "right") {
              leftPad = Math.max(1, totalPadding - 1);
              rightPad = 1;
            }

            return (
              <React.Fragment key={colIdx}>
                <Box flexDirection="row" width={colWidths[colIdx]}>
                  <Text>{" ".repeat(leftPad)}</Text>
                  {isHeader ? (
                    <InlineMarkdown
                      text={lineText}
                      theme={theme}
                      defaultColor={theme.primary}
                      defaultBold={true}
                    />
                  ) : (
                    <InlineMarkdown text={lineText} theme={theme} />
                  )}
                  <Text>{" ".repeat(rightPad)}</Text>
                </Box>
                <Text color={theme.muted}>│</Text>
              </React.Fragment>
            );
          })}
        </Box>
      );
    }
    return renderedLines;
  };

  return (
    <Box flexDirection="column" marginY={1}>
      <Text color={theme.muted}>{topBorder}</Text>
      {renderRow(table.headers, true)}
      <Text color={theme.muted}>{headerDivider}</Text>
      {table.rows.map((row, idx) => (
        <Box key={idx} flexDirection="column">
          {renderRow(row, false)}
        </Box>
      ))}
      <Text color={theme.muted}>{bottomBorder}</Text>
    </Box>
  );
};

// ---------------------------------------------------------------------------
// Block Parser: Headings, Lists, Dividers, Blockquotes, Tables, Code Blocks
// ---------------------------------------------------------------------------

export type MarkdownBlock =
  | { type: "code"; text: string; lang: string }
  | { type: "table"; tableData: MarkdownTableData }
  | { type: "heading"; level: number; text: string }
  | { type: "rule" }
  | { type: "blockquote"; text: string }
  | { type: "list_item"; ordered: boolean; number?: string; text: string; indent: number }
  | { type: "paragraph"; text: string };

/**
 * Parses markdown text into structured semantic blocks.
 */
export function parseMarkdownBlocks(content: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  if (!content) return blocks;

  const lines = content.split(/\r?\n/);
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // 1. Fenced Code Block: starts with optional leading spaces + ``` or ~~~
    const codeFenceMatch = line.match(/^(\s*)(```|~~~)([a-zA-Z0-9_-]*)/);
    if (codeFenceMatch) {
      const fenceMarker = codeFenceMatch[2];
      const lang = codeFenceMatch[3].trim() || "code";
      i++; // Skip opening fence line

      const codeLines: string[] = [];
      while (i < lines.length) {
        const curLine = lines[i];
        const closeMatch = curLine.match(/^(\s*)(```|~~~)\s*$/);
        if (closeMatch && closeMatch[2] === fenceMarker) {
          i++; // Skip closing fence line
          break;
        }
        codeLines.push(curLine);
        i++;
      }

      blocks.push({
        type: "code",
        lang,
        text: codeLines.join("\n"),
      });
      continue;
    }

    // 2. Empty blank line
    if (!trimmed) {
      i++;
      continue;
    }

    // 3. Horizontal rule: ---, ***, ___
    if (/^(?:---+|\*\*\*+|___+)$/.test(trimmed)) {
      blocks.push({ type: "rule" });
      i++;
      continue;
    }

    // 4. Headings: # H1, ## H2, ### H3, #### H4
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      blocks.push({
        type: "heading",
        level: headingMatch[1].length,
        text: headingMatch[2].trim(),
      });
      i++;
      continue;
    }

    // 5. Blockquotes: > quote
    if (line.startsWith(">")) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        quoteLines.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      blocks.push({ type: "blockquote", text: quoteLines.join("\n").trim() });
      continue;
    }

    // 6. Markdown & ASCII Tables
    const isTableLine = (str: string) => {
      const t = str.trim();
      return (
        t.startsWith("|") ||
        t.startsWith("│") ||
        t.startsWith("┌") ||
        t.startsWith("├") ||
        t.startsWith("+") ||
        (t.includes("|") && !t.startsWith(">")) ||
        (t.includes("│") && !t.startsWith(">"))
      );
    };

    if (isTableLine(line) && i + 1 < lines.length && (isTableLine(lines[i + 1]) || lines[i + 1].includes("─"))) {
      const tableLines: string[] = [];
      while (i < lines.length && isTableLine(lines[i])) {
        tableLines.push(lines[i]);
        i++;
      }
      const parsedTable = parseMarkdownTable(tableLines);
      if (parsedTable && parsedTable.headers.length > 0) {
        blocks.push({ type: "table", tableData: parsedTable });
        continue;
      } else {
        for (const tl of tableLines) {
          blocks.push({ type: "paragraph", text: tl });
        }
        continue;
      }
    }

    // 7. Unordered or Ordered Lists
    const bulletMatch = line.match(/^(\s*)([-*•])\s+(.*)$/);
    const orderedMatch = line.match(/^(\s*)(\d+\.)\s+(.*)$/);

    if (bulletMatch) {
      const indent = Math.floor(bulletMatch[1].length / 2);
      blocks.push({
        type: "list_item",
        ordered: false,
        text: bulletMatch[3],
        indent,
      });
      i++;
      continue;
    }

    if (orderedMatch) {
      const indent = Math.floor(orderedMatch[1].length / 2);
      blocks.push({
        type: "list_item",
        ordered: true,
        number: orderedMatch[2],
        text: orderedMatch[3],
        indent,
      });
      i++;
      continue;
    }

    // 8. Standard Paragraph
    blocks.push({ type: "paragraph", text: line });
    i++;
  }

  // Post-process blocks to consolidate adjacent code blocks and discard empty code blocks
  const consolidated: MarkdownBlock[] = [];
  for (const b of blocks) {
    if (b.type === "code") {
      if (!b.text.trim()) continue; // Ignore empty code blocks

      const last = consolidated[consolidated.length - 1];
      if (last && last.type === "code") {
        last.text = last.text + "\n\n" + b.text;
        if (last.lang === "code" && b.lang !== "code") {
          last.lang = b.lang;
        }
        continue;
      }
    }
    consolidated.push(b);
  }

  return consolidated;
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export const MarkdownText: React.FC<MarkdownTextProps> = ({ content }) => {
  const theme = useTheme();
  const blocks = parseMarkdownBlocks(content);

  // Register code blocks into CodeBlockStore for /copy command
  useEffect(() => {
    for (const block of blocks) {
      if (block.type === "code" && block.text.trim()) {
        CodeBlockStore.getInstance().addBlock(block.lang || "code", block.text);
      }
    }
  }, [content]);

  return (
    <Box flexDirection="column">
      {blocks.map((block, idx) => {
        switch (block.type) {
          case "heading": {
            if (block.level === 1) {
              return (
                <Box key={idx} flexDirection="column" marginTop={1} marginBottom={0.5}>
                  <Text bold color={theme.primary}>
                    ✦ {block.text}
                  </Text>
                  <Text color={theme.muted}>────────────────────────────────────────────────────────────</Text>
                </Box>
              );
            } else if (block.level === 2) {
              return (
                <Box key={idx} marginTop={1} marginBottom={0.5}>
                  <Text bold color={theme.secondary}>
                    ◆ {block.text}
                  </Text>
                </Box>
              );
            } else if (block.level === 3) {
              return (
                <Box key={idx} marginTop={0.5} marginBottom={0.5}>
                  <Text bold color={theme.warning}>
                    ▸ {block.text}
                  </Text>
                </Box>
              );
            } else {
              return (
                <Box key={idx} marginTop={0.5}>
                  <Text bold color={theme.bodyText}>
                    • {block.text}
                  </Text>
                </Box>
              );
            }
          }

          case "table": {
            return <MarkdownTableView key={idx} table={block.tableData} theme={theme} />;
          }

          case "rule": {
            return (
              <Box key={idx} marginY={0.5}>
                <Text color={theme.muted}>────────────────────────────────────────────────────────────</Text>
              </Box>
            );
          }

          case "blockquote": {
            return (
              <Box key={idx} flexDirection="row" marginY={0.5} paddingLeft={1}>
                <Text color={theme.primary}>│ </Text>
                <InlineMarkdown text={block.text} theme={theme} defaultColor={theme.bodyText} />
              </Box>
            );
          }

          case "list_item": {
            const indentSpaces = "  ".repeat(block.indent);
            return (
              <Box key={idx} flexDirection="row" paddingLeft={1}>
                <Text>{indentSpaces}</Text>
                {block.ordered ? (
                  <Text bold color={theme.secondary}>
                    {block.number}{" "}
                  </Text>
                ) : (
                  <Text color={theme.primary}>• </Text>
                )}
                <InlineMarkdown text={block.text} theme={theme} />
              </Box>
            );
          }

          case "code": {
            if (!block.text.trim()) return null;

            const langLabel = block.lang ? ` ${block.lang.toUpperCase()} ` : " CODE ";
            let highlighted = block.text;

            if (theme.id !== "plain") {
              try {
                highlighted = highlight(block.text, {
                  language: block.lang !== "code" ? block.lang : undefined,
                  ignoreIllegals: true,
                });
              } catch {
                highlighted = block.text;
              }
            }

            return (
              <Box key={idx} flexDirection="column" marginY={1}>
                <Box flexDirection="row">
                  <Text color={theme.muted}>─── </Text>
                  <Text bold color={theme.secondary}>
                    {langLabel}
                  </Text>
                  <Text color={theme.muted}>─────────────────────────────────────────────────────────────</Text>
                </Box>
                <Box paddingLeft={1} marginY={0.5}>
                  <Text color={theme.bodyText}>{highlighted}</Text>
                </Box>
                <Box flexDirection="row">
                  <Text color={theme.muted}>───────────────────────────────────────── </Text>
                  <Text dimColor color={theme.muted}>
                    (type /copy to copy)
                  </Text>
                  <Text color={theme.muted}> ───</Text>
                </Box>
              </Box>
            );
          }

          case "paragraph":
          default: {
            return (
              <Box key={idx} marginY={0}>
                <InlineMarkdown text={block.text} theme={theme} />
              </Box>
            );
          }
        }
      })}
    </Box>
  );
};
