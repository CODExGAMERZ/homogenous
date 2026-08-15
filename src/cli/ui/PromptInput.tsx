import React, { useState, useEffect, useRef } from "react";
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
  const prevValueRef = useRef(value);

  // Sync cursor when value is modified externally (e.g. via Tab autocomplete or prompt clear)
  useEffect(() => {
    if (prevValueRef.current !== value) {
      prevValueRef.current = value;
      setCursorOffset(value.length);
    }
  }, [value]);

  useInput((input, key) => {
    if (!focus) return;

    // Reserve Tab and Shift+Tab for Slash/Subcommand autocomplete cycling
    if (key.tab || input === "\t" || input === "\x1b[Z") {
      return;
    }

    // Handle Multi-Line Paste (or bracketed paste)
    if (input.length > 1 && !key.ctrl && !key.meta && !input.startsWith("\x1b")) {
      const cleaned = input
        .replace(/\x1b\[200~/g, "")
        .replace(/\x1b\[201~/g, "")
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n");

      const nextValue =
        value.slice(0, cursorOffset) + cleaned + value.slice(cursorOffset);
      prevValueRef.current = nextValue;
      onChange(nextValue);
      setCursorOffset(cursorOffset + cleaned.length);
      return;
    }

    // Home / Ctrl+A -> Jump to start of line or prompt
    if ((key.ctrl && input === "a") || input === "\x1b[H" || input === "\x1b[1~") {
      const before = value.slice(0, cursorOffset);
      const lastNl = before.lastIndexOf("\n");
      setCursorOffset(lastNl === -1 ? 0 : lastNl + 1);
      return;
    }

    // End / Ctrl+E -> Jump to end of line or prompt
    if ((key.ctrl && input === "e") || input === "\x1b[F" || input === "\x1b[4~") {
      const after = value.slice(cursorOffset);
      const nextNl = after.indexOf("\n");
      setCursorOffset(nextNl === -1 ? value.length : cursorOffset + nextNl);
      return;
    }

    // Left Arrow
    if (key.leftArrow) {
      if (cursorOffset > 0) {
        setCursorOffset(cursorOffset - 1);
      }
      return;
    }

    // Right Arrow
    if (key.rightArrow) {
      if (cursorOffset < value.length) {
        setCursorOffset(cursorOffset + 1);
      }
      return;
    }

    // Up Arrow -> Navigate multi-line lines
    if (key.upArrow) {
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

    // Down Arrow -> Navigate multi-line lines
    if (key.downArrow) {
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

    // Backspace / Delete
    if (key.backspace || key.delete) {
      if (cursorOffset > 0) {
        const nextValue =
          value.slice(0, cursorOffset - 1) + value.slice(cursorOffset);
        prevValueRef.current = nextValue;
        onChange(nextValue);
        setCursorOffset(cursorOffset - 1);
      }
      return;
    }

    // Shift+Enter / Ctrl+J -> Insert newline in multi-line prompt
    if ((key.shift && key.return) || (key.ctrl && input === "j")) {
      const nextValue =
        value.slice(0, cursorOffset) + "\n" + value.slice(cursorOffset);
      prevValueRef.current = nextValue;
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

    // Normal Character Input
    if (input && !key.ctrl && !key.meta && !input.startsWith("\x1b")) {
      const nextValue =
        value.slice(0, cursorOffset) + input + value.slice(cursorOffset);
      prevValueRef.current = nextValue;
      onChange(nextValue);
      setCursorOffset(cursorOffset + input.length);
    }
  });

  // Render multi-line prompt with consistent cursor highlight
  const lines = value.split("\n");
  let runningOffset = 0;

  return (
    <Box flexDirection="column" flexGrow={1}>
      {value.length === 0 ? (
        <Text color="gray">
          {focus ? chalk.inverse(" ") : ""}
          {placeholder}
        </Text>
      ) : (
        lines.map((line, lineIdx) => {
          const lineStart = runningOffset;
          const lineEnd = runningOffset + line.length;
          // Account for newline delimiter
          runningOffset += line.length + 1;

          const isCursorInLine =
            focus &&
            cursorOffset >= lineStart &&
            (cursorOffset <= lineEnd || (lineIdx === lines.length - 1 && cursorOffset >= lineEnd));

          if (!isCursorInLine) {
            return <Text key={lineIdx}>{line || " "}</Text>;
          }

          const localOffset = Math.min(cursorOffset - lineStart, line.length);
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
