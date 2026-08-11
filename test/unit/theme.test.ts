import assert from "node:assert";
import test from "node:test";
import { getActiveTheme, shouldDisableColors } from "../../src/cli/ui/themes/ThemeContext.js";

test("getActiveTheme returns plain monochrome theme when NO_COLOR is set", () => {
  const origEnv = process.env.NO_COLOR;
  try {
    process.env.NO_COLOR = "1";
    assert.strictEqual(shouldDisableColors(), true);
    const theme = getActiveTheme();
    assert.strictEqual(theme.id, "plain");
    assert.strictEqual(theme.primary, "cyan");
  } finally {
    if (origEnv !== undefined) {
      process.env.NO_COLOR = origEnv;
    } else {
      delete process.env.NO_COLOR;
    }
  }
});

test("getActiveTheme returns neon theme when NO_COLOR is not set and stdout is TTY", () => {
  const origEnv = process.env.NO_COLOR;
  delete process.env.NO_COLOR;

  // Mock isTTY for test
  const origIsTTY = process.stdout.isTTY;
  Object.defineProperty(process.stdout, "isTTY", { value: true, configurable: true });

  try {
    const theme = getActiveTheme();
    assert.strictEqual(theme.id, "neon");
    assert.strictEqual(theme.primary, "#00F0FF");
    assert.strictEqual(theme.secondary, "#FF2ED1");
  } finally {
    Object.defineProperty(process.stdout, "isTTY", { value: origIsTTY, configurable: true });
    if (origEnv !== undefined) process.env.NO_COLOR = origEnv;
  }
});
