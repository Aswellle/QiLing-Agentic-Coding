# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

---

# Part A · 项目信息

## Commands

```bash
# Development
bun run dev                        # Run in development mode
bun run dev:debug                  # Run with QILING_DEBUG=1

# Testing (Bun's native test runner; import from `bun:test`, NOT Jest/Vitest)
bun test                           # Run all tests
bun test tests/unit/permissions/classifier.test.ts  # Single file
bun test --grep "MEDIUM RISK"      # Pattern
bun test --coverage                # Coverage
bun run test:watch                 # Watch mode

# Type checking & linting
bun run typecheck                  # tsc --noEmit
bunx @biomejs/biome check src/     # Lint
bunx @biomejs/biome check --write src/  # Auto-fix

# Building
bun run build                      # Current platform
bun run build:windows              # Windows .exe
bun run build:all                  # All platforms

# Releasing
bun run release:patch              # Bump patch + git tag
bun run release:minor              # Bump minor + git tag
bun run install:link               # bun link for local dev
```

## Architecture

**QiLing (启灵)** is a terminal AI programming agent — Chinese-first, open-source, Codex-inspired. Single cross-platform Bun binary.

### Core Loop
```
main.tsx → load settings → createProvider() | buildToolRegistry() | MCP/skills
  → REPL.tsx (Ink) → PromptInput → runQuery()
       → Provider.stream() → collect tool_use → PermissionManager.check()
       → execute tools (parallel safe / serial unsafe) → recurse
       → auto-compact when token usage > 80%
```

### Key Modules

| Path | Role |
|------|------|
| `src/main.tsx` | CLI entry (Commander.js) |
| `src/query.ts` | `runQuery()` agentic loop |
| `src/query/StreamingToolExecutor.ts` | Concurrent tool execution |
| `src/components/REPL.tsx` | Root Ink component |
| `src/providers/index.ts` | `createProvider()` — 10 providers |
| `src/tools/index.ts` | `buildToolRegistry()` — 40+ tools |
| `src/permissions/manager.ts` | Permission check + recording |
| `src/permissions/classifier.ts` | Risk-classify Bash (high/medium/low) |
| `src/settings/loader.ts` | 4-level config loading with Zod |
| `src/compact/engine.ts` | Context compression |
| `src/hooks/index.ts` | PreToolUse / PostToolUse / Stop |
| `src/modes/planMode.ts` | act → acceptEdits → plan (Shift+Tab) |
| `src/coordinator/` | Multi-agent orchestration |
| `src/vim/` | Vim mode state machine |
| `src/plugins/loader.ts` | `.qiling/skills/*.md` + plugins |
| `src/keybindings/` | JSON-configurable + chord |
| `src/services/` | Sessions, memory, cron, tasks, teams, worktree |
| `src/commands/index.ts` | Slash commands (`/commit`, `/review`, ...) |

### Providers
Unified `Provider` interface. `anthropic.ts` uses `@anthropic-ai/sdk`; `bedrock.ts` uses AWS SDK; `vertex.ts` uses GCP; others (qwen/doubao/glm/ollama/minimax/openai/gemini) go through `openai-compat.ts`.

### Permission Modes (Shift+Tab cycle)
- `act` — write/execute require per-call confirmation (default)
- `acceptEdits` — auto-approve FileEdit/FileWrite; shell still prompts
- `plan` — read-only: FileRead, Glob, Grep, WebFetch, WebSearch, TodoWrite, NotebookRead, AskUserQuestion, RepoMap

### Tech Stack
**Runtime:** Bun 1.x (TS-native, single-binary) | **TUI:** Ink 5.x + React 18 | **AI:** `@anthropic-ai/sdk` + `openai` SDK | **CLI:** commander.js | **Validation:** Zod | **Lint:** Biome | **External:** `ripgrep` (PATH), LSP binaries

### Windows Notes
`PowerShellTool` primary on Windows; `BashTool` requires WSL/Git Bash. Shift+Tab needs VT (Windows Terminal/ConEmu/VS Code, not raw `cmd.exe`). `bun run build:windows` → self-contained `.exe`.

### Project Docs
- `docs/04-ARCHITECTURE.md` — full technical design
- `docs/06-SECURITY-MODEL.md` — threat model
- `docs/07-TESTING-STRATEGY.md` — test approach
- `docs/replication/` — CC 复刻产物(见 Part B)

---

# Part B · 复刻协议(代码优先,文档轻量)

参考代码库(CC):`D:\Git-Clone\CC-SRC\Codex-sourcemap\restored-src\src`
**核心**:最大化移植 CC 功能 + 绝对保护 QiLing 品牌门面与 TUI 骨架。
用户偏好简体中文交流;代码注释保留英文。

---

## B0. 时间预算 · 80/20 原则

**你的工作时间应该这样分配**:

| 类型 | 目标占比 | 主要动作 |
|---|---|---|
| **代码动作** | ≥ 80% | Read CC → Write/Edit QiLing → typecheck |
| **文档动作** | ≤ 20% | Tracker 批量更新(批次首尾)、BLOCKED 记录、git commit |

**反模式**(看到自己在做以下事,立刻停下回到代码):
- 每完成 1 个文件就更新一次 tracker(应该批次结束时统一更新)
- 写很详细的 `batch_report.md` 统计每种标记数量(已被 git commit 替代)
- 在 Notes 列写长段说明(只在 BLOCKED 时写)
- 反复"分片读 tracker"确认状态(信任 Active Batch,直接干活)
- 中途暂停 review 已复制的文件(全部复制完再统一 review)
- **把"精化所有 PARTIAL notes"作为一整个批次的工作目标** — notes 只在即将 copy-block 该文件时精化，或用户明确要求时；generic notes 不是阻塞项
- **整个会话只做 tracker notes 更新而零源码产出** — 纯文档会话是失败模式；发现时立即中止，转向找 PARTIAL/MISSING 文件写代码

**口诀**:**复制为主,标记必要,文档批次末,报告按需**。

### 会话代码目标(每次启动时自检)

确定 Active Batch 后，**先问**:"本次会话要写/修改哪些源代码文件？"

| 答案 | 行动 |
|---|---|
| 有明确的 copy-block / copy-verbatim 文件 | 直接进阶段 1，文档动作全部延后到批次结束 |
| 只有 tracker notes 精化 / 纯文档目标 | 停止，改为找 PARTIAL adapt-complete 或 MISSING 文件做 copy-block |

> **判定标准**:会话结束时，若无任何 `src/` 下的文件被 Write/Edit，本次会话代码产出 = 0，属于失败模式。

---

## B1. 五条核心原则

1. **复制是诚实的**:TS→TS 同语言项目,首选 cp,不要"理解后重写"
2. **功能向 CC,门面向 QiLing**:见 B3 双向边界
3. **本地化集中处理**:Phase B 严禁改 UI 字符串/品牌名,用 `// LOC:` / `// NAME:` 标记
4. **架构决策不自作主张**:命名冲突/版本/依赖/API 差异 → BLOCKED 等用户
5. **状态在文件**:tracker 是真相之源,但**批量更新**而非逐个更新

---

## B2. 会话生命周期(精简版)

### 启动
用户说"继续"或类似指令 → 自检"本次会话写哪些 src/ 文件？" → Grep 找 Active Batch → 进工作。
**不需要**预先读完 tracker / BATCH_PLAN 才开干。需要查特定信息时按 B9 分片读。
若找不到 MISSING/PARTIAL 文件可写，说明当前批次已完成 → 告知用户并等待新批次，**不要转而做 notes 精化**。

### 中间(占 80% 时间)
专注代码动作。tracker Status 更新**全部延后到批次结束**，中间不做任何 tracker 写入。

### 收尾
触发收尾的条件(任一):
- 当前批次全部文件完成
- 上下文使用 ≥ 70%
- 遇到 BLOCKED 无法继续
- 用户主动要求结束

收尾动作:
1. 一次 Edit 批量更新 tracker(剩余未更新的文件 Status + 顶部 Last Updated)
2. **简短** git commit message(取代 batch_report.md,见 B12)
3. 对话中输出 3–5 行中文总结

---

## B3. 双向边界(铁律)

### B3.1 向 CC 靠近(最大化移植)

**对象**:功能逻辑 / 算法 / 协议接口 / CC 独有的功能性 UI / 错误处理结构

**默认 Op**:
- MISSING → `copy-verbatim`
- PARTIAL → `copy-block` 补完
- DIVERGED → 默认推荐回归,等用户决策

### B3.2 保留 QiLing(严禁靠近 CC)

#### L1 · 品牌门面(绝对保护 · 触碰立即 BLOCKED)

**精确路径清单**(2026-05-23 扫描确认):

| 路径 | 保护原因 |
|---|---|
| `src/components/StartupBanner.tsx` | figlet ASCII art + 春绿色板 + box-drawing 备用 logo |
| `src/utils/theme.ts` | 六套主题色彩 Token,纯品牌主题 |
| `src/utils/themeContext.tsx` | ThemeProvider + useTheme |
| `src/buddy/sprites.ts` | ASCII art 精灵帧动画 |
| `src/buddy/CompanionSprite.tsx` | 宠物精灵 TUI 渲染 |
| `src/buddy/companion.ts` | Buddy 功能核心 |
| `src/buddy/types.ts` | Buddy 类型定义 |

**特征兜底**(精确清单外的判定):
- 文件名含 `Logo`/`Banner`/`Splash`/`Welcome`/`Intro`/`Boot`
- 含大段 ASCII art / Unicode box drawing 字符画
- 主题/配色定义 (`src/theme/` `colors.ts` `palette.ts`)

#### L2 · TUI 骨架(结构保护 · 仅可补功能不动视觉)

**精确路径清单**:

| 路径 | 角色 | 保护要点 |
|---|---|---|
| `src/components/REPL.tsx` | 根布局 | 严禁改 Box 布局结构 + 组件树 |
| `src/components/StatusBar.tsx` | 状态栏 | 严禁重排字段顺序 + 分区 |
| `src/components/PromptInput.tsx` | 输入框 | 严禁改视觉(边框/装饰)|
| `src/components/Message.tsx` | 消息容器 | 严禁改对话排版 |
| `src/components/MessageResponse.tsx` | 助手消息响应 | 候选 L2,暂按 L2 |

**L2 允许移植**:新增事件处理、状态字段、辅助 hook、性能优化(memo)
**L2 严禁移植**:Box 布局、边框样式、字段顺序、配色引用、装饰字符、组件树结构
**操作**:默认 BLOCKED,等用户明确"移植 X 功能,保留 Y 视觉"

#### QiLing 特色模块(绝对保护)

`src/coordinator/` · `src/vim/` · `src/keybindings/` · `src/plugins/loader.ts` · `src/services/stats.ts` · `src/providers/{qwen,doubao,glm,minimax}.ts` · PowerShell 一等公民支持 · 中文 README/docs

### B3.3 过度本地化红线(禁止)

- 把 CC 多个组件重构成一个
- 把 CC 多步流程简化成一步
- 直接翻译 UI 文案替换(必须先 `// LOC:` 标记)
- 略过 CC 特性因为"中文用户不需要"(skip 必须用户决策)

---

## B4. 阶段定义(简表)

| 阶段 | 触发 | 核心动作 | 禁忌 |
|---|---|---|---|
| **A.5** Audit | 自然形成的对齐覆盖率反编码 | 只读不写,只产出 tracker / audit_reports | 严禁改业务代码 |
| **B** 增量对齐 | BATCH_PLAN 中的批次 | 复制优先,批次三阶段 | 严禁改 UI 字符串/品牌名 |
| **C** 本地化注入 | Phase B 覆盖率 ≥ 95% | 命名替换 + 字符串外置 + CJK 布局 | 跨领域混做 |
| **D** 特色化 | Phase C 完成 | DIFF 切片设计 | Phase B < 95% 时启动 |

**五状态分类**(Audit Verdict):
`FULLY_ALIGNED` / `PARTIAL` / `DIVERGED` / `NEW` / `MISSING` / `RESTRUCTURED`

差异判定:差异 < 10% 算 FULLY_ALIGNED,10–50% 算 PARTIAL,> 50% 算 DIVERGED。
忽略的差异:注释、字符串字面量、已知命名映射、空白格式、import 顺序。
计入的差异:控制流、函数签名、导出符号集、错误处理分支、关键算法步骤。

---

## B5. Phase B 操作

### B5.1 Op 类型

| Op | 场景 |
|---|---|
| `copy-verbatim` | MISSING + 架构兼容(整文件复制,只改 import) |
| `copy-with-refs` | MISSING + 调用已重组模块(复制后批量修引用) |
| `copy-block` | PARTIAL 补完(从 CC 摘函数/分支贴入) |
| `adapt-new` | MISSING + 架构差异显著(< 5% 场景) |
| `adapt-rewrite` | DIVERGED 选回归(保留 QiLing 接口契约) |
| `skip` | CC 有但不要(Notes 写原因) |

### B5.2 决策树(每个文件)

```
0. 文件在 L1 精确清单 或 特色模块?           → BLOCKED
1. 文件在 L2 精确清单?                        → BLOCKED(等用户指明移植哪部分)
2. 是 UI 组件(Ink/React)?                    → 进入 B7 三层决策
3. 纯逻辑/工具/类型/常量?                     → copy-verbatim
4. 调用的下游已重组?                          → copy-with-refs
5. PARTIAL 缺失部分是完整函数/分支?           → copy-block
6. 架构显著差异?                              → adapt-new / adapt-rewrite
其他                                          → 默认 copy-verbatim
```

### B5.3 标记规范(分必填/可选)

**必填**(影响 Phase C 工作,不打就丢失信息):

| 注释 | 触发条件 | 示例 |
|---|---|---|
| `// LOC:` | UI 可见字符串(传给 console/Text/render) | `// LOC: tool.read.too_large` |
| `// NAME:` | CC 品牌字符串("Codex" / "Anthropic" 等) | `// NAME: Codex` |
| `// FROM CC:` | copy-block 时标记来源函数/类型名 | `// FROM CC: handleImageRead` |
| `// QILING-IDENTITY:` | L1 文件、主题键替换、L2 骨架保留点 | `// QILING-IDENTITY: theme ref` |

**可选**(锦上添花,不必每个都打,优先用 git commit 记录):

| 注释 | 使用场景 |
|---|---|
| `// PLATFORM:` | 平台特定逻辑、中文宽字符需重算的 padStart/截断处 |
| `// IMPROVED:` | 发现 QiLing 比 CC 实现更优,值得保留 |
| `// BUN:` | Bun 与 Node API 差异(非必要,typecheck 通过即可) |

**不要做的事**:
- 不要为了打标记而打标记(只标记真正影响 Phase C 的)
- 不要在批次报告里统计每种标记数量(已被 git commit 替代)

### B5.4 批次三阶段(浓缩)

**阶段 1 · 批量复制**:对批次内所有 copy-* 文件,**一次性**全部复制完成。复制时只加必填注释,不改代码,不跑 typecheck,不 review。

**阶段 2 · 集中修复**:全部复制完后,跑一次 `bun run typecheck` → 按错误清单批量修 import → 再跑确认。依赖未对齐的错误 → 标 BLOCKED + Notes 写 `waiting for <dep_file_id>`。

**阶段 3 · 验证落盘**:跑 BATCH_PLAN 的 Verify 命令 → 一次 Edit 批量更新 tracker 多行 Status → git commit(见 B12)。**通常不需要写 batch_report.md**(BLOCKED 时才需要)。

---

## B6. Bun vs Node(浓缩)

**完全兼容**:fs / path / os / crypto / child_process / process / import.meta / Buffer — 直接复制无需标记。

**测试文件强制改 Bun**:`@jest/globals` 或 `vitest` → `bun:test`(阶段 1 立即处理)。

**其他 Node API**:**保留原样不动**,阶段 2 typecheck 通过则不改。仅当报错才换 Bun 等价 API,可加 `// BUN:`。

**Bun-only 特性**:`Bun.serve` / `Bun.file` / `Bun.$` / `bun:sqlite` — Phase B 不主动替换,留到 Phase D。

---

## B7. UI 三层移植(精简)

### 决策子流程(B5.2 第 2 步)

```
对 UI 组件文件:

Q1. 在 B3.2 L1 精确清单?              → BLOCKED + // QILING-IDENTITY:
Q2. 在 B3.2 L2 精确清单?              → BLOCKED(等用户指明移植哪部分)
Q3. QiLing 不存在,CC 独有的功能性 UI? → copy-verbatim
                                         主题键改 QiLing 版,无等价键则 BLOCKED
                                         文案标 LOC,品牌标 NAME
Q4. QiLing 已存在,功能性组件?         → 看 Audit Verdict:
                                         PARTIAL → copy-block 补功能不改视觉
                                         FULLY_ALIGNED → 跳过
                                         DIVERGED → BLOCKED
```

### L3 移植三约束

1. **主题键**:CC 的 `color="Codex-blue"` → QiLing 主题键(标 `// QILING-IDENTITY: theme ref`);无等价键则 BLOCKED
2. **文案**:全部 `// LOC:`,不直接翻译
3. **品牌字符**:`// NAME:`

### CJK 宽字符

遇 `padStart` / `padEnd` / `repeat` / 截断逻辑用于终端宽度 → 标 `// PLATFORM: cjk-*`,**Phase B 不修**,Phase C 接 `string-width`。

---

## B8. ALIGNMENT_TRACKER 结构

顶部状态(分片读时只读这部分):
```
> Current Phase: <A.5 | B | C | D>
> Last Updated: <ISO>
> Audit Progress: T0 ✅ | T1 ✅ | T2 🟡 | T3–T7 ⏸
> Verdict Distribution: FULLY_ALIGNED N | PARTIAL N | DIVERGED N | NEW N | MISSING N
> Active Batch: <id or "none">
```

文件表列:`| ID | CC Path | Target Path | Category | UI Layer | Audit Verdict | Confidence | Status | Op | Notes |`

- **UI Layer**: L1 / L2 / L3 / —
- **Status**: UNTOUCHED / MAPPED / IN_PROGRESS / ALIGNED / VERIFIED / BLOCKED / KEPT
- **Notes**: **只在以下情况精化**:① BLOCKED/重大决策 ② 本次会话即将对该文件 copy-block。已有 generic notes（如"CC has N extra exports"）的 PARTIAL 行——如果本次不写代码，**不要精化其 notes**，直接跳过。

---

## B9. tracker 分片读 + 批量更新

**tracker 224KB,严禁整文件 Read**。按需读:

| 需求 | 操作 |
|---|---|
| 当前阶段 / Active Batch | `Read view_range=[1, 30]` |
| 当前批次涉及的文件 | `Grep "BATCH_<id>" ALIGNMENT_TRACKER.md` |
| 某 T 类 | `Grep "\| T1 \|"` |
| BLOCKED 汇总 | `Grep "\| BLOCKED \|"` |
| 某 L 层 | `Grep "\| L1 \|"` |
| 单文件 ID | `Grep "^\| F0123 "` |

**更新策略**:
- 单文件状态变化 → **不立即更新**,累积到**批次结束**再一次 Edit(不再是 3–5 个一次,减少文档中断)
- Notes 精化(无对应代码写入) → 不单独触发更新,统一在批次结束时处理
- 批次结束 → 一次 Edit 批量改顶部 + 所有文件行
- **禁止** Write 整文件覆盖 tracker

---

## B10. BLOCKED 判定与输出

**必须 BLOCKED 的情况**:
- 触碰 L1/L2 精确清单 / 特色模块
- 命名冲突 / 依赖版本冲突 / 平台抽象决策
- 1:N 或 N:1 重组 / DIVERGED 回归决策
- 影响 3+ 文件的设计选择
- L3 主题键在 QiLing 无等价

**BLOCKED 输出格式**(简短):
```
[BLOCKED] <file_id> · <触发类型>
原因:<一句话>
影响:<连带文件>
方案 A:<...>
方案 B:<...>
建议:<推荐 + 理由>
```

---

## B11. 上下文管理

≥ **70%** 使用率 → 立即收尾:
1. 完成当前文件(不要中途断)
2. 一次 Edit 批量更新 tracker
3. 输出 3–5 行中文总结
4. 停止接收新任务

---

## B12. 文档产出(按需,非强制)

### tracker 更新(强制)
唯一**强制**的文档动作。批量化:每 3–5 个文件或批次结束时,一次 Edit 改多行。

### git commit message(取代 batch_report.md)
**默认**每批次结束写一个 commit,**取代** batch_report.md:

```
BATCH_<id>: <n> files (verbatim:<a>, block:<b>, with-refs:<c>)
- BLOCKED: <n>(列 ID + 触发类型,如 none 则省略此行)
- Key: <若有重大决策一句话,否则省略>
```

### batch_report.md(可选,仅特定情况)
**仅当**以下情况才写一份 `docs/replication/batch_reports/BATCH_<id>.md`:
- 该批次有 ≥ 2 个 BLOCKED
- 该批次涉及重大架构决策(影响 5+ 后续文件)
- 用户明确要求

格式精简到 5 行:
```
## BATCH_<id>
- Files: <ids>
- BLOCKED: <ids + 触发类型>
- Decision: <一句话>
- Next: <一句话>
```

### audit_reports(Phase A.5 专用,Phase B 不写)
Phase A.5 推进单个 T 类时产出 `AUDIT_<T_class>.md`。Phase B 期间不再产出 audit 类报告。

### 会话总结(对话中,非文件)
每次会话结束,在对话中给 3–5 行中文总结。**不要**写成单独文件。

---

## B13. 工具使用偏好

- **扫描**:Glob + Grep 批量,不逐个 Read
- **CC 文件**:Read 顶部 30 行通常够;大文件用 view_range 分段
- **目标文件**:Edit 小范围替换;copy-verbatim 用 Write
- **验证**:阶段 2 `bun run typecheck`,阶段 3 `bun test <pattern>` 或 `bunx @biomejs/biome check src/<changed>`

---

## 速查 · 一句话工作流

| 触发 | 你的动作 |
|---|---|
| 用户说"继续" | 先自检"今天写哪些文件？" → Grep Active Batch → 进阶段 1 |
| 复制完一个文件 | 加必填标记 → **不**立即更新 tracker(累积到批次结束) |
| 完成整个批次 | 一次 Edit 批量更新所有文件 Status + 顶部 Last Updated |
| 阶段 1 全部复制完 | 跑 typecheck → 批量修 import → 再跑确认 |
| 阶段 2 完成 | 跑 verify → 一次 Edit 批量更新 tracker → git commit |
| 遇到 L1/L2/特色模块 | 立即 BLOCKED,不要任何变更 |
| 遇到 CC 主题键无 QiLing 等价 | BLOCKED,等用户补主题 |
| 上下文 ≥ 70% | 收尾,不硬撑 |
| 想写 batch_report.md | 大多数情况不写,git commit 已够 |
| 想在 Notes 写长说明 | 只在 BLOCKED 时写,日常留空 |
| 想多次小改 tracker | 改用一次 Edit 多行替换 |
| **想精化 PARTIAL notes（但不写代码）** | **跳过**；notes 只在即将 copy-block 该文件时精化 |
| **发现大量 PARTIAL 行 notes 是通用描述** | **不要把精化 notes 当作一个批次的目标**；找那些文件做 copy-block 才是正确动作 |
| **发现会话已做 1 小时只有 tracker updates** | 立即停止文档工作，转向找 PARTIAL/MISSING 文件写代码 |

---

*AGENTS.md v3.1 · 代码优先强化版*
*相对 v3.0:B0 加"纯文档会话=失败模式"+ 会话代码目标自检；B2 启动加代码目标问句；B8 Notes 精化条件收紧；B9 tracker 更新从"3-5 个"改为"批次结束"；速查表加 3 行防滑规则*