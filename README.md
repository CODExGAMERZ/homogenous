# ✦ HOMOGENOUS (v3.9.5)
### The Enterprise-Grade, Local-First, Zero-Overhead Agentic CLI Coding Assistant

[![Version: 3.9.5](https://img.shields.io/badge/Version-3.9.5-00F0FF.svg?style=for-the-badge)](package.json)
[![License: MIT](https://img.shields.io/badge/License-MIT-39FF14.svg?style=for-the-badge)](LICENSE)
[![TypeScript 5.0+](https://img.shields.io/badge/TypeScript-5.0+-3178C6.svg?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js 20+](https://img.shields.io/badge/Node.js-20+-339933.svg?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Tests: 84 Passed](https://img.shields.io/badge/Tests-84%20Passed-39FF14.svg?style=for-the-badge)](test/)
[![Zero-Trust Security](https://img.shields.io/badge/Security-Zero--Trust%20Sandbox-FF2ED1.svg?style=for-the-badge)](README.md#-zero-trust-security--sandboxing-architecture)

```text
 ██╗  ██╗ ██████╗ ███╗   ███╗ ██████╗  ██████╗ ███████╗███╗   ██╗ ██████╗ ██╗   ██╗███████╗
 ██║  ██║██╔═══██╗████╗ ████║██╔═══██╗██╔════╝ ██╔════╝████╗  ██║██╔═══██╗██║   ██║██╔════╝
 ███████║██║   ██║██╔████╔██║██║   ██║██║  ███╗█████╗  ██╔██╗ ██║██║   ██║██║   ██║███████╗
 ██╔══██║██║   ██║██║╚██╔╝██║██║   ██║██║   ██║██╔══╝  ██║╚██╗██║██║   ██║██║   ██║╚════██║
 ██║  ██║╚██████╔╝██║ ╚═╝ ██║╚██████╔╝╚██████╔╝███████╗██║ ╚████║╚██████╔╝╚██████╔╝███████║
 ╚═╝  ╚═╝ ╚═════╝ ╚═╝     ╚═╝ ╚═════╝  ╚═════╝ ╚══════╝╚═╝  ╚═══╝ ╚═════╝  ╚═════╝ ╚══════╝
                     ✦ LOCAL-FIRST AGENTIC CODING ASSISTANT ✦
```

**Homogenous** is an enterprise-grade, local-first, zero-overhead agentic CLI coding assistant built from the ground up with TypeScript, Node.js, and React Ink. Designed for privacy-conscious developers and terminal power users, Homogenous gives you complete control over your AI backends — unifying offline local inference engines (**Ollama**, **LM Studio**) with 9 frontier cloud providers, Model Context Protocol (MCP) tool integrations, dynamic skill extensions, persistent project memory, live token cost accounting, silky-smooth 60 FPS streaming, and zero-trust security sandboxing.

---

## 📋 Table of Contents

- [✦ Executive Summary & Design Philosophy](#-executive-summary--design-philosophy)
- [🌟 What's New in Version 3.9.1](#-whats-new-in-version-391)
- [⚡ Architectural Feature Breakdown](#-architectural-feature-breakdown)
- [📦 Complete Installation Guide](#-complete-installation-guide)
- [🚀 Execution Modes & Command Line Options](#-execution-modes--command-line-options)
- [⌨️ Interactive TUI Navigation & Shortcuts](#️-interactive-tui-navigation--shortcuts)
- [🛠️ Deep-Dive Slash Commands Reference](#️-deep-dive-slash-commands-reference)
- [🤖 Complete AI Model & Provider Matrix](#-complete-ai-model--provider-matrix)
- [🧰 Built-in Agent Tools](#-built-in-agent-tools)
- [🛡️ Zero-Trust Security & Sandboxing Architecture](#️-zero-trust-security--sandboxing-architecture)
- [🔌 Model Context Protocol (MCP) Integration](#-model-context-protocol-mcp-integration)
- [🧠 Persistent Project Memory & Context Retrieval](#-persistent-project-memory--context-retrieval)
- [🧩 Dynamic Skill Ecosystem](#-dynamic-skill-ecosystem)
- [🎨 Beautiful Themes & Visual Customization](#-beautiful-themes--visual-customization)
- [⚙️ Configuration & Customization](#️-configuration--customization)
- [📁 Repository Layout & Codebase Structure](#-repository-layout--codebase-structure)
- [🧪 Testing & Quality Assurance Suite](#-testing--quality-assurance-suite)
- [🔧 Troubleshooting & FAQ](#-troubleshooting--faq)
- [📄 License](#-license)

---

## ✦ Executive Summary & Design Philosophy

Homogenous is built around four fundamental engineering principles:

1. **Local-First & Offline Resilience**: Local AI inference is a first-class citizen. Homogenous connects natively to local servers (**Ollama**, **LM Studio**) without requiring cloud API keys, network access, or telemetry.
2. **Terminal-Native Visual Excellence & 60 FPS Rendering**: Built with React Ink, Homogenous renders syntax-highlighted code blocks with LRU memoization, token-aware cell line wrapping in Markdown tables, and rich color palettes across themes.
3. **Scrollback Preservation & Zero-Lag Typing**: AI streaming never locks terminal scrollback buffers. Completed paragraphs flush directly to `stdout`, keeping dynamic TUI re-render height minimal so terminal scrolling remains 100% responsive. Keystrokes execute with zero input latency.
4. **Zero-Trust Security Sandboxing**: Agent execution is strictly contained. Homogenous enforces realpath symlink containment, executes subcommands directly without shell interpolation (`execFileDirect`), blocks SSRF targets, and gates all state-modifying actions behind explicit user approval.

---

## 🌟 What's New in Version 3.9.1

Version 3.9.1 delivers a major leap forward in input responsiveness, typing ergonomics, intelligent autocomplete, and 60 FPS rendering performance:

* ⚡ **Ultra-Smooth Typing & Native Cursor Ergonomics**:
  * **Accurate Delete vs Backspace**: `Delete` key (`\x1b[3~` / fn+Del) now deletes character *after* the cursor without jumping backwards; `Backspace` deletes character *before* cursor.
  * **Word-Boundary Jumping**: `Ctrl+Left` / `Alt+Left` / `Option+Left` (`\x1bb`, `\x1b[1;5D`) and `Ctrl+Right` / `Alt+Right` / `Option+Right` (`\x1bf`, `\x1b[1;5C`) jump across word boundaries instantly.
  * **Word Deletions**: `Ctrl+W`, `Ctrl+Backspace`, `Alt+Backspace` (backward word kill) and `Alt+D`, `Ctrl+Delete` (forward word kill).
  * **Line Editing Shortcuts**: `Ctrl+U` (kill from cursor to start of line), `Ctrl+K` (kill from cursor to end of line), `Ctrl+A` / `Home` (start of line), `Ctrl+E` / `End` (end of line).
  * **Session Prompt History**: Press `↑` on a single line or top line to cycle backward through previously submitted prompts, and `↓` to cycle forward back to your current draft.
* 🔍 **Intelligent Fuzzy Autocomplete & Dynamic `@file` Suggestions**:
  * **Fuzzy Command Matching**: Type partial shortcuts like `/clr` -> `/clear`, `/mod` -> `/model`, `/th` -> `/theme`, `/sk` -> `/skills`.
  * **Dynamic File & Directory Autocomplete**: Typing `@` (e.g. `@src/` or `@README.md`) provides real-time workspace path suggestions with `📁` and `📄` icons.
  * **Interactive Suggestion Navigation**: Use `↑` / `↓` arrow keys to navigate suggestions, `Enter` or `Tab` to select, and `Esc` to dismiss.
  * **Comprehensive Subcommand Suggestions**: Instant completions for `/theme`, `/mode`, `/diff`, `/budget`, `/skills`, `/mcp`, `/session`, `/login`, and active models.
* 🚀 **60 FPS High-Framerate Streaming & Zero-Lag Keychain**:
  * **In-Memory Keychain Cache**: Caches credential lookups in memory, eliminating synchronous disk reads (`fs.readFileSync`) during typing.
  * **Syntax Highlighting LRU Memoizer**: Eliminates CPU re-parsing spikes during code generation and streaming re-renders.
  * **60 FPS Output Throttling**: Batch streaming token updates at 16ms high-framerate windows, eliminating terminal redraw storms and screen tearing.

---

## ⚡ Architectural Feature Breakdown

### 1. Multi-Provider Local & Cloud Inference Engine
Seamlessly switch between local offline servers and 9 frontier cloud providers. The provider registry dynamically inspects local endpoints (`127.0.0.1:11434` for Ollama, `127.0.0.1:1234` for LM Studio) and manages credentials stored securely in OS Keychain and `~/.homogenous/keys.json`.

### 2. Model Context Protocol (MCP) Integration Engine
Connect to standard MCP servers configured via `.mcp.json` or `~/.homogenous/mcp.json`. Homogenous acts as a full MCP client, exposing server tools, prompt templates, and resources directly to the agent loop.

### 3. Plan & Apply Execution Engine
Safely review complex multi-file modifications before execution. In Planning Mode (`/plan`, `/mode plan`, or `Ctrl+P`), the agent inspects the workspace, generates an `implementation_plan.md`, and waits for explicit user approval before executing edits (`/apply`).

### 4. Interactive Diff & State Rollback
Homogenous tracks all file modifications in a session-level diff engine. Use `/diff` or `Ctrl+D` to review uncommitted file edits, or `/undo` or `Ctrl+U` to instantly revert file changes step by step.

### 5. Term-Frequency Memory & Context Retrieval
Stores persistent project facts in `.agentmemory/facts.json` with automated term-frequency ranking (`ContextRetriever`). The memory engine injects relevant project context into system prompts while keeping token budgets compact.

---

## 📦 Complete Installation Guide

### Option A: Global NPM Installation (Recommended)

Install Homogenous globally using Node Package Manager:

```bash
npm install -g @codexgamerz/homogenous
```

Verify installation:

```bash
homogenous --version
# Output: 3.9.1
```

---

### Option B: Automated One-Line Installers

#### Windows (PowerShell)
```powershell
irm https://raw.githubusercontent.com/CODExGAMERZ/homogenous/main/install.ps1 | iex
```

#### macOS / Linux (Bash)
```bash
curl -fsSL https://raw.githubusercontent.com/CODExGAMERZ/homogenous/main/install.sh | bash
```

---

### Option C: Building from Source

1. Clone the repository:
   ```bash
   git clone https://github.com/CODExGAMERZ/homogenous.git
   cd homogenous
   ```
2. Install dependencies & compile:
   ```bash
   npm install
   npm run build
   ```
3. Run tests & link binary globally:
   ```bash
   npm test
   npm install -g .
   ```

---

## 🚀 Execution Modes & Command Line Options

Homogenous supports three primary execution modes:

### 1. Interactive TUI REPL Mode
Launch the full-screen interactive REPL in any repository:

```bash
homogenous
# or specify a model override:
homogenous -m ollama/qwen2.5-coder:1.5b
homogenous -m groq/llama-3.3-70b-versatile
```

### 2. Fast Oneshot Prompt Execution
Run a single non-interactive task directly from the terminal:

```bash
homogenous oneshot "Analyze package.json and summarize main dependencies"
```

### 3. Sub-Command Utility Execution
Execute memory, skill, and MCP management tasks directly from the CLI:

```bash
# Manage persistent project memory
homogenous memory list
homogenous memory add "Use pnpm for package management"
homogenous memory remove <fact-id>
homogenous memory clear

# Manage dynamic agent skills
homogenous skills list
homogenous skills create my-custom-skill
homogenous skills install ./my-skill-pack
homogenous skills remove my-custom-skill

# Manage Model Context Protocol (MCP) servers
homogenous mcp list
homogenous mcp reload

# Initialize repository configuration
homogenous init
```

---

## ⌨️ Interactive TUI Navigation & Shortcuts

When running in interactive REPL mode, use keyboard shortcuts for instant control:

| Shortcut | Command Equivalent | Description / Action |
| :--- | :--- | :--- |
| `Ctrl + P` | `/plan` | Toggle **Planning Mode** (generates dry-run plan before edits) |
| `Ctrl + U` | `/undo` / Line Kill | Revert last file modification (or kill to line start when editing) |
| `Ctrl + D` | `/diff` | Display unified session diff of uncommitted file edits |
| `Ctrl + O` or `Ctrl + M` | `/model` | Open interactive AI model picker (sorted by parameter size) |
| `Ctrl + A` | `/auto` / Line Start | Toggle **Auto-Approve** mode (or jump cursor to line start) |
| `Ctrl + L` | `/clear` | Clear conversation feed history |
| `Ctrl + K` | — | Kill line from cursor to end of line |
| `Ctrl + W` / `Ctrl + Backspace` | — | Delete previous word before cursor |
| `Alt + D` / `Ctrl + Delete` | — | Delete next word after cursor |
| `Ctrl + Left` / `Alt + Left` | — | Jump backward one word |
| `Ctrl + Right` / `Alt + Right` | — | Jump forward one word |
| `Home` / `End` | — | Jump cursor to start / end of line or prompt |
| `Up / Down Arrows` | — | Navigate prompt history (or suggestions / multiline lines) |
| `Tab` / `Shift + Tab` | — | Cycle forward / backward through autocomplete suggestions |
| `Enter` | — | Submit prompt (or select active suggestion) |
| `Shift + Enter` or `Ctrl + J` | — | Insert a newline in prompt (multi-line editing) |
| `Esc` | `/exit` / Close popup | Close suggestion popup (or exit session) |

---

## 🛠️ Deep-Dive Slash Commands Reference

All slash commands can be typed directly into the REPL prompt with fuzzy autocomplete:

### `/model [number | provider/model-name]`
Inspect active provider status or switch models interactively, with all available models dynamically sorted from highest to lowest parameter capacity.
* **Examples**:
  - `/model` — Opens the interactive selection menu sorted by parameters.
  - `/model 1` — Selects model option `#1`.
  - `/model nvidia/meta/llama-3.3-70b-instruct` — Switches to NVIDIA Llama 3.3 70B.
  - `/model ollama/qwen2.5-coder:1.5b` — Switches to local Ollama Qwen model.
  - `/model groq/llama-3.3-70b-versatile` — Switches to Groq Llama 3.3.

### `/login <provider> <api-key>`
Securely stores an API key for a cloud provider in OS Keychain and `~/.homogenous/keys.json` (0600 mode) for permanent, user-isolated reuse across sessions.
* **Supported Providers**: `nvidia`, `groq`, `anthropic`, `openai`, `deepseek`, `openrouter`, `mistral`, `together`.
* **Example**: `/login nvidia nvapi-...`

### `/mode [auto|plan|normal]`
Inspects or sets the global agent execution mode:
* `normal` — Prompts execute directly; all shell commands require interactive approval.
* `auto` — Non-destructive allowlisted inspection commands auto-execute; all state-modifying actions prompt for confirmation.
* `plan` — Prompts generate dry-run implementation plans requiring explicit `/apply` approval.

### `/plan [on|off|prompt]`
Toggles standing Plan Mode or generates a dry-run technical implementation plan for a prompt.

### `/apply`
Executes the approved steps in the current `implementation_plan.md`.

### `/reject`
Rejects the pending implementation plan and clears plan state.

### `/undo`
Reverts the most recent file edit performed by the agent.

### `/diff`
Displays unified line diffs for all files modified in the current session.

### `/theme [neon|cyberpunk|monokai|dracula|nord|plain]`
Switches the active TUI color scheme instantly.

### `/copy`
Copies the latest syntax-highlighted code block to your OS clipboard.

### `/cost`
Displays session token metrics (input tokens, output tokens, cached tokens, and total cost in USD).

### `/budget [limit-usd|reset]`
Inspects, resets, or sets a maximum spending budget for the current session.

### `/memory [list|add|remove|clear]`
Manages persistent project memory facts stored in `.agentmemory/facts.json`.
* **Examples**:
  - `/memory list` — Lists all stored project facts.
  - `/memory add "Use Vitest for unit testing"` — Stores a new fact.
  - `/memory remove fact-1740000000000` — Removes a specific fact.
  - `/memory clear` — Clears all persistent facts.

### `/mcp [list|reload|prompts|prompt <server> <name>]`
Inspects connected Model Context Protocol (MCP) servers, reloads configuration, or invokes prompt templates.

### `/skills [list|create|install|remove] [name/path]`
Manages dynamic skill packs in `.homogenous/skills/` (workspace) or `~/.homogenous/skills/` (global).

### `/init`
Scaffolds `.toolrc.yaml`, `.agentmemory/facts.json`, and `.homogenous/skills/` in the current workspace.

### `/session [new|stats|clear]`
Starts a fresh session, displays turn and token statistics, or clears session history.

### `/help`
Displays the full command help matrix.

### `/clear`
Clears the terminal feed history.

### `/exit`
Exits the CLI assistant cleanly.

---

## 🤖 Complete AI Model & Provider Matrix

Homogenous provides out-of-the-box support for 11 inference backends:

| Provider ID | Provider Name | Default Model | Type | Authentication / Host Setup |
| :--- | :--- | :--- | :--- | :--- |
| `ollama` | **Ollama** | `qwen2.5-coder:1.5b` | Local / Offline | `http://127.0.0.1:11434` (auto-detected) |
| `lmstudio` | **LM Studio** | Local Auto-detect | Local / Offline | `http://127.0.0.1:1234/v1` (auto-detected) |
| `groq` | **Groq** | `llama-3.3-70b-versatile` | Cloud (Free Tier) | `/login groq <KEY>` or `GROQ_API_KEY` |
| `nvidia` | **Nvidia NIM** | `llama-3.3-70b-instruct` | Cloud (Frontier) | `/login nvidia <KEY>` or `NVIDIA_API_KEY` |
| `anthropic` | **Anthropic** | `claude-3-7-sonnet-20250219` | Cloud | `/login anthropic <KEY>` or `ANTHROPIC_API_KEY` |
| `openai` | **OpenAI** | `gpt-4o` / `o3-mini` | Cloud | `/login openai <KEY>` or `OPENAI_API_KEY` |
| `deepseek` | **DeepSeek** | `deepseek-chat` / `deepseek-reasoner` | Cloud | `/login deepseek <KEY>` or `DEEPSEEK_API_KEY` |
| `openrouter` | **OpenRouter** | `anthropic/claude-3.5-sonnet` | Cloud Router | `/login openrouter <KEY>` or `OPENROUTER_API_KEY` |
| `mistral` | **Mistral AI** | `mistral-large-latest` | Cloud | `/login mistral <KEY>` or `MISTRAL_API_KEY` |
| `together` | **Together AI** | `meta-llama/Llama-3.3-70B` | Cloud | `/login together <KEY>` or `TOGETHER_API_KEY` |
| `mock` | **Demo Mode** | `demo-mode` | Offline Test | Built-in offline test provider |

---

## 🧰 Built-in Agent Tools

Homogenous equips the agent with 10 built-in core tools:

| Tool Name | Category | Purpose / Security Guardrails |
| :--- | :--- | :--- |
| `read_file` | File System | Reads file contents with line offset/limit bounds and workspace containment. |
| `write_file` | File System | Writes or overwrites files with workspace realpath containment checks. |
| `replace_file_content` | File System | Replaces exact code targets with dollar-sign preservation and diff tracking. |
| `grep_search` | Search | Searches files via ripgrep with direct argument array execution (no shell). |
| `glob_files` | Search | Matches file paths using glob patterns within workspace root. |
| `git_status` | Version Control | Inspects uncommitted changes and branch status via direct git subprocess. |
| `git_diff` | Version Control | Computes unified line diffs for modified workspace files. |
| `git_log` | Version Control | Inspects commit history with bounded commit count limits. |
| `shell_execute` | Terminal | Zero-trust execution: allowlisted read-only inspection auto-runs in auto mode; state-modifying actions prompt for approval. |
| `web_fetch` | Network | Fetches web documentation with SSRF defense, IPv4-mapped IPv6 canonicalization, and private IP blocking. |

---

## 🛡️ Zero-Trust Security & Sandboxing Architecture

Homogenous enforces a multi-layer zero-trust model to safeguard host machines:

```text
                     ┌────────────────────────────────────────┐
                     │          Homogenous CLI Agent          │
                     └───────────────────┬────────────────────┘
                                         │
     ┌───────────────────────────────────┼───────────────────────────────────┐
     ▼                                   ▼                                   ▼
┌─────────────────────────┐ ┌─────────────────────────┐ ┌─────────────────────────┐
│  Workspace Containment  │ │ Direct Argv Subprocess  │ │ Network SSRF Isolation  │
│  resolveWorkspacePath() │ │    execFileDirect()     │ │      WebFetchTool       │
└────────────┬────────────┘ └────────────┬────────────┘ └────────────┬────────────┘
             │                                   │                                   │
             ▼                                   ▼                                   ▼
 Blocks traversal (../) and   Executes tools without shell    Blocks private IPs (127/8,
  symlinks escaping root      interpolation (no injection)   10/8, ::ffff:127.0.0.1, AWS)
```

1. **Workspace Containment & Symlink Defense**:
   - `resolveWorkspacePath()` resolves lexical paths AND validates target destinations via `fs.realpathSync()`.
   - Symlinks inside the workspace pointing to sensitive files (`~/.ssh/id_rsa`, `/etc/passwd`) are strictly blocked.
   - Tilde expansion (`~`) is categorically rejected.
2. **Direct Subprocess Execution (`execFileDirect`)**:
   - Commands execute using `cross-spawn` with pre-tokenized argument vectors (`shell: false`).
   - Eliminates shell injection vulnerabilities, metacharacter bypasses (`&&`, `;`, `|`, `$()`, `` ` ``), and argument misparsing.
3. **Zero-Trust Script Protection**:
   - `npm test`, `npm run <script>`, `npx`, and config-dereferencing commands are never auto-approved, preventing `package.json` injection attacks.
4. **Network SSRF Safeguards**:
   - `WebFetchTool` canonicalizes all hostnames and DNS resolutions, extracting embedded IPv4 addresses from IPv4-mapped IPv6 formats (`::ffff:127.0.0.1`).
   - Blocks loopback, private RFC 1918 subnets, cloud instance metadata (`169.254.169.254`), and non-HTTP protocols.
5. **Structured Audit Logging**:
   - Every executed command is recorded in `.agentmemory/audit.log` (mode `0o600`) with credential and bearer token redaction.

---

## 🔌 Model Context Protocol (MCP) Integration

Homogenous is a compliant MCP client. Configure external tool servers in `.mcp.json` (workspace) or `~/.homogenous/mcp.json` (global):

```json
{
  "mcpServers": {
    "sqlite": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-sqlite", "--db-path", "./data.db"]
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_..."
      }
    }
  }
}
```

Reload or inspect MCP tools during a session:

```bash
/mcp list
/mcp reload
```

---

## 🧠 Persistent Project Memory & Context Retrieval

Homogenous maintains persistent project memory across CLI sessions in `.agentmemory/facts.json`.

### Fact Structure
```json
[
  {
    "id": "fact-1740000000000-123",
    "fact": "Project uses Vite with TypeScript and React 19",
    "category": "architecture",
    "updated_at": "2026-08-15T00:00:00.000Z",
    "updated_by": "developer"
  }
]
```

### Context Retrieval Engine
The `ContextRetriever` calculates term-frequency matches against the user's active prompt, dynamically scoring and injecting only relevant facts into system prompts while keeping prompt cache prefixes stable.

---

## 🧩 Dynamic Skill Ecosystem

Extend agent capabilities with modular markdown skill packs stored in `.homogenous/skills/` (workspace) or `~/.homogenous/skills/` (global).

### Skill Package Layout
```text
.homogenous/skills/commit-message-generator/
├── SKILL.md          # YAML frontmatter + prompt directives
└── examples.md       # Few-shot prompt references
```

### Creating a New Dynamic Skill
```bash
/skills create commit-message-generator
# or via CLI:
homogenous skills create commit-message-generator
```

---

## 🎨 Beautiful Themes & Visual Customization

Switch themes dynamically during a session with `/theme <name>`:

* **Neon** (default): High-contrast cyan, magenta, and fluorescent green.
* **Cyberpunk**: Vibrant electric yellow, deep purple, and neon cyan accents.
* **Monokai**: Classic code editor palette with warm pastels.
* **Dracula**: Deep purple, pink, and vibrant blue gothic aesthetic.
* **Nord**: Arctic blue, frosty white, and cool slate tones.
* **Plain**: Clean monochrome theme for strict POSIX/NO_COLOR terminals.

---

## ⚙️ Configuration & Customization

Homogenous supports flexible configuration hierarchies via `.toolrc.yaml` or `.toolrc.json`:

```yaml
# .toolrc.yaml
defaultProvider: anthropic
defaultModel: claude-3-7-sonnet-20250219
mode: auto

tokenBudget:
  maxSessionTokens: 200000
  warningThreshold: 0.8

security:
  strictSandbox: true
  allowlistedCommands:
    - git status
    - git diff
    - git log
    - ls
    - dir
```

---

## 📁 Repository Layout & Codebase Structure

```text
homogenous/
├── bin/
│   ├── homogenous.ts              # CLI entry point & yargs command dispatcher
│   └── homogenous.js              # Compiled production executable
├── src/
│   ├── agent/
│   │   ├── AgentLoop.ts           # Core reasoning & tool invocation loop
│   │   ├── PlanningMode.ts        # Dry-run implementation planner
│   │   ├── systemPrompt.ts        # Adaptive system prompt generator
│   │   └── tools/                 # Built-in agent tools (FS, Git, Shell, Web)
│   ├── cli/
│   │   ├── repl.tsx               # Ink React full-screen TUI runner
│   │   ├── oneshot.ts             # Non-interactive CLI prompt handler
│   │   ├── init.ts                # Workspace scaffolding helper
│   │   ├── slash/                 # Slash command registry & autocomplete
│   │   └── ui/                    # Ink TUI components (Markdown, Input, Header)
│   ├── config/
│   │   └── ConfigResolver.ts      # Multi-tier configuration loader
│   ├── inference/
│   │   ├── ProviderRegistry.ts    # 11-provider dynamic routing engine
│   │   ├── keychain.ts            # OS Keychain & in-memory credentials store
│   │   └── providers/             # Ollama, LM Studio, Groq, Anthropic, etc.
│   ├── mcp/
│   │   ├── McpClientManager.ts    # Model Context Protocol client manager
│   │   └── config.ts              # .mcp.json parser & validator
│   ├── memory/
│   │   ├── PersistentMemory.ts    # .agentmemory/facts.json storage
│   │   ├── SessionMemory.ts       # Active session message store
│   │   └── ContextRetriever.ts    # TF-IDF term frequency fact ranker
│   ├── platform/
│   │   └── shell.ts               # Direct subprocess execution (execFileDirect)
│   ├── skills/
│   │   ├── SkillRegistry.ts       # Dynamic skill pack loader
│   │   └── SkillInstaller.ts      # Dynamic skill pack installer
│   └── token-budget/
│       └── BudgetLedger.ts        # Live token cost & budget tracker
└── test/
    └── unit/                      # 26 unit test suites (84 test cases)
```

---

## 🧪 Testing & Quality Assurance Suite

Homogenous is protected by 26 comprehensive unit test suites covering 84 discrete assertions:

```bash
npm test
```

### Test Suite Highlights:
- **Autocomplete & Typing Ergonomics**: Fuzzy matching, dynamic `@file` autocompletion, 0ms Keychain cache lookup.
- **Embedded Tool Call Parsing**: Validates XML, JSON, Groq inline function calls, and markdown codeblocks.
- **Security Hardening**: Tests path traversal blocks, symlink escapes, SSRF defenses, and shell tokenization.
- **Markdown & Table Wrapping**: Validates multiline table cell wrapping, code highlight caching, and stream flushing.
- **Provider Parity**: Confirms uniform tool-calling behavior across Anthropic, OpenAI, Groq, and Ollama.

---

## 🔧 Troubleshooting & FAQ

### 1. How do I use Ollama models offline?
Ensure Ollama is running (`ollama serve`). Homogenous automatically detects `http://127.0.0.1:11434` and discovers your installed models. Type `/model` in the REPL to select any installed model.

### 2. Where are my API keys stored?
API keys added via `/login <provider> <key>` are stored in your OS Keychain (via keytar) or in `~/.homogenous/keys.json` with user-only permissions (`0600`).

### 3. How do I enable auto-approval for safe commands?
Type `/mode auto` in the REPL or start Homogenous with the auto flag. Read-only inspection commands (`git status`, `ls`, `grep`) will run automatically, while destructive edits always require your approval.

---

## 📄 License

Homogenous is open-source software licensed under the [MIT License](LICENSE).

Developed with ✦ by **CODExGAMERZ**.
