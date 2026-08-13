# ✦ HOMOGENOUS (v3.4.1)
### Local-First, Zero-Overhead Agentic CLI Coding Assistant

[![Version: 3.4.1](https://img.shields.io/badge/Version-3.4.1-00F0FF.svg?style=for-the-badge)](package.json)
[![License: MIT](https://img.shields.io/badge/License-MIT-39FF14.svg?style=for-the-badge)](LICENSE)
[![TypeScript 5.0+](https://img.shields.io/badge/TypeScript-5.0+-3178C6.svg?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js 20+](https://img.shields.io/badge/Node.js-20+-339933.svg?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Tests: 53 Passed](https://img.shields.io/badge/Tests-53%20Passed-39FF14.svg?style=for-the-badge)](test/)
[![Security Hardened](https://img.shields.io/badge/Security-Hardened%20Sandbox-FF2ED1.svg?style=for-the-badge)](README.md#-comprehensive-security-architecture-v341)

```
 ██╗  ██╗ ██████╗ ███╗   ███╗ ██████╗  ██████╗ ███████╗███╗   ██╗ ██████╗ ██╗   ██╗███████╗
 ██║  ██║██╔═══██╗████╗ ████║██╔═══██╗██╔════╝ ██╔════╝████╗  ██║██╔═══██╗██║   ██║██╔════╝
 ███████║██║   ██║██╔████╔██║██║   ██║██║  ███╗█████╗  ██╔██╗ ██║██║   ██║██║   ██║███████╗
 ██╔══██║██║   ██║██║╚██╔╝██║██║   ██║██║   ██║██╔══╝  ██║╚██╗██║██║   ██║██║   ██║╚════██║
 ██║  ██║╚██████╔╝██║ ╚═╝ ██║╚██████╔╝╚██████╔╝███████╗██║ ╚████║╚██████╔╝╚██████╔╝███████║
 ╚═╝  ╚═╝ ╚═════╝ ╚═╝     ╚═╝ ╚═════╝  ╚═════╝ ╚══════╝╚═╝  ╚═══╝ ╚═════╝  ╚═════╝ ╚══════╝
                     ✦ LOCAL-FIRST AGENTIC CODING ASSISTANT ✦
```

**Homogenous** is a local-first, zero-overhead agentic CLI coding assistant built with TypeScript, Node.js, and Ink (React for terminals). Designed to mirror and elevate terminal-first AI development workflows, Homogenous gives you complete control over your LLM backends — seamlessly combining offline local inference engines (Ollama, LM Studio) with 9 frontier cloud AI providers, persistent project memory, Model Context Protocol (MCP) tool integrations, custom dynamic skill packs, live token cost accounting, rich terminal Markdown & table formatting, and interactive TUI feedback.

---

## 🚀 Quick Start & Installation

Homogenous can be installed on **Windows**, **macOS**, and **Linux**.

### Option A: Install from NPM (Recommended)

```bash
npm install -g @codexgamerz/homogenous
```

---

### Option B: One-Line Installer

* **Windows (PowerShell)**:
  ```powershell
  irm https://raw.githubusercontent.com/CODExGAMERZ/homogenous/main/install.ps1 | iex
  ```

* **macOS / Linux (Bash)**:
  ```bash
  curl -fsSL https://raw.githubusercontent.com/CODExGAMERZ/homogenous/main/install.sh | bash
  ```

---

### Option C: Standalone Pre-Packaged NPM Tarball

Download and install the self-contained production bundle with zero build steps:

```bash
npm install -g codexgamerz-homogenous-3.4.1.tgz
```

---

### Option C: Install from Source / ZIP Distribution

1. Download **[homogenous-cli-v3.4.1.zip](homogenous-cli-v3.4.1.zip)** or clone the repo:
   ```bash
   git clone https://github.com/CODExGAMERZ/homogenous.git
   cd homogenous
   ```
2. Install dependencies & build:
   ```bash
   npm install
   npm run build
   ```
3. Link globally:
   ```bash
   npm link
   ```

---

## ⚡ Launching Homogenous

Once installed, simply run `homogenous` from **any directory** on your machine:

```bash
# Start interactive full-screen chat session
homogenous

# Run a fast single-prompt command
homogenous oneshot "Inspect package.json and summarize the project stack"

# Manage memory or skills
homogenous memory list
homogenous skills list
```

---

## 🛡️ Comprehensive Security Architecture (v3.4.1)

Homogenous is built with a defense-in-depth security model to ensure the agent operates safely inside your local codebase:

| Security Module | Defensive Mechanism | Protection Provided |
| :--- | :--- | :--- |
| **Workspace Containment** | `resolveWorkspacePath()` root-boundary validation | Blocks directory traversal (`../../../../etc/passwd`, `~/.ssh/`) across all file reading, writing, and search tools. |
| **Direct Argv Execution** | `execFileDirect()` subprocess spawning with `--` option terminators | Completely eliminates shell command injection (`$()`, backtick subshells, `%VAR%` expansion) in ripgrep and git tools. |
| **Interactive Shell Approval Gate** | Raw-mode single-key confirmation (`[y]/[n]`) with metacharacter blocking | Prevents command-chaining bypasses (`cat file.txt && rm -rf ~`). State-modifying commands strictly require user consent. |
| **Tool Input Schema Validation** | Runtime Zod schema enforcement on all tool calls | Rejects malformed or typed-injected model arguments before reaching execution handlers. |
| **Skill Trust Boundaries** | Provenance origin tagging (`bundled`, `global`, `project`) | Untrusted repo-local `.homogenous/skills` are isolated to user prompt context rather than unrestricted `role: "system"` privileges. |
| **WebFetch SSRF Protection** | Hop-by-hop redirect inspection & private IP blocklist | Blocks access to cloud instance metadata (`169.254.169.254`, `metadata.google.internal`), localhost, and private IPv4 networks. |
| **Streaming Memory Caps** | Incremental `getReader()` body truncation at 500 KB | Prevents memory exhaustion attacks from oversized web pages without buffering full payloads. |
| **Automatic 429 Rate-Limit Retry** | Exponential backoff retry loop (up to 3 attempts) | Automatically handles free-tier token-per-minute rate limit spikes without dropping the active session. |

---

## ✨ Core Features & Capabilities

- 🎨 **Dark Neon TUI Theme Engine (Ink + React 19)**: Modern, full-viewport terminal UI with syntax-highlighted code blocks (`cli-highlight`), state-reactive prompt container borders, middle-elision tool output cards, and live spinner indicators.
- 📝 **Rich Terminal Markdown & Table Rendering Engine**: Fully native terminal Markdown parser rendering formatted Unicode box-drawing tables (`┌─┬─┐`), styled headers (`✦`, `◆`, `▸`), inline typography (bold, italic, code), lists, blockquotes, horizontal dividers, and syntax-highlighted code blocks with `/copy` clipboard integration.
- ⚡ **11 Supported LLM Providers**: Unified abstraction layer connecting local offline runtimes and cloud API backends with dynamic task routing and fallback:
  - **Local Offline Runtimes**: [Ollama](https://ollama.com/), [LM Studio](https://lmstudio.ai/)
  - **Frontier Cloud APIs**: Anthropic (Claude 3.5 Sonnet, Claude 3 Opus), OpenAI (GPT-4o, o3-mini), Groq Free/Fast Tier, NVIDIA NIM, DeepSeek, OpenRouter, Mistral AI, Together AI, and Mock Demo mode.
- 🖥️ **Hardware VRAM Probe**: Non-blocking 5s cached `nvidia-smi` probe displaying a live `[VRAM: X.XG/Y.YG]` badge in the terminal header with zero CPU overhead.
- 📋 **Standing Plan Mode (`/plan` & `/apply`)**: Dry-run architectural proposal generation with structured step breakdown and explicit user review before executing file modifications through the `AgentLoop`.
- 🛡️ **Safe Auto-Approve Mode (`/auto`)**: Automated approval for non-destructive file reads and edits, with strict safety carve-outs gating dangerous system commands.
- 💰 **Real-Time Token Budgeting & Cost Accounting (`/budget`, `/cost`)**: Precise token counting (`js-tiktoken`), middle-elision tool output truncator, prompt cache manager, and configurable session spending caps (`maxSessionCostUSD`).
- ⏪ **Diff Engine & Instant Rollbacks (`/diff`, `/undo`)**: In-memory edit snapshot stack supporting unified colored git-style diff preview and single-command file restoration.
- 🧠 **Persistent Project Memory (`/memory`)**: Local vector & term-based memory retriever (`.agentmemory/`) preserving project conventions, architectural facts, and developer context across REPL sessions.
- 🧩 **Dynamic Skill Packs (`/skills`)**: Extend agent capabilities with modular skills stored in `skills/` or `.homogenous/skills/`, complete with keyword matching, skill installer, and auto-scaffolding.
- 🔌 **Native MCP (Model Context Protocol) Support (`/mcp`)**: Native `.mcp.json` server resolution via `@modelcontextprotocol/sdk`, exposing external tool, resource, and prompt integrations directly to the agent.
- 🔑 **Secure OS Keychain Credential Management (`/login`)**: Ping-validates API keys against live LLM endpoints before saving to OS Keychain (`keytar`) or secure user file permissions (`0600`).

---

## 📖 CLI Command Reference

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

## 📁 Repository Architecture

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
│   │   ├── systemPrompt.ts           # Centralized system prompt builder with environment context
│   │   └── tools/                    # File, Shell, Git, Search, and Web tool implementations
│   ├── cli/                          # Terminal User Interface & REPL engine
│   │   ├── repl.tsx                  # Interactive REPL main loop (Ink React render)
│   │   ├── init.ts                   # Project setup wizard (.toolrc.yaml / .agentmemory)
│   │   ├── oneshot.ts                # Non-interactive command runner
│   │   ├── slash/                    # Slash command handlers (/plan, /model, /login, etc.)
│   │   └── ui/                       # Ink UI components (Header, TokenMeter, ToolCard, DiffView, MarkdownText)
│   ├── config/                       # YAML configuration resolver & schema validation (Zod)
│   ├── inference/                    # LLM Provider abstraction & keychain security
│   │   ├── ProviderRegistry.ts       # Central registry for all 11 inference providers
│   │   ├── keychain.ts               # OS Keychain (keytar) / secure local storage fallback (0600)
│   │   └── providers/                # Provider modules (Anthropic, OpenAI, Groq, Ollama, etc.)
│   ├── mcp/                          # Model Context Protocol (MCP) server integration
│   ├── memory/                       # Persistent & session memory storage, retriever & compactor
│   ├── platform/                     # Platform utilities (direct argv shell, vramProbe, paths)
│   ├── skills/                       # Dynamic skill pack loader, registry & installer
│   ├── token-budget/                 # Token counter, cost ledger, prompt caching & diff engine
│   └── utils/                        # Code block parser & clipboard helpers
├── skills/                           # Bundled stock skill packs (code-refactor, test-scaffolder, etc.)
├── test/                             # Automated test suite (52 unit tests across 13 test suites)
├── install.ps1                       # One-line installer for Windows
├── install.sh                        # One-line installer for Linux / macOS
├── .toolrc.example.yaml              # Example project configuration template
├── package.json                      # Project metadata & scripts
└── tsconfig.json                     # TypeScript compiler configuration
```

---

## 🧪 Development, Testing & Verification

Homogenous is fully covered with automated TypeScript type checking, unit tests, and security tests:

```bash
# 1. Typecheck codebase (0 errors)
npm run typecheck

# 2. Run automated unit test suite (52 passing tests)
npm test

# 3. Build production distribution bundle
npm run build

# 4. Create standalone npm package tarball
npm pack
```

---

## 📄 License & Author

Developed by **CODExGAMERZ**. Licensed under the open-source **[MIT License](LICENSE)**.
