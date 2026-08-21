# ✦ HOMOGENOUS (v4.1.0)

### The Enterprise-Grade, Local-First, Zero-Overhead Agentic CLI Coding Assistant

[![NPM Version](https://img.shields.io/npm/v/@codexgamerz/homogenous?style=for-the-badge&logo=npm&color=CB3837)](https://www.npmjs.com/package/@codexgamerz/homogenous)
[![License: MIT](https://img.shields.io/badge/LICENSE-MIT-39FF14?style=for-the-badge)](LICENSE)
[![TypeScript 5.0+](https://img.shields.io/badge/TYPESCRIPT-5.0+-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js 20+](https://img.shields.io/badge/NODE.JS-20+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Tests: 92 Passed](https://img.shields.io/badge/TESTS-92%20PASSED-39FF14?style=for-the-badge)](test/)
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

**Homogenous** is an enterprise-grade, local-first, zero-overhead agentic CLI coding assistant built from the ground up with TypeScript, Node.js, and React Ink. Designed for privacy-conscious developers and terminal power users, Homogenous gives you complete control over your AI backends — unifying offline local inference engines (**Ollama**, **LM Studio**) with 9 frontier cloud providers, Model Context Protocol (MCP) tool integrations, dynamic skill extensions, persistent project memory, live token cost accounting, silky-smooth 60 FPS streaming, and zero-trust security sandboxing.

---

## 📋 Table of Contents

1. [✦ Executive Summary & Design Philosophy](#-executive-summary--design-philosophy)
2. [🏗️ End-to-End System Architecture](#️-end-to-end-system-architecture)
3. [🛡️ Enterprise Zero-Leak Security Vault](#️-enterprise-zero-leak-security-vault)
4. [🧠 11 Multi-Provider Inference Engines](#-11-multi-provider-inference-engines)
5. [🛠️ 10 Autonomous Core Tools + MCP](#️-10-autonomous-core-tools--mcp)
6. [🔄 Dual Execution & Interactive Plan Modes](#-dual-execution--interactive-plan-modes)
7. [⚡ Reactive 60 FPS Terminal UI & Ergonomics](#-reactive-60-fps-terminal-ui--ergonomics)
8. [💾 Persistent Memory & Dynamic Skills](#-persistent-memory--dynamic-skills)
9. [💰 Budgeting, Cost Ledger & Token Compaction](#-budgeting-cost-ledger--token-compaction)
10. [📦 Installation & Setup Guide](#-installation--setup-guide)
11. [🚀 Quickstart & Workflow Walkthrough](#-quickstart--workflow-walkthrough)
12. [⌨️ Keyboard Shortcuts Reference](#️-keyboard-shortcuts-reference)
13. [📜 Complete Slash Commands Manual](#-complete-slash-commands-manual)
14. [⚙️ Configuration Reference (`.toolrc.yaml` & `.mcp.json`)](#️-configuration-reference-toolrcyaml--mcpjson)
15. [📁 Codebase Directory Structure](#-codebase-directory-structure)
16. [💻 Programmatic API & SDK Usage](#-programmatic-api--sdk-usage)
17. [🧪 Test Suite & Verification](#-test-suite--verification)
18. [📄 License](#-license)

---

## ✦ Executive Summary & Design Philosophy

**Homogenous** is an autonomous CLI coding assistant designed for engineers who demand total workspace agency, extreme responsiveness, multi-model flexibility, and enterprise security.

Unlike cloud-dependent extensions or heavy web wrappers, Homogenous runs **directly inside your local terminal**, interfacing with your local file system, git repository, shell, and custom tools.

```
 ╭────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
 │ ✦ HOMOGENOUS AGENT v4.1.0 (Local-First Assistant)                                     workspace: /projects/core [main] │
 │ model: nvidia/deepseek-ai/deepseek-r1 [671B]                               session: 1.4k tok | $0.002 | 14 loc / 0 cld │
 ╰────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
  ✦ Ctrl+P:Plan | Ctrl+U:Undo | Ctrl+D:Diff | Ctrl+O:Model | Ctrl+A:Auto | Ctrl+L:Clear | Esc:Exit
 ╭────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
 │ homogenous > @src/auth/jwt.ts fix expiration timestamp race condition and add unit tests                               │
 ╰────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
```

### Core Tenets:
1. **Local-First & Zero-Trust**: Your source code stays on your machine. File reads, writes, searches, and diff calculations happen locally with strict workspace containment and symlink protections.
2. **Bring Your Own Key (BYOK) & True Permanence**: Connect any cloud provider (`nvidia`, `groq`, `anthropic`, `openai`, `deepseek`, `mistral`, `together`, `openrouter`) or air-gapped local server (`ollama`, `lmstudio`). Keys remain active indefinitely until explicitly unregistered.
3. **Zero-Leak Security**: Credentials stored at rest are encrypted with machine-bound **AES-256-GCM** encryption (`0600` permissions) and synchronized with OS Keychains. Third-party MCP servers are isolated and never receive parent API keys.
4. **Full Autonomous Agency**: When given a prompt, Homogenous does not just output suggestions—it inspects files, edits code, runs type checks and test suites, handles errors, and iterates until the feature is complete.

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
            │  • Live Markdown Parsing         │                      │  • 671B->1B Parameter Sorting    │
            │  • Real-time Streaming Words     │                      │  • Active-Credential Filtering   │
            │  • Mono Table Alignment          │                      │  • Non-Blocking Cursor Movement  │
            └──────────────────────────────────┘                      └──────────────────────────────────┘
                             │                                                         │
                             └────────────────────────────┬────────────────────────────┘
                                                          ▼
                                          ┌───────────────────────────────┐
                                          │      SLASH COMMAND ROUTER     │
                                          │  • /login, /logout, /model    │
                                          │  • /plan, /apply, /undo, /diff│
                                          └───────────────────────────────┘
                                                          │
                                                          ▼
                                          ┌───────────────────────────────┐
                                          │     AUTONOMOUS AGENT LOOP     │
                                          │  • Multi-Turn Reasoning       │
                                          │  • Tool Call Dispatcher       │
                                          │  • Context Compaction         │
                                          └───────────────────────────────┘
                                                          │
                ┌─────────────────────────────────────────┼─────────────────────────────────────────┐
                ▼                                         ▼                                         ▼
┌───────────────────────────────┐         ┌───────────────────────────────┐         ┌───────────────────────────────┐
│     10 WORKSPACE AGENT TOOLS  │         │   11 INFERENCE PROVIDERS      │         │   ZERO-LEAK SECURITY VAULT    │
│  • write_file, read_file      │         │  • NVIDIA NIM (550B, R1, 70B) │         │  • AES-256-GCM Vault (0600)   │
│  • replace_file_content       │         │  • Anthropic (Claude 3.7)     │         │  • OS Keychain Sync (keytar)  │
│  • grep_search, glob_files    │         │  • Groq (800 tok/s Llama 3.3) │         │  • MCP Process Env Isolation  │
│  • git_status, diff, log      │         │  • DeepSeek (R1 & V3)         │         │  • Sensitive Path Blacklist   │
│  • shell_execute (Sandboxed)  │         │  • OpenAI (GPT-4o, o3-mini)   │         │  • Real-Time Token Scrubber   │
│  • web_fetch (SSRF Shield)    │         │  • Ollama & LM Studio (Local) │         │  • Prompt History Masking     │
└───────────────────────────────┘         └───────────────────────────────┘         └───────────────────────────────┘
                │                                         │                                         │
                └─────────────────────────────────────────┼─────────────────────────────────────────┘
                                                          ▼
                                          ┌───────────────────────────────┐
                                          │    PERSISTENT PROJECT MEMORY  │
                                          │  • .agentmemory/facts.json    │
                                          │  • .homogenous/skills/        │
                                          │  • .mcp.json Tool Connectors  │
                                          └───────────────────────────────┘
```

---

## 🛡️ Enterprise Zero-Leak Security Vault

Homogenous v4.0.0 implements an industry-leading security architecture ensuring credentials and private files can never leak to the screen, child processes, third-party MCP servers, or cloud models:

```
 ┌──────────────────────────────────────────────────────────────────────────────────────────┐
 │                        HOMOGENOUS ZERO-LEAK SECURITY VAULT                               │
 └──────────────────────────────────────────────────────────────────────────────────────────┘
             │
             ├── 1. HARDWARE-BOUND AES-256-GCM ENCRYPTED VAULT (~/.homogenous/keys.json @ 0600)
             │      • Encrypted at rest using a machine-derived SHA-256 seed.
             │      • Plaintext credentials never exist on disk.
             │      • Primary storage sync with OS Keychains (Windows Credential Manager / macOS Keychain).
             │
             ├── 2. THIRD-PARTY MCP SUBPROCESS ISOLATION
             │      • Strips all parent API keys (*_API_KEY, *_SECRET, *_TOKEN, HOMOGENOUS_*) before
             │        spawning MCP servers. Passes only clean system environment + user cfg.env.
             │
             ├── 3. SENSITIVE FILE & CREDENTIAL PATH BLACKLIST
             │      • Tools (read_file, write_file, grep, glob, cat, head) strictly block access to:
             │        - ~/.homogenous/keys.json
             │        - .ssh/id_rsa, .ssh/id_ed25519, *.key
             │        - .aws/credentials, .azure/, .config/gcloud/
             │        - .git-credentials, .netrc, .npmrc
             │        - *.pem, *.pfx, *.p12 certificate stores
             │
             ├── 4. ACTIVE TOOL OUTPUT & TURN CONTEXT SCRUBBING
             │      • Tool outputs (git diff, git log, grep, shell_execute) are actively scrubbed for
             │        known active keys and high-entropy patterns before entering LLM turn memory.
             │
             ├── 5. PROMPT HISTORY & ERROR SANITIZATION
             │      • Typing '/login <provider> <key>' is masked in terminal history (↑/↓) as ●●●●●●●●.
             │      • Diagnostic commands (/config) and error toasts automatically redact sensitive keys.
             │
             └── 6. ZERO LLM CONTEXT INJECTION
                    • Credentials exist strictly in the inference network layer and are never injected
                      into system prompts, tool schemas, or conversational turns.
```

---

## 🧠 11 Multi-Provider Inference Engines

Homogenous unifies all major frontier cloud backends and local neural inference runtimes behind a single, high-performance TypeScript abstraction:

| Provider | Key Model Offerings & Parameter Capacity | Primary Capabilities |
| :--- | :--- | :--- |
| **NVIDIA NIM** | `deepseek-ai/deepseek-r1` (671B), `nemotron-3-ultra-550b-a55b` (550B), `nemotron-4-340b-instruct` (340B), `meta/llama-3.3-70b-instruct` (70B), `mistralai/mixtral-8x22b-instruct-v0.1` (176B) | Enterprise-scale frontier reasoning, massive context windows, ultra-large open models |
| **Anthropic** | `claude-3-7-sonnet-20250219` (200B Reasoning), `claude-3-5-sonnet-20241022`, `claude-3-5-haiku-20241022`, `claude-3-opus` | Deep multi-file refactoring, hybrid thinking/reasoning, complex code synthesis |
| **DeepSeek** | `deepseek-reasoner` (R1 671B Reasoning), `deepseek-chat` (V3 671B MoE) | State-of-the-art algorithmic problem solving, competitive coding, math reasoning |
| **Groq** | `llama-3.3-70b-versatile` (70B), `llama-3.1-8b-instant` (8B) | Ultra-low latency inference (800+ tokens/sec) on LPU hardware, instant triage |
| **OpenAI** | `gpt-4o`, `gpt-4o-mini`, `o3-mini`, `o1`, `o1-mini` | Universal reasoning, structured output generation, general coding intelligence |
| **Mistral AI** | `mistral-large-latest` (123B), `codestral-latest` (22B Coding), `open-mixtral-8x22b` (176B) | European sovereign AI, high-efficiency coding, multilingual codebases |
| **Together AI** | `meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo` (405B), `Mixtral-8x22B` | Mega-scale open-weight inference with fast serverless hosting |
| **OpenRouter** | Any OpenRouter routing string (`anthropic/claude-3.5-sonnet`, `deepseek/deepseek-r1`) | Multi-provider fallback router, unified billing |
| **Ollama** | Any locally pulled model (`qwen2.5-coder:14b`, `deepseek-r1:8b`, `llama3.3:70b`) | 100% offline, air-gapped private development on local GPU/CPU |
| **LM Studio** | Any local OpenAI-compatible endpoint (`http://localhost:1234/v1`) | Local GPU-accelerated GGUF models |
| **Mock** | Deterministic internal test harness | Offline development, automated testing, and CI/CD validation |

---

## 🛠️ 10 Autonomous Core Tools + MCP

Homogenous comes equipped with 10 built-in workspace tools that operate under strict zero-trust containment:

| Tool | Parameters | Description & Security Guardrails |
| :--- | :--- | :--- |
| `write_file` | `path`, `content` | Creates a new file or overwrites an existing file with complete content. Automatically scaffolds parent directories. Enforces workspace containment and denies sensitive security paths. |
| `read_file` | `path`, `startLine?`, `endLine?` | Reads file content with 1-indexed line numbers. Supports slice ranges to minimize token consumption. Rejects access to credential vaults and SSH keys. |
| `replace_file_content` | `path`, `targetContent`, `replacementContent` | Surgically finds and replaces exact code blocks. Records edit snapshots in the `DiffEngine` undo stack for instant `/undo` rollbacks. |
| `grep_search` | `query`, `path?` | Searches for exact strings or regex patterns across files using ripgrep with an automatic JavaScript fallback. Automatically excludes `.git`, `node_modules`, `dist`, and sensitive paths. |
| `glob_files` | `pattern` | Finds workspace files matching glob extensions or filenames. |
| `git_status` | — | Inspects repository status (modified files, staged changes, untracked files). |
| `git_diff` | `staged?` | Returns unified git diffs for uncommitted or staged workspace changes. Output is scrubbed of sensitive secrets. |
| `git_log` | `count?` | Inspects the most recent repository commit history. |
| `shell_execute` | `command` | Executes shell commands in workspace root. Under Auto Mode, allowlisted safe read-only commands run automatically; all other commands prompt for user confirmation. |
| `web_fetch` | `url`, `maxChars?` | Fetches live web pages and documentation with HTML-to-text conversion. Protected by an advanced SSRF shield (blocks loopback, link-local, cloud metadata, and encoded IPs). |
| **MCP Tools** | Dynamic | Connects to arbitrary third-party tools via the Model Context Protocol (MCP). Subprocesses run in an isolated environment with parent credentials stripped. |

---

## 🔄 Dual Execution & Interactive Plan Modes

Homogenous provides three operational workflows tailored to different task granularities:

### 1. Normal Mode (Default)
Commands that modify files are executed autonomously by the agent loop, while terminal shell commands (`shell_execute`) prompt for explicit confirmation before execution.

### 2. Auto-Approve Mode (`/auto on` or `Ctrl+A`)
For high-velocity triage and read-heavy tasks. Allowlisted non-destructive commands (`cat`, `type`, `head`, `tail`, `ls`, `dir`, `pwd`, `date`, `node -v`, `npm list`, `tsc --noEmit`) execute automatically without interrupting you.

### 3. Interactive Plan & Apply Mode (`/plan on` or `Ctrl+P`)
For complex, multi-file refactoring or high-stakes architectural changes.
- In Plan Mode, Homogenous **does not modify files on disk**.
- Instead, it generates a comprehensive, step-by-step architectural blueprint detailing all proposed file modifications.
- You can review the plan and execute it with `/apply` or discard it with `/reject`.

```bash
homogenous > /plan on
homogenous > refactor authentication from session cookies to stateless JWT with refresh rotation
# (Agent outputs structured Plan Blueprint)
homogenous > /apply
# (Agent executes multi-file modifications and verifies tests)
```

---

## ⚡ Reactive 60 FPS Terminal UI & Ergonomics

The Homogenous interface is powered by a custom **Ink/React reactive engine**:

- **Sub-Millisecond Typing Tracking**: Zero typing latency, smooth word-by-word streaming animations, and instantaneous key response.
- **Dynamic Active Autocomplete**:
  - Typing `/` triggers fuzzy command completion (`/mod` → `/model`, `/th` → `/theme`, `/mem` → `/memory`).
  - Typing `@` opens dynamic file and directory autocomplete.
  - Subcommands auto-suggest valid options (`/mode auto`, `/theme dracula`, `/mcp reload`).
  - Cursor positions jump to end of text upon `Tab` or `Enter` selection without freezing.
- **Visual Syntax Rendering**: Markdown headings, bold/italic typography, and clean ASCII box tables with monospace column calculations that never misalign.
- **5 Curated Color Themes**: Switch themes anytime via `/theme <neon | cyberpunk | monochrome | dracula | nord>`.

---

## 💾 Persistent Memory & Dynamic Skills

### Persistent Project Memory
Homogenous remembers project architecture, styling preferences, and engineering conventions across sessions. Facts are stored in `.agentmemory/facts.json`:

```bash
# Add a persistent convention
/memory add "Always use Zod for runtime schema validation in API routes"

# List remembered facts
/memory list

# Remove a specific fact
/memory remove <fact-id>
```

### Dynamic Domain Skills
Skills are specialized instruction sets located in `.homogenous/skills/` or bundled with Homogenous. When your prompt matches a skill keyword, the skill activates dynamically:

```bash
# Scaffold a new skill
/skills create react-performance-optimizer

# List all available skills
/skills list
```

---

## 💰 Budgeting, Cost Ledger & Token Compaction

Homogenous tracks token consumption and financial spend across all 11 providers in real-time:

- **Token Compaction**: Automatically detects when context approaches provider limits and performs intelligent lossless summarization.
- **Budget Alerts**: Set session cost thresholds via `/budget set 2.00`.
- **Cost Ledger**: Inspect exact prompt token counts, completion token counts, and USD cost via `/cost`.

---

## 📦 Installation & Setup Guide

### System Requirements
- **Node.js**: v20.0.0 or higher
- **OS**: Windows (x64/ARM64), macOS (Intel/Apple Silicon), or Linux (x64/ARM64)
- **Git**: Installed and available in your `PATH`

### 1. Global Installation via NPM
```bash
npm install -g @codexgamerz/homogenous
```

### 2. PowerShell One-Liner (Windows)
```powershell
irm https://raw.githubusercontent.com/CODExGAMERZ/homogenous/main/install.ps1 | iex
```

### 3. Bash One-Liner (Linux / macOS)
```bash
curl -fsSL https://raw.githubusercontent.com/CODExGAMERZ/homogenous/main/install.sh | bash
```

### 4. Direct Execution via npx
```bash
npx @codexgamerz/homogenous@latest
```

---

## 🚀 Quickstart & Workflow Walkthrough

### 1. Launch the Assistant
Run from any project repository:
```bash
homogenous
```

### 2. Register Your AI Provider Credentials
```bash
# NVIDIA NIM (550B Nemotron, DeepSeek R1, Llama 3.3 70B)
/login nvidia nvapi-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Groq (800 tok/sec Llama 3.3 70B & 8B)
/login groq gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Anthropic (Claude 3.7 Sonnet Reasoning)
/login anthropic sk-ant-xxxxxxxxxxxxxxxxxxxxxxxxxxxx

# OpenAI (GPT-4o, o3-mini)
/login openai sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# DeepSeek (R1 & V3 MoE)
/login deepseek sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 3. Pick a Model
Open the suggestion box with `Ctrl+O` or switch directly:
```bash
/model nvidia/deepseek-ai/deepseek-r1
/model groq/llama-3.3-70b-versatile
/model anthropic/claude-3-7-sonnet-20250219
/model ollama/qwen2.5-coder:14b
```

### 4. Build, Edit, and Refactor!
```bash
# Create files
homogenous > create a Next.js 15 landing page in app/page.tsx with TailwindCSS and dark mode

# Edit existing files using @mentions
homogenous > @app/page.tsx add a testimonials carousel with responsive breakpoints

# Run tests and fix errors
homogenous > run npm test and fix any failing unit tests in test/auth.test.ts
```

---

## ⌨️ Universal Keyboard Shortcuts Reference

When working in the interactive REPL, Homogenous provides instant single-stroke keyboard shortcuts:

| Shortcut | Command Equivalent | Action & Behavior |
| :--- | :--- | :--- |
| `Ctrl + P` | `/plan` | **Toggle Planning Mode**: Switch between interactive plan generation and direct execution. In Plan Mode, dry-run blueprints are produced without writing to disk. |
| `Ctrl + A` | `/auto` | **Toggle Auto-Approve Mode**: Toggle automated execution for allowlisted, read-only system tools and inspections without user prompts. |
| `Ctrl + O` / `Ctrl + M` | `/model` | **Open Model Picker**: Launch the interactive suggestion box populated with active models sorted from largest (671B) to smallest (1B). |
| `Ctrl + U` | `/undo` | **Revert Last Edit**: Roll back the most recent file write or surgical replacement using the `DiffEngine` snapshot undo stack. |
| `Ctrl + D` | `/diff` | **View Session Diff**: Display a syntax-highlighted unified git diff of all file modifications performed during the active session. |
| `Ctrl + L` | `/clear` | **Clear Screen**: Reset the terminal viewport, clear scrollback history, and redisplay the header status bar. |
| `Shift + Enter` / `Ctrl + J` | — | **Insert New Line**: Insert a clean newline in the prompt input bar without submitting, enabling multi-line prompt editing. |
| `Enter` | — | **Submit Prompt / Select**: Submit the current prompt to the assistant or select the currently highlighted autocomplete suggestion. |
| `Tab` / `Shift + Tab` | — | **Cycle Autocomplete**: Step forward or backward through slash commands, subcommands, active models, or `@file` path suggestions. |
| `↑` / `↓` | — | **History & Navigation**: Cycle through prompt history (sensitive credentials are automatically masked) or navigate suggestion items. |
| `Esc` / `Ctrl + C` | `/exit` | **Graceful Exit**: Disconnect child MCP server processes, commit persistent session memory, and cleanly exit the CLI. |

---

## 📜 Complete Slash Commands Manual

Homogenous includes a comprehensive suite of slash commands for session control, configuration, memory, and model management:

### 🤖 Model & Provider Management

#### `/model [model-name | index]`
Inspect the active provider/model or switch models interactively. When run without arguments or with partial text, it displays models with active credentials or local running servers sorted by parameter capacity:
```bash
/model                                      # Open interactive model picker sorted by parameter scale
/model nvidia/deepseek-ai/deepseek-r1       # Switch to DeepSeek R1 671B via NVIDIA NIM
/model groq/llama-3.3-70b-versatile         # Switch to Groq ultra-fast 800 tok/sec Llama 3.3
/model anthropic/claude-3-7-sonnet-20250219 # Switch to Claude 3.7 Sonnet Reasoning
/model ollama/qwen2.5-coder:14b             # Switch to local offline Ollama Qwen model
```

#### `/login <provider> <api-key>`
Saves and registers an API key permanently in your machine-bound encrypted vault (`~/.homogenous/keys.json` @ 0600) and OS Keychain. The key is verified with a live ping check before saving:
```bash
/login nvidia nvapi-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
/login groq gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
/login anthropic sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxx
/login openai sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
/login deepseek sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
/login mistral xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
/login together xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
/login openrouter sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxxx
```

#### `/logout <provider>` / `/unregister <provider>`
Unregisters and permanently deletes the stored API key for a provider from the local encrypted vault and OS Keychain:
```bash
/logout nvidia                              # Remove stored NVIDIA NIM API key
/unregister groq                            # Remove stored Groq API key
```

---

### 🎯 Workflow & Execution Modes

#### `/mode <normal | auto | plan>`
Inspects or switches the runtime agent execution mode:
```bash
/mode normal                                # Standard mode: edits files, prompts before running shell commands
/mode auto                                  # Auto-Approve: safe read-only commands execute automatically
/mode plan                                  # Plan Mode: generates non-destructive blueprint plans
```

#### `/plan [on | off | prompt]`
Controls Interactive Planning Mode. When enabled, Homogenous analyzes your request and generates a multi-step blueprint detailing every file to be created, modified, or deleted without modifying disk:
```bash
/plan on                                    # Turn on Plan Mode
/plan off                                   # Turn off Plan Mode
```

#### `/apply`
Approves and executes all proposed file modifications in the active plan blueprint through the autonomous `AgentLoop`:
```bash
/apply                                      # Execute the pending plan modifications
```

#### `/reject`
Discards the currently pending plan blueprint without making any changes to workspace files:
```bash
/reject                                     # Discard active plan
```

---

### ⏪ Inspection, Diff & Rollback

#### `/undo`
Instantly reverts the last file write or code replacement made by the assistant using the `DiffEngine` snapshot stack:
```bash
/undo                                       # Roll back the most recent file edit
```

#### `/diff [staged]`
Renders a colorized unified git diff showing all modifications made during the active session:
```bash
/diff                                       # Show all uncommitted workspace changes
/diff staged                                # Show only staged git changes
```

#### `/copy`
Copies the most recent code block outputted by the assistant directly to your system clipboard:
```bash
/copy                                       # Copy last code snippet to clipboard
```

---

### 🧠 Memory, Skills & Tools

#### `/memory [list | add <fact> | remove <id> | clear]`
Manages persistent project conventions and architectural rules stored in `.agentmemory/facts.json`:
```bash
/memory list                                # List all remembered facts with metadata
/memory add "Use pnpm instead of npm"       # Add a persistent convention to project memory
/memory remove fact-1741234567-890          # Remove a specific memory fact by ID
/memory clear                               # Clear all project memory facts
```

#### `/skills [list | create <name> | remove <name>]`
Manages on-demand modular domain skills stored in `.homogenous/skills/`:
```bash
/skills list                                # List all bundled and project-specific skills
/skills create nextjs-seo-optimizer         # Scaffold a new skill directory with instructions
/skills remove nextjs-seo-optimizer         # Remove a project skill
```

#### `/mcp [list | reload]`
Inspects and manages Model Context Protocol (MCP) tool integrations configured in `.mcp.json`:
```bash
/mcp list                                   # View connected MCP servers and exposed tools
/mcp reload                                 # Reconnect and reload all MCP tool servers
```

---

### 🎨 Diagnostics, Theme & Budget

#### `/theme [neon | cyberpunk | monochrome | dracula | nord]`
Switches the terminal color palette dynamically:
```bash
/theme neon                                 # High-contrast cyan and magenta palette (default)
/theme cyberpunk                            # Electric yellow and cyan theme
/theme dracula                              # Classic purple and pink Dracula theme
/theme nord                                 # Cool arctic blue and frost palette
/theme monochrome                           # Clean plain text for accessibility & CI
```

#### `/cost` / `/budget [set <limit>]`
Inspects token consumption, input/output token counts, and calculates USD cost:
```bash
/cost                                       # View token usage and cost for the active session
/budget set 5.00                            # Set a session budget limit of $5.00 USD
```

#### `/config`
Displays active configuration settings, model routing matrix, and security status (all API keys are redacted):
```bash
/config                                     # Print active .toolrc.yaml settings
```

#### `/doctor`
Runs comprehensive system environment diagnostics, checking Node.js version, Git binary, GPU/VRAM status, OS Keychain availability, and inference provider connectivity:
```bash
/doctor                                     # Run full diagnostic self-check
```

#### `/clear`
Clears the terminal viewport and resets conversation display feed:
```bash
/clear                                      # Clear screen
```

#### `/help`
Displays the full command reference matrix and quickstart documentation:
```bash
/help                                       # Display command matrix
```

#### `/exit`
Safely closes background connections and exits Homogenous:
```bash
/exit                                       # Exit CLI session
```

---

## ⚙️ Configuration Reference (`.toolrc.yaml` & `.mcp.json`)

### `.toolrc.yaml`
Place in your workspace root or `~/.homogenous/.toolrc.yaml` for global defaults:

```yaml
# Homogenous Global Configuration
mode: normal # normal | auto | plan
theme: neon # neon | cyberpunk | monochrome | dracula | nord

routing:
  complexEdit: nvidia/deepseek-ai/deepseek-r1
  planning: anthropic/claude-3-7-sonnet-20250219
  fileSearch: groq/llama-3.1-8b-instant
  lintSummary: groq/llama-3.1-8b-instant
  embedding: ollama/nomic-embed-text

budget:
  sessionLimitUsd: 5.00
  warningThresholdUsd: 2.50

fallbackOrder:
  - nvidia
  - groq
  - anthropic
  - openai
  - deepseek
  - ollama
```

### `.mcp.json`
Configure Model Context Protocol servers in your workspace:

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_xxxxxxxxxxxx"
      }
    },
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres", "postgresql://localhost/mydb"]
    },
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "./docs"]
    }
  }
}
```

---

## 📁 Codebase Directory Structure

```
CLI Tool/
├── bin/
│   └── homogenous.ts               # CLI Entrypoint & Argument Parsing
├── src/
│   ├── index.ts                    # Root Programmatic SDK Entrypoint
│   ├── agent/
│   │   ├── AgentLoop.ts            # Autonomous Multi-Turn Agent Loop & Token Scrubber
│   │   ├── ExecutionMode.ts        # Normal, Auto-Approve, and Plan Execution Modes
│   │   ├── PlanningMode.ts         # Plan & Apply Blueprint Generator
│   │   ├── SubAgent.ts             # SubAgent Orchestration Engine
│   │   ├── systemPrompt.ts         # Base System Prompt & Environment Context
│   │   └── tools/                  # 10 Core Autonomous Agent Tools
│   │       ├── BaseTool.ts         # Base Tool Class & Runtime Schema Validator
│   │       ├── fileTools.ts        # read_file, write_file, replace_file_content
│   │       ├── gitTools.ts         # git_status, git_diff, git_log
│   │       ├── searchTools.ts      # grep_search, glob_files
│   │       ├── shellTool.ts        # shell_execute (Sandboxed Allowlist)
│   │       └── webTools.ts         # web_fetch (SSRF Protected)
│   ├── cli/
│   │   ├── index.ts                # Main Application Bootstrapper
│   │   ├── repl.tsx                # Interactive Terminal REPL Controller
│   │   ├── slash/                  # Slash Command Engine & Builtins
│   │   │   ├── AutocompleteEngine.ts # 671B->1B Active Credential Suggestion Box
│   │   │   ├── SlashCommandRegistry.ts # Command Dispatcher
│   │   │   └── builtin/            # /model, /login, /logout, /mode, /memory, etc.
│   │   └── ui/                     # Ink/React 60 FPS Terminal Components
│   │       ├── App.tsx             # Main Reactive Terminal Viewport
│   │       ├── ClaudeHeader.tsx    # Header Status Bar
│   │       ├── MarkdownText.tsx    # Monospace Table & Markdown Parser
│   │       ├── PromptInput.tsx     # Low-Latency Multi-Line Input Bar
│   │       ├── ToolCard.tsx        # Tool Execution Status Visualizer
│   │       └── themes/             # Color Palettes (Neon, Cyberpunk, Nord, etc.)
│   ├── config/                     # Configuration Resolvers & Schemas
│   ├── inference/                  # 11 Multi-Provider Inference Layer
│   │   ├── keychain.ts             # Hardware AES-256-GCM Credential Vault
│   │   ├── ProviderRegistry.ts     # Dynamic Routing & Local Server Prober
│   │   ├── toolParser.ts           # JSON / XML / Llama 3 Tool Call Extractors
│   │   └── providers/              # Anthropic, OpenAI, Nvidia, Groq, DeepSeek, etc.
│   ├── mcp/                        # Model Context Protocol Client & Process Isolation
│   ├── memory/                     # Persistent Project Memory & Turn Compactor
│   ├── platform/                   # OS Shell Tokenizer, Paths, and VRAM Prober
│   ├── skills/                     # Modular Dynamic Skills Engine
│   └── token-budget/               # Cost Ledger, Token Counter, and DiffEngine
├── test/
│   └── unit/                       # 92 Automated Unit Tests
├── install.ps1                     # Automated Windows PowerShell Installer
├── install.sh                      # Automated macOS / Linux Bash Installer
├── package.json                    # Package Manifest (v4.1.0)
└── README.md                       # Comprehensive Documentation
```

---

## 💻 Programmatic API & SDK Usage

In addition to the interactive CLI, `@codexgamerz/homogenous` can be imported as a TypeScript/JavaScript library into your own Node.js applications:

```typescript
import {
  AgentLoop,
  ProviderRegistry,
  KeychainService,
  PersistentMemory,
  SkillRegistry,
} from "@codexgamerz/homogenous";

// 1. Initialize inference provider & credentials
const registry = ProviderRegistry.getInstance();
const provider = registry.getProvider("anthropic");

// 2. Instantiate persistent project memory
const memory = PersistentMemory.getInstance();
await memory.addFact("Project uses Next.js 15 with TailwindCSS");

// 3. Initialize Agent Loop
const agent = new AgentLoop({
  provider,
  model: "claude-3-7-sonnet-20250219",
  systemPrompt: "You are an autonomous engineering assistant.",
  workspaceRoot: process.cwd(),
});

// 4. Run task with live token streaming
const result = await agent.run("Scaffold a dark-mode pricing component", {
  onTextDelta: (delta) => process.stdout.write(delta),
  onToolStart: (tool, input) => console.log(`\nExecuting: ${tool}...`),
});

console.log("\nTask Complete!", result);
```

---

## 🧪 Test Suite & Verification

Homogenous includes a comprehensive test harness covering every layer of the application:

```bash
# Run all 92 automated unit tests
npm test

# Build production TypeScript bundle
npm run build

# Install globally from source
npm install -g .
```

---

## 📄 License

Homogenous CLI is open-source software licensed under the [MIT License](LICENSE).

---

<p align="center">
  <b>✦ HOMOGENOUS CLI v4.1.0 — Code Faster. Deploy Safer. Local First. ✦</b>
</p>



