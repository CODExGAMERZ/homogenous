import fs from "node:fs";
import path from "node:path";
import yaml from "yaml";
import { resolvePath } from "../platform/paths.js";

export interface SkillMetadata {
  name: string;
  description: string;
  version?: string;
  triggers?: {
    keywords?: string[];
    fileTypes?: string[];
  };
  requiresTools?: string[];
}

export interface LoadedSkill {
  metadata: SkillMetadata;
  body: string;
  folderPath: string;
  origin?: "bundled" | "global" | "project";
}

export class SkillLoader {
  /**
   * Parses SKILL.md YAML frontmatter and body.
   */
  public static parseSkillFile(filePath: string, origin: "bundled" | "global" | "project" = "global"): LoadedSkill | null {
    if (!fs.existsSync(filePath)) return null;

    let content = "";
    try {
      content = fs.readFileSync(filePath, "utf-8");
    } catch (err: any) {
      if (err?.code === "EBUSY") {
        try {
          content = fs.readFileSync(filePath, "utf-8");
        } catch {
          return null;
        }
      } else {
        return null;
      }
    }

    const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);

    if (!fmMatch) {
      return null;
    }

    try {
      const rawYaml = fmMatch[1];
      const body = fmMatch[2].trim();
      const metadata = yaml.parse(rawYaml) as SkillMetadata;

      if (!metadata.name || typeof metadata.name !== "string" || !metadata.description) {
        return null;
      }

      // Enforce strict safe alphanumeric skill name to prevent directory traversal
      if (!/^[a-zA-Z0-9_-]+$/.test(metadata.name)) {
        return null;
      }

      return {
        metadata,
        body,
        folderPath: path.dirname(filePath),
        origin,
      };
    } catch {
      return null;
    }
  }

  /**
   * Scans a directory for subfolders containing SKILL.md.
   */
  public static scanSkillsDirectory(dirPath: string, origin: "bundled" | "global" | "project" = "global"): LoadedSkill[] {
    if (!fs.existsSync(dirPath)) return [];

    const skills: LoadedSkill[] = [];
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const skillFilePath = resolvePath(dirPath, entry.name, "SKILL.md");
        const loaded = SkillLoader.parseSkillFile(skillFilePath, origin);
        if (loaded) {
          skills.push(loaded);
        }
      }
    }

    return skills;
  }
}
