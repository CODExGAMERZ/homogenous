# ✦ Under the Hood: How Homogenous CLI Works

```text
  ██╗  ██╗ ██████╗ ███╗   ███╗██████╗  ██████╗ ███████╗███╗   ██╗██████╗ ██╗  ██╗███████╗
  ██║  ██║██╔═══██╗████╗ ████║██╔═══██╗██╔════╝██╔════╝████╗  ██║██╔═══██╗██║  ██║██╔════╝
  ███████║██║   ██║██╔████╔██║██║   ██║██║  ███╗█████╗  ██╔██╗ ██║██║   ██║██║  ██║███████╗
  ██╔══██║██║   ██║██║╚██╔╝██║██║   ██║██║   ██║██╔══╝  ██║╚██╗██║██║   ██║██║  ██║╚════██║
  ██║  ██║╚██████╔╝██║ ╚═╝ ██║╚██████╔╝╚██████╔╝███████╗██║ ╚████║╚██████╔╝╚█████╔╝███████║
  ╚═╝  ╚═╝ ╚═════╝ ╚═╝     ╚═╝ ╚═════╝  ╚═════╝ ╚══════╝╚═╝  ╚═══╝ ╚═════╝  ╚════╝ ╚══════╝
                     ✦ THE INNER WORKINGS OF A LOCAL-FIRST AGENT ✦
```

> *"Software should feel alive in your hands. It shouldn't be an opaque black box running on someone else's server. It should run on your bare metal, inspect your real files, respect your secrets, and explain its thinking at 60 frames per second."*

When you type a command into **Homogenous CLI** and press `Enter`, what happens inside the machine over the next 120 milliseconds?

This document takes you on an immersive deep-dive through the architecture, memory pipelines, safety hypervisors, and autonomous reasoning loops that power Homogenous.

---

## 🧭 The Global Architecture Map

```mermaid
flowchart TD
    subgraph S1 ["1. THE SENSORY LAYER (Terminal TUI)"]
        User([Developer at Terminal]) -->|Keystrokes| TTY[React Ink Raw-Mode Engine]
        TTY --> Autocomplete[Fuzzy Path & Command Autocomplete]
        TTY --> KeyRouter[Instant Shortcut Router: Ctrl+P, Ctrl+U, Ctrl+D]
    end

    subgraph S2 ["2. THE ORCHESTRATOR (AgentLoop)"]
        TTY -->|Prompt Event| AgentLoop[Autonomous AgentLoop]
        AgentLoop <--> SysPrompt[System Prompt & Identity Matrix]
        AgentLoop <--> SessionMem[Sliding Session Memory]
        AgentLoop <--> BudgetLedger[Live Token & Dollar Ledger]
        AgentLoop <--> DiffEngine[DiffEngine Rollback Stack]
    end

    subgraph S3 ["3. SUB-AGENT SWARM (delegate_task)"]
        AgentLoop -->|Forks Task| SubAgent[SubAgent Worker]
        SubAgent --> BoundedTurns[Turn Budget Cap]
        SubAgent --> SilentTUI[Silent TUI Sandbox]
        SubAgent --> ScopeContain[Workspace Root Jail]
        SubAgent --> AntiRecursion[Recursion Guard]
    end

    subgraph S4 ["4. THE INFERENCE MATRIX"]
        AgentLoop <--> ProviderRouter{Dynamic Provider Router}
        ProviderRouter <--> LocalEngines["Local Zero-Leak Silicon\n(Ollama / LM Studio)"]
        ProviderRouter <--> CloudEngines["Frontier Cloud Models\n(Claude 3.5, GPT-4o, Groq, DeepSeek)"]
    end

    subgraph S5 ["5. THE SYSTEM HYPERVISOR (Tools & Vault)"]
        AgentLoop <--> Tools["Sandboxed Workspace Tools\n(CRLF-Aware File Engine, Ripgrep, Git, Shell)"]
        AgentLoop <--> MCP["Model Context Protocol (MCP)\n(External Stdio Servers & Prompts)"]
        AgentLoop <--> Keychain["AES-256-CBC Vault\n(.vault_seed + Regex Secret Scrubber)"]
    end
```

---

## 🎬 Act I: The Sensory Layer (Terminal TUI & 60 FPS Ink)

Everything begins in your terminal window. Traditional CLI tools rely on synchronous stdout line-printing. Homogenous is different: it boots a full **React Ink** virtual terminal DOM with sub-millisecond keyboard interception.

```
 ╭────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
 │ ✦ HOMOGENOUS AGENT v4.3.1 (Local-First Assistant)                                     workspace: /projects/core [main] │
 │ model: claude-3-5-sonnet-20241022 [200k]                                   session: 1.4k tok | $0.002 | 14 loc / 0 cld │
 ╰────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
  ✦ Ctrl+P:Plan | Ctrl+U:Undo | Ctrl+D:Diff | Ctrl+O:Model | Ctrl+A:Auto | Ctrl+L:Clear | Esc:Exit
 ╭────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
 │ homogenous > @src/auth/jwt.ts fix expiration race condition and run tests                              │
 ╰────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
```

### 1. Zero-Latency Path & Command Autocomplete
As you type `@`, the `AutocompleteEngine` immediately walks your workspace tree in the background. It surfaces matching files with fuzzy score weighting, so typing `@jwt` immediately expands to `@src/auth/jwt.ts`.

### 2. High-Frequency Keyboard Shortcuts
Pressing `Ctrl+P`, `Ctrl+U`, or `Ctrl+D` bypasses the standard input queue. The `getShortcutTarget` engine translates raw terminal byte signals (like ASCII `\x10` for Ctrl+P) into instant commands:
- **`Ctrl+P` (Plan Mode)**: Switches the agent into "Dry-Run Architect" mode. Instead of directly touching code, it drafts an execution blueprint and waits for your `/apply`.
- **`Ctrl+U` (Atomic Undo)**: Pulls the latest diff from `DiffEngine` and reverts your file back to its exact previous byte sequence.
- **`Ctrl+D` (Diff Viewer)**: Renders a colorized, unified terminal diff of everything changed across the entire session.

---

## 🧠 Act II: The Thought Engine (`AgentLoop.ts`)

Once your prompt is submitted, the **AgentLoop** takes the helm. This is an autonomous multi-turn reasoning machine that executes a continuous loop of:

$$\text{Observation} \longrightarrow \text{Thought} \longrightarrow \text{Tool Invocation} \longrightarrow \text{State Mutation}$$

```
                ┌────────────────────────────────────────────────────────┐
                │                  User Prompt Received                  │
                └───────────────────────────┬────────────────────────────┘
                                            │
                                            ▼
                ┌────────────────────────────────────────────────────────┐
                │          Step 1: System Matrix Injection               │
                │ • Declares workspace root: C:/projects/core            │
                │ • Injects installed dynamic skill instructions        │
                │ • Loads persistent memory facts (.agentmemory)         │
                └───────────────────────────┬────────────────────────────┘
                                            │
                                            ▼
                ┌────────────────────────────────────────────────────────┐
                │          Step 2: Dual Inference Dispatch               │
                │ • Streams JSON tool schemas to LLM provider            │
                │ • Emits real-time word deltas throttled to ~16ms       │
                └───────────────────────────┬────────────────────────────┘
                                            │
                          ┌─────────────────┴─────────────────┐
                          │ Model Response Evaluation         │
                          └─────────────────┬─────────────────┘
                                            │
               ┌────────────────────────────┴────────────────────────────┐
               ▼                                                         ▼
    ┌──────────────────────┐                                  ┌──────────────────────┐
    │  Tool Use Emitted    │                                  │  Plain Text Response │
    └──────────┬───────────┘                                  └──────────┬───────────┘
               │                                                         │
               ▼                                                         ▼
    ┌──────────────────────┐                                  ┌──────────────────────┐
    │ Tool Validation      │                                  │ Hesitation Check:    │
    │ (Zod Schemas)        │                                  │ Did it say "I will   │
    └──────────┬───────────┘                                  │ edit..." without an  │
               │                                              │ actual tool call?    │
               ▼                                              └──────────┬───────────┘
    ┌──────────────────────┐                                             │
    │ Execute Sandboxed    │                                    Yes ─────┴───── No
    │ Workspace Tool       │                                     │               │
    └──────────┬───────────┘                                     ▼               ▼
               │                                            Nudge Agent to   Complete Turn
               ▼                                            Invoke Tool      & Render Markdown
    ┌──────────────────────┐
    │ Truncate Output &    │
    │ Feed back to Memory  │
    └──────────────────────┘
```

### The "Hesitation Guard": Stopping Conversational Procrastination
Many large language models have a known behavioral defect: after reading a file, they pause and output conversational prose such as:
> *"I have inspected the file. Now I will modify the expiration logic..."*

Instead of actually editing the code, the model pauses, forcing the user to say *"Go ahead"*. 

Homogenous includes an automated **Hesitation Guard**. It monitors response patterns with regex heuristics (`isConversationalPromise`). If the model read a file recently and announces it is about to write, but didn't invoke `write_file` or `replace_file_content`, Homogenous automatically injects a hidden steer turn:
> *"Proceed now to invoke 'replace_file_content' with the complete code changes. Do not pause with conversational text."*

The model snaps back into autonomous action and executes the change without wasting your time.

---

## 🤖 Act III: The Sub-Agent Swarm (`SubAgent.ts`)

What happens when a task is too big or noisy for a single conversation window? 

Imagine asking the agent to *"Audit all 40 unit test suites, locate flaky timeouts, and document them."* If the main agent ran this, your primary context window would quickly fill with hundreds of lines of raw test logs, driving up token costs and causing context rot.

Homogenous solves this through **Sub-Agent Delegation**:

```
[Main Agent Loop]
       │
       ▼ (delegates heavy research task)
┌─────────────────────────────────────────────────────────────────────────────┐
│ 🤖 SUB-AGENT JAILED EXECUTION CONTAINER                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│ 1. BOUNDED EXECUTION: Hard-capped at maxTurns (default: 8 turns)            │
│ 2. SILENT TUI SANDBOX: Stdout is muted to prevent raw Ink display corruption │
│ 3. WORKSPACE JAIL: Tools are locked strictly into the target workspaceRoot  │
│ 4. ANTI-RECURSION GUARD: Cannot recursively call delegate_task              │
│ 5. SPECIALIZED IDENTITY: System prompt tuned strictly for concise reporting │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼ Returns SubAgentResult
[Main Agent continues with clean, distilled 3-bullet summary]
```

### Why Silent TUI Isolation Matters
When running in an interactive terminal under Ink's raw-mode alternate screen buffer, any raw `console.log` dumped to `stdout` breaks cursor coordinate tracking, causing text tearing and visual artifacts.

Child sub-agents run with `silent: true`. Their tool executions, file queries, and intermediate steps occur completely in-memory. Only their final structured report is surfaced cleanly to the main agent.

---

## 🛠️ Act IV: The Tooling Hypervisor (`src/agent/tools/`)

The model's hands in your codebase are its tools. Homogenous treats tool execution like a hypervisor: every operation is validated, bounded, and monitored.

```
┌────────────────────────┬────────────────────────────────────────────────────────┐
│ Tool Name              │ The Engineering Miracle Under The Hood                 │
├────────────────────────┼────────────────────────────────────────────────────────┤
│ `replace_file_content` │ 🪟 Windows CRLF / LF Multi-Pass Resilience            │
│                        │ LLMs always output Unix '\n', but Windows files often  │
│                        │ use '\r\n'. Homogenous runs a multi-pass normalizer   │
│                        │ that finds the match regardless of line-ending style,   │
│                        │ and preserves the exact original line-ending format.   │
├────────────────────────┼────────────────────────────────────────────────────────┤
│ `grep_search`          │ ⚡ Native Ripgrep with Pure JS Fallback                 │
│                        │ Invokes ultra-fast native 'rg' with '--' protection.    │
│                        │ If 'rg' is not installed, it silently switches to a    │
│                        │ multi-threaded JavaScript directory walker.            │
├────────────────────────┼────────────────────────────────────────────────────────┤
│ `execute_shell`        │ 🛡️ Zero-Trust Security Shell Sandbox                   │
│                        │ Rejects shell metacharacters, subshells, chained pipes, │
│                        │ and tilde expansions unless explicitly allowlisted.    │
├────────────────────────┼────────────────────────────────────────────────────────┤
│ `fetch_web`            │ 🌐 Anti-SSRF Defense Network                           │
│                        │ Blocks requests to internal LANs, 127.0.0.1, IPv6      │
│                        │ loopbacks, cloud metadata IPs (169.254.169.254), and   │
│                        │ hex/decimal encoded obfuscated IP addresses.           │
└────────────────────────┴────────────────────────────────────────────────────────┘
```

### The Windows CRLF Dilemma (Solved)
One of the most notorious bugs in AI coding assistants on Windows is the **Line Ending Mismatch**:
1. Your TypeScript file on Windows is saved with CRLF (`\r\n`).
2. The cloud LLM generates code with standard Unix LF (`\n`).
3. The AI agent searches for target content, but the string search fails because `\n !== \r\n`.
4. The tool returns: *"Error: Could not find targetContent"*.

Homogenous eliminates this forever. Its `ReplaceFileContentTool` performs **multi-pass line-ending tolerance**:
1. Checks for an exact byte match.
2. If that fails, it normalizes both target and file content to LF and checks for a match.
3. If that fails, it tries CRLF normalization.
4. When writing back to disk, it automatically preserves the file's original line endings!

---

## ⚡ Act V: The Dual Brain (Local Silicon vs Frontier Cloud)

Homogenous believes developers should have complete sovereignty over their inference pipeline:

```
                  ┌─────────────────────────────────────────┐
                  │       Universal Provider Interface      │
                  └────────────────────┬────────────────────┘
                                       │
                    ┌──────────────────┴──────────────────┐
                    ▼                                     ▼
      ┌───────────────────────────┐         ┌───────────────────────────┐
      │   Local Offline Silicon   │         │    Frontier Cloud LLMs    │
      ├───────────────────────────┤         ├───────────────────────────┤
      │ • Ollama (Llama 3, Qwen)  │         │ • Anthropic Claude 3.5    │
      │ • LM Studio (Local Server)│         │ • OpenAI GPT-4o / o1 / o3 │
      │ • Zero data leaves device │         │ • Groq (300+ tokens/sec)  │
      │ • 100% air-gapped ready   │         │ • DeepSeek-V3 & R1        │
      │ • Free forever            │         │ • NVIDIA NIM & Mistral    │
      └───────────────────────────┘         └───────────────────────────┘
```

- **Dynamic Model Discovery**: Launching Homogenous automatically probes local Ollama (`http://localhost:11434`) and LM Studio (`http://localhost:1234`). If running, local models appear immediately in your picker (`Ctrl+O`).
- **Real-Time Cost Accounting (`BudgetLedger.ts`)**: Every token generated is audited. The ledger tracks input, output, cache-read, and cache-write tokens against real pricing models, calculating the exact sub-cent cost of every session.

---

## 🛡️ Act VI: The Zero-Leak Security Vault (`src/inference/keychain.ts`)

Security is not an afterthought; it is built into the memory model.

```
       [API Key / Secret]
               │
               ▼
┌───────────────────────────────┐
│ AES-256-CBC Encryption Engine │ <─── System Vault Seed (~/.homogenous/.vault_seed)
└──────────────┬────────────────┘
               │
               ▼
[Encrypted Ciphertext on Disk (keys.json)]
```

1. **Per-Machine Vault Seed**: Your API keys are encrypted at rest using AES-256-CBC. The encryption key is tied to a machine-unique `.vault_seed` created on first run.
2. **Dynamic Regex Secret Scrubber**: Before any text, error message, or tool result is appended to LLM memory or written to disk, it passes through `scrubSensitiveTokens`. It automatically matches and redacts:
   - Specific active API keys (Anthropic, OpenAI, Groq, NVIDIA, etc.)
   - Bearer authorization headers and GitHub PAT tokens
   - Database connection URIs containing credentials (`postgres://user:pass@host/db`)
   - AWS access keys and JWT signatures

Your secrets **never** leak into LLM context windows or conversation logs.

---

## 🔄 Act VII: The Safety Net (DiffEngine & Rollback)

Every modification to your filesystem is reversible.

```
   Existing File: auth.ts
            │
            ▼ (write_file or replace_file_content triggered)
   ┌─────────────────────────────────────────────────┐
   │ DiffEngine captures pre-edit snapshot in memory │
   └────────────────────────┬────────────────────────┘
                            │
                            ▼
   New Content written to disk
            │
            ▼
   User presses Ctrl+U (or types /undo)
            │
            ▼
   DiffEngine restores pre-edit snapshot instantly!
```

- **`Ctrl+D` (Diff Viewer)**: Renders a unified side-by-side diff showing exactly what the agent changed.
- **`Ctrl+U` (Instant Undo)**: Made a mistake? Press `Ctrl+U` to immediately pop the last snapshot from the undo stack and restore your file cleanly.

---

## 🚀 The Complete Lifecycle: From Prompt to Execution

Here is the exact journey of a single prompt:

```text
 1. You type: "@src/server.ts add an auth rate limiter and test it"
 2. Autocomplete walks tree -> replaces @src/server.ts with real file content.
 3. AgentLoop compiles System Prompt (declares tools, workspace root, active skills).
 4. Prompt dispatched to Claude 3.5 Sonnet / DeepSeek / Ollama.
 5. Model emits: replace_file_content("src/server.ts", ...)
 6. DiffEngine takes memory snapshot of src/server.ts.
 7. File tool applies change with Windows CRLF tolerance.
 8. Model emits: execute_shell("npm test")
 9. Shell sandbox runs tests -> returns "12 tests passed".
10. Model outputs final summary.
11. CodeBlockStore extracts code blocks -> ready for /copy.
12. Status bar updates: "session: 1.8k tok | $0.003 | 24 loc".
```

**That is Homogenous CLI: Fast. Private. Resilient. Engineered for developers who want total control.**
