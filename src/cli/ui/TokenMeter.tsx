import React from "react";
import { Text, Box } from "ink";
import { BudgetLedger } from "../../token-budget/BudgetLedger.js";

export const TokenMeter: React.FC = () => {
  const ledger = BudgetLedger.getInstance();
  const meterText = ledger.formatMeterString();

  return (
    <Box borderStyle="single" borderColor="cyan" paddingX={1}>
      <Text color="green">{meterText}</Text>
    </Box>
  );
};
