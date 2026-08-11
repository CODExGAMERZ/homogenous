import React from "react";
import { Box, Text } from "ink";
import { useTheme } from "./themes/ThemeContext.js";

export const HOMOGENOUS_BANNER = `
  ██╗  ██╗ ██████╗ ███╗   ███╗██████╗  ██████╗ ███████╗███╗   ██╗██████╗ ██╗  ██╗███████╗
  ██║  ██║██╔═══██╗████╗ ████║██╔═══██╗██╔════╝██╔════╝████╗  ██║██╔═══██╗██║  ██║██╔════╝
  ███████║██║   ██║██╔████╔██║██║   ██║██║  ███╗█████╗  ██╔██╗ ██║██║   ██║██║  ██║███████╗
  ██╔══██║██║   ██║██║╚██╔╝██║██║   ██║██║   ██║██╔══╝  ██║╚██╗██║██║   ██║██║  ██║╚════██║
  ██║  ██║╚██████╔╝██║ ╚═╝ ██║╚██████╔╝╚██████╔╝███████╗██║ ╚████║╚██████╔╝╚█████╔╝███████║
  ╚═╝  ╚═╝ ╚═════╝ ╚═╝     ╚═╝ ╚═════╝  ╚═════╝ ╚══════╝╚═╝  ╚═══╝ ╚═════╝  ╚════╝ ╚══════╝
`;

export const LogoBanner: React.FC = () => {
  const theme = useTheme();
  return (
    <Box flexDirection="column" alignItems="center" marginY={0} marginBottom={1}>
      <Text bold color={theme.primary}>
        {HOMOGENOUS_BANNER}
      </Text>
      <Text bold color={theme.secondary}>
        ✦ LOCAL-FIRST AGENTIC CODING ASSISTANT ✦
      </Text>
    </Box>
  );
};
