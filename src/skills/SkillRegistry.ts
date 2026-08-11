import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";
import { SkillLoader, type LoadedSkill } from "./SkillLoader.js";
import { resolvePath, getGlobalConfigDir } from "../platform/paths.js";

export class SkillRegistry {
  private static instance: SkillRegistry;
  private skillsMap: Map<string, LoadedSkill>;

  private constructor() {
    this.skillsMap = new Map();
    this.reloadSkills();
  }

  public static getInstance(): SkillRegistry {
    if (!SkillRegistry.instance) {
      SkillRegistry.instance = new SkillRegistry();
    }
    return SkillRegistry.instance;
  }

  public reloadSkills(projectRoot: string = process.cwd()): void {
    this.skillsMap.clear();

    // 1. Load global skills
    const globalSkillsDir = resolvePath(getGlobalConfigDir(), "skills");
    const globalSkills = SkillLoader.scanSkillsDirectory(globalSkillsDir);
    for (const s of globalSkills) {
      this.skillsMap.set(s.metadata.name, s);
    }

    // 2. Load project-local skills (precedence over global)
    const projectSkillsDir = resolvePath(projectRoot, ".homogenous", "skills");
    const projectSkills = SkillLoader.scanSkillsDirectory(projectSkillsDir);
    for (const s of projectSkills) {
      this.skillsMap.set(s.metadata.name, s);
    }

    // 3. Load bundled skills
    const bundledSkillsDir = resolvePath(process.cwd(), "skills");
    const bundled = SkillLoader.scanSkillsDirectory(bundledSkillsDir);
    for (const s of bundled) {
      if (!this.skillsMap.has(s.metadata.name)) {
        this.skillsMap.set(s.metadata.name, s);
      }
    }
  }

  public listSkills(): LoadedSkill[] {
    return Array.from(this.skillsMap.values());
  }

  public matchTrigger(promptText: string): LoadedSkill | null {
    const lower = promptText.toLowerCase();
    for (const skill of this.skillsMap.values()) {
      const keywords = skill.metadata.triggers?.keywords || [];
      for (const kw of keywords) {
        if (lower.includes(kw.toLowerCase())) {
          return skill;
        }
      }
    }
    return null;
  }

  public createSkillScaffold(skillName: string, projectRoot: string = process.cwd()): string {
    const targetDir = resolvePath(projectRoot, ".homogenous", "skills", skillName);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const skillFilePath = resolvePath(targetDir, "SKILL.md");
    const scaffoldContent = `---
name: ${skillName}
description: Custom skill pack for ${skillName}
version: 1.0.0
triggers:
  keywords: ["${skillName}"]
  fileTypes: [".ts", ".js"]
requiresTools: ["fileTools"]
---
# ${skillName} Instructions

Provide detailed step-by-step instructions for the model when this skill triggers.
`;

    fs.writeFileSync(skillFilePath, scaffoldContent, "utf-8");
    this.reloadSkills(projectRoot);
    return skillFilePath;
  }
}
