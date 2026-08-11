import React from "react";
import { Box, Text } from "ink";
import { useTheme } from "./themes/ThemeContext.js";

export interface ToolCardProps {
  toolName: string;
  input: Record<string, unknown>;
  status?: "pending" | "success" | "error";
  outputPreview?: string;
}

export const ToolCard: React.FC<ToolCardProps> = ({
  toolName,
  input,
  status = "pending",
  outputPreview,
}) => {
  const theme = useTheme();
  const isError = status === "error";
  const badgeColor = status === "pending" ? theme.warning : isError ? theme.error : theme.success;

  let detail = "";
  if (input.path) detail = `file: ${input.path}`;
  else if (input.command) detail = `cmd: ${input.command}`;
  else if (input.query) detail = `query: '${input.query}'`;
  else detail = JSON.stringify(input);

  return (
    <Box flexDirection="column" borderStyle="single" borderColor={badgeColor} paddingX={1} marginY={0}>
      <Box justifyContent="space-between">
        <Text bold color={theme.primary}>
          ⚙ Tool: {toolName} <Text color={theme.muted}>({detail})</Text>
        </Text>
        <Text bold color={badgeColor}>
          [{status.toUpperCase()}]
        </Text>
      </Box>
      {outputPreview && (
        <Box marginTop={0}>
          <Text color={theme.muted}>{outputPreview.slice(0, 120).replace(/\n/g, " ")}...</Text>
        </Box>
      )}
    </Box>
  );
};
