# ✦ HOMOGENOUS (v3.9.0)
### The Enterprise-Grade, Local-First, Zero-Overhead Agentic CLI Coding Assistant

[![Version: 3.9.0](https://img.shields.io/badge/Version-3.9.0-00F0FF.svg?style=for-the-badge)](package.json)
[![License: MIT](https://img.shields.io/badge/License-MIT-39FF14.svg?style=for-the-badge)](LICENSE)
[![TypeScript 5.0+](https://img.shields.io/badge/TypeScript-5.0+-3178C6.svg?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js 20+](https://img.shields.io/badge/Node.js-20+-339933.svg?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Tests: 80 Passed](https://img.shields.io/badge/Tests-80%20Passed-39FF14.svg?style=for-the-badge)](test/)
[![Zero-Trust Security](https://img.shields.io/badge/Security-Zero--Trust%20Sandbox-FF2ED1.svg?style=for-the-badge)](README.md#-comprehensive-security-architecture)

```text
 ██╗  ██╗ ██████╗ ███╗   ███╗ ██████╗  ██████╗ ███████╗███╗   ██╗ ██████╗ ██╗   ██╗███████╗
 ██║  ██║██╔═══██╗████╗ ████║██╔═══██╗██╔════╝ ██╔════╝████╗  ██║██╔═══██╗██║   ██║██╔════╝
 ███████║██║   ██║██╔████╔██║██║   ██║██║  ███╗█████╗  ██╔██╗ ██║██║   ██║██║   ██║███████╗
 ██╔══██║██║   ██║██║╚██╔╝██║██║   ██║██║   ██║██╔══╝  ██║╚██╗██║██║   ██║██║   ██║╚════██║
 ██║  ██║╚██████╔╝██║ ╚═╝ ██║╚██████╔╝╚██████╔╝███████╗██║ ╚████║╚██████╔╝╚██████╔╝███████║
 ╚═╝  ╚═╝ ╚═════╝ ╚═╝     ╚═╝ ╚═════╝  ╚═════╝ ╚══════╝╚═╝  ╚═══╝ ╚═════╝  ╚═════╝ ╚══════╝
                     ✦ LOCAL-FIRST AGENTIC CODING ASSISTANT ✦
```

**Homogenous** is an enterprise-grade, local-first, zero-overhead agentic CLI coding assistant built from the ground up with TypeScript, Node.js, and React Ink. Designed for privacy-conscious developers and terminal power users, Homogenous gives you complete control over your AI backends — unifying offline local inference engines (**Ollama**, **LM Studio**) with 9 frontier cloud providers, Model Context Protocol (MCP) tool integrations, dynamic skill extensions, persistent project memory, live token cost accounting, and zero-trust security sandboxing.

---

## 📋 Table of Contents

- [✦ Executive Summary \& Design Philosophy](#-executive-summary--design-philosophy)
- [🌟 What's New in Version 3.9.0](#-whats-new-in-version-390)
- [⚡ Architectural Feature Breakdown](#-architectural-feature-breakdown)
- [📦 Complete Installation Guide](#-complete-installation-guide)
- [🚀 Execution Modes \& Command Line Options](#-execution-modes--command-line-options)
- [⌨️ Interactive TUI Navigation \& Shortcuts](#️-interactive-tui-navigation--shortcuts)
- [🛠️ Deep-Dive Slash Commands Reference](#️-deep-dive-slash-commands-reference)
- [🤖 Complete AI Model \& Provider Matrix](#-complete-ai-model--provider-matrix)
- [🧰 Built-in Agent Tools](#-built-in-agent-tools)
- [🛡️ Zero-Trust Security \& Sandboxing Architecture](#️-zero-trust-security--sandboxing-architecture)
- [🔌 Model Context Protocol (MCP) Integration](#-model-context-protocol-mcp-integration)
- [🧠 Persistent Project Memory \& Retrieval](#-persistent-project-memory--retrieval)
- [🧩 Dynamic Skill Ecosystem](#-dynamic-skill-ecosystem)
- [⚙️ Configuration \& Customization](#️-configuration--customization)
- [📁 Repository Layout \& Codebase Structure](#-repository-layout--codebase-structure)
- [🧪 Testing \& Quality Assurance Suite](#-testing--quality-assurance-suite)
- [🔧 Troubleshooting \& FAQ](#-troubleshooting--faq)
- [📄 License](#-license)

---

## ✦ Executive Summary & Design Philosophy

Homogenous is built around four fundamental engineering principles:

1. **Local-First & Offline Resilience**: Local AI inference is a first-class citizen. Homogenous connects natively to local servers (**Ollama**, **LM Studio**) without requiring cloud API keys, network access, or telemetry.
2. **Terminal-Native Visual Excellence**: Built with React Ink, Homogenous renders syntax-highlighted code blocks, token-aware cell line wrapping in Markdown tables, and clear visual indicators across dark and light terminal themes.
3. **Scrollback Preservation**: AI streaming never locks terminal scrollback buffers. Completed paragraphs flush directly to `stdout`, keeping dynamic TUI re-render height minimal (1–2 lines) so mouse and keyboard scrolling remain 100% responsive.
4. **Zero-Trust Security Sandboxing**: Agent execution is strictly contained. Homogenous enforces realpath symlink containment, executes subcommands directly without shell interpolation (`execFileDirect`), blocks SSRF targets, and gates all state-modifying actions behind explicit user approval.

---

## 🌟 What's New in Version 3.9.0

Version 3.9.0 introduces universal multi-format tool call parsing across all providers, Groq/Llama 3 inline function parsing, 30 FPS frame-throttled terminal streaming, adaptive TPM token budgeting, and state-tracked autocomplete cycling:

* 🌐 **Universal Tool Call Parser**: Intercepts and executes function calls across all formats:
  * **Groq / Llama 3 Inline**: `<function/write_file({...})>` and `<function:write_file({...})>`
  * **Anthropic XML**: `<invoke name="write_file"><parameter name="path">...</parameter></invoke>`
  * **OpenAI / Ollama XML**: `<tool_call>{...}</tool_call>` and `<function_call>{...}</function_call>`
  * **Markdown JSON Codeblocks**: ` ```json {"name": "write_file", ...} ``` `
  * **Balanced JSON Extraction**: Extracts JSON function blocks embedded in conversational paragraphs.
* 🚀 **30 FPS Frame-Throttled Streaming & Memoization**: Batches streaming token deltas at ~30 FPS (35ms frame window) with AST memoization, eliminating terminal redraw storms, lag, and cursor stutter when moving, scrolling, or resizing the terminal window during code generation.
* ⚡ **Adaptive TPM & Token Budgeting**: Automatically handles provider token-per-minute (TPM) caps and HTTP 413 errors by dynamically budgeting `max_tokens` and executing seamless backoff retries.
* 🎯 **Authoritative Autonomous Directives**: Enforces that coding prompts ("create index.html", "write a game") always invoke `write_file` or `replace_file_content` directly rather than outputting raw chat text.
* ⚡ **Intelligent Multi-Phase Autocomplete Engine**: Full autocomplete support across command names, subcommands (`/mode auto`, `/memory list`, `/skills create`, `/mcp reload`), providers (`/login nvidia`, `/login groq`), and active models, with interactive `Tab` / `Shift + Tab` cycling and active item indicators (`❯`).
* 📋 **Full Multi-Line Input & Paste Engine**: Native support for pasting multi-line prompts directly from the clipboard without premature execution, plus `Shift + Enter` and `Ctrl + J` manual multi-line editing and full cursor navigation (`Home`, `End`, arrows).
* 📊 **Table Cell Wrapping & Inline Code Stability**: Refined cell line wrapping for inline code spans with adjacent punctuation, eliminating orphaned character wrapping and locking table border alignments.
* 🛡️ **Zero-Trust Shell Execution & `execFileDirect`**: By default, all commands prompt for user approval. Under explicit Auto-Approve opt-in, only strict allowlisted read-only operations run automatically without shell interpolation.
* ⚡ **Node-Native File Inspection**: `cat`, `type`, `head`, `tail`, `ls`, and `dir` execute Node-natively with symlink realpath containment, completely removing shell invocation overhead and cross-platform quirks.
* 🔒 **Zero-Trust Script Defense**: `npm test`, `npm run`, `npx`, and config-dereferencing commands always prompt for confirmation to prevent `package.json` injection attacks.
* 🌐 **IPv4-Mapped IPv6 SSRF Protection**: Canonicalizes and validates embedded IPv4 addresses (`::ffff:127.0.0.1`) against private and cloud metadata address ranges.
* 🧩 **Complete Dynamic Skill Lifecycle**: Full scaffolding, regex name validation (`/^[a-zA-Z0-9_-]+$/`), and skill uninstallation via `/skills remove <name>` and `homogenous skills remove <name>`.
* 🧠 **Persistent Memory & MCP Expansion**: Added `/mode [auto|plan|normal]`, `/memory clear`, and `/mcp reload` support across both slash commands and CLI entry points.
* ✦ **Single-Turn Assistant Header Deduplication**: Ensures the `✦ Assistant` banner appears strictly once per response turn instead of repeating per streamed chunk.

---

## ⚡ Architectural Feature Breakdown

### 1. Multi-Provider Local & Cloud Inference Engine
Seamlessly switch between local offline servers and 9 frontier cloud providers. The provider registry dynamically inspects local endpoints (`127.0.0.1:11434` for Ollama, `127.0.0.1:1234` for LM Studio) and manages credentials stored securely in `~/.homogenous/config.json`.

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
# Output: 3.9.0
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

### Option C: Production Package Tarball

Install from the pre-built production tarball:

```bash
npm install -g codexgamerz-homogenous-3.9.0.tgz
```

---

### Option D: Building from Source

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
   npm link
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
homogenous skills install commit-message-generator
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
| `Ctrl + U` | `/undo` | Revert the last file modification step |
| `Ctrl + D` | `/diff` | Display unified session diff of uncommitted file edits |
| `Ctrl + O` or `Ctrl + M` | `/model` | Open interactive AI model picker (sorted by parameter size) |
| `Ctrl + A` | `/auto` | Toggle **Auto-Approve** mode for allowlisted inspection tools |
| `Ctrl + L` | `/clear` | Clear conversation feed history |
| `Home` or `Ctrl + A` | — | Jump cursor to start of line or prompt |
| `End` or `Ctrl + E` | — | Jump cursor to end of line or prompt |
| `Left / Right Arrows` | — | Navigate cursor character by character |
| `Up / Down Arrows` | — | Navigate lines in multi-line prompt |
| `Tab` | — | Cycle forward through slash command and subcommand autocomplete suggestions |
| `Shift + Tab` | — | Cycle backward through autocomplete suggestions |
| `Shift + Enter` or `Ctrl + J` | — | Insert a new line in the prompt bar (multi-line editing) |
| `Enter` | — | Submit current prompt to the assistant |
| `Esc` | `/exit` | Exit the Homogenous session |

---

## 🛠️ Deep-Dive Slash Commands Reference

All slash commands can be typed directly into the REPL prompt:

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

### `/copy`
Copies the latest syntax-highlighted code block to your OS clipboard.

### `/cost`
Displays session token metrics (input tokens, output tokens, cached tokens, and total cost in USD).

### `/budget [limit-usd]`
Inspects or sets a maximum spending budget for the current session.

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

### `/session [new|stats]`
Starts a fresh session or displays current turn and token statistics.

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
| `groq` | **Groq** | `gpt-oss-120b` | Cloud (Free Tier) | `/login groq <KEY>` or `GROQ_API_KEY` |
| `nvidia` | **Nvidia NIM** | `llama-3.3-70b-instruct` | Cloud (Frontier) | `/login nvidia <KEY>` or `NVIDIA_API_KEY` |
| `anthropic` | **Anthropic** | `claude-3-5-sonnet-20241022` | Cloud | `/login anthropic <KEY>` or `ANTHROPIC_API_KEY` |
| `openai` | **OpenAI** | `gpt-4o` | Cloud | `/login openai <KEY>` or `OPENAI_API_KEY` |
| `deepseek` | **DeepSeek** | `deepseek-chat` | Cloud | `/login deepseek <KEY>` or `DEEPSEEK_API_KEY` |
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

## 🧠 Persistent Project Memory & Retrieval

Homogenous maintains persistent project memory across CLI sessions in `.agentmemory/facts.json`.

### Fact Structure
```json
[
  {
    "id": "fact-1740000000000-123",
    "fact": "Project uses Vite with TypeScript and React 18",
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
└── SKILL.md
```

### `SKILL.md` Specification
```markdown
---
name: commit-message-generator
description: Formats conventional git commit messages based on git diff working directory status.
version: 1.0.0
triggers:
  keywords: [commit message, git commit, generate commit]
---

When generating commit messages, adhere to the Conventional Commits specification:
- feat: A new feature
- fix: A bug fix
- docs: Documentation changes
- refactor: Code change that neither fixes a bug nor adds a feature
```

### Skill Management Commands
```bash
# Scaffold a new skill
homogenous skills create my-custom-skill

# List installed skills
homogenous skills list

# Remove a skill
homogenous skills remove my-custom-skill
```

---

## ⚙️ Configuration & Customization

Homogenous supports workspace-level configuration via `.toolrc.yaml` and global configuration via `~/.homogenous/config.json`:

### Workspace Configuration (`.toolrc.yaml`)
```yaml
# Provider & Model defaults
provider: ollama
model: qwen2.5-coder:1.5b

# Token budget & agent limits
max_turns: 20
session_budget_usd: 1.50

# UI Theme: neon | monochrome
theme: neon
```

---

## 📁 Repository Layout & Codebase Structure

```text
CLI Tool/
├── bin/
│   └── homogenous.ts               # CLI Entry Point & Yargs Command Router
├── src/
│   ├── agent/                      # Agent Loop, System Prompt & Core Tools
│   │   ├── AgentLoop.ts            # Tool Calling Loop & Streaming Orchestration
│   │   ├── ExecutionMode.ts        # Execution Mode Definitions (Normal, Auto, Plan)
│   │   ├── PlanningMode.ts         # Plan Parser & Implementation Plan Generator
│   │   ├── SubAgent.ts             # Delegated Sub-Agent Task Executor
│   │   ├── systemPrompt.ts         # Dynamic System Prompt Generator
│   │   └── tools/                  # Core Tool Implementations (File, Search, Shell, Web)
│   ├── cli/                        # Ink TUI, REPL & Slash Commands
│   │   ├── init.ts                 # Project Initializer Logic
│   │   ├── oneshot.ts              # Single Prompt Execution Handler
│   │   ├── repl.tsx                # Full-Screen Interactive TUI REPL
│   │   ├── slash/                  # Slash Command Registry & Built-in Commands
│   │   └── ui/                     # React Ink UI Components (App, MarkdownText, Header)
│   ├── config/                     # Configuration Resolver & Zod Schemas
│   ├── inference/                  # Multi-Provider Clients (Ollama, Anthropic, OpenAI, etc.)
│   ├── mcp/                        # Model Context Protocol Client Manager & Resource Cache
│   ├── memory/                     # Persistent Project Memory & Session State
│   ├── platform/                   # Shell Execution, Git Helpers & Path Utils
│   ├── skills/                     # Skill Loader, Scaffolder & Registry
│   ├── token-budget/               # Context Compactor, Cost Ledger & Diff Engine
│   └── utils/                      # Code Block Store & Monospace Text Helpers
├── test/                           # Comprehensive Test Suite (73 Unit & Integration Tests)
├── skills/                         # Bundled Skill Packs (commit-message-generator, etc.)
├── install.ps1                     # Automated Windows PowerShell Installer
├── install.sh                      # Automated macOS / Linux Bash Installer
├── package.json                    # Project Manifest (v3.9.0)
├── tsconfig.json                   # TypeScript Compiler Configuration
└── README.md                       # Project Documentation
```

---

## 🧪 Testing & Quality Assurance Suite

Homogenous maintains an automated test suite covering tools, parsers, security sandboxes, and provider integrations:

```bash
# Run full unit test suite (80 tests)
npm test

# Run typescript compilation build
npm run build

# Perform type checking
npm run typecheck
```

### Test Inventory Highlights
- `agent_embedded_tool_exec.test.ts` — Tests automatic text tool call parsing and end-to-end file writing in AgentLoop.
- `text_tool_calls.test.ts` — Tests extraction of JSON parameters, Groq/Llama 3 inline `<function/...>`, fenced markdown blocks, and `<tool_call>` XML tags.
- `shell_tokenizer.test.ts` — Tests shell tokenization, argument vectors, quoted strings, and local binary resolution.
- `full_functionality.test.ts` — Tests slash commands (`/mode`, `/memory`, `/mcp reload`, `/skills remove`), and audit logging.
- `security_hardening.test.ts` — Tests workspace containment, symlink escape prevention, tilde rejection, zero-trust script defense, and IPv4-mapped IPv6 SSRF blocking.
- `markdown_renderer.test.ts` — Tests table parsing, token wrapping, ANSI stripping, and indented code block detection.
- `ollama_provider.test.ts` — Tests `normalizeOllamaHost()` URL scheme, bind address mapping, and port fallbacks.
- `agent_loop.test.ts` — Tests tool calling loop, plan mode enforcement, and streaming callbacks.

---

## 🔧 Troubleshooting & FAQ

### 1. Error: `Failed to parse URL from 0.0.0.0/api/chat`
* **Cause**: `OLLAMA_HOST` was configured without an `http://` scheme or used `0.0.0.0`.
* **Solution**: Upgrade to Homogenous **v3.9.0**, which automatically normalizes `0.0.0.0` to `http://127.0.0.1:11434`.

### 2. Table Column Borders Misaligned on Colored Text
* **Cause**: ANSI color escape codes bloated string length calculations in terminal text nodes.
* **Solution**: Homogenous v3.9.0 uses `stripAnsi()` prior to monospace column budgeting, locking table cell borders into fixed alignment.

### 3. Terminal Scrollback Locked During Streaming
* **Cause**: High-frequency dynamic component re-renders reset terminal scrollback cursor.
* **Solution**: Homogenous v3.9.0 flushes completed paragraphs directly to terminal stdout, keeping the active re-render region to 1-2 lines.

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.
