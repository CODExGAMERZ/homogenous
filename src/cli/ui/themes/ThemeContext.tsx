import React, { createContext, useContext } from "react";
import type { ThemeDefinition } from "./ThemeDefinition.js";
import { neonTheme, plainTheme } from "./neon.js";

export function shouldDisableColors(): boolean {
  if (process.env.NO_COLOR !== undefined && process.env.NO_COLOR !== "0" && process.env.NO_COLOR !== "false") {
    return true;
  }
  if (process.argv.includes("--no-color")) {
    return true;
  }
  if (process.stdout && !process.stdout.isTTY) {
    return true;
  }
  return false;
}

export function getActiveTheme(): ThemeDefinition {
  if (shouldDisableColors()) {
    return plainTheme;
  }
  return neonTheme;
}

const ThemeContext = createContext<ThemeDefinition>(neonTheme);

export const ThemeProvider: React.FC<{ children: React.ReactNode; overrideTheme?: ThemeDefinition }> = ({
  children,
  overrideTheme,
}) => {
  const activeTheme = overrideTheme || getActiveTheme();
  return <ThemeContext.Provider value={activeTheme}>{children}</ThemeContext.Provider>;
};

export function useTheme(): ThemeDefinition {
  return useContext(ThemeContext);
}
