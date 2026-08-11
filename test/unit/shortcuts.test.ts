import assert from "node:assert";
import test from "node:test";
import { getShortcutTarget } from "../../src/cli/ui/App.js";

test("getShortcutTarget resolves all Ctrl, Meta, ASCII control code, and Escape key bindings", () => {
  // Plan shortcut: Ctrl+P or ASCII 16 (\x10)
  assert.strictEqual(getShortcutTarget("p", { ctrl: true }), "/plan");
  assert.strictEqual(getShortcutTarget("P", { meta: true }), "/plan");
  assert.strictEqual(getShortcutTarget(String.fromCharCode(16), {}), "/plan");

  // Undo shortcut: Ctrl+U or ASCII 21 (\x15)
  assert.strictEqual(getShortcutTarget("u", { ctrl: true }), "/undo");
  assert.strictEqual(getShortcutTarget(String.fromCharCode(21), {}), "/undo");

  // Diff shortcut: Ctrl+D or ASCII 4 (\x04)
  assert.strictEqual(getShortcutTarget("d", { ctrl: true }), "/diff");
  assert.strictEqual(getShortcutTarget(String.fromCharCode(4), {}), "/diff");

  // Model shortcut: Ctrl+M or Ctrl+O or ASCII 15 (\x0F)
  assert.strictEqual(getShortcutTarget("m", { ctrl: true }), "/model");
  assert.strictEqual(getShortcutTarget("o", { ctrl: true }), "/model");
  assert.strictEqual(getShortcutTarget(String.fromCharCode(15), {}), "/model");

  // Auto-approve shortcut: Ctrl+A or ASCII 1 (\x01)
  assert.strictEqual(getShortcutTarget("a", { ctrl: true }), "/auto");
  assert.strictEqual(getShortcutTarget(String.fromCharCode(1), {}), "/auto");

  // Clear shortcut: Ctrl+L or ASCII 12 (\x0C)
  assert.strictEqual(getShortcutTarget("l", { ctrl: true }), "/clear");
  assert.strictEqual(getShortcutTarget(String.fromCharCode(12), {}), "/clear");

  // Exit shortcuts: Ctrl+Q, Ctrl+X, Ctrl+C, Esc
  assert.strictEqual(getShortcutTarget("q", { ctrl: true }), "/exit");
  assert.strictEqual(getShortcutTarget("x", { ctrl: true }), "/exit");
  assert.strictEqual(getShortcutTarget("c", { ctrl: true }), "/exit");
  assert.strictEqual(getShortcutTarget("", { escape: true }), "/exit");

  // Regular keypresses should return null
  assert.strictEqual(getShortcutTarget("hello", {}), null);
  assert.strictEqual(getShortcutTarget("", { return: true }), null);
});
