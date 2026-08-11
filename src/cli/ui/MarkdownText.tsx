import React, { useEffect } from "react";
import { Box, Text } from "ink";
import { highlight } from "cli-highlight";
import { useTheme } from "./themes/ThemeContext.js";
import { CodeBlockStore } from "../../utils/CodeBlockStore.js";

export interface MarkdownTextProps {
  content: string;
}

export const MarkdownText: React.FC<MarkdownTextProps> = ({ content }) => {
  const theme = useTheme();

  // Split content by markdown code fences
  const parts: Array<{ type: "text" | "code"; text: string; lang?: string }> = [];
  const codeBlockRegex = /```([a-zA-Z0-9_-]*)\r?\n([\s\S]*?)```/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", text: content.slice(lastIndex, match.index) });
    }
    const lang = match[1].trim() || "code";
    const code = match[2].trimEnd();
    parts.push({ type: "code", text: code, lang });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push({ type: "text", text: content.slice(lastIndex) });
  }

  // Register code blocks into CodeBlockStore for /copy command
  useEffect(() => {
    for (const part of parts) {
      if (part.type === "code") {
        CodeBlockStore.getInstance().addBlock(part.lang || "code", part.text);
      }
    }
  }, [content]);

  return (
    <Box flexDirection="column">
      {parts.map((part, idx) => {
        if (part.type === "text") {
          return (
            <Text key={idx} color={theme.bodyText}>
              {part.text}
            </Text>
          );
        } else {
          const langLabel = part.lang ? ` ${part.lang.toUpperCase()} ` : " CODE ";
          let highlighted = part.text;

          // Attempt syntax highlighting via cli-highlight if colors are active
          if (theme.id !== "plain") {
            try {
              highlighted = highlight(part.text, {
                language: part.lang !== "code" ? part.lang : undefined,
                ignoreIllegals: true,
              });
            } catch {
              highlighted = part.text;
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
      })}
    </Box>
  );
};
