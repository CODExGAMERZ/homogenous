import React, { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import chalk from "chalk";

export interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  placeholder?: string;
  focus?: boolean;
}

export const PromptInput: React.FC<PromptInputProps> = ({
  value: rawValue,
  onChange,
  onSubmit,
  placeholder = "",
  focus = true,
}) => {
  const value = rawValue || "";
  const [cursorOffset, setCursorOffset] = useState(value.length);

  useEffect(() => {
    if (cursorOffset > value.length) {
      setCursorOffset(value.length);
    }
  }, [value, cursorOffset]);

  useInput((input, key) => {
    if (!focus) return;
    if (key.tab) return;

    // Handle Paste: If input length > 1, it's a pasted string (even if it contains \r\n or \n)
    if (input.length > 1) {
      // Clean up bracketed paste escape sequences if present (\x1b[200~ ... \x1b[201~)
      const cleaned = input
        .replace(/\x1b\[200~/g, "")
        .replace(/\x1b\[201~/g, "")
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n");

      const nextValue =
        value.slice(0, cursorOffset) + cleaned + value.slice(cursorOffset);
      onChange(nextValue);
      setCursorOffset(cursorOffset + cleaned.length);
      return;
    }

    // Navigation & Editing keys
    if (key.leftArrow) {
      if (cursorOffset > 0) setCursorOffset(cursorOffset - 1);
      return;
    }

    if (key.rightArrow) {
      if (cursorOffset < value.length) setCursorOffset(cursorOffset + 1);
      return;
    }

    if (key.upArrow) {
      // Move up to the line above
      const before = value.slice(0, cursorOffset);
      const lines = before.split("\n");
      if (lines.length > 1) {
        const currentLineCol = lines[lines.length - 1].length;
        const prevLineLen = lines[lines.length - 2].length;
        const targetCol = Math.min(currentLineCol, prevLineLen);
        const prevLineStart = before.lastIndexOf("\n", before.lastIndexOf("\n") - 1) + 1;
        setCursorOffset(prevLineStart + targetCol);
      } else {
        setCursorOffset(0);
      }
      return;
    }

    if (key.downArrow) {
      // Move down to the line below
      const after = value.slice(cursorOffset);
      const nextNewline = after.indexOf("\n");
      if (nextNewline !== -1) {
        const before = value.slice(0, cursorOffset);
        const currentLineCol = before.length - (before.lastIndexOf("\n") + 1);
        const restOfDoc = after.slice(nextNewline + 1);
        const nextNextNewline = restOfDoc.indexOf("\n");
        const nextLineLen = nextNextNewline === -1 ? restOfDoc.length : nextNextNewline;
        const targetCol = Math.min(currentLineCol, nextLineLen);
        setCursorOffset(cursorOffset + nextNewline + 1 + targetCol);
      } else {
        setCursorOffset(value.length);
      }
      return;
    }

    if (key.backspace || key.delete) {
      if (cursorOffset > 0) {
        const nextValue =
          value.slice(0, cursorOffset - 1) + value.slice(cursorOffset);
        onChange(nextValue);
        setCursorOffset(cursorOffset - 1);
      }
      return;
    }

    // Shift+Enter / Ctrl+J -> Insert newline without submitting
    if ((key.shift && key.return) || (key.ctrl && input === "j")) {
      const nextValue =
        value.slice(0, cursorOffset) + "\n" + value.slice(cursorOffset);
      onChange(nextValue);
      setCursorOffset(cursorOffset + 1);
      return;
    }

    // Standard Enter -> Submit
    if (key.return) {
      if (onSubmit) {
        onSubmit(value);
      }
      return;
    }

    // Standard single-character input
    if (input && !key.ctrl && !key.meta) {
      const nextValue =
        value.slice(0, cursorOffset) + input + value.slice(cursorOffset);
      onChange(nextValue);
      setCursorOffset(cursorOffset + input.length);
    }
  });

  // Render multi-line or single-line prompt with visible inverse cursor
  const lines = value.split("\n");
  let currentOffset = 0;

  return (
    <Box flexDirection="column" flexGrow={1}>
      {value.length === 0 && placeholder ? (
        <Text color="gray">
          {chalk.inverse(placeholder[0] || " ")}
          {placeholder.slice(1)}
        </Text>
      ) : (
        lines.map((line, lineIdx) => {
          const lineStart = currentOffset;
          const lineEnd = currentOffset + line.length;
          // Account for the newline character in offset
          currentOffset += line.length + 1;

          const isCursorInLine =
            focus &&
            cursorOffset >= lineStart &&
            (cursorOffset <= lineEnd || (lineIdx === lines.length - 1 && cursorOffset === lineEnd));

          if (!isCursorInLine) {
            return <Text key={lineIdx}>{line || " "}</Text>;
          }

          const localOffset = cursorOffset - lineStart;
          const beforeCursor = line.slice(0, localOffset);
          const cursorChar = localOffset < line.length ? line[localOffset] : " ";
          const afterCursor = localOffset < line.length ? line.slice(localOffset + 1) : "";

          return (
            <Text key={lineIdx}>
              {beforeCursor}
              {chalk.inverse(cursorChar)}
              {afterCursor}
            </Text>
          );
        })
      )}
    </Box>
  );
};
