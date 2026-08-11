import React, { useState, useEffect } from "react";
import { Box, Text } from "ink";
import { BudgetLedger } from "../../token-budget/BudgetLedger.js";
import { useTheme } from "./themes/ThemeContext.js";
import { getVramInfo, type VramInfo } from "../../platform/vramProbe.js";

export interface ClaudeHeaderProps {
  workspacePath: string;
  modelName: string;
  providerId: string;
  gitBranch?: string;
  autoApproveEnabled?: boolean;
  maxCostUSD?: number;
}

export const ClaudeHeader: React.FC<ClaudeHeaderProps> = ({
  workspacePath,
  modelName,
  providerId,
  gitBranch = "main",
  autoApproveEnabled = false,
  maxCostUSD = 5.0,
}) => {
  const theme = useTheme();
  const ledger = BudgetLedger.getInstance();
  const summary = ledger.getSummary();
  const tokK = (summary.totalTokens / 1000).toFixed(1);
  const costVal = summary.totalCostUSD;
  const costStr = costVal.toFixed(3);
  const isDemo = providerId === "mock" || modelName.includes("demo");

  const [vram, setVram] = useState<VramInfo | null>(null);

  useEffect(() => {
    let isMounted = true;
    getVramInfo().then((info) => {
      if (isMounted && info) setVram(info);
    });
    return () => {
      isMounted = false;
    };
  }, [summary.totalTokens]);

  const costRatio = maxCostUSD > 0 ? costVal / maxCostUSD : 0;
  let costColor = theme.success;
  if (costRatio >= 0.9) costColor = theme.error;
  else if (costRatio >= 0.5) costColor = theme.warning;

  return (
    <Box flexDirection="column" borderStyle="round" borderColor={theme.primary} paddingX={1} marginY={0} marginBottom={1}>
      <Box justifyContent="space-between">
        <Text bold color={theme.primary}>
          ✦ HOMOGENOUS AGENT <Text color={theme.muted}>(Local-First Assistant)</Text>
        </Text>
        <Text color={theme.warning}>
          workspace: {workspacePath} [{gitBranch}]
        </Text>
      </Box>
      <Box justifyContent="space-between">
        <Text color={theme.primary} bold>
          model: {providerId}/{modelName}
          {isDemo && <Text color={theme.warning} bold> [DEMO]</Text>}
          {autoApproveEnabled && <Text color={theme.warning} bold> [AUTO]</Text>}
          {vram && <Text color={theme.success} bold> [VRAM: {vram.usedGb}G/{vram.totalGb}G]</Text>}
        </Text>
        <Text color={theme.bodyText}>
          session: {tokK}k tok | <Text color={costColor}>${costStr}</Text> | {summary.localCalls} loc / {summary.cloudCalls} cld
        </Text>
      </Box>
    </Box>
  );
};
