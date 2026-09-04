import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { BaseTool, type ToolResult } from "../agent/tools/BaseTool.js";
import { ToolOutputTruncator } from "../token-budget/ToolOutputTruncator.js";
import { McpConfigResolver } from "./config.js";
import { ResourceCache } from "./ResourceCache.js";

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
        // Sanitize inherited environment variables to prevent leaking parent process API credentials
        const sanitizedParentEnv: Record<string, string> = {};
        for (const [k, v] of Object.entries(process.env)) {
          if (v === undefined) continue;
          const upperKey = k.toUpperCase();
          // Filter out all API keys, secrets, tokens, and private inference provider credentials
          if (
            upperKey.includes("API_KEY") ||
            upperKey.includes("_SECRET") ||
            upperKey.includes("AUTH_TOKEN") ||
            upperKey.includes("PRIVATE_KEY") ||
            upperKey.startsWith("ANTHROPIC_") ||
            upperKey.startsWith("OPENAI_") ||
            upperKey.startsWith("NVIDIA_") ||
            upperKey.startsWith("DEEPSEEK_") ||
            upperKey.startsWith("GROQ_") ||
            upperKey.startsWith("OPENROUTER_") ||
            upperKey.startsWith("MISTRAL_") ||
            upperKey.startsWith("TOGETHER_") ||
            upperKey.startsWith("HOMOGENOUS_")
          ) {
            continue;
          }
          sanitizedParentEnv[k] = v;
        }

        const transport = new StdioClientTransport({
          command: cfg.command,
          args: cfg.args || [],
          env: { ...sanitizedParentEnv, ...(cfg.env || {}) } as Record<string, string>,
        });

        const client = new Client(
          { name: "homogenous-cli", version: "4.3.0" },
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

  public getActiveServerNames(): string[] {
    return Array.from(this.activeClients.keys());
  }

  public async listPrompts(): Promise<{ serverName: string; name: string; description?: string; arguments?: any[] }[]> {
    const allPrompts: { serverName: string; name: string; description?: string; arguments?: any[] }[] = [];
    for (const [serverName, client] of this.activeClients.entries()) {
      try {
        const result = await client.listPrompts();
        if (result && Array.isArray(result.prompts)) {
          for (const p of result.prompts) {
            allPrompts.push({
              serverName,
              name: p.name,
              description: p.description,
              arguments: (p as any).arguments,
            });
          }
        }
      } catch {
        // Server may not support prompts capability; safely ignore
      }
    }
    return allPrompts;
  }

  public async getPrompt(
    serverName: string,
    promptName: string,
    args?: Record<string, string>
  ): Promise<any> {
    const client = this.activeClients.get(serverName);
    if (!client) {
      throw new Error(`MCP server '${serverName}' is not connected.`);
    }
    return await client.getPrompt({
      name: promptName,
      arguments: args,
    });
  }

  public async listResources(): Promise<{ serverName: string; uri: string; name: string; mimeType?: string; description?: string }[]> {
    const allResources: { serverName: string; uri: string; name: string; mimeType?: string; description?: string }[] = [];
    for (const [serverName, client] of this.activeClients.entries()) {
      try {
        const result = await client.listResources();
        if (result && Array.isArray(result.resources)) {
          for (const r of result.resources) {
            allResources.push({
              serverName,
              uri: r.uri,
              name: r.name,
              mimeType: r.mimeType,
              description: r.description,
            });
          }
        }
      } catch {
        // Server may not support resources capability; safely ignore
      }
    }
    return allResources;
  }

  public async readResource(serverName: string, uri: string): Promise<string> {
    const cached = ResourceCache.get(uri);
    if (cached) return cached;

    const client = this.activeClients.get(serverName);
    if (!client) {
      throw new Error(`MCP server '${serverName}' is not connected.`);
    }

    const res = await client.readResource({ uri });
    const content = (res.contents || [])
      .map((c: any) => (c.text !== undefined ? c.text : (c.blob || "")))
      .join("\n");

    return ResourceCache.set(uri, content);
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
