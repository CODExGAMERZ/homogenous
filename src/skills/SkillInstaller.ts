import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";
import { resolvePath, getGlobalConfigDir } from "../platform/paths.js";
import { SkillLoader } from "./SkillLoader.js";
import { SkillRegistry } from "./SkillRegistry.js";

export class SkillInstaller {
  private static DEFAULT_REGISTRY_URL =
    "https://raw.githubusercontent.com/homogenous-ai/skills-registry/main/registry.json";

  /**
   * Installs a skill from local path, git URL, or registry name.
   */
  public static async installSkill(
    sourceOrName: string,
    global: boolean = false,
    projectRoot: string = process.cwd()
  ): Promise<boolean> {
    const absSource = resolvePath(projectRoot, sourceOrName);

    // 1. Check if local path exists
    if (fs.existsSync(absSource)) {
      return SkillInstaller.installFromLocalPath(absSource, global, projectRoot);
    }

    // 2. Otherwise resolve from registry or GitHub repository URL
    console.log(chalk.cyan(`Resolving skill '${sourceOrName}' from skills registry...`));
    try {
      let downloadUrl = sourceOrName;
      if (!sourceOrName.startsWith("http://") && !sourceOrName.startsWith("https://")) {
        // Resolve via registry JSON lookup
        const res = await fetch(SkillInstaller.DEFAULT_REGISTRY_URL);
        if (res.ok) {
          const registryData = (await res.json()) as Record<string, { url: string }>;
          if (registryData[sourceOrName]?.url) {
            downloadUrl = registryData[sourceOrName].url;
          }
        }
      }

      console.log(chalk.green(`Fetching skill pack from: ${downloadUrl}`));
      const skillRes = await fetch(downloadUrl.endsWith("/SKILL.md") ? downloadUrl : `${downloadUrl}/SKILL.md`);

      if (!skillRes.ok) {
        console.error(chalk.red(`Failed to download SKILL.md from ${downloadUrl}`));
        return false;
      }

      const skillContent = await skillRes.text();
      const tempSkillDir = resolvePath(projectRoot, ".homogenous", "temp_skill");
      if (!fs.existsSync(tempSkillDir)) {
        fs.mkdirSync(tempSkillDir, { recursive: true });
      }

      fs.writeFileSync(resolvePath(tempSkillDir, "SKILL.md"), skillContent, "utf-8");
      const installed = await SkillInstaller.installFromLocalPath(tempSkillDir, global, projectRoot);
      fs.rmSync(tempSkillDir, { recursive: true, force: true });
      return installed;
    } catch (err) {
      console.error(chalk.red(`Error installing skill '${sourceOrName}': ${(err as Error).message}`));
      return false;
    }
  }

  private static async installFromLocalPath(
    absSource: string,
    global: boolean,
    projectRoot: string
  ): Promise<boolean> {
    const skillFile = resolvePath(absSource, "SKILL.md");

    if (!fs.existsSync(skillFile)) {
      console.error(chalk.red(`Error: SKILL.md not found at path '${absSource}'`));
      return false;
    }

    const loaded = SkillLoader.parseSkillFile(skillFile);
    if (!loaded) {
      console.error(chalk.red(`Error: Invalid SKILL.md metadata at '${skillFile}'`));
      return false;
    }

    const skillName = loaded.metadata.name;
    const targetParentDir = global
      ? resolvePath(getGlobalConfigDir(), "skills")
      : resolvePath(projectRoot, ".homogenous", "skills");

    const targetDir = resolvePath(targetParentDir, skillName);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // Copy SKILL.md and assets
    fs.cpSync(absSource, targetDir, { recursive: true });
    console.log(chalk.green(`✓ Skill '${skillName}' installed successfully to ${targetDir}`));

    SkillRegistry.getInstance().reloadSkills(projectRoot);
    return true;
  }
}
