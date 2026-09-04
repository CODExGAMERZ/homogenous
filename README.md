# ✦ HOMOGENOUS (v4.3.0)

### The Enterprise-Grade, Local-First, Zero-Overhead Agentic CLI Coding Assistant

[![NPM Version](https://img.shields.io/npm/v/@codexgamerz/homogenous?style=for-the-badge&logo=npm&color=CB3837)](https://www.npmjs.com/package/@codexgamerz/homogenous)
[![License: MIT](https://img.shields.io/badge/LICENSE-MIT-39FF14?style=for-the-badge)](LICENSE)
[![TypeScript 5.0+](https://img.shields.io/badge/TYPESCRIPT-5.0+-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js 20+](https://img.shields.io/badge/NODE.JS-20+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Tests: 116 Passed](https://img.shields.io/badge/TESTS-116%20PASSED-39FF14?style=for-the-badge)](test/)
[![Security: Zero-Trust Sandbox](https://img.shields.io/badge/SECURITY-ZERO--TRUST%20SANDBOX-FF007F?style=for-the-badge)](https://github.com/CODExGAMERZ/homogenous)

```text
  ██╗  ██╗ ██████╗ ███╗   ███╗██████╗  ██████╗ ███████╗███╗   ██╗██████╗ ██╗  ██╗███████╗
  ██║  ██║██╔═══██╗████╗ ████║██╔═══██╗██╔════╝██╔════╝████╗  ██║██╔═══██╗██║  ██║██╔════╝
  ███████║██║   ██║██╔████╔██║██║   ██║██║  ███╗█████╗  ██╔██╗ ██║██║   ██║██║  ██║███████╗
  ██╔══██║██║   ██║██║╚██╔╝██║██║   ██║██║   ██║██╔══╝  ██║╚██╗██║██║   ██║██║  ██║╚════██║
  ██║  ██║╚██████╔╝██║ ╚═╝ ██║╚██████╔╝╚██████╔╝███████╗██║ ╚████║╚██████╔╝╚█████╔╝███████║
  ╚═╝  ╚═╝ ╚═════╝ ╚═╝     ╚═╝ ╚═════╝  ╚═════╝ ╚══════╝╚═╝  ╚═══╝ ╚═════╝  ╚════╝ ╚══════╝
                        ✦ LOCAL-FIRST AGENTIC CODING ASSISTANT ✦
```

**Homogenous** is an enterprise-grade, local-first, zero-overhead agentic CLI coding assistant built from the ground up with TypeScript, Node.js, and React Ink. Designed for privacy-conscious developers and terminal power users, Homogenous gives you complete control over your AI backends — unifying offline local inference engines (**Ollama**, **LM Studio**) with 9 frontier cloud providers, Model Context Protocol (MCP) tool integrations, sub-agent delegation, dynamic skill extensions, persistent project memory, live token cost accounting, silky-smooth 60 FPS streaming, and zero-trust security sandboxing.

---

## 📋 Table of Contents

1. [✦ Executive Summary & Design Philosophy](#-executive-summary--design-philosophy)
2. [🏗️ End-to-End System Architecture](#️-end-to-end-system-architecture)
3. [🛡️ Enterprise Zero-Leak Security Vault](#️-enterprise-zero-leak-security-vault)
4. [🧠 11 Multi-Provider Inference Engines](#-11-multi-provider-inference-engines)
5. [🛠️ 11 Autonomous Core Tools + Sub-Agent Delegation + MCP](#️-11-autonomous-core-tools--sub-agent-delegation--mcp)
6. [🤖 Sub-Agent Delegation Engine](#-sub-agent-delegation-engine)
7. [🩺 System Diagnostics & Health (`/doctor`)](#-system-diagnostics--health-doctor)
8. [🎨 Dynamic 6-Theme Palette Engine (`/theme`)](#-dynamic-6-theme-palette-engine-theme)
9. [🔌 Real MCP Prompts & Resources Engine](#-real-mcp-prompts--resources-engine)
10. [💾 Persistent Project Memory & Dynamic Skills](#-persistent-project-memory--dynamic-skills)
11. [💰 Token Budget Management & Accounting (`/budget`)](#-token-budget-management--accounting-budget)
12. [⚡ Non-Interactive Oneshot Agent Mode](#-non-interactive-oneshot-agent-mode)
13. [🔄 Dual Execution & Interactive Plan Modes](#-dual-execution--interactive-plan-modes)
14. [⌨️ Keyboard Shortcuts Reference](#️-keyboard-shortcuts-reference)
15. [📜 Complete Slash Commands Manual](#-complete-slash-commands-manual)
16. [⚙️ Configuration Reference (`.toolrc.yaml` & `.mcp.json`)](#️-configuration-reference-toolrcyaml--mcpjson)
17. [📦 Installation & Setup Guide](#-installation--setup-guide)
18. [📁 Codebase Directory Structure](#-codebase-directory-structure)
19. [💻 Programmatic API & SDK Usage](#-programmatic-api--sdk-usage)
20. [🧪 Test Suite & Verification (116 Tests)](#-test-suite--verification-116-tests)
21. [📄 License](#-license)

---

## ✦ Executive Summary & Design Philosophy

**Homogenous** is designed for engineers who demand total workspace agency, extreme responsiveness, multi-model flexibility, and enterprise security.

Unlike cloud-dependent extensions or heavy web wrappers, Homogenous runs **directly inside your local terminal**, interfacing with your local file system, git repository, shell, and custom tools.

```
 ╭────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
 │ ✦ HOMOGENOUS AGENT v4.3.0 (Local-First Assistant)                                     workspace: /projects/core [main] │
 │ model: nvidia/deepseek-ai/deepseek-r1 [671B]                               session: 1.4k tok | $0.002 | 14 loc / 0 cld │
 ╰────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
  ✦ Ctrl+P:Plan | Ctrl+U:Undo | Ctrl+D:Diff | Ctrl+O:Model | Ctrl+A:Auto | Ctrl+L:Clear | Esc:Exit
 ╭────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
 │ homogenous > @src/auth/jwt.ts fix expiration timestamp race condition and add unit tests                               │
 ╰────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
```

### Core Tenets:
1. **Local-First & Zero-Trust**: Your source code stays on your machine. File operations, git diffs, shell runs, and search indexing happen locally with strict workspace containment and symlink protections.
2. **Bring Your Own Key (BYOK) & True Permanence**: Connect any cloud provider (`nvidia`, `groq`, `anthropic`, `openai`, `deepseek`, `mistral`, `together`, `openrouter`) or air-gapped local server (`ollama`, `lmstudio`). Keys remain active indefinitely until explicitly unregistered.
3. **Zero-Leak Security**: Credentials stored at rest are encrypted with machine-bound **AES-256-GCM** encryption (`0600` permissions) and synchronized with OS Keychains. Third-party MCP servers are isolated and never receive parent API keys.
4. **Full Autonomous Agency**: When given a prompt, Homogenous inspects files, edits code, runs builds, test suites, handles errors, and iterates until the feature is complete.

---

## 🏗️ End-to-End System Architecture

```
                                  ┌──────────────────────────────────────────────┐
                                  │            USER TERMINAL (CLI REPL)          │
                                  └──────────────────────────────────────────────┘
                                                          │
                             ┌────────────────────────────┴────────────────────────────┐
                             ▼                                                         ▼
            ┌──────────────────────────────────┐                      ┌──────────────────────────────────┐
            │   REACTIVE 60 FPS INK FRONTEND   │                      │    AUTOCOMPLETE SUGGESTION BOX   │
            │  • Live Markdown Table Parsing   │                      │  • 671B->1B Parameter Sorting    │
            │  • Real-time Streaming Words     │                      │  • Active-Credential Filtering   │
            │  • Dynamic 6-Theme Palettes      │                      │  • Non-Blocking Cursor Cycling   │
            └──────────────────────────────────┘                      └──────────────────────────────────┘
                             │                                                         │
                             └────────────────────────────┬────────────────────────────┘
                                                          ▼
                                          ┌───────────────────────────────┐
                                          │      SLASH COMMAND ROUTER     │
                                          │  • /doctor, /theme, /budget   │
                                          │  • /mcp, /memory, /skills     │
                                          │  • /login, /logout, /model    │
                                          └───────────────────────────────┘
                                                          │
                                                          ▼
                                          ┌───────────────────────────────┐
                                          │     AUTONOMOUS AGENT LOOP     │
                                          │  • Persistent Memory Prefix   │
                                          │  • Word-by-Word Delta Stream  │
                                          │  • Tool Result Aggregation    │
                                          │  • Token Budget Compactor     │
                                          └───────────────────────────────┘
                                            │             │             │
                    ┌───────────────────────┘             │             └───────────────────────────┐
                    ▼                                     ▼                                         ▼
   ┌──────────────────────────────────┐  ┌──────────────────────────────────┐  ┌──────────────────────────────────┐
   │       11 WORKSPACE TOOLS         │  │     SUB-AGENT DELEGATION         │  │     MODEL CONTEXT PROTOCOL       │
   │  • read_file, write_file         │  │  • Bounded Turn Execution        │  │  • Stdio Transport Isolation    │
   │  • replace_file_content          │  │  • Recursive Loop Prevention     │  │  • Tool, Prompt & Resource API │
   │  • grep_search, glob_files       │  │  • Output Stream Isolation       │  │  • In-Memory ResourceCache      │
   │  • git_status, git_diff, git_log │  └──────────────────────────────────┘  └──────────────────────────────────┘
   │  • shell_execute, web_fetch      │
   └──────────────────────────────────┘
                    │                                     │                                         │
                    └─────────────────────────────────────┼─────────────────────────────────────────┘
                                                          ▼
                                          ┌───────────────────────────────┐
                                          │    11 INFERENCE PROVIDERS     │
                                          │  • Offline: Ollama, LM Studio │
                                          │  • Cloud: Anthropic, OpenAI,  │
                                          │    NVIDIA, Groq, DeepSeek,    │
                                          │    Mistral, Together, Router  │
                                          └───────────────────────────────┘
```

---

## 🛡️ Enterprise Zero-Leak Security Vault

Homogenous features an enterprise-grade zero-trust security architecture:

1. **Hardware-Bound AES-256-GCM Vault**:
   - API keys are encrypted at rest in `~/.homogenous/keys.json` using AES-256-GCM authenticated encryption.
   - The key is derived uniquely per machine using a combination of hostname, username, and OS machine seed.
2. **OS Keychain Synchronization**:
   - Keys are automatically synchronized with the native OS Keychain (macOS Keychain, Windows Credential Manager, Linux Secret Service).
3. **Child Process Environment Sanitization**:
   - When spawning shell commands or third-party MCP servers, Homogenous scrubs all API keys and authorization tokens from the inherited environment variables.
4. **Zero Plaintext In-Terminal Exposure**:
   - Prompts containing `/login` have their secrets redacted in history (`●●●●●●●●`).
   - `/doctor` displays credential presence only (`[Configured ✓]`), never exposing keys.
5. **SSRF & Network Shield**:
   - The `web_fetch` tool validates IP resolution, blocking loopback (`127.0.0.1`), link-local (`169.254.169.254`), private RFC1918 subnets, IPv4-mapped IPv6, and cloud metadata endpoints.
6. **Workspace Containment**:
   - File tools enforce directory boundary checks, blocking path traversal (`../`) and unauthorized access outside the workspace root.

---

## 🧠 11 Multi-Provider Inference Engines

Homogenous unifies local offline LLMs and frontier cloud APIs behind a single normalized interface:

| Provider | Type | Typical Latency | Supported Models |
| :--- | :--- | :--- | :--- |
| **Ollama** | Offline Local | 5–20 ms TTFT | `llama3.3`, `qwen2.5-coder`, `deepseek-r1:14b`, `codellama`, etc. |
| **LM Studio** | Offline Local | 5–20 ms TTFT | Any GGUF model loaded in LM Studio on `localhost:1234` |
| **NVIDIA NIM** | Cloud API | ~180 ms TTFT | `deepseek-ai/deepseek-r1` (671B), `meta/llama-3.3-70b-instruct` |
| **Groq** | Cloud API | ~80 ms TTFT | `llama-3.3-70b-versatile`, `mixtral-8x7b-32768` |
| **Anthropic** | Cloud API | ~350 ms TTFT | `claude-3-7-sonnet-20250219`, `claude-3-5-haiku-20241022` |
| **OpenAI** | Cloud API | ~250 ms TTFT | `gpt-4o`, `gpt-4o-mini`, `o1`, `o3-mini` |
| **DeepSeek** | Cloud API | ~220 ms TTFT | `deepseek-chat`, `deepseek-reasoner` |
| **OpenRouter** | Cloud API | ~300 ms TTFT | Aggregated access to 200+ frontier & open models |
| **Mistral AI** | Cloud API | ~200 ms TTFT | `mistral-large-latest`, `codestral-latest` |
| **Together AI**| Cloud API | ~150 ms TTFT | `meta-llama/Llama-3.3-70B-Instruct-Turbo`, `Qwen/Qwen2.5-Coder-32B` |
| **Mock** | In-Memory | 1 ms | Deterministic test mock provider for headless CI/CD |

---

## 🛠️ 11 Autonomous Core Tools + Sub-Agent Delegation + MCP

Homogenous comes equipped with 11 native workspace tools:

| Tool Name | Scope | Description |
| :--- | :--- | :--- |
| `read_file` | Local FS | Read complete or line-range slices of files with middle elision on long outputs. |
| `write_file` | Local FS | Atomically create new files or perform full file rewrites. |
| `replace_file_content` | Local FS | Perform exact string replacements preserving line structure and special symbols (`$`). |
| `list_dir` | Local FS | Recursively list directory trees, file sizes, and directory entry counts. |
| `glob_files` | Local FS | Fast pattern search using wildcards (e.g., `src/**/*.ts`, `*.json`). |
| `grep_search` | Local FS | High-speed regex or literal content search (native `rg` or JavaScript fallback). |
| `git_status` | Version Control | Inspect working tree dirty state, staged changes, and untracked files. |
| `git_diff` | Version Control | Review staged or unstaged diffs with file snapshot rollback support. |
| `git_log` | Version Control | Inspect recent commit history, author metadata, and commit hashes. |
| `shell_execute` | Sandbox | Run terminal commands, test runners, and build scripts with zero-trust checks. |
| `web_fetch` | Network | Fetch external documentation and web pages with SSRF prevention and HTML-to-text conversion. |
| `delegate_task` | Agent Engine | Spawn an isolated sub-agent with bounded turns to perform deep research or triage. |

---

## 🤖 Sub-Agent Delegation Engine

The `delegate_task` tool allows the primary agent to spawn focused, autonomous sub-agents for isolated tasks without cluttering the main conversation window.

### Key Capabilities:
- **Bounded Execution**: Sub-agents operate with an explicit `maxTurns` limit (default: 8), preventing runaway API spend.
- **Recursion Guard (`disableSubAgent: true`)**: Child agents are structurally prohibited from calling `delegate_task`, guaranteeing zero infinite delegation loops.
- **TUI Output Isolation**: When running inside the interactive Ink terminal, sub-agents execute in silent mode to prevent raw stdout from corrupting the raw-mode terminal display.
- **Automated Summarization**: Sub-agents distill their multi-turn exploration and return a concise summary report to the parent agent.

```bash
# Example agent prompt that invokes sub-agent delegation:
homogenous > "Audit all dependencies in package.json for known vulnerabilities and report findings"
```

---

## 🩺 System Diagnostics & Health (`/doctor`)

The `/doctor` command performs an instant, comprehensive health check across your entire development environment:

```bash
/doctor
```

```text
🩺 Homogenous System Diagnostics & Environment Health Report
────────────────────────────────────────────────────────────
• Node.js Runtime:     v20.18.0 [✓ OK]
• Operating System:    win32 (Windows_NT 10.0.26100, x64)
• Terminal / TTY:      Interactive TTY (140x35)
• Workspace Path:      C:/Users/codex/Music/CLI Tool
• Git Repository:      Branch 'main' (0 uncommitted changes)
• Fast Search (rg):    Native binary available (ripgrep 14.1.0)
• GPU / VRAM:          NVIDIA GPU Active (4.2GB / 12.0GB VRAM used)
• Local Ollama:        Online at http://localhost:11434 (8 models loaded)
• Local LM Studio:     Online at http://localhost:1234 (2 models loaded)
• Cloud Providers:     anthropic [Configured ✓], groq [Configured ✓]
• MCP Configuration:   2 server(s) configured (filesystem, github)
• Project Memory:      4 stored fact(s) in .agentmemory/facts.json
────────────────────────────────────────────────────────────
Diagnostics complete. System is healthy.
```

### Probes Evaluated:
1. **Node.js Engine**: Verifies version `>= 20.0.0`.
2. **Git Repository**: Inspects active branch, repo root, and uncommitted changes.
3. **Ripgrep (`rg`)**: Detects native binary presence vs JS fallback.
4. **GPU / VRAM Probe**: Probes NVIDIA GPU VRAM via non-blocking `getVramInfo()` (or CPU mode).
5. **Local LLM Daemons**: Non-blocking ping (600ms timeout) to Ollama and LM Studio.
6. **Keychain Vault**: Audits configured provider credentials with complete key redaction.
7. **MCP Configuration**: Parses `.mcp.json` and verifies active servers.
8. **Persistent Memory**: Verifies `.agentmemory/facts.json` fact counts.

---

## 🎨 Dynamic 6-Theme Palette Engine (`/theme`)

Homogenous includes 6 hand-crafted terminal color palettes designed for maximum legibility and rich aesthetics:

| Theme ID | Primary Color | Secondary Color | Aesthetic Vibe |
| :--- | :--- | :--- | :--- |
| `neon` | `#00F0FF` (Cyan) | `#FF2ED1` (Magenta) | Cyberpunk high-contrast neon (Default) |
| `cyberpunk` | `#FFE600` (Yellow) | `#00E5FF` (Cyan) | Electric industrial cyber aesthetic |
| `dracula` | `#BD93F9` (Purple) | `#FF79C6` (Pink) | Classic dark gothic palette with green accents |
| `nord` | `#88C0D0` (Frost) | `#81A1C1` (Blue) | Arctic frost and calm slate tones |
| `monokai` | `#66D9EF` (Cyan) | `#F92672` (Rose) | Classic warm code editor theme |
| `plain` | `cyan` | `magenta` | Standard 16-color ANSI terminal fallback |

### Usage:
```bash
/theme                                      # List available themes and show active palette
/theme dracula                              # Instantly switch to Dracula theme
/theme nord                                 # Switch to Nord theme
/theme cyberpunk                            # Switch to Cyberpunk theme
```

> [!NOTE]
> **Strict `NO_COLOR` Compliance**: When `NO_COLOR` is set in your environment or when running in non-TTY pipelines, Homogenous automatically forces the `plain` monochrome theme, adhering strictly to the [NO_COLOR standard](https://no-color.org).

---

## 🔌 Real MCP Prompts & Resources Engine

Homogenous integrates with the **Model Context Protocol (MCP)**, supporting Tools, Prompts, and Resources:

```bash
/mcp list                                   # View connected MCP servers and active tools
/mcp reload                                 # Reconnect transports and discover newly added tools
/mcp prompts                                # List all prompt templates exposed by connected servers
/mcp prompt <server> <prompt-name> [k=v]    # Invoke an MCP prompt template into conversation
/mcp resources                              # Browse available MCP resources
```

### In-Memory Resource Cache (`ResourceCache`)
When resources are read via MCP, they are cached in memory with automatic TTL expiration, middle-elided for token limits, and recorded in the token budget ledger.

---

## 💾 Persistent Project Memory & Dynamic Skills

### 1. Persistent Memory Injection
Unlike traditional CLI tools where context is lost between sessions, Homogenous maintains `.agentmemory/facts.json` per project.

These facts are **automatically injected into the system prompt prefix** at runtime:
```bash
/memory list                                # View all saved facts for this repository
/memory add "Project uses ESM imports only" # Save architectural fact
/memory remove <id>                         # Remove specific fact
/memory clear                               # Clear all project memory
```

### 2. Dynamic Skills System
Modular skill packs extend the agent's capabilities with specialized domain prompts and tools:
```bash
/skills list                                # View installed and bundled skills
/skills install <path-or-repo>              # Install a custom skill pack
/skills create <name>                       # Scaffold a new custom skill
/skills remove <name>                       # Uninstall a skill pack
```

---

## 💰 Token Budget Management & Accounting (`/budget`)

Track every token and dollar spent with millisecond precision:

```bash
/cost                                       # Quick one-line spend summary
/budget                                     # View session utilization meter
/budget --report                            # Detailed breakdown (input, output, cache hits, calls)
/budget set 10.00                           # Set session spending ceiling to $10.00 USD
/budget reset                               # Clear records and reset spend counters to $0.00
```

---

## ⚡ Non-Interactive Oneshot Agent Mode

Automate builds, refactors, and investigations in CI/CD pipelines or shell scripts without launching the interactive Ink TUI:

```bash
# 1. Simple streaming completion:
homogenous oneshot "Explain the difference between interface and type in TypeScript"

# 2. Autonomous Agent Execution (with tools, edits, and tests):
homogenous oneshot "Run test suite and fix any failing assertions" --agent

# 3. Model Override with Agent Mode:
homogenous oneshot "Analyze codebase dependencies and output a summary table" -m anthropic/claude-3-5-haiku-20241022 -a
```

---

## 🔄 Dual Execution & Interactive Plan Modes

Homogenous provides two execution flows depending on task complexity:

### 1. Direct Execution Mode (Normal / Auto)
- Prompts execute immediately.
- In **Normal Mode**, shell executions and destructive operations require explicit user approval.
- In **Auto Mode** (`/auto` or `Ctrl+A`), allowlisted workspace tools execute autonomously.

### 2. Interactive Planning Mode (`/plan` or `Ctrl+P`)
- The agent formulates a structured step-by-step implementation plan.
- The plan outlines affected files, components, and actions (`[NEW]`, `[MODIFY]`, `[DELETE]`).
- Execute steps interactively using `/apply` or abandon with `/plan off`.
- Any file edit can be instantly undone using `/undo` or `Ctrl+U`.

---

## ⌨️ Keyboard Shortcuts Reference

| Shortcut | Action | Description |
| :--- | :--- | :--- |
| `Ctrl+P` | `/plan` | Toggle interactive Planning Mode on/off |
| `Ctrl+U` | `/undo` | Roll back the most recent file edit snapshot |
| `Ctrl+D` | `/diff` | Display colorized git diff of all session changes |
| `Ctrl+O` | `/model` | Open dynamic model picker |
| `Ctrl+A` | `/auto` | Toggle autonomous auto-approval mode |
| `Ctrl+L` | `/clear` | Clear terminal conversation feed |
| `Tab` / `Shift+Tab` | Cycling | Cycle forward/backward through autocomplete suggestions |
| `Esc` | `/exit` | Exit the CLI session cleanly |

---

## 📜 Complete Slash Commands Manual

| Command | Category | Usage | Description |
| :--- | :--- | :--- | :--- |
| `/doctor` | Utility | `/doctor` | Run full system environment and provider health diagnostics |
| `/theme` | Config | `/theme [name]` | View or switch terminal theme (`neon`, `cyberpunk`, `dracula`, `nord`, `monokai`, `plain`) |
| `/budget` | Session | `/budget [set <amt> \| reset \| --report]` | Manage token spending limits, view breakdown, or reset counters |
| `/cost` | Session | `/cost` | Print token budget ledger breakdown and cost accounting |
| `/mcp` | Config | `/mcp [list \| reload \| prompts \| prompt <s\> <p\> \| resources]` | Manage MCP servers, tools, prompt templates, and resources |
| `/model` | Model | `/model [provider/model-id]` | Switch active inference model or list available models |
| `/login` | Auth | `/login <provider> <key>` | Securely store provider API key in encrypted keychain vault |
| `/logout` | Auth | `/logout <provider>` | Remove stored credentials for a provider |
| `/plan` | Mode | `/plan [prompt]` | Formulate a multi-step structured implementation plan |
| `/apply` | Mode | `/apply [all \| step#]` | Execute planned steps interactively |
| `/undo` | Edit | `/undo` | Revert the last file modification made by the agent |
| `/diff` | Edit | `/diff` | Show colorized diff of unstaged/staged workspace edits |
| `/memory` | Memory | `/memory [list \| add <text> \| remove <id> \| clear]` | Manage persistent project memory facts |
| `/skills` | Utility | `/skills [list \| install <src> \| create <name> \| remove <name>]` | Manage dynamic skills packs |
| `/mode` | Mode | `/mode [normal \| auto \| plan]` | Switch agent execution mode |
| `/copy` | Utility | `/copy [index]` | Copy the latest generated code block to the OS clipboard |
| `/clear` | Session | `/clear` | Clear terminal display feed |
| `/help` | Utility | `/help` | Display interactive command manual |
| `/exit` | Session | `/exit` | Exit Homogenous session |

---

## ⚙️ Configuration Reference (`.toolrc.yaml` & `.mcp.json`)

### `.toolrc.yaml`
Place in your workspace root or `~/.homogenous/.toolrc.yaml` for global defaults:

```yaml
# Homogenous Global Configuration
mode: normal # normal | auto | plan
theme: neon  # neon | cyberpunk | dracula | nord | monokai | plain

# Token Budget Limits
maxSessionCostUSD: 5.00

# Task-Based Model Routing
routing:
  fastSearch: groq/llama-3.3-70b-versatile
  complexEdit: anthropic/claude-3-7-sonnet-20250219
  planning: anthropic/claude-3-7-sonnet-20250219
  quickQuestion: groq/llama-3.3-70b-versatile
  codeReview: anthropic/claude-3-7-sonnet-20250219

# Security & Sandboxing
security:
  allowShellExecution: true
  autoApproveSafeCommands: false
  blockedCommands:
    - rm -rf /
    - mkfs
    - dd
```

### `.mcp.json`
Configure Model Context Protocol servers in your workspace root:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "./docs"]
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_xxxxxxxxxxxx"
      }
    }
  }
}
```

---

## 📦 Installation & Setup Guide

### Option 1: Global NPM Install (Recommended)
```bash
npm install -g @codexgamerz/homogenous
```

### Option 2: Automated One-Line Installers
**macOS / Linux**:
```bash
curl -fsSL https://raw.githubusercontent.com/CODExGAMERZ/homogenous/main/install.sh | bash
```

**Windows (PowerShell)**:
```powershell
irm https://raw.githubusercontent.com/CODExGAMERZ/homogenous/main/install.ps1 | iex
```

### Option 3: From Source
```bash
git clone https://github.com/CODExGAMERZ/homogenous.git
cd homogenous
npm install
npm run build
npm link
```

---

## 📁 Codebase Directory Structure

```text
.
├── bin/
│   └── homogenous.ts               # CLI Entrypoint (REPL & Oneshot CLI router)
├── src/
│   ├── index.ts                    # Public Programmatic SDK Exports
│   ├── agent/                      # Autonomous Agent Execution Engine
│   │   ├── AgentLoop.ts            # Multi-Turn Agent Loop & Delta Streaming
│   │   ├── SubAgent.ts             # Isolated Sub-Agent Execution Engine
│   │   ├── PlanningMode.ts         # Plan Formulation, Parsing & Step Execution
│   │   ├── systemPrompt.ts         # Base System Prompt & Persistent Memory Injection
│   │   └── tools/                  # 11 Native Workspace Tools
│   │       ├── BaseTool.ts         # Base Tool Abstract Class & Zod Validation
│   │       ├── fileTools.ts        # read_file, write_file, replace_file_content, list_dir
│   │       ├── gitTools.ts         # git_status, git_diff, git_log
│   │       ├── searchTools.ts      # grep_search, glob_files
│   │       ├── shellTool.ts        # shell_execute (Zero-Trust Sandbox)
│   │       ├── webTools.ts         # web_fetch (SSRF Protection & HTML Parser)
│   │       └── subAgentTool.ts     # delegate_task (Sub-Agent Delegation)
│   ├── cli/                        # Interactive Terminal Frontend
│   │   ├── oneshot.ts              # Non-Interactive Oneshot Runner (--agent support)
│   │   ├── slash/                  # Slash Command Subsystem
│   │   │   ├── SlashCommandRegistry.ts
│   │   │   ├── AutocompleteEngine.ts
│   │   │   └── builtin/            # Built-in Slash Commands (/doctor, /theme, etc.)
│   │   └── ui/                     # React Ink Terminal User Interface
│   │       ├── App.tsx             # Main TUI Container & Dynamic Theme State
│   │       ├── themes/             # 6-Theme Palette Engine & Context
│   │       │   ├── ThemeDefinition.ts
│   │       │   ├── ThemeContext.tsx
│   │       │   ├── neon.ts
│   │       │   └── themes.ts
│   │       └── MarkdownText.tsx    # 60 FPS Tokenized Markdown & Table Renderer
│   ├── config/                     # Configuration Schemas & .toolrc.yaml Resolver
│   ├── inference/                  # 11 Multi-Provider Inference Drivers & Keychain
│   ├── mcp/                        # Model Context Protocol Client & ResourceCache
│   ├── memory/                     # Session & Persistent Memory (.agentmemory/facts.json)
│   ├── platform/                   # Shell Tokenizer, Paths, and VRAM Prober
│   ├── skills/                     # Modular Dynamic Skills Engine
│   └── token-budget/               # Cost Ledger, Token Counter, and DiffEngine
├── test/
│   └── unit/                       # 116 Automated Unit Tests Across 35 Test Suites
├── install.ps1                     # Automated Windows PowerShell Installer
├── install.sh                      # Automated macOS / Linux Bash Installer
├── package.json                    # Package Manifest (v4.3.0)
└── README.md                       # Comprehensive Documentation
```

---

## 💻 Programmatic API & SDK Usage

You can import `@codexgamerz/homogenous` directly into your Node.js / TypeScript projects:

```typescript
import {
  AgentLoop,
  ProviderRegistry,
  KeychainService,
  PersistentMemory,
  SubAgent,
} from "@codexgamerz/homogenous";

// 1. Resolve Provider
const registry = ProviderRegistry.getInstance();
const provider = registry.getProvider("anthropic");

// 2. Add Persistent Project Fact
const memory = PersistentMemory.getInstance();
memory.addFact("Always use strict TypeScript types without 'any'", "convention");

// 3. Instantiate Autonomous Agent Loop
const agent = new AgentLoop({
  provider: provider!,
  model: "claude-3-7-sonnet-20250219",
  autoApprove: true,
  workspaceRoot: process.cwd(),
});

// 4. Execute prompt with streaming deltas
const finalResponse = await agent.run(
  [{ role: "user", content: "Inspect src/index.ts and add missing docstrings" }],
  (delta) => process.stdout.write(delta)
);

console.log("\nFinished:", finalResponse);
```

---

## 🧪 Test Suite & Verification (116 Tests)

Homogenous is built with strict test-driven guarantees. Every layer of the system is covered by automated unit tests:

```bash
# Run the complete test suite (116 passing tests)
npm test

# Run strict TypeScript typechecking
npm run typecheck

# Build production bundle
npm run build
```

```text
✔ WebFetchTool returns tool description and executes input schema
✔ WebFetchTool blocks SSRF targets and invalid protocols
✔ Zero-Key Invisibility: getActiveModels returns no cloud models when no keys exist
✔ Autocomplete Zero-Key Invisibility: /model suggestions are empty when no keys exist
✔ Slash Command /model displays zero-key guidance and /login instructions
✔ Dynamic /login and /logout lifecycle invalidates caches
✔ Slash Command /mode: switches between normal, auto, and plan modes
✔ Slash Command /memory: supports list, add, remove, and clear aliases
✔ Slash Command /mcp: supports /mcp reload
✔ ShellExecuteTool: executes allowlisted commands under autoApprove
✔ KeychainService resolves API keys for all providers via ConfigResolver
✔ McpConfigResolver parses .mcp.json correctly
✔ PersistentMemory adds, lists, and removes facts with metadata
✔ Slash /doctor reports system diagnostics and daemon health
✔ Theme Suite: all 6 themes are registered and have full color token definitions
✔ Theme Suite: getActiveTheme resolves by ID but respects NO_COLOR strictly
✔ Theme Suite: /theme slash command manages active themes
✔ Budget Management: BudgetLedger reset clears records and counters
✔ Budget Management: /budget set and /budget reset slash commands
✔ DelegateTaskTool: validates tool definition and schema
✔ DelegateTaskTool: recursion guard prevents delegate_task inside sub-agents
✔ MCP Prompts & Resources: McpClientManager exposes methods
✔ MCP ResourceCache: caches content and retrieves correctly
...
ℹ tests 116
ℹ pass 116
ℹ fail 0
```

---

## 📄 License

Homogenous CLI is open-source software licensed under the [MIT License](LICENSE).

---

<p align="center">
  <b>✦ HOMOGENOUS CLI v4.3.0 — Code Faster. Deploy Safer. Local First. ✦</b>
</p>
