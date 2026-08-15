import React, { useState, useEffect, useRef } from "react";
import { Box, Text, useInput } from "ink";
import chalk from "chalk";

export interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  placeholder?: string;
  focus?: boolean;
  isAutocompleteActive?: boolean;
  onNavigateSuggestions?: (direction: "up" | "down") => void;
  onSelectSuggestion?: () => void;
  onDismissSuggestions?: () => void;
  history?: string[];
}

export const PromptInput: React.FC<PromptInputProps> = ({
  value: rawValue,
  onChange,
  onSubmit,
  placeholder = "",
  focus = true,
  isAutocompleteActive = false,
  onNavigateSuggestions,
  onSelectSuggestion,
  onDismissSuggestions,
  history = [],
}) => {
  const value = rawValue || "";
  const [cursorOffset, setCursorOffset] = useState(value.length);
  const prevValueRef = useRef(value);

  // History cycling index (-1 = current draft)
  const historyIndexRef = useRef<number>(-1);
  const draftValueRef = useRef<string>("");

  // Sync cursor when value is modified externally (e.g. via Enter/Tab autocomplete, prompt history, or prompt clear)
  useEffect(() => {
    if (prevValueRef.current !== value) {
      prevValueRef.current = value;
      setCursorOffset(value.length);
    }
  }, [value]);

  // Find previous word boundary before index
  const findPrevWordBoundary = (str: string, index: number): number => {
    if (index <= 0) return 0;
    let i = index - 1;
    // Skip trailing spaces
    while (i > 0 && /\s/.test(str[i])) {
      i--;
    }
    // Skip word characters
    while (i > 0 && !/\s/.test(str[i - 1])) {
      i--;
    }
    return i;
  };

  // Find next word boundary after index
  const findNextWordBoundary = (str: string, index: number): number => {
    if (index >= str.length) return str.length;
    let i = index;
    // Skip leading non-spaces
    while (i < str.length && !/\s/.test(str[i])) {
      i++;
    }
    // Skip spaces
    while (i < str.length && /\s/.test(str[i])) {
      i++;
    }
    return i;
  };

  useInput((input, key) => {
    if (!focus) return;

    // 1. Reserve Tab and Shift+Tab for Autocomplete cycling in App
    if (key.tab || input === "\t" || input === "\x1b[Z") {
      return;
    }

    // 2. Escape Key Handling
    if (key.escape || input === "\x1b") {
      if (isAutocompleteActive && onDismissSuggestions) {
        onDismissSuggestions();
        return;
      }
      // If no autocomplete, let shortcut handler process exit
      return;
    }

    // 3. Autocomplete Navigation Interception
    if (isAutocompleteActive) {
      if (key.upArrow && onNavigateSuggestions) {
        onNavigateSuggestions("up");
        return;
      }
      if (key.downArrow && onNavigateSuggestions) {
        onNavigateSuggestions("down");
        return;
      }
      if (key.return && onSelectSuggestion) {
        onSelectSuggestion();
        return;
      }
    }

    // 4. Handle Bracketed Paste & Multi-Line Paste
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

    // 5. Word-Level Navigation (Alt+Left / Ctrl+Left / \x1bb / \x1b[1;5D)
    const isWordLeft =
      input === "\x1bb" ||
      input === "\x1b[1;5D" ||
      input === "\x1b[5D" ||
      ((key.meta || key.ctrl) && key.leftArrow);

    if (isWordLeft) {
      const newPos = findPrevWordBoundary(value, cursorOffset);
      setCursorOffset(newPos);
      return;
    }

    // 6. Word-Level Navigation (Alt+Right / Ctrl+Right / \x1bf / \x1b[1;5C)
    const isWordRight =
      input === "\x1bf" ||
      input === "\x1b[1;5C" ||
      input === "\x1b[5C" ||
      ((key.meta || key.ctrl) && key.rightArrow);

    if (isWordRight) {
      const newPos = findNextWordBoundary(value, cursorOffset);
      setCursorOffset(newPos);
      return;
    }

    // 7. Backward Word Delete (Ctrl+W, Ctrl+Backspace, Alt+Backspace)
    const isWordDeleteBack =
      (key.ctrl && input === "w") ||
      input === "\x17" ||
      input === "\x1b\x7f" ||
      input === "\x1b\x08" ||
      ((key.ctrl || key.meta) && key.backspace);

    if (isWordDeleteBack) {
      if (cursorOffset > 0) {
        const start = findPrevWordBoundary(value, cursorOffset);
        const nextValue = value.slice(0, start) + value.slice(cursorOffset);
        prevValueRef.current = nextValue;
        onChange(nextValue);
        setCursorOffset(start);
      }
      return;
    }

    // 8. Forward Word Delete (Alt+D, Ctrl+Delete)
    const isWordDeleteForward =
      input === "\x1bd" ||
      input === "\x1b[3;5~" ||
      ((key.ctrl || key.meta) && key.delete);

    if (isWordDeleteForward) {
      if (cursorOffset < value.length) {
        const end = findNextWordBoundary(value, cursorOffset);
        const nextValue = value.slice(0, cursorOffset) + value.slice(end);
        prevValueRef.current = nextValue;
        onChange(nextValue);
      }
      return;
    }

    // 9. Home / Ctrl+A -> Jump to start of line or prompt
    if ((key.ctrl && input === "a") || input === "\x1b[H" || input === "\x1b[1~") {
      const before = value.slice(0, cursorOffset);
      const lastNl = before.lastIndexOf("\n");
      setCursorOffset(lastNl === -1 ? 0 : lastNl + 1);
      return;
    }

    // 10. End / Ctrl+E -> Jump to end of line or prompt
    if ((key.ctrl && input === "e") || input === "\x1b[F" || input === "\x1b[4~") {
      const after = value.slice(cursorOffset);
      const nextNl = after.indexOf("\n");
      setCursorOffset(nextNl === -1 ? value.length : cursorOffset + nextNl);
      return;
    }

    // 11. Ctrl+U -> Kill from cursor to beginning of current line
    if (key.ctrl && input === "u") {
      const before = value.slice(0, cursorOffset);
      const lastNl = before.lastIndexOf("\n");
      const lineStart = lastNl === -1 ? 0 : lastNl + 1;
      const nextValue = value.slice(0, lineStart) + value.slice(cursorOffset);
      prevValueRef.current = nextValue;
      onChange(nextValue);
      setCursorOffset(lineStart);
      return;
    }

    // 12. Ctrl+K -> Kill from cursor to end of current line
    if (key.ctrl && input === "k") {
      const after = value.slice(cursorOffset);
      const nextNl = after.indexOf("\n");
      const lineEnd = nextNl === -1 ? value.length : cursorOffset + nextNl;
      const nextValue = value.slice(0, cursorOffset) + value.slice(lineEnd);
      prevValueRef.current = nextValue;
      onChange(nextValue);
      return;
    }

    // 13. Left Arrow (Single character)
    if (key.leftArrow) {
      if (cursorOffset > 0) {
        setCursorOffset(cursorOffset - 1);
      }
      return;
    }

    // 14. Right Arrow (Single character)
    if (key.rightArrow) {
      if (cursorOffset < value.length) {
        setCursorOffset(cursorOffset + 1);
      }
      return;
    }

    // 15. Up Arrow -> Multi-line navigation OR Prompt History
    if (key.upArrow) {
      const before = value.slice(0, cursorOffset);
      const lines = before.split("\n");
      if (lines.length > 1) {
        // Move to line above
        const currentLineCol = lines[lines.length - 1].length;
        const prevLineLen = lines[lines.length - 2].length;
        const targetCol = Math.min(currentLineCol, prevLineLen);
        const prevLineStart = before.lastIndexOf("\n", before.lastIndexOf("\n") - 1) + 1;
        setCursorOffset(prevLineStart + targetCol);
      } else if (history.length > 0) {
        // Navigate prompt history upwards (older)
        if (historyIndexRef.current === -1) {
          draftValueRef.current = value;
        }
        const nextIdx = Math.min(historyIndexRef.current + 1, history.length - 1);
        if (nextIdx >= 0 && nextIdx < history.length) {
          historyIndexRef.current = nextIdx;
          const histVal = history[history.length - 1 - nextIdx];
          prevValueRef.current = histVal;
          onChange(histVal);
          setCursorOffset(histVal.length);
        }
      } else {
        setCursorOffset(0);
      }
      return;
    }

    // 16. Down Arrow -> Multi-line navigation OR Prompt History
    if (key.downArrow) {
      const after = value.slice(cursorOffset);
      const nextNewline = after.indexOf("\n");
      if (nextNewline !== -1) {
        // Move to line below
        const before = value.slice(0, cursorOffset);
        const currentLineCol = before.length - (before.lastIndexOf("\n") + 1);
        const restOfDoc = after.slice(nextNewline + 1);
        const nextNextNewline = restOfDoc.indexOf("\n");
        const nextLineLen = nextNextNewline === -1 ? restOfDoc.length : nextNextNewline;
        const targetCol = Math.min(currentLineCol, nextLineLen);
        setCursorOffset(cursorOffset + nextNewline + 1 + targetCol);
      } else if (historyIndexRef.current >= 0) {
        // Navigate prompt history downwards (newer)
        const nextIdx = historyIndexRef.current - 1;
        historyIndexRef.current = nextIdx;
        const nextVal = nextIdx === -1 ? draftValueRef.current : history[history.length - 1 - nextIdx];
        prevValueRef.current = nextVal;
        onChange(nextVal);
        setCursorOffset(nextVal.length);
      } else {
        setCursorOffset(value.length);
      }
      return;
    }

    // 17. Forward Delete Key (fn+Delete or Delete key: \x1b[3~)
    if (key.delete || input === "\x1b[3~") {
      if (cursorOffset < value.length) {
        const nextValue =
          value.slice(0, cursorOffset) + value.slice(cursorOffset + 1);
        prevValueRef.current = nextValue;
        onChange(nextValue);
      }
      return;
    }

    // 18. Backward Backspace Key (Delete character before cursor)
    if (key.backspace || input === "\x7f" || input === "\x08") {
      if (cursorOffset > 0) {
        const nextValue =
          value.slice(0, cursorOffset - 1) + value.slice(cursorOffset);
        prevValueRef.current = nextValue;
        onChange(nextValue);
        setCursorOffset(cursorOffset - 1);
      }
      return;
    }

    // 19. Shift+Enter / Ctrl+J -> Insert newline in multi-line prompt
    if ((key.shift && key.return) || (key.ctrl && input === "j")) {
      const nextValue =
        value.slice(0, cursorOffset) + "\n" + value.slice(cursorOffset);
      prevValueRef.current = nextValue;
      onChange(nextValue);
      setCursorOffset(cursorOffset + 1);
      return;
    }

    // 20. Standard Enter -> Submit
    if (key.return) {
      historyIndexRef.current = -1;
      draftValueRef.current = "";
      if (onSubmit) {
        onSubmit(value);
      }
      return;
    }

    // 21. Normal Character Input (Single or printable character)
    if (input && !key.ctrl && !key.meta && !input.startsWith("\x1b")) {
      historyIndexRef.current = -1;
      const nextValue =
        value.slice(0, cursorOffset) + input + value.slice(cursorOffset);
      prevValueRef.current = nextValue;
      onChange(nextValue);
      setCursorOffset(cursorOffset + input.length);
    }
  });

  // Render multi-line or single-line prompt with crisp cursor highlight
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
