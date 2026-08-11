import type { SlashCommand } from "../SlashCommand.js";
import { CodeBlockStore } from "../../../utils/CodeBlockStore.js";

export const copyCommand: SlashCommand = {
  name: "copy",
  description: "Copy the latest generated code block directly to OS clipboard",
  category: "utility",
  usage: "/copy [index]",
  execute: async (args) => {
    const store = CodeBlockStore.getInstance();
    let index = 1;
    if (args.length > 0) {
      const parsed = parseInt(args[0], 10);
      if (!isNaN(parsed) && parsed > 0) {
        index = parsed;
      }
    }

    const block = store.getLastBlock(index);
    if (!block) {
      return { output: "❌ No code blocks found in current session to copy." };
    }

    const ok = store.copyToClipboard(block.code);
    if (ok) {
      const lineCount = block.code.split("\n").length;
      return {
        output: `✓ Copied code block [${block.lang.toUpperCase()}] (${lineCount} lines) directly to clipboard!`,
      };
    } else {
      return {
        output: "❌ Failed to copy to clipboard automatically. You can copy the raw text from the screen.",
      };
    }
  },
};
