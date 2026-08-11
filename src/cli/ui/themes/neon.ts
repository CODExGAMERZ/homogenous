import type { ThemeDefinition } from "./ThemeDefinition.js";

export const neonTheme: ThemeDefinition = {
  id: "neon",
  primary: "#00F0FF",
  secondary: "#FF2ED1",
  success: "#39FF14",
  warning: "#FFB000",
  error: "#FF3860",
  bodyText: "#D6FBFF",
  muted: "#5C6773",
  diffAdd: "#39FF14",
  diffAddBg: "#0A2818",
  diffRemove: "#FF3860",
  diffRemoveBg: "#2A0A12",
  syntax: {
    keyword: "#FF2ED1",
    string: "#39FF14",
    comment: "#5C6773",
    function: "#00F0FF",
    number: "#FFB000",
  },
};

export const plainTheme: ThemeDefinition = {
  id: "plain",
  primary: "cyan",
  secondary: "magenta",
  success: "green",
  warning: "yellow",
  error: "red",
  bodyText: "white",
  muted: "gray",
  diffAdd: "green",
  diffAddBg: "",
  diffRemove: "red",
  diffRemoveBg: "",
  syntax: {
    keyword: "magenta",
    string: "green",
    comment: "gray",
    function: "cyan",
    number: "yellow",
  },
};
