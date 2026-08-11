# Homogenous — Local-First Agentic CLI Coding Assistant

### Full Architecture & Phased Build Plan

Assumptions made (flag if wrong, cheap to change now, expensive later):

- This starts as a personal daily-driver tool, but built clean enough to open-source later — so packaging/registry work is included but deprioritized to late phases.
- Primary embedding path for local semantic search runs through Ollama's `/api/embeddings` (e.g. `nomic-embed-text`, ~275MB, runs fine on 4GB VRAM) rather than a separate Python embedding stack — keeps the tool single-runtime.
- You'll BYOK at least Anthropic + one OpenAI-compatible free-tier (Groq) at launch; the other 3 backends are built to the same interface but get less real-world testing early.
- "Comparable in scope to Claude Code" means: repo-aware multi-turn agent, file edit tools, shell exec with gating, not a full IDE.

---

## 1. Language / Runtime Decision

**Recommendation: TypeScript on Node.js.**

This goes against your usual Python-first stack (Flask/FastAPI, Ollama, Unsloth), so here's the honest tradeoff rather than a default:

| Concern                  | Node/TypeScript                                                                                                                                                                   | Python                                                                                                                                                        |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Distribution             | `npm install -g` / single `npx` invocation, no venv management, no "which python" hell on Windows                                                                                 | pip packaging is workable but native deps (tokenizers, some embedding libs) cause Windows wheel pain; venv activation is a recurring first-run friction point |
| OS Keychain              | `keytar` is mature, prebuilt binaries for Win/Mac/Linux, widely used (VS Code itself uses it)                                                                                     | `keyring` works but backend selection on Windows (`keyring.backends.Windows`) is less battle-tested for a CLI distributed to others                           |
| CLI ergonomics / TUI     | `ink` (React for CLIs) gives you a real component model for a live token meter, streaming panes, diff viewers — this is genuinely better here than anything in Python's CLI space | `rich` / `textual` are good but weaker for the "live updating multi-pane" UX you want for the token meter                                                     |
| Async streaming          | Node's event loop is a natural fit for concurrently streaming a cloud response while tailing a shell subprocess and updating a UI meter                                           | `asyncio` is fine but more ceremony for this specific mix (subprocess + SSE + UI redraw)                                                                      |
| MCP SDK maturity         | Official `@modelcontextprotocol/sdk` is the most actively maintained, matches the ecosystem's primary reference implementation (also how Claude Code itself is built)             | Official Python SDK (`mcp`) exists and is solid too, but TS is where most community servers get tested first                                                  |
| Your existing code reuse | None directly reusable (your Tree-sitter, Qdrant, LangGraph work is Python)                                                                                                       | Direct reuse of SentinelRAG's Tree-sitter chunking logic, embedding pipeline patterns                                                                         |
| Local model compute      | Irrelevant either way — Ollama/LM Studio do all the actual inference over HTTP; the CLI process never loads model weights itself                                                  | Same                                                                                                                                                          |
| Windows-first-class      | Strong: `path.win32`, `cross-spawn` for shell invocation, `keytar` all handle Windows natively as first-class, not bolted-on                                                      | Workable, but `subprocess` + `shlex` quoting differences between POSIX/Windows shells are a classic source of the exact bugs you said bit you before          |

The deciding factors: since Ollama/LM Studio externalize the actual model compute, Python's "native ML tooling" advantage mostly disappears — the CLI itself is just an orchestrator, HTTP client, and terminal UI. On that playing field, Node wins on distribution, keychain integration, Windows shell handling, and MCP SDK maturity — the four things you explicitly flagged as past pain points or hard constraints.

If you want to reuse SentinelRAG's Tree-sitter/embedding logic directly, the fallback plan is a **thin Python sidecar** (`homogenous-retrieval-worker`) invoked as a subprocess for the AST-chunking step only, communicating over stdio JSON — isolated, optional, replaceable with a pure-JS Tree-sitter binding (`web-tree-sitter` exists and is quite good) later if the sidecar proves annoying. I'd start pure-TS with `web-tree-sitter` and only reach for the Python sidecar if chunking quality is worse than what you already have.

**Runtime specifics:** Node 20+ LTS, TypeScript 5.x, ESM modules, `tsx` for dev, `pkg`/`node --experimental-sea-config` or just plain npm global install for distribution (single-executable packaging is a Phase-N nicety, not a blocker).

---

## 2. High-Level Module / Folder Structure

```
homogenous/
├── package.json
├── tsconfig.json
├── .toolrc.example.yaml
├── bin/
│   └── homogenous.ts                 # CLI entrypoint (yargs/commander arg parsing)
├── src/
│   ├── cli/
│   │   ├── repl.ts                   # interactive REPL loop
│   │   ├── oneshot.ts                # `tool "prompt"` non-interactive mode
│   │   ├── init.ts                   # `tool init` project scaffolder
│   │   ├── commands/                 # slash command system (see §7)
│   │   │   ├── SlashCommandRegistry.ts
│   │   │   ├── parseSlashInput.ts     # input router: "/cmd args" vs. plain prompt
│   │   │   ├── builtin/
│   │   │   │   ├── session.ts         # /clear /compact /undo /exit /save /resume
│   │   │   │   ├── model.ts           # /model /provider /routing
│   │   │   │   ├── memory.ts          # /remember /forget /memory
│   │   │   │   ├── skills.ts          # /skills
│   │   │   │   ├── mcp.ts             # /mcp
│   │   │   │   ├── mode.ts            # /plan /auto /yolo
│   │   │   │   ├── budget.ts          # /budget /cost
│   │   │   │   ├── diff.ts            # /diff /apply /reject
│   │   │   │   └── meta.ts            # /help /config /login /init /version
│   │   │   └── userDefined/           # loader for ~/.homogenous/commands/*.md
│   │   └── ui/
│   │       ├── TokenMeter.tsx         # ink component — live token/cost display
│   │       ├── DiffView.tsx           # ink component — unified diff renderer
│   │       └── ConfirmPrompt.tsx      # destructive-action confirmation gate
│   │
│   ├── inference/
│   │   ├── InferenceProvider.ts       # the interface (see §3)
│   │   ├── providers/
│   │   │   ├── AnthropicProvider.ts
│   │   │   ├── OpenAIProvider.ts
│   │   │   ├── GroqProvider.ts
│   │   │   ├── OllamaProvider.ts
│   │   │   └── LMStudioProvider.ts
│   │   ├── ProviderRegistry.ts        # detection, model routing config resolution
│   │   └── keychain.ts                # keytar wrapper, validate-then-store flow
│   │
│   ├── token-budget/
│   │   ├── TokenCounter.ts            # per-provider tokenizer adapters
│   │   ├── ContextCompactor.ts        # rolling summarization
│   │   ├── ContextRetriever.ts        # ripgrep + embeddings selective file context
│   │   ├── DiffEngine.ts              # diff-based edit proposals + full-rewrite fallback
│   │   ├── ToolOutputTruncator.ts     # smart middle-elision
│   │   ├── PromptCacheManager.ts      # provider-native cache-control injection
│   │   └── BudgetLedger.ts            # session/command accounting, cost display
│   │
│   ├── memory/
│   │   ├── SessionMemory.ts           # working context, ties into ContextCompactor
│   │   ├── PersistentMemory.ts        # .agentmemory/ reader/writer
│   │   ├── MemoryRetriever.ts         # relevance-scored selective retrieval
│   │   └── commands.ts                # remember/forget/list/edit
│   │
│   ├── skills/
│   │   ├── SkillLoader.ts             # frontmatter scan (cheap) + lazy body load
│   │   ├── SkillRegistry.ts           # local index of installed skills
│   │   ├── SkillInstaller.ts          # git-url / registry-name install
│   │   └── scaffold/                  # `skills create` templates
│   │
│   ├── mcp/
│   │   ├── McpClientManager.ts        # wraps @modelcontextprotocol/sdk
│   │   ├── transports/
│   │   │   ├── stdio.ts
│   │   │   └── sse.ts
│   │   ├── ResourceCache.ts
│   │   └── config.ts                  # .mcp.json reader (shared convention)
│   │
│   ├── agent/
│   │   ├── AgentLoop.ts               # core plan→act→observe loop
│   │   ├── PlanningMode.ts            # produces diff/action list for approval
│   │   ├── ExecutionMode.ts
│   │   ├── SubAgent.ts                # scoped task delegation with trimmed context
│   │   └── tools/
│   │       ├── fileTools.ts           # read/write/edit
│   │       ├── shellTool.ts           # with confirmation gate (mirrors JARVIS pattern)
│   │       ├── searchTools.ts         # grep/glob
│   │       ├── gitTools.ts
│   │       └── webTools.ts            # optional, off by default
│   │
│   ├── config/
│   │   ├── ConfigResolver.ts          # CLI flags > .toolrc project > .toolrc global
│   │   └── schema.ts                  # zod schema for .toolrc
│   │
│   └── platform/
│       ├── paths.ts                   # Windows/POSIX-safe path helpers
│       └── shell.ts                   # cross-spawn wrapper, Windows shell quoting
│
├── skills/                            # bundled default skills (own SKILL.md files)
├── .agentmemory/                      # example/scaffold for `tool init`
└── test/
```

---

## 3. `InferenceProvider` Interface (concrete TypeScript)

```typescript
// src/inference/InferenceProvider.ts

export type Role = "system" | "user" | "assistant" | "tool";

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>; // JSON Schema
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface Message {
  role: Role;
  content: string | ContentBlock[];
  toolCallId?: string; // set when role === "tool"
}

export type ContentBlock =
  | { type: "text"; text: string }
  | { type: "tool_use"; toolCall: ToolCall }
  | {
      type: "tool_result";
      toolCallId: string;
      content: string;
      isError?: boolean;
    }
  | { type: "image"; mimeType: string; data: string }; // base64

export interface CacheHint {
  /** Segment of the message list that should be marked cacheable by the
   *  provider (system prompt, skill defs, repo map). Providers that don't
   *  support native caching (Groq, LM Studio) silently ignore this. */
  cacheableUpToIndex: number;
}

export interface ChatRequest {
  model: string;
  messages: Message[];
  tools?: ToolDefinition[];
  maxTokens: number;
  temperature?: number;
  cacheHint?: CacheHint;
  stopSequences?: string[];
}

export interface ChatResponse {
  content: ContentBlock[];
  stopReason: "end_turn" | "tool_use" | "max_tokens" | "stop_sequence";
  usage: {
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens?: number;
    cacheWriteTokens?: number;
  };
  raw?: unknown; // escape hatch for provider-specific debugging
}

export interface StreamEvent {
  type:
    | "text_delta"
    | "tool_call_start"
    | "tool_call_delta"
    | "tool_call_end"
    | "message_stop";
  textDelta?: string;
  toolCall?: Partial<ToolCall>;
  usage?: ChatResponse["usage"];
}

export interface EmbedRequest {
  model: string;
  input: string[];
}

export interface EmbedResponse {
  embeddings: number[][];
  dimensions: number;
}

export interface ProviderCapabilities {
  supportsTools: boolean;
  supportsStreaming: boolean;
  supportsPromptCaching: boolean;
  supportsEmbeddings: boolean;
  isLocal: boolean;
  contextWindow: number; // per-model, resolved at runtime — see resolveModel()
}

/**
 * Every backend implements this exact contract. Nothing provider-specific
 * leaks past this boundary — the agent loop, token budget layer, and model
 * router only ever talk to InferenceProvider.
 */
export interface InferenceProvider {
  readonly id: "anthropic" | "openai" | "groq" | "ollama" | "lmstudio";

  /** Cheap connectivity/credential check, used at login and at startup
   *  probing for local backends. Must not consume a meaningful quota. */
  ping(): Promise<{ ok: boolean; models?: string[]; error?: string }>;

  chat(request: ChatRequest): Promise<ChatResponse>;

  stream(request: ChatRequest): AsyncIterable<StreamEvent>;

  embed(request: EmbedRequest): Promise<EmbedResponse>;

  countTokens(text: string, model: string): Promise<number>;

  capabilities(model: string): ProviderCapabilities;

  supportsTools(model: string): boolean;
}
```

Notes on the 5 implementations:

- **AnthropicProvider** — thin wrapper over `@anthropic-ai/sdk`. `cacheHint` maps directly to `cache_control: {type: "ephemeral"}` blocks. `countTokens` uses the SDK's token-count endpoint (cheap, no generation).
- **OpenAIProvider** — wrapper over `openai` SDK. No native prompt caching as of writing for most models — `cacheHint` is a no-op but the interface still accepts it so the token-budget layer doesn't need per-provider branches. `countTokens` uses `tiktoken` (bundle `js-tiktoken` to avoid native bindings — matters for Windows).
- **GroqProvider** — OpenAI-compatible endpoint, reuses OpenAIProvider's request/response mapping internally with a different base URL and model list; this is the free-tier workhorse for local-first triage of cheap subtasks.
- **OllamaProvider** — talks to `localhost:11434/api/chat` and `/api/embeddings`. `supportsTools` checked per-model against Ollama's tool-calling model list (not all local models support structured tool use — this matters a lot for your 4GB VRAM target, since most tool-capable quantized models start around 7B-Q4). `countTokens` estimates via a local heuristic (chars/4) unless the model exposes a tokenizer endpoint — exact counts aren't critical for local models since there's no cost to track, only context-window management.
- **LMStudioProvider** — OpenAI-compatible endpoint at `localhost:1234/v1`; nearly identical implementation to OpenAIProvider with base URL swapped and a startup model-list probe.

`ProviderRegistry.ts` handles auto-detection (parallel `ping()` against Ollama/LM Studio at startup, ~200ms timeout each, never blocking if neither is running) and resolves the per-task-type model routing config (e.g. `routing.fileSearch: "ollama/qwen2.5-coder:3b"`, `routing.complexEdit: "anthropic/claude-sonnet-5"`).

---

## 4. Token-Efficiency Layer (detailed)

This is the actual product. Design goal: **the agent should never send a token it doesn't need to, and you should always be able to see why it sent the ones it did.**

### 4.1 Context Compaction

- Every session maintains a running token count against the active model's context window (from `capabilities(model).contextWindow`).
- Trigger: when `usedTokens / contextWindow >= compactionThreshold` (default 0.70, configurable in `.toolrc`).
- On trigger: the oldest N turns (everything before the last `keepRecentTurns`, default 4) get sent to a **compaction call** — deliberately routed to the cheapest available model (local if present, else Groq free tier, never the frontier model) with a fixed summarization prompt: extract (a) decisions made, (b) files touched and why, (c) open threads/TODOs, (d) anything explicitly `remember`'d. Output replaces the raw turns as a single synthetic `assistant` message tagged `[compacted-summary]`.
- Compaction is **lossy by design** for conversational fluff, lossless for the four categories above — those get cross-checked against `PersistentMemory` so nothing structurally important only lives in a compacted blob.
- The `BudgetLedger` logs every compaction event (tokens before → after) so the live meter can show "compacted 3 times this session, saved ~18k tokens."

### 4.2 Selective File Context

- Never do `cat -r .` into the prompt. Retrieval pipeline per turn:
  1. **Ripgrep pass** — fast literal/regex search scoped to the query's extracted keywords (symbol names, error strings, file globs mentioned).
  2. **Embedding pass** (only if ripgrep returns weak/ambiguous matches, or the query is conceptual rather than literal) — local model embeds the query, compares against a pre-built embedding index of function/class-level chunks. Index built via `web-tree-sitter` AST chunking (function/class boundaries, not arbitrary line windows) — same chunking philosophy as SentinelRAG's content-derived block approach.
  3. Merge + rank both result sets, take top-K spans (default K=8, configurable), each span carries its file path + line range so edits can be diffed back precisely.
- The embedding index lives in `.agentmemory/index/` (SQLite + vector blobs — no separate vector DB dependency needed at this scale; swap for Qdrant only if a repo is large enough to need ANN search, which is itself a config toggle, not a hard dependency).
- Index updates incrementally on file save (watched via `chokidar`), not full rebuild every turn.

### 4.3 Diff-Based Edits

- Agent always proposes edits as unified diff hunks against the retrieved spans, never a full-file rewrite, **unless** the diff would exceed `fullRewriteThreshold` (default: diff touches >40% of file's lines, or file is under ~50 lines where a diff has no token advantage anyway).
- `DiffEngine` validates the diff applies cleanly (dry-run via `diff-match-patch` or a real patch apply in a scratch copy) before ever asking for user confirmation — an invalid diff triggers one automatic regeneration attempt with the failure fed back to the model, not a silent full-file fallback.

### 4.4 Tool-Result Truncation

- Every tool output (file read, shell stdout, MCP resource read) passes through `ToolOutputTruncator` before entering the message list.
- Cap default: 4k tokens per tool result (configurable per-tool-type — shell stdout gets a lower default than file reads).
- Truncation strategy: **smart middle-elision** — keep first ~40% and last ~40% of the content, collapse the middle into a single marker line: `… [1,842 tokens elided — showing head/tail; use \`read_full\` with the same args to see the omitted middle] …`. Head/tail is right because errors/stack traces put the actionable line at the end, and file headers (imports, signatures) matter at the start; middle is usually implementation detail already covered elsewhere.
- Truncation is logged in the budget ledger per call so you can see which tools are chronically over-cap (signal to narrow the tool's own query, not just eat the truncation every time).

### 4.5 Prompt Caching

- `PromptCacheManager` builds a **stable prefix** per session: system prompt + triggered skill bodies + repo map (directory tree + key file signatures) + persistent memory facts pulled in at session start. This prefix is marked via `cacheHint.cacheableUpToIndex` on every Anthropic call.
- Cache invalidation rule: the prefix only changes when (a) a new skill triggers mid-session, (b) memory is explicitly edited, or (c) the repo map changes materially (file added/removed, not on every edit) — anything short of that reuses the same cached prefix across the whole session, which is where the real savings compound over a long session.
- For non-caching providers (OpenAI, Groq, local), the same stable-prefix construction still happens — it just doesn't get the cost discount, but it does keep the prompt structure consistent so switching providers mid-session doesn't require a different context-assembly path.

### 4.6 Local-First Triage

- `ProviderRegistry` exposes a `routeFor(taskType)` resolver. Task types: `fileSearch`, `lintSummary`, `containsCheck`, `compaction`, `embedding`, `complexEdit`, `planning`.
- Default routing table (overridable in `.toolrc`):
  ```yaml
  routing:
    fileSearch: ollama/qwen2.5-coder:3b # falls back to groq if ollama absent
    lintSummary: ollama/qwen2.5-coder:3b
    containsCheck: ollama/qwen2.5-coder:3b
    compaction: groq/llama-3.1-8b-instant
    embedding: ollama/nomic-embed-text
    complexEdit: anthropic/claude-sonnet-5
    planning: anthropic/claude-sonnet-5
  fallbackOrder: [ollama, lmstudio, groq, openai, anthropic]
  ```
- Given your 4GB VRAM ceiling, the bundled default local model recommendation is a **3B-class Q4 quantized model** (e.g. `qwen2.5-coder:3b-instruct-q4_K_M`, ~2GB resident) for triage tasks — never defaulting to anything that assumes 7B+ comfortably fits, per your constraint. `tool init` runs a one-time VRAM probe (`nvidia-smi` if present, else assume CPU-only) and picks the routing default accordingly, warning if even the 3B model looks tight.

### 4.7 Token-Budget Accounting / Live Meter

- `BudgetLedger` is the single source of truth: every `chat()`/`embed()` call reports `{provider, model, inputTokens, outputTokens, cacheReadTokens, cacheWriteTokens, estimatedCostUSD}` back to it.
- Cost table per model is a small static JSON (`pricing.json`), updatable without a code release, with local models always priced at $0.00 (electricity cost is out of scope, but the meter clearly labels local calls separately so you can see the cloud/local split at a glance).
- Live meter (ink component, `TokenMeter.tsx`) renders during REPL mode as a persistent single line at the top:
  ```
  ⛁ session: 42.1k tok (↑31.2k ↓10.9k) │ $0.087 │ cache-hit 68% │ 2 local, 5 cloud calls
  ```
- `--budget-report` flag on one-shot mode prints a full per-call breakdown table at the end instead of the live line, for CI/scripting use.
- Hard budget cap (optional): `.toolrc` can set `maxSessionCostUSD` — the agent refuses further cloud calls past the cap and falls back to local-only or asks for confirmation to continue, so a runaway loop can never silently rack up a bill.

---

## 5. Skills File Format Spec

Directory-based, one skill per folder:

```
skills/
└── refactor-to-hooks/
    ├── SKILL.md
    ├── scripts/
    │   └── codemod.ts        # optional helper script the skill can invoke
    └── templates/
        └── hook-boilerplate.tsx
```

`SKILL.md` frontmatter schema (YAML):

```yaml
---
name: refactor-to-hooks
description: >
  Converts React class components to function components with hooks.
  Trigger when the user mentions "convert to hooks", "functional component",
  "useState instead of this.state", or asks to modernize class-based React code.
version: 1.0.0
triggers:
  keywords: ["hooks", "class component", "useState", "componentDidMount"]
  fileTypes: [".jsx", ".tsx"]
requiresTools: ["fileEdit", "shell"] # what capabilities must exist for this to run
requiresLocalModel: false # true = disable if no local backend present
tokenCost: low # low|medium|high — hint for the router
---
# Body — only loaded when triggered

<full instructions, examples, edge cases, links to scripts/templates go here>
```

**Loading lifecycle** (this is the token-efficiency mechanism, not just organization):

1. **Index time** (`tool init` or `skills install`): only the frontmatter block is parsed and stored in `SkillRegistry`'s local index (a small JSON/SQLite cache) — never the body.
2. **Every turn**: only `name` + `description` + `triggers` for _all installed skills_ are kept resident in context (this list is itself kept small and cache-friendly — it's part of the stable prefix in §4.5).
3. **Trigger match**: keyword/fileType heuristic match first (free, no model call); if ambiguous, a cheap local-model classification call decides whether to load (`containsCheck` routing) — never the frontier model just to decide _whether_ to load a skill.
4. **On trigger**: the full `SKILL.md` body is loaded into context for that turn only, plus referenced `scripts/`/`templates/` are made available as tool-readable paths (not inlined — the agent reads them via the normal file-read tool only if it actually needs to, so an unused template never costs tokens).
5. **Skill session cache**: once triggered, the body stays resident for the rest of the session (added to the stable cached prefix) rather than being reloaded/re-triggered every turn — matches Claude's own skills lazy-load pattern you referenced.

CLI surface:

- `skills install <git-url|registry-name>` — clones/downloads into `~/.homogenous/skills/` (global) or `.homogenous/skills/` (project-local, takes precedence).
- `skills list` — shows installed skills, trigger keywords, and last-triggered timestamp.
- `skills create <name>` — scaffolds the folder + starter `SKILL.md` with the schema above pre-filled.
- Registry: Phase-N nicety — a single `registry.json` on GitHub Pages/raw GitHub mapping `name → git-url`, resolved by `skills install <name>`. No hosting infra needed to start.

---

## 6. MCP Client Integration Plan

**Build vs. depend:**

- **Depend on** the official `@modelcontextprotocol/sdk` (TypeScript) for the protocol layer itself — message framing, JSON-RPC handling, capability negotiation, both `stdio` and `SSE`/`StreamableHTTP` transports. This is exactly the kind of well-maintained single-purpose dependency your constraints call for; reimplementing MCP's wire protocol would be pure risk for zero differentiation.
- **Build**: everything MCP-adjacent that's specific to Homogenous —
  - `.mcp.json` reader compatible with the existing ecosystem convention (same shape Claude Code/Cursor use) so servers configured elsewhere "just work" without translation.
  - `McpClientManager` — lifecycle management (spawn/connect on demand, not all servers eagerly at startup; tear down idle stdio server processes after an inactivity timeout to avoid leaking child processes on Windows).
  - `ResourceCache` — MCP resource reads go through the _same_ `ToolOutputTruncator` and `BudgetLedger` as built-in tools (§4.4) — an MCP server is not a trusted-to-be-token-efficient citizen just because it's external; cap and log identically.
  - Tool discovery results get folded into the same `ToolDefinition[]` shape used internally, so the agent loop never branches on "is this an MCP tool or a built-in tool" — one dispatch path.
  - Prompt templates exposed by MCP servers are surfaced as user-invocable slash-commands in the REPL, not auto-injected into context.

`mcp add <server>` / `mcp list` mirror `skills install`/`skills list` UX for consistency — same confirmation flow, same "where does this live" (project `.mcp.json` vs. global `~/.homogenous/mcp.json`) precedence rule as the rest of config.

---

## 7. Slash Command System

The original pass didn't have one — worth calling out, because without it every meta-action ("switch model," "clear context," "show me the diff before applying") has to be phrased as a natural-language request to the model, which is slower, burns tokens on something that should be free, and is ambiguous to parse reliably. Slash commands are a **local, no-model-call, deterministic** input path, parsed before anything reaches `AgentLoop`.

### 7.1 Input routing

`parseSlashInput.ts` is the first thing every REPL line hits:

```typescript
// src/cli/commands/parseSlashInput.ts

export type ParsedInput =
  | { kind: "prompt"; text: string } // normal message to the agent
  | { kind: "command"; name: string; args: string[]; raw: string };

export function parseSlashInput(line: string): ParsedInput {
  const trimmed = line.trim();
  if (!trimmed.startsWith("/")) return { kind: "prompt", text: trimmed };

  // "/model list" -> name="model", args=["list"]
  const [nameToken, ...rest] = trimmed.slice(1).split(/\s+/);
  return {
    kind: "command",
    name: nameToken.toLowerCase(),
    args: rest,
    raw: trimmed,
  };
}
```

A leading `/` is unambiguous in a coding-agent CLI (no legitimate prompt starts with a bare `/word`), so this needs no escape hatch — but one is still worth having: `//` at the start of a line forces plain-prompt interpretation, for the rare case someone actually wants to paste a shell command starting with `/` as text.

### 7.2 Built-in commands (Phase 0 minimum set)

| Command           | Args                          | Effect                                                                                                                                                                           |
| ----------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| `/help`           | `[command]`                   | list all commands, or detailed help for one                                                                                                                                      |
| `/clear`          | —                             | wipe session memory (not persistent memory), start fresh turn history                                                                                                            |
| `/compact`        | `[instructions]`              | force a `ContextCompactor` run now, optionally steering what to preserve                                                                                                         |
| `/undo`           | `[n]`                         | revert the last (or last N) applied file edits — requires `DiffEngine` to keep an undo stack, not just apply-and-forget                                                          |
| `/model`          | `[provider/model]`            | show current model, or switch it for the rest of the session (overrides `.toolrc` routing for `complexEdit`/`planning` only — doesn't touch triage routing)                      |
| `/routing`        | `[taskType] [provider/model]` | view or override the full per-task-type routing table live                                                                                                                       |
| `/provider`       | `status`                      | show detection status of all 5 backends (which local ones are up, which cloud keys are validated)                                                                                |
| `/plan`           | `on\|off`                     | toggle planning mode (produce diff/action-list for approval before any writes)                                                                                                   |
| `/auto`           | `on\|off`                     | toggle auto-approve for non-destructive shell commands (still gates destructive ones regardless — see open question #1 from the risk review, this never fully disables the gate) |
| `/diff`           | —                             | show the pending diff for the last proposed edit without applying it                                                                                                             |
| `/apply`          | `[hunk-id]`                   | apply a pending diff (or one specific hunk) after review                                                                                                                         |
| `/reject`         | `[hunk-id]`                   | discard a pending diff without applying                                                                                                                                          |
| `/remember`       | `"<fact>"`                    | shortcut for `memory remember`, scoped to current project                                                                                                                        |
| `/forget`         | `"<fact>                      | <id>"`                                                                                                                                                                           | shortcut for `memory forget` |
| `/memory`         | `list\|edit`                  | inspect or open `.agentmemory/facts.json`                                                                                                                                        |
| `/skills`         | `list\|<name>`                | list installed skills, or force-trigger one this turn regardless of keyword match                                                                                                |
| `/mcp`            | `list\|<server>`              | list connected MCP servers/tools, or show one server's exposed tools/resources/prompts                                                                                           |
| `/budget`         | `[--report]`                  | show live ledger snapshot; `--report` prints the full per-call breakdown table (same as the one-shot flag)                                                                       |
| `/config`         | `show\|edit`                  | print resolved config (with precedence source annotated per key) or open `.toolrc` in `$EDITOR`                                                                                  |
| `/login`          | `<provider>`                  | run the BYOK validate-then-store flow for a cloud provider mid-session                                                                                                           |
| `/init`           | —                             | run project scaffolder without leaving the REPL                                                                                                                                  |
| `/save`           | `<name>`                      | checkpoint current session (turns + budget ledger state) to disk                                                                                                                 |
| `/resume`         | `<name>`                      | reload a saved session                                                                                                                                                           |
| `/exit` / `/quit` | —                             | end REPL session                                                                                                                                                                 |

Every command here does **zero model calls** except `/compact` (which deliberately routes to the cheap model per §4.6, same as an automatic compaction trigger) and `/skills <name>` force-trigger (which loads the skill body but doesn't itself call the model — the next prompt does).

### 7.3 User-defined custom commands

Same lazy-load philosophy as the skills system, but simpler — these are pure prompt templates, not full capability packages:

```
~/.homogenous/commands/          # global, available in every project
.homogenous/commands/            # project-local, takes precedence on name collision
└── review-pr.md
```

```markdown
---
name: review-pr
description: Review the current branch's diff against main for bugs and style issues.
args: [base_branch] # optional positional args, referenced as {{base_branch}}
defaultArgs:
  base_branch: main
---

Review the diff between HEAD and {{base_branch}}. Focus on: correctness bugs,
missing error handling, and anything that contradicts the conventions in
.agentmemory/facts.json. Don't comment on formatting.
```

Invoked as `/review-pr` or `/review-pr develop`. On invocation: `SlashCommandRegistry` resolves the template, substitutes `{{args}}`, and injects the result as the next user turn — no separate parsing path needed in `AgentLoop`, it's just a shortcut for typing a longer prompt. This is deliberately **not** the same mechanism as skills: custom commands are static templates (cheap, no trigger-matching logic needed since the user is invoking them explicitly by name), skills are heuristically triggered capability bundles with scripts/templates attached.

### 7.4 MCP prompt templates as slash commands

Per §6, any MCP server that exposes prompt templates gets them surfaced the same way: `/mcp:<server>:<prompt-name>` (namespaced to avoid collisions between servers, and between MCP prompts and local custom commands). `/help` lists these in a separate section so it's clear which commands are local vs. server-provided.

### 7.5 Autocomplete & discoverability

- Ink REPL shows a filtered command list on typing `/` (fuzzy-matched against name + description), same UX pattern as Claude Code / most modern CLI chat tools — this is a small but real usability item, worth budgeting real time for in Phase 0, not bolting on later.
- `Tab` completes the highlighted suggestion; arg hints (from the command's schema) show inline as you type, e.g. `/model [provider/model]`.
- `/help` with no args groups commands by category (Session, Model & Routing, Memory, Skills, MCP, Diff & Edits, Budget, Config) rather than one flat alphabetical list — flat lists stop being useful past ~15 commands, which this set already exceeds.

### 7.6 One-shot mode mapping

Non-interactive mode doesn't have a REPL to type `/` into, so every stateful slash command needs a CLI flag equivalent so scripts/CI can do the same things: `--model`, `--plan`, `--auto-approve`, `--budget-report`, `--routing <taskType>=<provider/model>`. `ConfigResolver`'s existing precedence (flags > project `.toolrc` > global `.toolrc`) covers this without new plumbing — one-shot flags just populate the same config object a REPL `/model` command would mutate at runtime.

---

## 8. Phased Build Roadmap

Each phase produces something you can actually use standalone before moving on — same spirit as the tiering-engine phasing.

**Phase 0 — Skeleton + single-provider chat loop**

- CLI scaffold (bin entry, REPL shell, one-shot mode), `ConfigResolver` with the three-tier precedence, `platform/` Windows-safe path & shell helpers.
- Slash command scaffold (§7): `parseSlashInput`, `SlashCommandRegistry`, and the Phase-0-relevant subset (`/help`, `/clear`, `/model`, `/config`, `/login`, `/exit`) plus `/` autocomplete in the Ink REPL. The rest of §7.2's commands get added alongside the feature they control, not retrofitted later.
- Only `AnthropicProvider` implemented (fastest path to something real).
- No tools yet — pure chat, no file access. Validates the plumbing (streaming to terminal, keychain login flow) end to end.
- _Usable as_: a `claude`-style raw chat CLI with your own key.

**Phase 1 — File tools + confirmation gate**

- `fileTools.ts` (read/write/edit), `shellTool.ts` with the mandatory confirmation gate mirroring JARVIS's pattern, `gitTools.ts` basics (status/diff/log — read-only first).
- `DiffEngine` v1: propose diffs, apply after confirmation, no truncation/budget layer yet.
- _Usable as_: a real (if token-wasteful) coding agent against one provider.

**Phase 2 — Multi-backend + model routing**

- `OllamaProvider`, `LMStudioProvider`, `OpenAIProvider`, `GroqProvider` implemented against the same interface.
- Startup auto-detection, `ProviderRegistry.routeFor()`, `.toolrc` routing config.
- _Usable as_: fully zero-cost-capable if you want it to be — this is the point where the "dual backend" differentiator is real, not aspirational.

**Phase 3 — Token-efficiency layer, part 1 (the cheap wins)**

- `ToolOutputTruncator` (middle-elision), `BudgetLedger` + live `TokenMeter` UI.
- These are independently valuable and low-risk before the harder retrieval/compaction pieces.
- _Usable as_: you can now _see_ what every session is costing/using — informs tuning the rest.

**Phase 4 — Selective file context (retrieval)**

- Ripgrep-based retrieval first (no embeddings yet) — biggest token win for smallest complexity.
- `web-tree-sitter` AST chunking, then embedding index (Ollama `nomic-embed-text`) + hybrid rank, only once ripgrep-only is proven insufficient on a real repo.
- _Usable as_: works on repos too big to naively dump into context — the actual scope-comparable-to-Claude-Code milestone.

**Phase 5 — Context compaction + persistent memory**

- `ContextCompactor` with the 70%-threshold trigger, `PersistentMemory` (`.agentmemory/`) reader/writer, `remember`/`forget`/`memory list`/`memory edit` commands, `MemoryRetriever` relevance scoring.
- _Usable as_: sessions no longer degrade/truncate ungracefully on long tasks; project facts survive across sessions.

**Phase 6 — Prompt caching + planning mode**

- `PromptCacheManager` stable-prefix construction, cache-hint wiring for Anthropic.
- `PlanningMode` (diff/action-list-for-approval before any writes) as a toggleable mode distinct from direct execution.
- _Usable as_: the cost-per-session drops materially on repeat/long sessions; you get a review step for risky multi-file changes.

**Phase 7 — Skills system**

- `SkillLoader` frontmatter-scan + lazy body load, `SkillRegistry`, `skills create` scaffolder, 2-3 bundled starter skills (e.g. "commit message writer," "test scaffolder").
- `skills install <git-url>` before the registry JSON (registry is Phase 9).
- _Usable as_: capability extension without re-engineering the agent loop each time.

**Phase 8 — MCP client**

- `McpClientManager` on `@modelcontextprotocol/sdk`, stdio transport first (simpler, covers most existing servers), then SSE/HTTP.
- `.mcp.json` convention support, tool-result routing through the same truncation/budget layer.
- _Usable as_: plugs into the existing MCP server ecosystem immediately.

**Phase 9 — Sub-agent delegation + polish**

- `SubAgent.ts` scoped task delegation with trimmed context for large tasks.
- Skills registry JSON + `skills install <registry-name>` resolution.
- Packaging polish: single-executable option, `tool init` project-type detection templates for common stacks.
- _Usable as_: the full-scope tool as specified; everything after this is refinement, not new capability.

---

### Open questions worth answering before Phase 0 (not blockers, but cheap to settle now)

1. Should the confirmation gate for shell commands be an allow-list of "known safe" commands (git status, ls, cat) that skip confirmation, or confirm-everything-except-reads by default? (JARVIS's pattern — worth confirming it's still what you want here.)
2. For the free-tier Groq routing default — any preference on which hosted model, given their available model list changes fairly often?
3. Do you want `.agentmemory/` committed to the repo by default (shareable with collaborators / across machines via git) or gitignored (personal-only)? Changes the `tool init` scaffold's `.gitignore` entry.
