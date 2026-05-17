# 功能差距分析 — CC vs QiLing

*生成时间: 2026-05-18 | CC 源码: D:\Git-Clone\CC-SRC\claude-code-sourcemap*

---

## 已完成 ✅

- ✅ **Bash 工具链** — shellQuote, commands, heredoc, ast, bashSecurity, sedValidation, commandSemantics | `src/utils/bash/`, `src/tools/BashTool/`
- ✅ **PowerShell 工具链** — dangerousCmdlets, parser, powershellSecurity, gitSafety | `src/utils/powershell/`, `src/tools/PowerShellTool/`
- ✅ **Git 工具链** — gitDiff, gitFilesystem, gitignore, gitConfigParser, git.ts (综合) | `src/utils/git/`, `src/utils/git.ts`
- ✅ **权限系统** — shellRuleMatching, denialTracking, permissionExplainer, YOLO分类器, autoModeState | `src/permissions/`
- ✅ **LSP 完整客户端** — LSPClient, LSPServerInstance, LSPServerManager, LSPDiagnosticRegistry, passiveFeedback | `src/services/lsp/`
- ✅ **MCP 完整重写** — @modelcontextprotocol/sdk, 三种传输, 持久连接 | `src/services/mcp/`
- ✅ **Agent 子系统** — agentMemory, agentMemorySnapshot, agentColorManager, agentDisplay, loadAgentsDir | `src/tools/AgentTool/`
- ✅ **内置 Agent** — Explore, Plan, general-purpose, claude-code-guide, statusline-setup, worker | `src/tools/AgentTool/builtInAgents.ts`
- ✅ **SyntheticOutputTool** — 结构化 JSON 输出 | `src/tools/SyntheticOutputTool.ts`
- ✅ **Buddy 宠物系统** — 20种宠物+7种植物宠物+动画+气泡 | `src/buddy/`
- ✅ **主题系统** — 6主题(dark/light/dark-ansi/light-ansi/两种色盲) | `src/utils/theme.ts`, `src/utils/themeContext.tsx`
- ✅ **SessionMemory** — 会话笔记自动维护 | `src/services/SessionMemory/`
- ✅ **MagicDocs** — MAGIC DOC 标头自动文档更新 | `src/services/MagicDocs/`
- ✅ **AgentSummary** — 协调器后台摘要 | `src/services/AgentSummary/`
- ✅ **ExtractMemories** — 会话记忆自动提取 | `src/services/extractMemories/`
- ✅ **PostCompactCleanup** — 压缩后状态清理 | `src/compact/postCompactCleanup.ts`
- ✅ **Tool Result Storage** — 大型工具输出磁盘持久化 | `src/utils/toolResultStorage.ts`
- ✅ **fsOperations** — 文件系统工具函数 | `src/utils/fsOperations.ts`
- ✅ **QueryGuard** — 查询并发控制状态机 | `src/utils/QueryGuard.ts`
- ✅ **Migrations** — 模型名迁移系统 | `src/utils/migrations.ts`
- ✅ **Context Analysis** — 上下文窗口分析 | `src/utils/analyzeContext.ts`
- ✅ **McpTool 分类折叠** — MCP 工具搜索/读取分类 | `src/tools/McpTool/classifyForCollapse.ts`
- ✅ **Slash 命令扩展** — /theme, /agents, /tasks, /context, /files, /rename, /tag, /env, /status, /effort, /buddy, /model, /config, /copy, /clear, /compact + 更多
- ✅ **agentMemory 系统** — 三级作用域持久记忆 | `src/tools/AgentTool/agentMemory.ts`
- ✅ **git.ts 综合工具** — getBranch/getRemoteUrl/getGitState 等 | `src/utils/git.ts`
- ✅ **messages.ts 扩展** — getMessagesAfterCompactBoundary 等 | `src/utils/messages.ts`

---

## 待复刻（按优先级排序）

### 🔴 P0 — 高价值、立即实现

- ✅ **`which.ts`** — 命令路径检测(which/whichSync)，Bun.which 封装 | `src/utils/which.ts` | CC: `utils/which.ts` | S
- ✅ **`zodToJsonSchema.ts`** — Zod→JSON Schema 带 WeakMap 缓存，提升工具调用性能 | `src/utils/zodToJsonSchema.ts` | CC: `utils/zodToJsonSchema.ts` | S
- ✅ **`thinking.ts`** — ThinkingConfig 类型, hasUltrathinkKeyword(), modelSupportsThinking() | `src/utils/thinking.ts` | CC: `utils/thinking.ts` | S
- ✅ **`truncate.ts`** — 宽度感知字符串截断(CJK/emoji安全), truncatePathMiddle(), wrapText() | `src/utils/truncate.ts` | CC: `utils/truncate.ts` | S
- ✅ **`treeify.ts`** — 树形数据文本渲染，用于 /agents、/mcp 等命令展示 | `src/utils/treeify.ts` | CC: `utils/treeify.ts` | S
- ✅ **awaySummary** — "您离开期间"会话回顾摘要，REPL 恢复时显示 | `src/services/awaySummary.ts` | CC: `services/awaySummary.ts` | M
- ✅ **`worktree.ts`** — Git worktree 创建/切换/删除，AgentTool 隔离基础 | `src/utils/worktree.ts` | CC: `utils/worktree.ts` | L

### 🟡 P1 — 中高价值、应实现

- ✅ **`sideQuery.ts`** — 轻量级 AI 查询（不经过完整 runQuery 循环），权限解释器等依赖 | `src/utils/sideQuery.ts` | CC: `utils/sideQuery.ts` | M
- [ ] **`collapseReadSearch.ts`** — 读取/搜索工具调用折叠逻辑（减少噪音） | `src/utils/collapseReadSearch.ts` | CC: `utils/collapseReadSearch.ts` | M
- ✅ **`tokenEstimation.ts`** — 精确 token 数估算（roughTokenCountEstimation） | `src/services/tokenEstimation.ts` | CC: `services/tokenEstimation.ts` | S
- [ ] **`sessionStorage.ts`** — 会话元数据持久化（会话名、transcript 路径、agent color 等） | `src/utils/sessionStorage.ts` | CC: `utils/sessionStorage.ts` | M
- [ ] **`sessionActivity.ts`** — 会话活动追踪（并发会话检测） | `src/utils/sessionActivity.ts` | CC: `utils/sessionActivity.ts` | S
- [ ] **Tool formatters** — LSPTool formatters.ts (诊断格式化) + symbolContext | `src/tools/LSPTool/` | CC: `tools/LSPTool/` | M
- [ ] **`/summary` 命令升级** — 使用 SessionMemory 的最新状态作为摘要来源 | `src/commands/index.ts` | CC: `commands/summary/` | S
- [ ] **`/share` 命令** — 会话内容分享功能 | `src/commands/index.ts` | CC: `commands/share/` | S
- [ ] **PromptSuggestion 简化版** — 每轮结束后预测用户下一条指令 | `src/services/PromptSuggestion/` | CC: `services/PromptSuggestion/` | M
- ✅ **GrepTool gitignore 集成** (ripgrep 原生支持，无需额外集成) — 搜索时跳过 .gitignore 的文件 | `src/tools/GrepTool.ts` | CC: `utils/git/gitignore.ts` 集成 | S

### 🟢 P2 — 中等价值、有时间则实现

- [ ] **`thinking.ts` 集成** — 在 PromptInput 检测 ultrathink 关键词并调整 thinkingBudget | `src/components/PromptInput.tsx` | CC: REPL 集成 | S
- [ ] **`statsCache.ts`** — Stats 带磁盘缓存，避免每次重算 | `src/utils/statsCache.ts` | CC: `utils/statsCache.ts` | M
- [ ] **autoDream 服务** — 自动运行后台任务 | `src/services/autoDream/` | CC: `services/autoDream/` | L
- [ ] **BriefTool 改进** — Brief 工具增强（attachment 上传） | `src/tools/BriefTool.ts` | CC: `tools/BriefTool/` | M
- [ ] **ripgrep 集成优化** — 使用 Bun 内建 ripgrep | `src/tools/GrepTool.ts` | CC: `utils/ripgrep.ts` | M
- [ ] **`/branch` 命令** — git branch 管理 | `src/commands/index.ts` | CC: `commands/branch/` | S

### ⚫ 已知风险/依赖 & 跳过项

**跳过 (CC 特有基础设施)**:
- `auth.ts` — OAuth/Anthropic 账号系统（CC 特有，QiLing 用 API Key）
- `bridge/` — VS Code 扩展通信（CC 特有）
- `analytics/` — Statsig/DataDog 遥测（CC 特有）
- `remote/` — 远程会话功能（CC 特有）
- `sandbox/` — macOS App Sandbox（CC 特有）
- `voice/` — 语音输入（需要原生二进制）
- `computerUse/` — 计算机控制（需要原生二进制）
- `mobile/` — 移动端支持（CC 特有）
- `chrome/` — Chrome 扩展集成（CC 特有）
- `billing.ts` / `passes.ts` — 订阅计费（CC 特有）
- OAuth 流程 (`services/oauth/`) — CC 账号授权

**简化实现**:
- `claudemd.ts` — QiLing 用自己的 memdir 系统替代
- `sessionRestore.ts` — QiLing 用 `session/resume.ts` 替代
- `sideQuery.ts` — 使用 QiLing provider 接口简化实现

---

## 进度统计

- 总模块数 (按 CC 目录估算): ~320
- 已完成: ~90 (28%)
- 待复刻 P0: 7
- 待复刻 P1: 9
- 待复刻 P2: 6
- 跳过/CC特有: ~208 (65%)
