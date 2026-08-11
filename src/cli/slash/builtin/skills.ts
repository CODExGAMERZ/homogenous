import type { SlashCommand } from "../SlashCommand.js";
import { SkillRegistry } from "../../../skills/SkillRegistry.js";
import { SkillInstaller } from "../../../skills/SkillInstaller.js";

export const skillsCommands: SlashCommand[] = [
  {
    name: "skills",
    description: "Manage dynamic skill packs",
    category: "config",
    usage: "/skills [list|create|install] [name/path]",
    execute: async (args) => {
      const action = args[0] || "list";
      const registry = SkillRegistry.getInstance();

      if (action === "list") {
        const skills = registry.listSkills();
        const items = skills.map((s) => `- ${s.metadata.name}: ${s.metadata.description}`);
        return { output: `Installed Skills:\n${items.join("\n")}` };
      } else if (action === "create") {
        const name = args[1];
        if (!name) return { output: "Usage: /skills create [name]" };
        const pathCreated = registry.createSkillScaffold(name);
        return { output: `Scaffolded skill at ${pathCreated}` };
      } else if (action === "install") {
        const target = args[1];
        if (!target) return { output: "Usage: /skills install [local-path|registry-name]" };
        const ok = await SkillInstaller.installSkill(target);
        return { output: ok ? `Installed skill '${target}'` : `Failed to install '${target}'` };
      }
      return { output: "Usage: /skills [list|create|install]" };
    },
  },
];
