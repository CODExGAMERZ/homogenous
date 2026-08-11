import fs from "node:fs";
import chalk from "chalk";
import { resolvePath, getProjectConfigFile, getProjectMemoryDir } from "../platform/paths.js";

export function detectProjectStack(projectRoot: string = process.cwd()): string {
  if (fs.existsSync(resolvePath(projectRoot, "package.json"))) return "Node.js / TypeScript";
  if (fs.existsSync(resolvePath(projectRoot, "pyproject.toml")) || fs.existsSync(resolvePath(projectRoot, "requirements.txt"))) return "Python";
  if (fs.existsSync(resolvePath(projectRoot, "Cargo.toml"))) return "Rust";
  if (fs.existsSync(resolvePath(projectRoot, "go.mod"))) return "Go";
  return "General";
}

export async function runInit(projectRoot: string = process.cwd()): Promise<void> {
  const stack = detectProjectStack(projectRoot);
  console.log(chalk.bold.cyan("\nInitializing Homogenous for project at:"), projectRoot);
  console.log(chalk.bold.magenta(`Detected Project Stack: ${stack}`));

  // 1. Create .toolrc.yaml tailored to detected stack
  const configPath = getProjectConfigFile(projectRoot);
  if (fs.existsSync(configPath)) {
    console.log(chalk.yellow(`  [skip] .toolrc.yaml already exists at ${configPath}`));
  } else {
    const configTemplate = `# Homogenous Project Configuration (.toolrc.yaml)
# Detected Project Stack: ${stack}
defaultModel: anthropic/claude-3-5-sonnet-20241022
compactionThreshold: 0.70
maxSessionCostUSD: 5.00

routing:
  fileSearch: ollama/qwen2.5-coder:3b
  lintSummary: ollama/qwen2.5-coder:3b
  compaction: groq/llama-3.1-8b-instant
  embedding: ollama/nomic-embed-text
  complexEdit: anthropic/claude-3-5-sonnet-20241022
  planning: anthropic/claude-3-5-sonnet-20241022

fallbackOrder:
  - ollama
  - lmstudio
  - groq
  - openai
  - anthropic
`;
    fs.writeFileSync(configPath, configTemplate, "utf-8");
    console.log(chalk.green(`  [created] .toolrc.yaml`));
  }

  // 2. Create .agentmemory directory & facts.json
  const memoryDir = getProjectMemoryDir(projectRoot);
  const factsPath = resolvePath(memoryDir, "facts.json");
  const indexPath = resolvePath(memoryDir, "index");

  if (!fs.existsSync(memoryDir)) {
    fs.mkdirSync(memoryDir, { recursive: true });
  }

  if (!fs.existsSync(indexPath)) {
    fs.mkdirSync(indexPath, { recursive: true });
  }

  if (fs.existsSync(factsPath)) {
    console.log(chalk.yellow(`  [skip] .agentmemory/facts.json already exists`));
  } else {
    const initialFacts = [
      {
        id: "fact-init-1",
        fact: `Project initialized with Homogenous local-first agent CLI. Stack: ${stack}`,
        category: "general",
        updated_at: new Date().toISOString(),
        updated_by: "homogenous init",
      },
    ];
    fs.writeFileSync(factsPath, JSON.stringify(initialFacts, null, 2), "utf-8");
    console.log(chalk.green(`  [created] .agentmemory/facts.json`));
  }

  // 3. Create .mcp.json template if missing
  const mcpPath = resolvePath(projectRoot, ".mcp.json");
  if (fs.existsSync(mcpPath)) {
    console.log(chalk.yellow(`  [skip] .mcp.json already exists`));
  } else {
    const mcpTemplate = {
      mcpServers: {},
    };
    fs.writeFileSync(mcpPath, JSON.stringify(mcpTemplate, null, 2), "utf-8");
    console.log(chalk.green(`  [created] .mcp.json`));
  }

  // 4. Update .gitignore to exclude .agentmemory/index/
  const gitignorePath = resolvePath(projectRoot, ".gitignore");
  const ignoreEntry = "\n# Homogenous local vector cache\n.agentmemory/index/\n";

  if (fs.existsSync(gitignorePath)) {
    const content = fs.readFileSync(gitignorePath, "utf-8");
    if (!content.includes(".agentmemory/index/")) {
      fs.appendFileSync(gitignorePath, ignoreEntry, "utf-8");
      console.log(chalk.green(`  [updated] .gitignore (added .agentmemory/index/)`));
    } else {
      console.log(chalk.yellow(`  [skip] .gitignore already contains .agentmemory/index/`));
    }
  } else {
    fs.writeFileSync(gitignorePath, ignoreEntry.trimStart(), "utf-8");
    console.log(chalk.green(`  [created] .gitignore`));
  }

  console.log(chalk.bold.green("\nHomogenous initialization complete!\n"));
}
