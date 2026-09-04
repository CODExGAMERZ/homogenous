import assert from "node:assert";
import test from "node:test";
import { getThemeById, listThemeNames, THEMES } from "../../src/cli/ui/themes/themes.js";
import { getActiveTheme } from "../../src/cli/ui/themes/ThemeContext.js";
import { themeCommand } from "../../src/cli/slash/builtin/theme.js";
import { SlashCommandRegistry } from "../../src/cli/slash/SlashCommandRegistry.js";
import { UserStateService } from "../../src/platform/UserState.js";

test("Theme Suite: all 6 themes are registered and have full color token definitions", () => {
  const themes = listThemeNames();
  assert.strictEqual(themes.length, 6);
  assert.deepStrictEqual(themes, ["neon", "cyberpunk", "dracula", "nord", "monokai", "plain"]);

  for (const name of themes) {
    const theme = getThemeById(name);
    assert.ok(theme, `Theme '${name}' should exist in registry`);
    assert.strictEqual(theme?.id, name);
    assert.ok(theme?.primary, `Theme '${name}' must have primary color`);
    assert.ok(theme?.secondary, `Theme '${name}' must have secondary color`);
    assert.ok(theme?.success, `Theme '${name}' must have success color`);
    assert.ok(theme?.warning, `Theme '${name}' must have warning color`);
    assert.ok(theme?.error, `Theme '${name}' must have error color`);
    assert.ok(theme?.bodyText, `Theme '${name}' must have bodyText color`);
    assert.ok(theme?.muted, `Theme '${name}' must have muted color`);
    assert.ok(theme?.diffAdd, `Theme '${name}' must have diffAdd color`);
    assert.ok(theme?.diffRemove, `Theme '${name}' must have diffRemove color`);
    assert.ok(theme?.syntax?.keyword, `Theme '${name}' must have syntax.keyword`);
    assert.ok(theme?.syntax?.string, `Theme '${name}' must have syntax.string`);
    assert.ok(theme?.syntax?.comment, `Theme '${name}' must have syntax.comment`);
    assert.ok(theme?.syntax?.function, `Theme '${name}' must have syntax.function`);
    assert.ok(theme?.syntax?.number, `Theme '${name}' must have syntax.number`);
  }
});

test("Theme Suite: getActiveTheme resolves by ID but respects NO_COLOR strictly", () => {
  const origEnv = process.env.NO_COLOR;
  try {
    // When NO_COLOR is not set and stdout is TTY
    delete process.env.NO_COLOR;
    const origIsTTY = process.stdout.isTTY;
    Object.defineProperty(process.stdout, "isTTY", { value: true, configurable: true });

    try {
      const dracula = getActiveTheme("dracula");
      assert.strictEqual(dracula.id, "dracula");
      assert.strictEqual(dracula.primary, "#BD93F9");

      const nord = getActiveTheme("nord");
      assert.strictEqual(nord.id, "nord");
      assert.strictEqual(nord.primary, "#88C0D0");

      const monokai = getActiveTheme("monokai");
      assert.strictEqual(monokai.id, "monokai");

      const cyberpunk = getActiveTheme("cyberpunk");
      assert.strictEqual(cyberpunk.id, "cyberpunk");
    } finally {
      Object.defineProperty(process.stdout, "isTTY", { value: origIsTTY, configurable: true });
    }

    // When NO_COLOR is set, it MUST return plain theme even if another theme was requested
    process.env.NO_COLOR = "1";
    const forcedPlain = getActiveTheme("dracula");
    assert.strictEqual(forcedPlain.id, "plain");
    assert.strictEqual(forcedPlain.primary, "cyan");
  } finally {
    if (origEnv !== undefined) {
      process.env.NO_COLOR = origEnv;
    } else {
      delete process.env.NO_COLOR;
    }
  }
});

test("Theme Suite: /theme slash command manages active themes", async () => {
  const registry = SlashCommandRegistry.getInstance();
  const cmd = registry.getCommand("theme");
  assert.ok(cmd, "Theme command should be registered in SlashCommandRegistry");

  let switchedTheme: string | null = null;
  const mockCtx: any = {
    workspacePath: process.cwd(),
    setTheme: (t: string) => {
      switchedTheme = t;
    },
  };

  // 1. Without args: lists available themes
  const listRes = await themeCommand.execute([], mockCtx);
  assert.match(listRes.output, /Homogenous Color Themes:/);
  assert.match(listRes.output, /dracula/);
  assert.match(listRes.output, /nord/);

  // 2. With valid theme arg: switches theme
  const setRes = await themeCommand.execute(["dracula"], mockCtx);
  assert.match(setRes.output, /Theme successfully switched to 'dracula'/);
  assert.strictEqual(switchedTheme, "dracula");
  assert.strictEqual(UserStateService.getInstance().getTheme(), "dracula");

  // 3. With invalid theme arg: returns error and lists available
  const errRes = await themeCommand.execute(["non_existent_theme"], mockCtx);
  assert.match(errRes.output, /Unknown theme 'non_existent_theme'/);
  assert.match(errRes.output, /Available themes:/);
});
