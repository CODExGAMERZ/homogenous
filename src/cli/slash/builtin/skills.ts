import type { SlashCommand } from "../SlashCommand.js";
import { SkillRegistry } from "../../../skills/SkillRegistry.js";
import { SkillInstaller } from "../../../skills/SkillInstaller.js";

export const skillsCommands: SlashCommand[] = [
  {
    name: "skills",
    description: "Manage dynamic skill packs",
    category: "config",
    usage: "/skills [list|create|install|remove] [name/path]",
    execute: async (args, ctx) => {
      const action = (args[0] || "list").toLowerCase();
      const registry = SkillRegistry.getInstance();
      const projectRoot = ctx?.workspacePath || process.cwd();

      if (action === "list") {
        const skills = registry.listSkills();
        const items = skills.map((s) => `- ${s.metadata.name}: ${s.metadata.description}`);
        return { output: `Installed Skills:\n${items.join("\n")}` };
      } else if (action === "create") {
        const name = args[1];
        if (!name) return { output: "Usage: /skills create [name]" };
        try {
          const pathCreated = registry.createSkillScaffold(name, projectRoot);
          return { output: `Scaffolded skill at ${pathCreated}` };
        } catch (err) {
          return { output: `Error creating skill: ${(err as Error).message}` };
        }
      } else if (action === "install") {
        const target = args[1];
        if (!target) return { output: "Usage: /skills install [local-path|registry-name]" };
        const ok = await SkillInstaller.installSkill(target, false, projectRoot);
        return { output: ok ? `Installed skill '${target}'` : `Failed to install '${target}'` };
      } else if (action === "remove" || action === "uninstall") {
        const name = args[1];
        if (!name) return { output: "Usage: /skills remove [name]" };
        const ok = SkillInstaller.removeSkill(name, false, projectRoot);
        return { output: ok ? `✓ Skill '${name}' successfully removed.` : `Skill '${name}' could not be removed or was not found.` };
      }
      return { output: "Usage: /skills [list|create|install|remove]" };
    },
  },
];
