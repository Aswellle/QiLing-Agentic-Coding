# PRE_EXISTING_NEW.md

> QiLing-only files (no CC equivalent)
> **Purpose:** Phase D feature-extension candidates + architecture delta log
> **Rule:** Never enter BATCH_PLAN — mark KEPT / op=skip
> **Total:** 52 files

---

## Type Legend

| Type | Meaning |
|------|--------|
| `ARCH_DIFF` | Architecture difference — QiLing restructured module boundaries |
| `FEATURE_EXT` | Feature extension — QiLing added capability CC lacks |
| `PROVIDER` | Multi-model provider support (CC is Anthropic-only) |
| `TOOL_EXT` | QiLing-only tool |
| `INFRA` | Dev stubs / scaffolding |

---

## File List

| # | QiLing Path | T | Type | Description | Phase D Note |
|---|------------|---|------|-------------|-------------|
| 1 | `compact/reactiveCompact.ts` | T6 | ARCH_DIFF | Reactive Compact — ported from CC's servicescompactreac | Promoted from services/compact/ |
| 2 | `compact/snipCompact.ts` | T6 | ARCH_DIFF | History snip compaction — inspired by CC's servicescomp | Promoted from services/compact/ |
| 3 | `compact/warningHook.ts` | T6 | ARCH_DIFF | React hook for compact warning suppression — adapted fr | Promoted from services/compact/ |
| 4 | `compact/warningState.ts` | T6 | ARCH_DIFF | Compact warning suppression state — adapted from CC's s | Promoted from services/compact/ |
| 5 | `components/AskUserQuestionDialog.tsx` | T2 | FEATURE_EXT | AskUserQuestionDialogx | QiLing-only UI component |
| 6 | `components/DiffView.tsx` | T2 | FEATURE_EXT | DiffViewx | QiLing-only UI component |
| 7 | `components/PlanApprovalDialog.tsx` | T2 | FEATURE_EXT | PlanApprovalDialogx | QiLing-only UI component |
| 8 | `components/StartupBanner.tsx` | T2 | FEATURE_EXT | ── Spring Green Palette ─────────────────────────────── | QiLing-only UI component |
| 9 | `components/StatusBar.tsx` | T2 | FEATURE_EXT | StatusBarx | QiLing-only UI component |
| 10 | `components/ToolCallDisplay.tsx` | T2 | FEATURE_EXT | ToolCallDisplayx | QiLing-only UI component |
| 11 | `keybindings/loader.ts` | T4 | ARCH_DIFF | loader | Architecture difference |
| 12 | `modes/planMode.ts` | T0 | ARCH_DIFF | Permission Mode System — CC's Shift+Tab cycle pattern | Plan-mode state machine (top-level in QL) |
| 13 | `permissions/classifier.ts` | T6 | ARCH_DIFF | Risk levels for shell commands | Permissions promoted to top-level |
| 14 | `permissions/rules.ts` | T6 | ARCH_DIFF | Permission rule matching — aligned with CC's shellRuleM | Permissions promoted to top-level |
| 15 | `plugins/loader.ts` | T6 | ARCH_DIFF | Plugin loader — scans .qilingplugins for .ts  .js files | Architecture difference |
| 16 | `providers/anthropic.ts` | EXT | PROVIDER | anthropic | Multi-model provider (CC is Anthropic-only) |
| 17 | `providers/doubao.ts` | EXT | PROVIDER | 字节跳动 Doubao (豆包) Provider | Multi-model provider (CC is Anthropic-only) |
| 18 | `providers/glm.ts` | EXT | PROVIDER | 智谱 AI GLM Provider | Multi-model provider (CC is Anthropic-only) |
| 19 | `providers/ollama.ts` | EXT | PROVIDER | Ollama 本地模型 Provider | Multi-model provider (CC is Anthropic-only) |
| 20 | `providers/openai-compat.ts` | EXT | PROVIDER | Known context windows for common models | Multi-model provider (CC is Anthropic-only) |
| 21 | `providers/qwen.ts` | EXT | PROVIDER | 阿里云通义千问 Provider | Multi-model provider (CC is Anthropic-only) |
| 22 | `providers/vertex.ts` | EXT | PROVIDER | GCP Vertex AI Provider | Multi-model provider (CC is Anthropic-only) |
| 23 | `services/background/sessions.ts` | T5 | ARCH_DIFF | Background session registry — adapted from CC's LocalMa | QiLing-specific service |
| 24 | `services/cron/scheduler.ts` | T5 | ARCH_DIFF | Minimal cron scheduler for QiLing. | QiLing-specific service |
| 25 | `services/memory/extractor.ts` | T5 | ARCH_DIFF | Memory extractor — ported from CC's servicesextractMemo | QiLing-specific service |
| 26 | `services/messaging/bus.ts` | T5 | ARCH_DIFF | In-process message bus for inter-agent communication. | QiLing-specific service |
| 27 | `services/oauth/authCodeListener.ts` | T5 | ARCH_DIFF | OAuth Authorization Code Listener — direct port of CC's | QiLing-specific service |
| 28 | `services/outputStyles/loader.ts` | T5 | ARCH_DIFF | loader | QiLing-specific service |
| 29 | `services/tips.ts` | T5 | ARCH_DIFF | Rotating tipshints system — inspired by CC's servicesti | QiLing-specific service |
| 30 | `services/toolUseSummary/generator.ts` | T5 | ARCH_DIFF | Tool-use summary generator — ported from CC's servicest | QiLing-specific service |
| 31 | `settings/loader.ts` | T0 | ARCH_DIFF | loader | Architecture difference |
| 32 | `skills/loader.ts` | T6 | ARCH_DIFF | Skills System — 自定义 slash 命令（类似 Claude Code 的 skills 系统 | Architecture difference |
| 33 | `stubs/react-devtools-core.ts` | EXT | INFRA | Production stub for react-devtools-core. | Dev stub |
| 34 | `tools/AgentTool/built-in/qilingGuideAgent.ts` | T1 | FEATURE_EXT | QiLing guide agent definition — adapted from CC's tools | QiLing built-in guide agent |
| 35 | `tools/ExitPlanModeTool.ts` | T1 | ARCH_DIFF | ExitPlanModeTool | Tool-layer arch difference |
| 36 | `tools/LspTool.ts` | T1 | TOOL_EXT | LSP Tool — Language Server Protocol diagnostics via per | QiLing-only tool |
| 37 | `tools/McpTool.ts` | T1 | TOOL_EXT | MCP Tool Bridge — Phase 5 upgrade to persistent SDK-bas | QiLing-only tool |
| 38 | `tools/NotebookReadTool.ts` | T1 | ARCH_DIFF | NotebookReadTool | Tool-layer arch difference |
| 39 | `tools/RepoMapTool.ts` | T1 | TOOL_EXT | RepoMap — lightweight repository symbol index (inspired | QiLing-only tool |
| 40 | `tools/SleepTool.ts` | T1 | TOOL_EXT | SleepTool | QiLing-only tool |
| 41 | `tools/toolUtils.ts` | T1 | ARCH_DIFF | Tool message tagging utilities — adapted from CC's tool | Tool-layer arch difference |
| 42 | `types/message.ts` | T7 | ARCH_DIFF | message | QiLing-specific types |
| 43 | `types/provider.ts` | T7 | PROVIDER | provider | Multi-model provider (CC is Anthropic-only) |
| 44 | `types/tool.ts` | T7 | ARCH_DIFF | tool | QiLing-specific types |
| 45 | `utils/errorMessages.ts` | T6 | ARCH_DIFF | 生产级错误信息映射 | Architecture difference |
| 46 | `utils/mentions.ts` | T6 | ARCH_DIFF | 支持的 mention 类型： | Architecture difference |
| 47 | `utils/migrations.ts` | T6 | ARCH_DIFF | Settings migration utilities — ported from CC's migrati | Architecture difference |
| 48 | `utils/modelAliases.ts` | T6 | ARCH_DIFF | Model alias utilities — ported from CC's utilsmodelalia | Architecture difference |
| 49 | `utils/processUtils.ts` | T6 | ARCH_DIFF | Generic process utilities — ported from CC's utilsgener | Architecture difference |
| 50 | `utils/renderMarkdown.ts` | T6 | ARCH_DIFF | Markdown → Ink-compatible plain text renderer. | Architecture difference |
| 51 | `utils/themeContext.tsx` | T6 | ARCH_DIFF | React context for QiLing's theme system. | Architecture difference |
| 52 | `utils/updater.ts` | T6 | ARCH_DIFF | 启动时检查新版本（非阻塞，后台运行） | Architecture difference |

---

## Type Distribution

- `ARCH_DIFF`: 32
- `FEATURE_EXT`: 7
- `INFRA`: 1
- `PROVIDER`: 8
- `TOOL_EXT`: 4
