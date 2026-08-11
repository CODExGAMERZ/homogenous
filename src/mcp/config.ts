import fs from "node:fs";
import { resolvePath, getGlobalConfigDir } from "../platform/paths.js";

export interface McpServerConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface McpConfigFile {
  mcpServers?: Record<string, McpServerConfig>;
}

export class McpConfigResolver {
  public static loadMcpConfig(projectRoot: string = process.cwd()): Record<string, McpServerConfig> {
    let servers: Record<string, McpServerConfig> = {};

    // 1. Read global ~/.homogenous/mcp.json
    const globalPath = resolvePath(getGlobalConfigDir(), "mcp.json");
    if (fs.existsSync(globalPath)) {
      try {
        const content = fs.readFileSync(globalPath, "utf-8");
        const parsed = JSON.parse(content) as McpConfigFile;
        if (parsed.mcpServers) {
          servers = { ...servers, ...parsed.mcpServers };
        }
      } catch {
        // Ignore read error
      }
    }

    // 2. Read project-local .mcp.json
    const projectPath = resolvePath(projectRoot, ".mcp.json");
    if (fs.existsSync(projectPath)) {
      try {
        const content = fs.readFileSync(projectPath, "utf-8");
        const parsed = JSON.parse(content) as McpConfigFile;
        if (parsed.mcpServers) {
          servers = { ...servers, ...parsed.mcpServers };
        }
      } catch {
        // Ignore read error
      }
    }

    return servers;
  }
}
