# ✦ HOMOGENOUS (v3.5.0)
### The Local-First, Zero-Overhead Agentic CLI Coding Assistant

[![Version: 3.5.0](https://img.shields.io/badge/Version-3.5.0-00F0FF.svg?style=for-the-badge)](package.json)
[![License: MIT](https://img.shields.io/badge/License-MIT-39FF14.svg?style=for-the-badge)](LICENSE)
[![TypeScript 5.0+](https://img.shields.io/badge/TypeScript-5.0+-3178C6.svg?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js 20+](https://img.shields.io/badge/Node.js-20+-339933.svg?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Tests: 56 Passed](https://img.shields.io/badge/Tests-56%20Passed-39FF14.svg?style=for-the-badge)](test/)
[![Security Hardened](https://img.shields.io/badge/Security-Hardened%20Sandbox-FF2ED1.svg?style=for-the-badge)](README.md#-comprehensive-security-architecture)

```text
 ██╗  ██╗ ██████╗ ███╗   ███╗ ██████╗  ██████╗ ███████╗███╗   ██╗ ██████╗ ██╗   ██╗███████╗
 ██║  ██║██╔═══██╗████╗ ████║██╔═══██╗██╔════╝ ██╔════╝████╗  ██║██╔═══██╗██║   ██║██╔════╝
 ███████║██║   ██║██╔████╔██║██║   ██║██║  ███╗█████╗  ██╔██╗ ██║██║   ██║██║   ██║███████╗
 ██╔══██║██║   ██║██║╚██╔╝██║██║   ██║██║   ██║██╔══╝  ██║╚██╗██║██║   ██║██║   ██║╚════██║
 ██║  ██║╚██████╔╝██║ ╚═╝ ██║╚██████╔╝╚██████╔╝███████╗██║ ╚████║╚██████╔╝╚██████╔╝███████║
 ╚═╝  ╚═╝ ╚═════╝ ╚═╝     ╚═╝ ╚═════╝  ╚═════╝ ╚══════╝╚═╝  ╚═══╝ ╚═════╝  ╚═════╝ ╚══════╝
                     ✦ LOCAL-FIRST AGENTIC CODING ASSISTANT ✦
```

**Homogenous** is an enterprise-grade, local-first, zero-overhead agentic CLI coding assistant built from the ground up with TypeScript, Node.js, and React Ink. Designed for privacy-conscious developers and terminal power users, Homogenous gives you complete control over your AI backends — unifying offline local inference engines (Ollama, LM Studio) with 9 frontier cloud providers, Model Context Protocol (MCP) tool integrations, dynamic skill extensions, persistent project memory, live token cost accounting, and hardened security sandboxing.

---

## 📋 Table of Contents

- [✦ Executive Summary \& Design Philosophy](#-executive-summary--design-philosophy)
- [🌟 What's New in Version 3.5.0](#-whats-new-in-version-350)
- [⚡ Architectural Feature Breakdown](#-architectural-feature-breakdown)
- [📦 Complete Installation Guide](#-complete-installation-guide)
- [🚀 Execution Modes \& Command Line Options](#-execution-modes--command-line-options)
- [⌨️ Interactive TUI Navigation \& Shortcuts](#️-interactive-tui-navigation--shortcuts)
- [🛠️ Deep-Dive Slash Commands Reference](#️-deep-dive-slash-commands-reference)
- [🤖 Complete AI Model \& Provider Matrix](#-complete-ai-model--provider-matrix)
- [🛡️ Security Sandboxing Architecture](#️-security-sandboxing-architecture)
- [🔌 Model Context Protocol (MCP) Integration](#-model-context-protocol-mcp-integration)
- [🧠 Persistent Project Memory \& Retrieval](#-persistent-project-memory--retrieval)
- [🧩 Dynamic Skill System](#-dynamic-skill-system)
- [📁 Repository Layout \& Codebase Structure](#-repository-layout--codebase-structure)
- [🧪 Testing \& Quality Assurance Suite](#-testing--quality-assurance-suite)
- [🔧 Troubleshooting \& FAQ](#-troubleshooting--faq)
- [📄 License](#-license)

---

## ✦ Executive Summary & Design Philosophy

Homogenous is built around four fundamental engineering principles:

1. **Local-First & Offline Resilience**: Local AI inference should be a first-class citizen. Homogenous connects natively to local servers (**Ollama**, **LM Studio**) without requiring cloud API keys or telemetry.
2. **Terminal-Native Visual Excellence**: Terminal interfaces do not need to look plain. Using Ink (React for CLI), Homogenous renders syntax-highlighted code blocks, token-aware cell line wrapping in Markdown tables, and clear visual indicators.
3. **Scrollback Preservation**: AI streaming should never lock terminal scrollback buffers. Completed paragraphs flush to stdout, leaving dynamic re-renders tiny so keyboard/mouse scrolling remains 100% functional.
4. **Hardened Security Sandboxing**: Agent execution must be contained. Homogenous enforces strict workspace path containment, executes subcommands directly without shell interpolation (`execFileDirect`), and blocks SSRF targets.

---

## 🌟 What's New in Version 3.5.0

Version 3.5.0 introduces major enhancements across terminal UI rendering, model URL sanitization, and local code block parsing:

* 🌐 **Robust Ollama URL Sanitization**: Automatically normalizes host URLs in `OllamaProvider` (handling missing schemes, mapping `0.0.0.0` bind addresses to `127.0.0.1`, stripping trailing API paths, and enforcing fallback ports).
* 📝 **Indented & Unclosed Code Block Detection**: Parses fenced code blocks (` ```python `) from local LLMs regardless of list indentation or streaming state.
* 🧩 **Code Block Consolidation**: Automatically merges fragmented code blocks and filters out empty fence artifacts (` ``` ` ` ``` `).
* 📊 **Token-Aware Terminal Table Engine**: Renders GFM pipe tables and raw ASCII box tables with proportional column width budgeting and ANSI-safe monospace padding.
* 📜 **Uninterrupted Terminal Scrollback**: Flushes completed response paragraphs directly to terminal `stdout`, keeping dynamic TUI re-render height minimal so scrollback remains active.
* ✦ **Single-Turn Assistant Header Deduplication**: Ensures the `✦ Assistant` banner appears strictly once per response turn instead of repeating per streamed chunk.

---

## ⚡ Architectural Feature Breakdown

### 1. Multi-Provider Local & Cloud Inference Engine
Seamlessly switch between local offline servers and 9 frontier cloud providers. The provider registry dynamically inspects local endpoints (`127.0.0.1:11434` for Ollama, `127.0.0.1:1234` for LM Studio) and manages credentials stored in `~/.homogenous/config.json`.

### 2. Model Context Protocol (MCP) Integration Engine
Connect to standard MCP servers configured via `.mcp.json` or `~/.homogenous/mcp.json`. Homogenous acts as an MCP client, exposing server tools, prompts, and resources directly to the agent.

### 3. Plan & Apply Execution Engine
Safely review complex multi-file modifications before execution. In Planning Mode (`/plan` or `Ctrl+P`), the agent inspects the workspace, generates an `implementation_plan.md`, and waits for explicit user approval before executing edits (`/apply`).

### 4. Interactive Diff & State Rollback
Homogenous tracks all file modifications in a session-level diff engine. Use `/diff` or `Ctrl+D` to review uncommitted file edits, or `/undo` or `Ctrl+U` to instantly revert file changes.

### 5. Term-Frequency Memory & Context Retrieval
Stores persistent project facts in `.agentmemory` with automated term-frequency ranking (`ContextRetriever`). The memory engine injects relevant project context into system prompts while keeping prompt size compact.

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
# Output: 3.5.0
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

Install from the pre-built, zero-dependency production tarball:

```bash
npm install -g codexgamerz-homogenous-3.5.0.tgz
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
3. Run tests & link binary:
   ```bash
   npm test
   npm link
   ```

---

## 🚀 Execution Modes & Command Line Options

Homogenous supports three execution modes:

### 1. Interactive TUI REPL Mode
Launch the full-screen interactive REPL in any repository:

```bash
homogenous
```

### 2. Fast Oneshot Prompt Execution
Run a single non-interactive task directly from the terminal:

```bash
homogenous oneshot "Analyze package.json and summarize main dependencies"
```

### 3. Sub-Command Utility Execution
Execute memory and skill management tasks directly from the CLI:

```bash
# Manage persistent project memory
homogenous memory list
homogenous memory add "Use pnpm for package management"

# Manage agent skills
homogenous skills list
homogenous skills install commit-message-generator
```

---

## ⌨️ Interactive TUI Navigation & Shortcuts

When running in interactive REPL mode, use keyboard shortcuts for quick control:

| Shortcut | Command Equivalent | Description / Action |
| :--- | :--- | :--- |
| `Ctrl + P` | `/plan` | Toggle **Planning Mode** (generates plan before file edits) |
| `Ctrl + U` | `/undo` | Revert the last file modification step |
| `Ctrl + D` | `/diff` | Display session diff of uncommitted file edits |
| `Ctrl + O` or `Ctrl + M` | `/model` | Open interactive AI model & provider picker |
| `Ctrl + A` | `/auto` | Toggle **Auto-Approve** mode for tool execution |
| `Ctrl + L` | `/clear` | Clear conversation feed history |
| `Esc` | `/exit` | Exit the Homogenous session |

---

## 🛠️ Deep-Dive Slash Commands Reference

All slash commands can be typed directly into the REPL prompt:

### `/model [provider/model-name]`
Inspect active provider status or switch models.
* **Examples**:
  - `/model` — Opens the interactive selection menu.
  - `/model 1` — Selects model option `#1`.
  - `/model ollama/qwen2.5-coder:1.5b` — Switches to local Ollama Qwen model.
  - `/model groq/llama-3.3-70b-versatile` — Switches to Groq Llama 3.3.

### `/plan`
Enables Planning Mode. The agent will draft a structured plan in `implementation_plan.md` instead of making direct file changes.

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
Displays session token metrics (input tokens, output tokens, total cost in USD).

### `/memory [list|add|remove]`
Manages persistent project memory facts stored in `.agentmemory`.
* **Examples**:
  - `/memory list` — Lists all stored project facts.
  - `/memory add "Use Jest for testing"` — Stores a new fact.
  - `/memory remove 1` — Removes fact `#1`.

### `/mcp [list|reload]`
Inspects connected Model Context Protocol (MCP) servers and tools.

### `/skills [list|install]`
Inspects or installs dynamic agent skill packages (`.homogenous/skills/`).

### `/mode [auto|plan|normal]`
Sets the global agent execution mode.

### `/clear`
Clears the terminal feed history.

### `/exit`
Exits the CLI assistant.

---

## 🤖 Complete AI Model & Provider Matrix

Homogenous provides out-of-the-box support for 11 inference backends:

| Provider ID | Provider Name | Default Model | Type | Authentication Setup |
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

## 🛡️ Security Sandboxing Architecture

Homogenous enforces strict sandboxing to protect host environments:

```text
                     ┌────────────────────────────────────────┐
                     │          Homogenous CLI Agent          │
                     └───────────────────┬────────────────────┘
                                         │
                   ┌─────────────────────┴─────────────────────┐
                   ▼                                           ▼
      ┌─────────────────────────┐                 ┌─────────────────────────┐
      │  Workspace Containment  │                 │ Direct Argv Subprocess  │
      │  resolveWorkspacePath() │                 │     execFileDirect()    │
      └────────────┬────────────┘                 └────────────┬────────────┘
                   │                                           │
                   ▼                                           ▼
      Blocks path traversal escaping              Executes tools without shell
       workspace root (../../etc)                   interpolation (no injection)
```

1. **Workspace Path Containment**: `resolveWorkspacePath()` resolves real paths and validates that all file operations remain strictly inside the active workspace directory.
2. **Direct Subprocess Execution**: Shell tools use `execFileDirect()` with `--` option terminators, executing commands directly without passing raw strings to `/bin/sh` or `cmd.exe`.
3. **Command Sanitization**: `isSafeCommand()` validates commands against regex patterns, blocking chained operators (`&&`, `;`, `|`), backticks, and subshells.
4. **Network SSRF Safeguards**: `WebFetchTool` validates input URLs, blocking private IP ranges (`127.0.0.1`, `10.0.0.0/8`, `192.168.0.0/16`, `169.254.169.254`), non-HTTP protocols, and short-form decimal/hex IPs.

---

## 🔌 Model Context Protocol (MCP) Integration

Homogenous connects to standard MCP servers. Configure servers in `.mcp.json` in your workspace root or globally in `~/.homogenous/mcp.json`:

```json
{
  "mcpServers": {
    "sqlite": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-sqlite", "--db-path", "./data.db"]
    }
  }
}
```

Inspect active MCP tools using `/mcp`:

```bash
/mcp list
```

---

## 🧠 Persistent Project Memory & Retrieval

Homogenous maintains persistent project memory across CLI sessions in `.agentmemory`.

### Memory Format (`.agentmemory`)
```json
[
  {
    "id": "fact-1",
    "fact": "Project uses Vite with TypeScript and React 18",
    "timestamp": 1740000000000
  }
]
```

The `MemoryRetriever` ranks facts using term frequency against the user's prompt, injecting relevant facts into system context while discarding irrelevant data.

---

## 🧩 Dynamic Skill System

Extend agent behavior with markdown skill packs stored in `.homogenous/skills/` (workspace) or `~/.homogenous/skills/` (global).

### Skill Package Structure
```text
.homogenous/skills/commit-message-generator/
└── SKILL.md
```

### `SKILL.md` Specification
```markdown
---
name: commit-message-generator
description: Formats conventional git commit messages based on git diff
keywords: commit, git, conventional
---

When generating commit messages, follow Conventional Commits specification:
- feat: new feature
- fix: bug fix
- docs: documentation changes
```

---

## 📁 Repository Layout & Codebase Structure

```text
CLI Tool/
├── bin/
│   └── homogenous.ts               # CLI Entry Point & Yargs Command Router
├── src/
│   ├── agent/                      # Agent Loop, System Prompt & Core Tools
│   │   ├── AgentLoop.ts            # Tool Execution & Streaming Agent Loop
│   │   ├── systemPrompt.ts         # Dynamic System Prompt Generator
│   │   └── tools/                  # File, Search, Shell & Web Tools
│   ├── cli/                        # Ink TUI, REPL & Slash Commands
│   │   ├── index.ts                # Main CLI Execution Router
│   │   ├── repl.ts                 # Full-Screen Interactive TUI REPL
│   │   ├── slash/                  # Slash Command Registry & Handlers
│   │   └── ui/                     # React Ink UI Components (App, MarkdownText, Header)
│   ├── config/                     # Configuration Resolver & Schemas
│   ├── inference/                  # Provider Clients (Ollama, Anthropic, OpenAI, etc.)
│   ├── mcp/                        # Model Context Protocol Client Manager
│   ├── memory/                     # Persistent Project Memory & Session State
│   ├── platform/                   # Shell Execution, Git Helpers & Path Utils
│   ├── skills/                     # Skill Loader & Registry
│   ├── token-budget/               # Context Compactor, Cost Ledger & Diff Engine
│   └── utils/                      # Code Block Store & Shared Helpers
├── test/                           # Test Suite (56 Unit & Integration Tests)
├── install.ps1                     # Automated Windows PowerShell Installer
├── install.sh                      # Automated macOS / Linux Bash Installer
├── package.json                    # Project Manifest (v3.5.0)
└── README.md                       # Comprehensive Documentation
```

---

## 🧪 Testing & Quality Assurance Suite

Homogenous maintains a comprehensive test suite covering tools, parsers, security sandboxes, and provider integrations:

```bash
# Run full unit test suite (56 tests)
npm test

# Run typescript compilation build
npm run build

# Perform type checking
npm run typecheck
```

### Test Inventory Highlights
- `markdown_renderer.test.ts` — Tests table parsing, token wrapping, ANSI stripping, and indented code block detection.
- `ollama_provider.test.ts` — Tests `normalizeOllamaHost()` URL scheme, bind address mapping, and port fallbacks.
- `security_hardening.test.ts` — Tests workspace containment, shell injection prevention, and SSRF blocking.
- `agent_loop.test.ts` — Tests tool calling loop, plan mode enforcement, and streaming callbacks.

---

## 🔧 Troubleshooting & FAQ

### 1. Error: `Failed to parse URL from 0.0.0.0/api/chat`
* **Cause**: `OLLAMA_HOST` was configured without an `http://` scheme or used `0.0.0.0`.
* **Solution**: Upgrade to Homogenous **v3.5.0**, which automatically normalizes `0.0.0.0` to `http://127.0.0.1:11434`.

### 2. Table Column Borders Misaligned on Colored Text
* **Cause**: ANSI color escape codes bloated string length calculations in terminal text nodes.
* **Solution**: Homogenous v3.5.0 uses `stripAnsi()` prior to monospace column budgeting, locking table cell borders into fixed alignment.

### 3. Terminal Scrollback Locked During Streaming
* **Cause**: High-frequency dynamic component re-renders reset terminal scrollback cursor.
* **Solution**: Homogenous v3.5.0 flushes completed paragraphs directly to terminal stdout, keeping the active re-render region to 1-2 lines.

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.
