export interface ThemeSyntax {
  keyword: string;
  string: string;
  comment: string;
  function: string;
  number: string;
}

export interface ThemeDefinition {
  id: string;
  primary: string;
  secondary: string;
  success: string;
  warning: string;
  error: string;
  bodyText: string;
  muted: string;
  diffAdd: string;
  diffAddBg: string;
  diffRemove: string;
  diffRemoveBg: string;
  syntax: ThemeSyntax;
}
