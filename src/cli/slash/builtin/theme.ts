import type { SlashCommand } from "../SlashCommand.js";
import { UserStateService } from "../../../platform/UserState.js";
import { getThemeById, listThemeNames } from "../../ui/themes/themes.js";

export const themeCommand: SlashCommand = {
  name: "theme",
  description: "Switch terminal color palette theme (neon, cyberpunk, dracula, nord, monokai, plain)",
  category: "config",
  usage: "/theme [neon | cyberpunk | dracula | nord | monokai | plain]",
  execute: async (args, ctx) => {
    const available = listThemeNames();
    const currentThemeId = UserStateService.getInstance().getTheme();

    if (args.length === 0) {
      const formattedList = available
        .map((t) => (t === currentThemeId ? `  • ${t} (active ✓)` : `  • ${t}`))
        .join("\n");

      return {
        output: `🎨 Homogenous Color Themes:\n${formattedList}\n\nTo switch themes, run:\n  /theme <name>`,
      };
    }

    const requestedName = args[0].toLowerCase();
    const theme = getThemeById(requestedName);

    if (!theme) {
      return {
        output: `Unknown theme '${args[0]}'.\nAvailable themes: ${available.join(", ")}`,
      };
    }

    UserStateService.getInstance().setTheme(theme.id);
    if (ctx?.setTheme) {
      ctx.setTheme(theme.id);
    }

    return {
      output: `✓ Theme successfully switched to '${theme.id}'.`,
    };
  },
};
