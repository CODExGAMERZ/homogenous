import type { ThemeDefinition } from "./ThemeDefinition.js";
import { neonTheme, plainTheme } from "./neon.js";

export { neonTheme, plainTheme };

export const cyberpunkTheme: ThemeDefinition = {
  id: "cyberpunk",
  primary: "#FFE600",
  secondary: "#00E5FF",
  success: "#00FF66",
  warning: "#FF8800",
  error: "#FF003C",
  bodyText: "#F0F0F0",
  muted: "#707070",
  diffAdd: "#00FF66",
  diffAddBg: "#0B2616",
  diffRemove: "#FF003C",
  diffRemoveBg: "#2B0912",
  syntax: {
    keyword: "#FF003C",
    string: "#00FF66",
    comment: "#707070",
    function: "#00E5FF",
    number: "#FFE600",
  },
};

export const draculaTheme: ThemeDefinition = {
  id: "dracula",
  primary: "#BD93F9",
  secondary: "#FF79C6",
  success: "#50FA7B",
  warning: "#FFB86C",
  error: "#FF5555",
  bodyText: "#F8F8F2",
  muted: "#6272A4",
  diffAdd: "#50FA7B",
  diffAddBg: "#143020",
  diffRemove: "#FF5555",
  diffRemoveBg: "#36181E",
  syntax: {
    keyword: "#FF79C6",
    string: "#F1FA8C",
    comment: "#6272A4",
    function: "#50FA7B",
    number: "#BD93F9",
  },
};

export const nordTheme: ThemeDefinition = {
  id: "nord",
  primary: "#88C0D0",
  secondary: "#81A1C1",
  success: "#A3BE8C",
  warning: "#EBCB8B",
  error: "#BF616A",
  bodyText: "#ECEFF4",
  muted: "#4C566A",
  diffAdd: "#A3BE8C",
  diffAddBg: "#1C2E24",
  diffRemove: "#BF616A",
  diffRemoveBg: "#331E24",
  syntax: {
    keyword: "#81A1C1",
    string: "#A3BE8C",
    comment: "#4C566A",
    function: "#88C0D0",
    number: "#B48EAD",
  },
};

export const monokaiTheme: ThemeDefinition = {
  id: "monokai",
  primary: "#66D9EF",
  secondary: "#F92672",
  success: "#A6E22E",
  warning: "#FD971F",
  error: "#F92672",
  bodyText: "#F8F8F2",
  muted: "#75715E",
  diffAdd: "#A6E22E",
  diffAddBg: "#1A2B15",
  diffRemove: "#F92672",
  diffRemoveBg: "#3A1320",
  syntax: {
    keyword: "#F92672",
    string: "#E6DB74",
    comment: "#75715E",
    function: "#A6E22E",
    number: "#AE81FF",
  },
};

export const THEMES: Record<string, ThemeDefinition> = {
  neon: neonTheme,
  cyberpunk: cyberpunkTheme,
  dracula: draculaTheme,
  nord: nordTheme,
  monokai: monokaiTheme,
  plain: plainTheme,
  monochrome: plainTheme,
};

export function getThemeById(id: string): ThemeDefinition | undefined {
  return THEMES[id.toLowerCase()];
}

export function listThemeNames(): string[] {
  return ["neon", "cyberpunk", "dracula", "nord", "monokai", "plain"];
}
