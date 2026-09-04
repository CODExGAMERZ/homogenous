import type { SlashCommand } from "../SlashCommand.js";
import { McpConfigResolver } from "../../../mcp/config.js";
import { McpClientManager } from "../../../mcp/McpClientManager.js";

export const mcpCommands: SlashCommand[] = [
  {
    name: "mcp",
    description: "View configured MCP servers, active tools, and prompt templates",
    category: "config",
    usage: "/mcp [list|reload|prompts|prompt <server> <prompt-name>]",
    execute: async (args, ctx) => {
      const action = (args[0] || "list").toLowerCase();
      const projectRoot = ctx?.workspacePath || process.cwd();
      const servers = McpConfigResolver.loadMcpConfig(projectRoot);
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
      } else if (action === "reload") {
        const tools = await McpClientManager.getInstance().reloadServers(projectRoot);
        return {
          output: `✓ Reloaded MCP configuration.\nConnected Servers: ${Object.keys(servers).length}\nActive MCP Tools: ${tools.length}`,
        };
      } else if (action === "prompts" || action === "prompt") {
        if (entries.length === 0) return { output: "No MCP servers configured in .mcp.json." };
        if (args.length >= 3) {
          const serverName = args[1];
          const promptName = args[2];
          const rawArgs = args.slice(3);
          const promptArgs: Record<string, string> = {};
          for (const a of rawArgs) {
            const [k, ...v] = a.split("=");
            if (k && v.length > 0) {
              promptArgs[k] = v.join("=");
            }
          }

          try {
            const promptData = await McpClientManager.getInstance().getPrompt(serverName, promptName, promptArgs);
            const messages = (promptData?.messages || [])
              .map((m: any) => {
                const text = typeof m.content === "string" ? m.content : m.content?.text || JSON.stringify(m.content);
                return `[${m.role}]:\n${text}`;
              })
              .join("\n\n");

            return {
              output: `✦ MCP Prompt Template [/mcp:${serverName}:${promptName}]\n${promptData?.description ? `Description: ${promptData.description}\n\n` : ""}${messages || "(No messages in prompt template)"}`,
            };
          } catch (err) {
            return {
              output: `Failed to fetch MCP prompt '${promptName}' from '${serverName}': ${(err as Error).message}`,
            };
          }
        }

        const livePrompts = await McpClientManager.getInstance().listPrompts();
        if (livePrompts.length === 0) {
          return {
            output: "No MCP prompt templates exposed by connected servers.\n(To use a prompt, configure an MCP server supporting prompts in .mcp.json)",
          };
        }

        const promptList = livePrompts
          .map((p) => `  • /mcp prompt ${p.serverName} ${p.name}${p.description ? ` - ${p.description}` : ""}`)
          .join("\n");

        return {
          output: `Configured MCP Prompts:\n${promptList}\n\nInvoke a prompt with:\n  /mcp prompt <server> <prompt-name> [key=value...]`,
        };
      } else if (action === "resources") {
        if (entries.length === 0) return { output: "No MCP servers configured in .mcp.json." };
        const liveResources = await McpClientManager.getInstance().listResources();
        if (liveResources.length === 0) {
          return { output: "No MCP resources exposed by connected servers." };
        }
        const resList = liveResources
          .map((r) => `  • [${r.serverName}] ${r.name} (${r.uri})${r.description ? ` - ${r.description}` : ""}`)
          .join("\n");
        return {
          output: `Available MCP Resources:\n${resList}`,
        };
      }

      return { output: "Usage: /mcp [list | reload | prompts | prompt <server> <name> [key=val] | resources]" };
    },
  },
];
