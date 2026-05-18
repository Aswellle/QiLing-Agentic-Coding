# 功能差距分析 — CC vs QiLing

*最后更新: 2026-05-19 (会话三) | CC 源码: D:\Git-Clone\CC-SRC\claude-code-sourcemap*

---

## 已完成 ✅

### 基础设施与工具链 (会话一)
- ✅ **Bash 工具链** — shellQuote, commands, heredoc, ast, bashSecurity, sedValidation, commandSemantics | `src/utils/bash/`, `src/tools/BashTool/`
- ✅ **PowerShell 工具链** — dangerousCmdlets, parser, powershellSecurity, gitSafety | `src/utils/powershell/`, `src/tools/PowerShellTool/`
- ✅ **Git 工具链** — gitDiff, gitFilesystem, gitignore, gitConfigParser, git.ts (综合) | `src/utils/git/`, `src/utils/git.ts`
- ✅ **权限系统** — shellRuleMatching, denialTracking, permissionExplainer, YOLO分类器, autoModeState | `src/permissions/`
- ✅ **LSP 完整客户端** — LSPClient, LSPServerInstance, LSPServerManager, LSPDiagnosticRegistry, passiveFeedback | `src/services/lsp/`
- ✅ **MCP 完整重写** — @modelcontextprotocol/sdk, stdio/SSE/HTTP传输, 持久连接 | `src/services/mcp/`
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
- ✅ **which.ts** — 命令路径检测 | `src/utils/which.ts`
- ✅ **zodToJsonSchema.ts** — Zod→JSON Schema 带 WeakMap 缓存 | `src/utils/zodToJsonSchema.ts`
- ✅ **thinking.ts** — ThinkingConfig 类型, ultrathink 集成 | `src/utils/thinking.ts`
- ✅ **truncate.ts** — 宽度感知字符串截断 | `src/utils/truncate.ts`
- ✅ **treeify.ts** — 树形数据文本渲染 | `src/utils/treeify.ts`
- ✅ **awaySummary** — 离开期间会话回顾 | `src/services/awaySummary.ts`
- ✅ **worktree.ts** — Git worktree 管理 | `src/utils/worktree.ts`
- ✅ **sideQuery.ts** — 轻量级 AI 查询 | `src/utils/sideQuery.ts`
- ✅ **collapseReadSearch.ts** — 工具调用折叠 | `src/utils/collapseReadSearch.ts`
- ✅ **tokenEstimation.ts** — token 数估算 | `src/services/tokenEstimation.ts`
- ✅ **sessionStorage.ts** — 会话元数据持久化 | `src/utils/sessionStorage.ts`
- ✅ **statsCache.ts** — Stats 磁盘缓存 | `src/utils/statsCache.ts`

### 基础设施六批至十一批 (会话二)
- ✅ **jsonRead.ts** — UTF-8 BOM 剥离 | `src/utils/jsonRead.ts`
- ✅ **lockfile.ts** — 进程锁文件(惰性加载 proper-lockfile) | `src/utils/lockfile.ts`
- ✅ **imageValidation.ts** — API 图像大小验证(5MB 限制) | `src/utils/imageValidation.ts`
- ✅ **types/notebook.ts** — Jupyter notebook 数据类型定义 | `src/types/notebook.ts`
- ✅ **notebook.ts** — Jupyter .ipynb 解析与渲染 | `src/utils/notebook.ts`
- ✅ **cachePaths.ts** — 按项目稳定 cache 路径(djb2Hash) | `src/utils/cachePaths.ts`
- ✅ **fileRead.ts** — 叶节点文件读取(无 SCC 依赖) | `src/utils/fileRead.ts`
- ✅ **fileReadCache.ts** — mtime 失效内存缓存 | `src/utils/fileReadCache.ts`
- ✅ **execSyncWrapper.ts** — 带慢操作日志的 execSync | `src/utils/execSyncWrapper.ts`
- ✅ **promptShellExecution.ts** — skill prompt 内嵌 shell 命令执行 | `src/utils/promptShellExecution.ts`
- ✅ **completionCache.ts** — bash/zsh/fish shell 补全安装 | `src/utils/completionCache.ts`
- ✅ **pdf.ts** — PDF 文件读取+pdftoppm 页面渲染 | `src/utils/pdf.ts`
- ✅ **imageResizer.ts** — 图像自动缩放压缩(sharp 惰性加载) | `src/utils/imageResizer.ts`
- ✅ **exampleCommands.ts** — 启动个性化示例命令(git 历史采样) | `src/utils/exampleCommands.ts`
- ✅ **releaseNotes.ts** — CHANGELOG 缓存与 Release Notes 展示 | `src/utils/releaseNotes.ts`
- ✅ **BashTool/toolName.ts** — BASH_TOOL_NAME 常量 | `src/tools/BashTool/toolName.ts`
- ✅ **BashTool/utils.ts** — stripEmptyLines/formatOutput/imageResizer集成 | `src/tools/BashTool/utils.ts`
- ✅ **services/api/errorUtils.ts** — SSL/HTML错误格式化 | `src/services/api/errorUtils.ts`
- ✅ **services/api/emptyUsage.ts** — 零初始化 TokenUsage | `src/services/api/emptyUsage.ts`
- ✅ **agentId.ts** — 确定性 Agent ID (agentName@teamName) | `src/utils/agentId.ts`
- ✅ **caCerts.ts** — TLS CA 证书加载(企业代理支持) | `src/utils/caCerts.ts`
- ✅ **getWorktreePathsPortable.ts** — 轻量 worktree 路径检测 | `src/utils/getWorktreePathsPortable.ts`
- ✅ **cwd.ts** — 异步上下文 CWD (AsyncLocalStorage) | `src/utils/cwd.ts`
- ✅ **configConstants.ts** — 无依赖配置常量 | `src/utils/configConstants.ts`
- ✅ **constants/files.ts** — 二进制扩展名+字节检测 | `src/constants/files.ts`
- ✅ **mcpWebSocketTransport.ts** — MCP WebSocket 传输层 | `src/utils/mcpWebSocketTransport.ts`
- ✅ **bundledMode.ts** — Bun 运行时检测 | `src/utils/bundledMode.ts`
- ✅ **taggedId.ts** — Base58 Tagged ID 编码 | `src/utils/taggedId.ts`

### 系统集成 (会话二)
- ✅ **formatAPIError 集成** — Anthropic provider 使用 errorUtils 格式化错误 | `src/providers/anthropic.ts`
- ✅ **二进制文件检测集成** — FileReadTool 使用 hasBinaryExtension/isBinaryContent | `src/tools/FileReadTool.ts`
- ✅ **exampleCommands 集成** — StartupBanner 显示个性化提示词 | `src/components/StartupBanner.tsx`
- ✅ **MCP WebSocket 传输集成** — MCP client 支持 type:'ws' 配置 | `src/services/mcp/client.ts`, `src/services/mcp/types.ts`

---

## 跳过项 (CC 特有基础设施)

- `auth.ts` — OAuth/Anthropic 账号系统（CC 特有，QiLing 用 API Key）
- `bridge/` — VS Code 扩展通信（CC 特有）
- `analytics/` — Statsig/DataDog 遥测（CC 特有）
- `remote/` — 远程会话功能（CC 特有）
- `sandbox/` — macOS App Sandbox（CC 特有）
- `voice/` — 语音输入（需要原生二进制）
- `computerUse/` — 计算机控制（已简化实现）
- `mobile/` — 移动端支持（CC 特有）
- `billing.ts` / `passes.ts` — 订阅计费（CC 特有）
- `migration/*.ts` — 模型名迁移（CC 一方用户专用）
- `ink/` — Ink 框架改写（使用 npm 包 ink）
- `bootstrap/` — CC 启动状态机（QiLing 用 main.tsx 替代）
- `autoDream` — 依赖 runForkedAgent（CC 专有架构）
- `transcriptSearch.ts` — 依赖 CC 复杂消息类型
- `textHighlighting.ts` — 依赖 @alcalzone/ansi-tokenize

---

### 会话三新增 (2026-05-19)
- ✅ **constants/tools.ts** — 工具名称常量聚合中心, SHELL_TOOL_NAMES, ALL_AGENT_DISALLOWED_TOOLS 等
- ✅ **工具常量子模块批量补全** — 22个工具的 constants.ts/prompt.ts(CC 循环依赖解耦模式)
- ✅ **sessionUrl.ts** — 会话标识符解析(JSONL/UUID/URL)
- ✅ **toolPool.ts** — 工具池合并与协调器过滤
- ✅ **MCP InProcessTransport** — 同进程 MCP 传输对, createLinkedTransportPair()
- ✅ **MCP officialRegistry** — Anthropic 官方 MCP 注册中心缓存
- ✅ **autoModeDenials.ts** — Auto 模式拒绝记录
- ✅ **classifierApprovals.ts** — 分类器审批状态追踪
- ✅ **classifierApprovalsHook.ts** — 分类器审批 React hook(React/非React 分离)
- ✅ **diagLogs.ts** — 诊断日志(无PII, QILING_DIAGNOSTICS_FILE)
- ✅ **systemTheme.ts** — 终端暗色/亮色精确检测(OSC 11, COLORFGBG)
- ✅ **streamJsonStdoutGuard.ts** — SDK 流式 JSON stdout 保护
- ✅ **ndjsonSafeStringify.ts** — NDJSON 安全序列化(U+2028/U+2029转义)
- ✅ **codeIndexing.ts** — 代码索引工具检测(24种工具, CLI+MCP两种方式)
- ✅ **peerAddress.ts** — URI地址解析(uds/bridge/other)
- ✅ **keyboardShortcuts.ts** — macOS Option+key 特殊字符映射
- ✅ **profilerBase.ts** — 性能剖析基础设施(时间线格式化)
- ✅ **debugFilter.ts** — 调试日志分类过滤(包含/排除模式)
- ✅ **directMemberMessage.ts** — @agent-name 直接消息语法
- ✅ **mailbox.ts** — Agent 消息队列(send/poll/receive/subscribe)
- ✅ **generatedFiles.ts** — 生成/vendored 文件检测(Linguist规则)
- ✅ **teammateContext.ts** — In-process teammate AsyncLocalStorage 上下文
- ✅ **controlMessageCompat.ts** — requestId→request_id 键名兼容补丁
- ✅ **pasteStore.ts** — 粘贴内容磁盘缓存(hash存储/检索/清理)
- ✅ **useDoublePress** — 双击检测 React hook
- ✅ **useMinDisplayTime** — 最短显示时间节流 hook

---

## 进度统计 (更新至 2026-05-19 会话三)

- 已完成模块: ~170+ (会话一 ~90 + 会话二 ~50 + 会话三 ~30)
- 总提交数: 270+
- utils 文件: 190+  |  hooks: 5  |  services: 29  |  tools dirs: 77
- 跳过/CC特有: ~200 (auth/analytics/billing/bridge/ink框架改写等)
- 测试: 137 pass, 0 fail
- 类型检查: tsc --noEmit 通过
