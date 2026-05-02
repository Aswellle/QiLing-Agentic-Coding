# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
bun run dev                        # Run in development mode
bun run dev:debug                  # Run with QILING_DEBUG=1

# Testing
bun test                           # Run all tests
bun test tests/unit/permissions/classifier.test.ts  # Run a single test file
bun test --grep "MEDIUM RISK"      # Run tests matching a pattern
bun test --coverage                # Run with coverage report

# Type checking & linting
bun run typecheck                  # tsc --noEmit
bunx @biomejs/biome check src/     # Lint
bunx @biomejs/biome check --write src/  # Auto-fix

# Building
bun run build                      # Build for current platform
bun run build:windows              # Build Windows .exe
bun run build:all                  # Build all platforms
```

Tests use Bun's native test runner; import from `bun:test`, not Jest/Vitest.

## Architecture

**QiLing (启灵)** is a terminal AI programming agent — Chinese-first, open-source, Claude Code-inspired. It compiles to a single cross-platform Bun binary.

### Core Loop

```
main.tsx (CLI entry, Commander.js)
  → Load settings (CLI > project .qiling/ > global ~/.qiling/ > defaults)
  → createProvider(settings)    // src/providers/index.ts
  → buildToolRegistry(settings) // src/tools/index.ts
  → Load MCP tools + skills
  → Render Ink REPL (src/components/REPL.tsx)
        → PromptInput → runQuery() → Provider.stream()
             → collect tool_use blocks
             → PermissionManager.check()   // src/permissions/manager.ts
             → execute tools (parallel for read-only)
             → recurse until no tool_use
             → auto-compact when token usage > 80%
```

### Key Modules

| Path | Role |
|---|---|
| `src/main.tsx` | CLI entry point, argument parsing |
| `src/query.ts` | `runQuery()` — the agentic loop (stream → tools → recurse) |
| `src/components/REPL.tsx` | Root Ink component, manages conversation state |
| `src/providers/index.ts` | `createProvider()` factory for 10+ AI providers |
| `src/tools/index.ts` | `buildToolRegistry()` — all 14 tools |
| `src/permissions/manager.ts` | Permission check + decision recording |
| `src/permissions/classifier.ts` | Risk-classify Bash commands (high/medium/low) |
| `src/settings/loader.ts` | 4-level config loading with Zod validation |
| `src/compact/engine.ts` | Context compression when approaching token limits |
| `src/hooks/index.ts` | PreToolUse / PostToolUse / Stop lifecycle hooks |

### Providers

All providers implement a unified `Provider` interface. `anthropic.ts` uses the official `@anthropic-ai/sdk` natively; all others (`qwen.ts`, `doubao.ts`, `glm.ts`, `ollama.ts`, etc.) go through the OpenAI-compatible adapter in `openai-compat.ts` using the `openai` SDK.

### Tools

Tools implement `Tool<TInput>` with a Zod input schema. Read-only tools (`FileRead`, `Glob`, `Grep`, `WebFetch`, `RepoMap`) run in parallel; write/execute tools run sequentially and go through the permission system. `AgentTool` spawns sub-agents with depth limiting.

### Permission System

`PermissionManager` checks each tool call against:
1. `--yolo` / `--readonly` CLI flags
2. Glob-pattern allow/deny rules (session > project > global scope)
3. `classifier.ts` risk level for Bash commands

Decisions can be recorded at `once`, `session`, `project`, or `global` scope.

### Settings

Loaded in priority order: CLI flags → `.qiling/settings.json` (project) → `~/.qiling/settings.json` (global) → defaults. Schema defined with Zod in `src/settings/schema.ts`.

### TUI Stack

Ink 5.x + React 18 render the terminal UI. Key components: `REPL.tsx` (root), `PromptInput.tsx` (input + slash command autocomplete), `Message.tsx` (conversation), `ToolCallDisplay.tsx` (tool status), `PermissionDialog.tsx` (Y/N/A/D prompts), `StatusBar.tsx` (token usage).

## Tech Stack

- **Runtime / Build:** Bun 1.x (TypeScript-native, single-binary compilation)
- **TUI:** Ink 5.x + React 18
- **AI:** `@anthropic-ai/sdk` (native) + `openai` SDK (OpenAI-compat adapter)
- **CLI:** commander.js
- **Validation:** Zod
- **Linter:** Biome (Rust-based, replaces ESLint + Prettier)
- **External deps:** `ripgrep` (code search, PATH), optional LSP binaries

## Project Docs

Detailed design and architecture documents live in `docs/`:
- `docs/04-ARCHITECTURE.md` — full technical design
- `docs/06-SECURITY-MODEL.md` — threat model and defense layers
- `docs/07-TESTING-STRATEGY.md` — test approach

## CI/CD

GitHub Actions runs typecheck + tests on Ubuntu/Windows/macOS on every push/PR (`.github/workflows/ci.yml`). Releases are triggered by version tags and produce cross-platform binaries uploaded to GitHub releases (`.github/workflows/release.yml`).
