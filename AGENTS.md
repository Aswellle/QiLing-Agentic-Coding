# Repository Guidelines

# Project Overview

**QiLing (启灵)** is a terminal-based AI coding agent — a Claude Code clone written in TypeScript/Bun using React Ink for the TUI. It provides an interactive REPL for AI-assisted software engineering with multi-provider LLM support, permission-gated tool execution, multi-agent coordination, context compression, and a plugin/skill ecosystem.

- **Version**: 0.5.0
- **License**: MIT
- **Binary**: Single cross-platform Bun binary (`qiling`)

---

# Architecture & Data Flow

## Core Loop

```
main.tsx → loadSettings() → createProvider() → buildToolRegistry() → PermissionsManager
  → REPL.tsx (Ink) → PromptInput → runQuery()
      → Provider.stream() → collect tool_use chunks → PermissionManager.check()
      → StreamingToolExecutor (parallel safe / serial unsafe) → recurse
      → auto-compact when token usage > 80%
```

## Agentic Loop (`src/query.ts :: runQuery()`)

The heart of the application. Multi-round loop:

1. **Pre-loop**: Auto-compact threshold check, history snip, ContextCollapse, Microcompact
2. **Build system prompt**: memoryPrompt + systemContext + modeSystemPrompt + brief + memories + userContext (git status, date, CLAUDE.md)
3. **Stream**: `provider.stream(messages, toolDefinitions)` → AsyncGenerator<StreamChunkType>
4. **Stream handling**: text_delta → accumulate; tool_use_start → register pending; tool_use_delta → accumulate JSON; tool_use_stop → parse JSON, check concurrency safety, check permissions, dispatch to executor
5. **After stream**: Build assistant message (thinking blocks → text → tool_use blocks)
6. **Execute**: Permission checks for non-safe tools → `executor.addTool()` → special handling for AskUserQuestion, EnterPlanMode, ExitPlanMode
7. **Collect results**: `executor.getRemainingResults()` → append as user message with tool_result blocks
8. **Post-round**: Fire tool use summary (Haiku, non-blocking), check max turns, check token budget, refresh MCP tools → continue loop
9. **On exit**: Auto-memory extraction, SessionMemory update, MagicDocs update (fire-and-forget)

## StreamingToolExecutor (`src/query/StreamingToolExecutor.ts`)

Key insight: safe (read-only) tools start executing the moment their input JSON is complete, while the AI is still streaming other tool calls.

- **Concurrent-safe tools**: Run in parallel (capped at `QILING_MAX_TOOL_CONCURRENCY=10`)
- **Non-safe tools**: Execute alone (exclusive lock)
- **Results**: Yielded in original order
- **Error handling**: Bash/PowerShell errors abort sibling tools via `createChildAbortController`
- **Discard()**: For streaming fallback / model switch

## Provider System

Factory pattern: `createProvider(settings: Settings): Provider`

| Provider | Implementation |
|----------|---------------|
| `anthropic` | `@anthropic-ai/sdk` |
| `bedrock` | AWS SDK |
| `vertex` | GCP SDK |
| `openai`, `gemini`, `minimax` | `openai-compat.ts` |
| `qwen`, `doubao`, `glm` | Dedicated factory functions |
| `ollama` | `openai-compat.ts` |

Each provider has a default model fallback when `claude-sonnet-4-6` or empty is specified.

## Permission System

**Modes** (Shift+Tab cycle):
- `act` — write/execute require per-call confirmation (default)
- `acceptEdits` — auto-approve FileEdit/FileWrite; shell still prompts
- `plan` — read-only: FileRead, Glob, Grep, WebFetch, WebSearch, TodoWrite, NotebookRead, AskUserQuestion, RepoMap

**Classifier** (`src/permissions/classifier.ts`): Risk-classifies Bash commands into high/medium/low using pattern matching.

**Manager** (`src/permissions/manager.ts`): Orchestrates checks, records decisions, manages allow/deny lists.

## Context Compression (`src/compact/engine.ts`)

- **Auto-compact**: Triggered when token usage > 80%
- **Microcompact**: Truncates verbose tool_results
- **ContextCollapse**: Folds old tool rounds into summary
- **History snip**: Removes oldest messages when approaching limits

## Boot Sequence

1. Parse CLI args (Commander.js)
2. `loadSettings()` — 4-level config (default → global → project → CLI)
3. `createProvider()`
4. `buildToolRegistry()`
5. Create `PermissionsManager`
6. Either Print mode (`runQuery()` once) or Interactive mode (`render <REPL>`)

## Subcommands

- `qiling version` — Show version
- `qiling mcp list/add/remove` — Manage MCP servers in settings.json
- `qiling auth status/set-key` — Manage API keys
- `qiling doctor` — Diagnose installation/config/environment

---

# Key Directories

| Directory | Purpose |
|-----------|---------|
| `src/components/` | Ink TUI components (REPL, StatusBar, PromptInput, Message) |
| `src/providers/` | 10 LLM provider implementations |
| `src/tools/` | 40+ tool implementations |
| `src/permissions/` | Permission classifier, manager, rules |
| `src/settings/` | 4-level config loader with Zod validation |
| `src/compact/` | Context compression engine |
| `src/hooks/` | PreToolUse / PostToolUse / Stop lifecycle hooks |
| `src/modes/` | Plan mode tool filtering |
| `src/coordinator/` | Multi-agent orchestration |
| `src/vim/` | Vim mode state machine |
| `src/plugins/` | Plugin/skill loader |
| `src/key-bindings/` | JSON-configurable key bindings + chord system |
| `src/services/` | Sessions, memory, cron, tasks, teams, worktree |
| `src/commands/` | Slash commands (`/commit`, `/review`, ...) |
| `src/buddy/` | ASCII companion sprite system |
| `src/utils/` | Theme, helpers, shared utilities |
| `scripts/` | Install scripts, bump-version, skill helpers |
| `docs/` | Architecture, security model, testing strategy, replication |
| `tests/` | Unit tests (bun:test) |

---

# Development Commands

## Essential Commands

```bash
# Development
bun run dev                        # Run in development mode
bun run dev:debug                  # Run with QILING_DEBUG=1

# Testing
bun test                           # Run all tests
bun test tests/unit/permissions/classifier.test.ts  # Single file
bun test --test-name-pattern "MEDIUM RISK"         # Filter by name
bun test --coverage                # Coverage (informational, no thresholds)
bun run test:watch                 # Watch mode

# Type checking & linting
bun run typecheck                  # tsc --noEmit
bunx @biomejs/biome check src/     # Lint
bunx @biomejs/biome check --write src/  # Auto-fix

# Building
bun run build                      # Current platform (alias for build:linux-x64)
bun run build:windows              # Windows .exe
bun run build:all                  # All 5 platform targets

# Releasing
bun run release:patch              # Bump patch + git tag
bun run release:minor              # Bump minor + git tag
bun run install:link               # bun link for local dev
```

## Build Targets

| Target | Output |
|--------|--------|
| `build:linux-x64` | `dist/qiling-linux-x64` |
| `build:linux-arm64` | `dist/qiling-linux-arm64` |
| `build:macos-x64` | `dist/qiling-macos-x64` |
| `build:macos-arm64` | `dist/qiling-macos-arm64` |
| `build:windows` | `dist/qiling-windows-x64.exe` |

All builds use `--compile --minify` for self-contained native binaries.

## CI/CD

- **ci.yml**: Push to main/develop, PRs → typecheck + test + coverage (Codecov)
- **release.yml**: Tags `v*.*.*` → test → build (5-target matrix) → release with auto-generated notes
- **update-homebrew.yml**: Release published → update Homebrew formula SHA256
- **Binary size guard**: CI fails if Linux binary exceeds 150 MB

---

# Code Conventions & Common Patterns

## TypeScript Configuration

- **Target**: ESNext, **Module**: ESM, **ModuleResolution**: Bundler (required by Bun)
- **JSX**: react-jsx (automatic runtime)
- **Strict**: true, **skipLibCheck**: true
- **Types**: `bun-types` (replaces `@types/node`)
- **Path alias**: `@/*` → `./src/*`

## Formatting & Linting

- **Sole tool**: Biome ^1.9.4 — no ESLint, Prettier, or EditorConfig
- **Style**: 2-space indent, spaces (not tabs), organizeImports enabled
- **Override**: `src/buddy/CompanionSprite.tsx` disables `noArrayIndexKey` (intentional index keys in sprite lists)

## Naming Conventions

- **Files**: PascalCase for components (`REPL.tsx`), camelCase for utilities (`theme.ts`)
- **Tests**: `*.test.ts` suffix, co-located in `tests/unit/` mirroring `src/` structure
- **Constants**: UPPER_SNAKE_CASE (`QILING_MAX_TOOL_CONCURRENCY`)
- **Private**: Leading underscore (`_internal`)

## Error Handling

- Use `Result<T, E>` pattern or throw typed errors
- Bun-specific: `Bun.file()` for file I/O, `Bun.$` for shell commands
- Stream errors: Check `chunk.type === 'error'` in stream generators
- Permission errors: Return structured `{ behavior: 'deny', message }` or `{ behavior: 'ask' }`

## Async Patterns

- **Streams**: AsyncGenerator<StreamChunkType> with `for await (const chunk of stream)`
- **Concurrency**: `Promise.all()` for parallel safe tools, serial execution for unsafe
- **Cancellation**: `AbortController` with `createChildAbortController` for parent propagation
- **Fire-and-forget**: Auto-memory extraction, session updates — no await

## Dependency Injection

- No DI framework — manual construction and passing
- `ToolContext` carries all dependencies (provider, permissions, config, callbacks)
- `Settings` object threaded through all layers
- Test mocking via constructor injection (no jest.mock / bun.mock)

## State Management

- **TUI**: React Ink components with `useReducer` for complex state (REPL, PromptInput)
- **Settings**: Immutable loaded config, validated by Zod at load time
- **Vim mode**: Dedicated state machine in `src/vim/`
- **Permission mode**: Cycled via Shift+Tab, stored in REPL state

## Import Conventions

- Relative imports within src/ (`../utils/theme`)
- Path alias `@/utils/theme` for cross-cutting imports
- Tests use relative paths (`../../../src/...`)
- External imports grouped: Bun built-ins → npm packages → local

## Code Comments

- **Default**: English comments
- **Replication markers** (required when applicable):
  - `// LOC:` — UI-visible strings
  - `// NAME:` — CC brand strings ("Claude" / "Anthropic")
  - `// FROM CC:` — copy-block source function/type name
  - `// QILING-IDENTITY:` — L1/L2 protection markers
  - `// PLATFORM:` — Platform-specific logic (CJK width, etc.)
  - `// IMPROVED:` — QiLing improvements over CC
  - `// BUN:` — Bun vs Node API differences

---

# Important Files

| File | Role |
|------|------|
| `src/main.tsx` | CLI entry (Commander.js), signal handlers, subcommands |
| `src/query.ts` | `runQuery()` — core agentic loop |
| `src/query/StreamingToolExecutor.ts` | Concurrent tool execution engine |
| `src/components/REPL.tsx` | Root Ink component, mode cycling, session management |
| `src/providers/index.ts` | `createProvider()` factory |
| `src/providers/openai-compat.ts` | Shared OpenAI-compatible base |
| `src/tools/index.ts` | `buildToolRegistry()` — 40+ tools |
| `src/permissions/manager.ts` | Permission orchestration + recording |
| `src/permissions/classifier.ts` | Bash risk classification |
| `src/settings/loader.ts` | 4-level config loading with Zod |
| `src/compact/engine.ts` | Context compression (auto-compact, microcompact, ContextCollapse) |
| `src/hooks/index.ts` | PreToolUse / PostToolUse / Stop hooks |
| `src/modes/planMode.ts` | Plan mode tool filtering |
| `src/plugins/loader.ts` | `.qiling/skills/*.md` + plugin loading |
| `src/key-bindings/` | JSON-configurable + chord key system |
| `src/services/` | Sessions, memory, cron, tasks, teams, worktree |
| `src/commands/index.ts` | Slash commands (`/commit`, `/review`, ...) |
| `biome.json` | Lint/format configuration |
| `tsconfig.json` | TypeScript configuration |

---

# Runtime/Tooling Preferences

## Runtime

- **Bun** >= 1.1.0 — sole runtime, no Node.js fallback
- **Package manager**: Bun (`bun.lock` — sole lockfile)
- **CI**: `--frozen-lockfile` enforced
- **Binary**: `bun build --compile` for self-contained native executables

## Tooling Constraints

- **External binaries**: `ripgrep` (PATH) for search, LSP binaries for code intelligence
- **Windows**: PowerShellTool is primary; BashTool requires WSL/Git Bash
- **Windows Terminal**: Shift+Tab needs VT support (Windows Terminal/ConEmu/VS Code, not raw `cmd.exe`)
- **Build size**: Hard limit 150 MB per binary (CI-enforced)
- **Windows local cross-compile**: Bun 1.3.x fails with "Failed to extract executable" when the Bun cache and the repo live on different drives — set `BUN_INSTALL_CACHE_DIR` to a path on the repo's drive (e.g. `D:\bun-cache`) before `bun run build:all`.

## Dependencies

- **18 direct**, **7 dev** — intentionally minimal
- **No test framework** — uses Bun's built-in `bun:test`
- **No DI framework** — manual construction
- **No state library** — React useReducer + module-level singletons

---

# Testing & QA

## Framework

- **Runner**: `bun test` (Bun's native test runner)
- **Import**: `import { describe, test, expect, beforeEach, afterEach } from 'bun:test'`
- **No config file** — Bun discovers `*.test.ts` by default
- **No mocking framework** — dependency injection + real filesystem in temp dirs

## Test Organization

```
tests/
├── helpers/
│   └── mocks.ts              # Shared mocks (emptyUsage, mockConfig, mockProvider, etc.)
└── unit/
    ├── compact/              # engine, microcompact, queryEngine
    ├── hooks/                # hooks
    ├── modes/                # planMode
    ├── permissions/          # classifier, rules
    ├── query/                # retry, streamingToolExecutor
    ├── session/              # resume
    ├── settings/             # loader
    ├── skills/               # loader
    ├── tasks/                # tasks
    └── tools/                # FileEditTool
```

## Common Patterns

- **describe() grouping** by feature/module
- **Sync tests** for pure functions; **async/await** for tools and streaming
- **Filesystem isolation**: `import.meta.dir + __tmp__` with `beforeEach` mkdir + `afterEach` rmSync
- **Direct imports** from `src/` using relative paths
- **Local helpers** within test files (e.g., `makeMockTool`, `makeRunner`, `testFile`)
- **Expect-style assertions**: verify positive + negative cases, edge cases (empty arrays, missing files, encoding)

## Running Tests

```bash
bun test                                    # All tests
bun test --watch                            # Watch mode
bun test --coverage                         # Coverage (informational)
bun test tests/unit/permissions/classifier.test.ts  # Single file
bun test --test-name-pattern "isRetryable"  # Pattern match
```

## Coverage Expectations

- **No thresholds** — purely informational via `--coverage`
- **Focus areas**: permissions, compact engine, settings loader, skills loader, session resume, plan mode, retry logic, streaming executor, hooks, FileEditTool
- **Uncovered**: providers, most tools, CLI components, React/Ink UI, coordinator

---

# Replication Protocol (Part B)

**Reference codebase (CC)**: `D:\Git-Clone\CC-SRC\claude-code-sourcemap\restored-src\src`
**Core principle**: Maximize CC feature porting + absolutely protect QiLing brand facade and TUI skeleton.

## Time Budget · 80/20 Rule

| Type | Target | Actions |
|------|--------|---------|
| **Code** | ≥ 80% | Read CC → Write/Edit QiLing → typecheck |
| **Docs** | ≤ 20% | Tracker batch updates (start/end), BLOCKED records, git commit |

## Five Core Principles

1. **Copy is honest**: TS→TS same language, prefer `cp` over "rewrite from understanding"
2. **Features toward CC, facade toward QiLing**: See B3 boundary rules
3. **Localization centralized**: Phase B must NOT change UI strings/brand names — use `// LOC:` / `// NAME:` markers
4. **No unilateral architecture decisions**: Naming conflicts/version/dependency/API divergence → BLOCKED, wait for user
5. **State in files**: Tracker is source of truth, but **batch update** not one-by-one

## Bidirectional Boundaries

### Toward CC (maximize porting)

- MISSING → `copy-verbatim`
- PARTIAL → `copy-block` to complete
- DIVERGED → recommend regression, wait for user decision

### Protect QiLing (never approach CC)

#### L1 · Brand Facade (absolute protection · touch = immediate BLOCKED)

- `src/components/StartupBanner.tsx`
- `src/utils/theme.ts`, `src/utils/themeContext.tsx`
- `src/buddy/sprites.ts`, `src/buddy/CompanionSprite.tsx`, `src/buddy/companion.ts`, `src/buddy/types.ts`

#### L2 · TUI Skeleton (structure protection · only add features, never change visuals)

- `src/components/REPL.tsx` — no Box layout/component tree changes
- `src/components/StatusBar.tsx` — no field reordering
- `src/components/PromptInput.tsx` — no visual changes
- `src/components/Message.tsx` — no layout changes
- `src/components/MessageResponse.tsx` — candidate L2

**L2 allowed**: New event handlers, state fields, helper hooks, memo optimizations
**L2 forbidden**: Box layout, border styles, field order, color refs, decorative characters, component tree

#### QiLing Special Modules (absolute protection)

`src/coordinator/` · `src/vim/` · `src/key-bindings/` · `src/plugins/loader.ts` · `src/services/stats.ts` · `src/providers/{qwen,doubao,glm,minimax}.ts` · PowerShell first-class support · Chinese README/docs

## Phase Definitions

| Phase | Trigger | Core Actions | Forbidden |
|-------|---------|-------------|-----------|
| **A.5** Audit | Natural alignment coverage | Read-only, produce tracker/audit_reports | No business code changes |
| **B** Incremental Alignment | BATCH_PLAN batches | Copy-first, 3-stage batches | No UI string/brand changes |
| **C** Localization Injection | Phase B coverage ≥ 95% | Naming replacement + string externalization + CJK layout | Cross-domain mixing |
| **D** Feature Differentiation | Phase C complete | DIFF slice design | Phase B < 95% |

## Phase B Operations

| Op | Scenario |
|---|---|
| `copy-verbatim` | MISSING + architecture compatible (full file copy, only fix imports) |
| `copy-with-refs` | MISSING + calls reorganized modules (copy, then batch-fix refs) |
| `copy-block` | PARTIAL completion (paste functions/branches from CC) |
| `adapt-new` | MISSING + significant architecture difference |
| `adapt-rewrite` | DIVERGED regression (preserve QiLing interface contract) |
| `skip` | CC has but don't want (Notes write reason) |

## Batch 3-Stage Workflow

1. **Batch copy**: All copy-* files at once. Only add required markers, no code changes, no typecheck, no review.
2. **Centralized fix**: Run `bun run typecheck` → batch-fix imports → confirm.
3. **Verify & persist**: Run verify commands → one Edit batch-update tracker → git commit.

## BLOCKED Triggers

- Touching L1/L2 exact paths or special modules
- Naming conflicts / version conflicts / platform abstraction decisions
- 1:N or N:1 restructuring / DIVERGED regression decisions
- Design choices affecting 3+ files
- L3 theme key with no QiLing equivalent

## Documentation

- `docs/replication/BATCH_PLAN.md` — batch plan
- `docs/replication/ALIGNMENT_TRACKER.md` — file-by-file status
- `docs/replication/CC_REPLICATION_SYSTEM.md` — system overview
- `docs/replication/CC_REPLICATION_OPS_MANUAL.md` — ops manual
- `docs/replication/MODULE_TAXONOMY.md` — module taxonomy
- `docs/replication/CODEBASE_MAP.md` — codebase map

## Quick Reference

| Trigger | Action |
|---------|--------|
| User says "continue" | Self-check "which src/ files this session?" → Grep Active Batch → Stage 1 |
| Copied a file | Add required markers → **don't** update tracker immediately |
| Entire batch done | One Edit batch-update all file Status + top Last Updated |
| Stage 1 all copied | typecheck → batch-fix imports → confirm |
| Stage 2 done | verify → one Edit batch-update tracker → git commit |
| Hit L1/L2/special modules | Immediate BLOCKED, no changes |
| CC theme key has no QiLing equivalent | BLOCKED, wait for user |
| Context ≥ 70% | Wrap up, don't push |

---

*AGENTS.md v4.0 · Synthesized from parallel codebase research*
