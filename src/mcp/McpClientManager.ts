import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { BaseTool, type ToolResult } from "../agent/tools/BaseTool.js";
import { ToolOutputTruncator } from "../token-budget/ToolOutputTruncator.js";
import { McpConfigResolver } from "./config.js";

export class McpToolWrapper extends BaseTool {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: Record<string, unknown>;
  private client: Client;
  private originalToolName: string;

  constructor(client: Client, toolName: string, description: string, inputSchema: Record<string, unknown>) {
    super();
    this.client = client;
    this.originalToolName = toolName;
    this.name = `mcp_${toolName}`;
    this.description = `[MCP Tool] ${description}`;
    this.inputSchema = inputSchema;
  }

  async execute(input: Record<string, unknown>): Promise<ToolResult> {
    try {
      const res = await this.client.callTool({
        name: this.originalToolName,
        arguments: input,
      });

      const rawContent = (res as any).content
        ?.map((c: any) => (c.type === "text" ? c.text : JSON.stringify(c)))
        .join("\n") || "MCP tool call succeeded.";

      const truncated = ToolOutputTruncator.truncate(rawContent, 4000);

      return {
        ok: !(res as any).isError,
        isError: (res as any).isError ?? false,
        content: truncated.content,
      };
    } catch (err) {
      return {
        ok: false,
        isError: true,
        content: `MCP tool execution exception: ${(err as Error).message}`,
      };
    }
  }
}

export class McpClientManager {
  private static instance: McpClientManager;
  private activeClients: Map<string, Client>;
  private mcpTools: BaseTool[];

  private constructor() {
    this.activeClients = new Map();
    this.mcpTools = [];
  }

  public static getInstance(): McpClientManager {
    if (!McpClientManager.instance) {
      McpClientManager.instance = new McpClientManager();
    }
    return McpClientManager.instance;
  }

  public async initializeServers(projectRoot: string = process.cwd()): Promise<BaseTool[]> {
    const configs = McpConfigResolver.loadMcpConfig(projectRoot);
    const discoveredTools: BaseTool[] = [];

    for (const [serverName, cfg] of Object.entries(configs)) {
      try {
        const transport = new StdioClientTransport({
          command: cfg.command,
          args: cfg.args || [],
          env: { ...process.env, ...(cfg.env || {}) } as Record<string, string>,
        });

        const client = new Client(
          { name: "homogenous-cli", version: "3.7.6" },
          { capabilities: {} }
        );

        // Connect with 5000ms timeout; if timeout wins, close transport to kill spawned process
        let timeoutHandle: NodeJS.Timeout | undefined;
        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutHandle = setTimeout(() => {
            reject(new Error(`Connection to MCP server '${serverName}' timed out after 5000ms`));
          }, 5000);
        });

        try {
          await Promise.race([client.connect(transport), timeoutPromise]);
        } catch (connErr) {
          try {
            await transport.close();
          } catch {
            // Ignore transport close errors
          }
          throw connErr;
        } finally {
          if (timeoutHandle) clearTimeout(timeoutHandle);
        }

        this.activeClients.set(serverName, client);

        const toolsResult = await client.listTools();
        for (const t of toolsResult.tools) {
          const wrapper = new McpToolWrapper(
            client,
            t.name,
            t.description || "MCP tool",
            t.inputSchema as Record<string, unknown>
          );
          discoveredTools.push(wrapper);
        }
      } catch (err) {
        console.warn(`[MCP Warning] Failed to connect to MCP server '${serverName}': ${(err as Error).message}`);
      }
    }

    this.mcpTools = discoveredTools;
    return discoveredTools;
  }

  public getDiscoveredTools(): BaseTool[] {
    return this.mcpTools;
  }

  public async reloadServers(projectRoot: string = process.cwd()): Promise<BaseTool[]> {
    await this.closeAll();
    return this.initializeServers(projectRoot);
  }

  public async closeAll(): Promise<void> {
    for (const client of this.activeClients.values()) {
      try {
        await client.close();
      } catch {
        // Ignore close errors
      }
    }
    this.activeClients.clear();
    this.mcpTools = [];
  }
}
