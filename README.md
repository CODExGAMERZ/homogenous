# Homogenous (v3.2.0) — Local-First Agentic CLI Coding Assistant

[![License: MIT](https://img.shields.io/badge/License-MIT-brightgreen.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)

**Homogenous** is a local-first, zero-overhead agentic CLI coding assistant built in TypeScript and Ink (React for CLIs). Designed to mirror and enhance terminal-first coding agent workflows, Homogenous puts you in total control of your LLM backends — supporting local inference engines (Ollama, LM Studio) alongside 9 major cloud AI providers, persistent project memory, Model Context Protocol (MCP) integrations, custom skill packs, live token cost accounting, and interactive TUI feedback.

---

## ✨ Core Features

- 🎨 **Dark Neon TUI Theme Engine (Ink + React 19)**: Modern, responsive full-viewport terminal UI using vibrant hex tokens (`#00F0FF` primary cyan, `#FF2ED1` secondary magenta, `#39FF14` success green, `#FFB000` warning amber, and `#FF3860` error red). Features syntax-highlighted code blocks (`cli-highlight`), state-reactive prompt container borders, middle-elision tool output cards, and live spinner indicators.
- ⚡ **11 Supported LLM Providers**: Unified abstraction layer connecting both local offline runtimes and cloud API backends with dynamic failover:
  - **Local Offline Runtimes**: [Ollama](https://ollama.com/), [LM Studio](https://lmstudio.ai/)
  - **Frontier Cloud APIs**: Anthropic (Claude 3.5 Sonnet, Claude 3 Opus), OpenAI (GPT-4o, o3-mini), Groq Free/Fast Tier, NVIDIA NIM, DeepSeek, OpenRouter, Mistral AI, Together AI, and Mock Demo mode.
- 🖥️ **Hardware VRAM Probe**: Non-blocking 5s cached `nvidia-smi` probe displaying a live `[VRAM: X.XG/Y.YG]` badge in the terminal header with zero CPU overhead.
- 📋 **Standing Plan Mode (`/plan` & `/apply`)**: Dry-run architectural proposal generation with structured step breakdown and explicit user review before executing file modifications through the `AgentLoop`.
- 🛡️ **Safe Auto-Approve Mode (`/auto`)**: Automated approval for non-destructive file reads and edits, with strict safety carve-outs gating dangerous system commands (`rm -rf`, `sudo`, `git push --force`, system mutations).
- 💰 **Real-Time Token Budgeting & Cost Accounting (`/budget`, `/cost`)**: Precise token counting (`js-tiktoken`), middle-elision tool output truncator, prompt cache manager, and configurable session spending caps (`maxSessionCostUSD`).
- ⏪ **Diff Engine & Instant Rollbacks (`/diff`, `/undo`)**: In-memory edit snapshot stack supporting unified colored git-style diff preview and single-command file restoration.
- 🧠 **Persistent Project Memory (`/memory`)**: Local vector & term-based memory retriever (`.agentmemory/`) preserving project conventions, architectural facts, and developer context across REPL sessions.
- 🧩 **Dynamic Skill Packs (`/skills`)**: Extend agent capabilities with modular skills stored in `skills/` or `.homogenous/skills/`, complete with keyword matching, skill installer, and auto-scaffolding.
- 🔌 **Native MCP (Model Context Protocol) Support (`/mcp`)**: Native `.mcp.json` server resolution via `@modelcontextprotocol/sdk`, exposing external tool, resource, and prompt integrations directly to the agent.
- 🔑 **Secure OS Keychain Credential Management (`/login`)**: Ping-validates API keys against live LLM endpoints before saving to OS Keychain (`keytar`) or secure user file permissions (`0600`).

---

## 📦 Installation & Setup

### Prerequisites

- **Node.js**: `v20.0.0` or higher
- **npm** or **yarn** / **pnpm**
- *(Optional)* **Ollama** or **LM Studio** for local offline inference.

### Global Installation (Recommended)

Install Homogenous globally to launch `homogenous` from any project directory:

```bash
# 1. Clone the repository
git clone https://github.com/your-username/homogenous.git
cd homogenous

# 2. Install dependencies & build
npm install
npm run build

# 3. Link globally
npm install -g .

# 4. Launch from ANY folder on your system!
homogenous
```

### Development Execution

Run directly in dev mode using `tsx`:

```bash
# Start interactive REPL in current directory
npm run dev

# Launch chat with a specific model override
npx tsx bin/homogenous.ts chat --model groq/llama-3.1-8b-instant

# Run a non-interactive one-shot query
npx tsx bin/homogenous.ts oneshot "Examine src/index.ts and summarize export signatures"
```

---

## 📖 CLI Command Line Interface

```bash
homogenous                            # Start interactive REPL chat session (default)
homogenous chat                       # Explicitly launch interactive REPL chat session
homogenous oneshot "<prompt>"         # Execute non-interactive query and print output
homogenous init                       # Initialize .toolrc.yaml & .agentmemory for current project
homogenous memory list                # List persistent project memory facts
homogenous memory remember "<fact>"   # Save a project rule or architectural convention
homogenous memory forget "<id>"       # Remove a stored fact by ID
homogenous skills list                # View active dynamic skill packs
homogenous skills create <name>       # Scaffold a new skill pack template
homogenous skills install <target>    # Install skill pack from path or registry
homogenous mcp list                   # View configured MCP servers (.mcp.json)
```

---

## ✦ Interactive REPL Slash Commands

Inside an interactive chat session, type `/` to access built-in slash commands:

| Command | Usage | Description |
| :--- | :--- | :--- |
| `/plan` | `/plan [on\|off\|prompt]` | Toggle standing plan mode or generate a structured implementation plan proposal |
| `/apply` | `/apply` | Approve and execute pending plan steps via the `AgentLoop` |
| `/reject` | `/reject` | Discard pending implementation plan proposal |
| `/auto` | `/auto [on\|off]` | Toggle safe auto-approve mode (destructive commands remain gated) |
| `/model` | `/model [number]` | Interactively list installed local models & configured cloud models |
| `/provider` | `/provider [status]` | Ping all 11 inference providers and display connection health status |
| `/login` | `/login <provider> <key>` | Validate credential live against backend API & save securely to OS Keychain |
| `/budget` | `/budget [--report]` | Render real-time token budget allocation and financial spend accounting |
| `/cost` | `/cost` | View quick session token usage and USD cost breakdown |
| `/undo` | `/undo` | Instantly revert last applied file edit using the DiffEngine snapshot stack |
| `/diff` | `/diff` | Render unified colorized diff of all file modifications in current session |
| `/copy` | `/copy` | Copy last assistant code block directly to clipboard |
| `/memory` | `/memory list\|remember\|forget` | View or manage persistent project memory facts |
| `/skills` | `/skills list\|install` | Inspect available skills or install external skill modules |
| `/mcp` | `/mcp [list\|prompts]` | View connected MCP servers, exposed tools, and prompt templates |
| `/routing` | `/routing` | View task-to-model routing configuration matrix |
| `/config` | `/config` | View merged `.toolrc.yaml` active settings |
| `/init` | `/init` | Scaffold project configuration directly inside REPL |
| `/save` | `/save [name]` | Save active chat conversation state to session snapshot |
| `/resume` | `/resume [name]` | Resume previously saved chat session snapshot |
| `/clear` | `/clear` | Reset active conversation context feed |
| `/exit` | `/exit` | Exit the REPL cleanly |

---

## ⌨️ Universal Keyboard Shortcuts

| Shortcut | Action | Description |
| :--- | :--- | :--- |
| `Ctrl + P` | Toggle Plan Mode | Enable or disable standing plan mode (`/plan`) |
| `Ctrl + U` | Undo Last Edit | Revert the most recent file edit (`/undo`) |
| `Ctrl + D` | Show Session Diff | Display full colored diff of all modified files (`/diff`) |
| `Ctrl + M` | Select Model | Open model selector overlay (`/model`) |
| `Ctrl + A` | Toggle Auto Mode | Toggle safe auto-approve execution mode (`/auto`) |
| `Ctrl + L` | Clear Screen | Clear conversation feed (`/clear`) |
| `Ctrl + Q` / `Esc` | Quit REPL | Safely exit Homogenous session (`/exit`) |

---

## ⚙️ Configuration File (`.toolrc.yaml`)

Project options can be configured per-repository via `.toolrc.yaml` or globally in `~/.toolrc.yaml`:

```yaml
# Homogenous Configuration (.toolrc.yaml)
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
```

---

## 📁 Repository Architecture & Folder Structure

```
homogenous/
├── bin/
│   └── homogenous.ts                 # CLI entrypoint script (yargs command router)
├── src/
│   ├── agent/                        # Core agent execution & tool orchestration
│   │   ├── AgentLoop.ts              # Multi-turn tool execution loop & event stream
│   │   ├── ExecutionMode.ts          # Normal, Auto-Approve, and Plan mode definitions
│   │   ├── PlanningMode.ts           # Implementation plan generator & step parser
│   │   ├── SubAgent.ts               # Sub-agent delegate spawner for parallel tasks
│   │   └── tools/                    # File, Shell, Git, Search, and Web tool implementations
│   ├── cli/                          # Terminal User Interface & REPL engine
│   │   ├── repl.tsx                  # Interactive REPL main loop (Ink React render)
│   │   ├── init.ts                   # Project setup wizard (.toolrc.yaml / .agentmemory)
│   │   ├── oneshot.ts                # Non-interactive command runner
│   │   ├── slash/                    # Slash command handlers (/plan, /model, /login, etc.)
│   │   └── ui/                       # Ink UI components (Header, TokenMeter, ToolCard, DiffView)
│   ├── config/                       # YAML configuration resolver & schema validation (Zod)
│   ├── inference/                    # LLM Provider abstraction & keychain security
│   │   ├── ProviderRegistry.ts       # Central registry for all 11 inference providers
│   │   ├── keychain.ts               # OS Keychain (keytar) / secure local storage fallback
│   │   └── providers/                # Provider modules (Anthropic, OpenAI, Groq, Ollama, etc.)
│   ├── mcp/                          # Model Context Protocol (MCP) server integration
│   ├── memory/                       # Persistent & session memory storage, retriever & compactor
│   ├── platform/                     # Platform utilities (cross-spawn shell, vramProbe, paths)
│   ├── skills/                       # Dynamic skill pack loader, registry & installer
│   ├── token-budget/                 # Token counter, cost ledger, prompt caching & diff engine
│   └── utils/                        # Code block parser & helpers
├── skills/                           # Bundled stock skill packs (code-refactor, test-scaffolder)
├── test/                             # Automated test suite (37 unit test files)
├── .toolrc.example.yaml              # Example project configuration template
├── package.json                      # Project metadata & scripts
└── tsconfig.json                     # TypeScript compiler configuration
```

---

## 🧪 Testing & Verification

Homogenous is thoroughly tested across TypeScript types, tool mechanics, and provider abstractions:

```bash
# 1. Typecheck codebase (0 errors)
npm run typecheck

# 2. Build distribution bundle
npm run build

# 3. Run automated unit test suite (37 passing test suites)
npm test
```

---

## 📄 License

This project is open-source software licensed under the [MIT License](LICENSE).
