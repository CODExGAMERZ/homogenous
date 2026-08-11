import fs from "node:fs";
import yaml from "yaml";
import { ToolRcSchema, type ToolRcConfig } from "./schema.js";
import { getGlobalConfigFile, getProjectConfigFile } from "../platform/paths.js";

export class ConfigResolver {
  private static instance: ConfigResolver;
  private config: ToolRcConfig;

  private constructor() {
    this.config = this.loadConfig();
  }

  public static getInstance(): ConfigResolver {
    if (!ConfigResolver.instance) {
      ConfigResolver.instance = new ConfigResolver();
    }
    return ConfigResolver.instance;
  }

  public getConfig(): ToolRcConfig {
    return this.config;
  }

  /**
   * Reloads configuration merging Global < Project < Environment Variables < CLI Overrides.
   */
  public loadConfig(cliOverrides: Partial<ToolRcConfig> = {}): ToolRcConfig {
    let mergedRaw: Record<string, unknown> = {};

    // 1. Read Global Config
    const globalPath = getGlobalConfigFile();
    if (fs.existsSync(globalPath)) {
      try {
        const fileContent = fs.readFileSync(globalPath, "utf-8");
        const parsed = yaml.parse(fileContent);
        if (parsed && typeof parsed === "object") {
          mergedRaw = { ...mergedRaw, ...parsed };
        }
      } catch (e) {
        console.warn(`Warning: Failed to parse global config at ${globalPath}: ${(e as Error).message}`);
      }
    }

    // 2. Read Project Config
    const projectPath = getProjectConfigFile();
    if (fs.existsSync(projectPath)) {
      try {
        const fileContent = fs.readFileSync(projectPath, "utf-8");
        const parsed = yaml.parse(fileContent);
        if (parsed && typeof parsed === "object") {
          mergedRaw = { ...mergedRaw, ...parsed };
        }
      } catch (e) {
        console.warn(`Warning: Failed to parse project config at ${projectPath}: ${(e as Error).message}`);
      }
    }

    // 3. Extract Environment Variable Keys
    const envKeys: Record<string, string> = {};
    if (process.env.ANTHROPIC_API_KEY) envKeys.anthropic = process.env.ANTHROPIC_API_KEY;
    if (process.env.OPENAI_API_KEY) envKeys.openai = process.env.OPENAI_API_KEY;
    if (process.env.GROQ_API_KEY) envKeys.groq = process.env.GROQ_API_KEY;
    if (process.env.NVIDIA_API_KEY) envKeys.nvidia = process.env.NVIDIA_API_KEY;
    if (process.env.DEEPSEEK_API_KEY) envKeys.deepseek = process.env.DEEPSEEK_API_KEY;
    if (process.env.OPENROUTER_API_KEY) envKeys.openrouter = process.env.OPENROUTER_API_KEY;
    if (process.env.MISTRAL_API_KEY) envKeys.mistral = process.env.MISTRAL_API_KEY;
    if (process.env.TOGETHER_API_KEY) envKeys.together = process.env.TOGETHER_API_KEY;

    const existingApiKeys = (mergedRaw.apiKeys as Record<string, string>) || {};
    mergedRaw.apiKeys = { ...existingApiKeys, ...envKeys };

    // 4. Merge CLI Overrides
    mergedRaw = { ...mergedRaw, ...cliOverrides };

    // 5. Validate with Zod
    const result = ToolRcSchema.safeParse(mergedRaw);
    if (!result.success) {
      console.warn("Invalid config detected, falling back to defaults:", result.error.format());
      this.config = ToolRcSchema.parse({ apiKeys: envKeys });
    } else {
      this.config = result.data;
    }

    return this.config;
  }
}
