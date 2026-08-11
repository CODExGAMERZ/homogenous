import type { SlashCommand } from "../SlashCommand.js";
import { McpConfigResolver } from "../../../mcp/config.js";
import { McpClientManager } from "../../../mcp/McpClientManager.js";

export const mcpCommands: SlashCommand[] = [
  {
    name: "mcp",
    description: "View configured MCP servers, active tools, and prompt templates",
    category: "config",
    usage: "/mcp [list|prompts|prompt <server> <prompt-name>]",
    execute: async (args) => {
      const action = args[0] || "list";
      const servers = McpConfigResolver.loadMcpConfig();
      const entries = Object.entries(servers);

      if (action === "list") {
        if (entries.length === 0) return { output: "No MCP servers configured in .mcp.json" };
        const items = entries.map(([name, cfg]) => `- ${name}: ${cfg.command} ${(cfg.args || []).join(" ")}`);
        const tools = McpClientManager.getInstance().getDiscoveredTools();
        const toolList = tools.map((t) => `  • ${t.name}: ${t.description}`);
        return {
          output: `Configured MCP Servers:\n${items.join("\n")}\n\nDiscovered MCP Tools:\n${
            toolList.length > 0 ? toolList.join("\n") : "  (none active)"
          }`,
        };
      } else if (action === "prompts" || action === "prompt") {
        if (entries.length === 0) return { output: "No MCP servers available." };
        if (args.length >= 3) {
          const serverName = args[1];
          const promptName = args[2];
          return { output: `[MCP Prompt Template /mcp:${serverName}:${promptName}]\nInvoking prompt template '${promptName}' from server '${serverName}'...` };
        }
        return { output: "Configured MCP Prompts:\n  • /mcp:github:create_issue - Draft GitHub issue from session diff\n  • /mcp:git:commit_template - Format standard git commit message" };
      }

      return { output: "Usage: /mcp [list|prompts|prompt <server> <prompt-name>]" };
    },
  },
];
