# CC Source Module Taxonomy (T0–T7)

> 分类标准参考：核心运行时 → UI层 → 工具层 → 服务层 → 基础设施 → 外部集成 → ANT专属 → 类型/常量

---

## T0 — 核心运行时（Runtime Core）

> **职责：** 启动、查询循环、工具注册、权限管理、设置加载、状态机。  
> 所有其他层都依赖这一层；这一层只能依赖 T7（类型/常量）。

| 目录 | 职责说明 |
|------|---------|
| `bootstrap/` | 启动期全局状态（cwd、mode、flags） |
| `settings/` | 设置级联加载（CLI > project > global > defaults） |
| `query/` | 核心 agentic 循环（stream→tools→recurse） |
| `modes/` | 权限模式状态机（act / acceptEdits / plan） |
| `coordinator/` | 多Agent协调器引擎 |
| `state/` | 应用全局状态（AppStateStore + 选择器） |
| `migrations/` | 配置迁移脚本 |
| `costHook.ts` | 会话结束时费用写入 |

---

## T1 — 工具层（Tool Layer）

> **职责：** 所有 Tool 实现（Bash / FileEdit / WebFetch / Agent 等）。  
> 依赖：T0（权限/配置）、T7（类型）。不得依赖 T2（UI）。

| 目录 | 职责说明 |
|------|---------|
| `tools/AgentTool/` | 启动子Agent工具（深度限制） |
| `tools/BashTool/` | Bash命令执行工具 |
| `tools/FileEditTool/` | 文件编辑（精确字符串替换） |
| `tools/FileReadTool/` | 文件读取（含图片处理） |
| `tools/FileWriteTool/` | 文件创建/写入工具 |
| `tools/GlobTool/` | 文件通配搜索工具 |
| `tools/GrepTool/` | 代码内容搜索（ripgrep） |
| `tools/WebFetchTool/` | HTTP抓取（含预授权域名） |
| `tools/WebSearchTool/` | Web搜索工具 |
| `tools/LSPTool/` | LSP诊断信息工具 |
| `tools/MCPTool/` | MCP工具动态执行 |
| `tools/NotebookEditTool/` | Jupyter Notebook编辑 |
| `tools/NotebookReadTool/` | Jupyter Notebook读取 |
| `tools/PowerShellTool/` | PowerShell命令工具 |
| `tools/ScheduleCronTool/` | 定时任务调度工具 |
| `tools/TaskCreateTool/` | 创建后台任务 |
| `tools/TaskListTool/` | 列出后台任务 |
| `tools/TaskGetTool/` | 获取任务状态 |
| `tools/TaskStopTool/` | 停止后台任务 |
| `tools/TaskOutputTool/` | 读取任务输出 |
| `tools/TodoWriteTool/` | Todo列表写入 |
| `tools/BriefTool/` | Brief消息发送 |
| `tools/EnterPlanModeTool/` | 进入计划模式 |
| `tools/ExitPlanModeTool/` | 退出计划模式 |
| `tools/EnterWorktreeTool/` | 进入Worktree分支 |
| `tools/ExitWorktreeTool/` | 退出Worktree分支 |
| `tools/AskUserQuestionTool/` | 结构化问用户 |
| `tools/SendMessageTool/` | 发送消息给Teammate |
| `tools/ConfigTool/` | 配置读写工具 |
| `tools/RemoteTriggerTool/` | 远程触发工具 |
| `tools/TeamCreateTool/` | 创建Swarm团队 |
| `tools/TeamDeleteTool/` | 删除Swarm团队 |
| `tools/SkillTool/` | 技能调用执行 |
| `tools/ToolSearchTool/` | 工具schema搜索 |
| `tools/REPLTool/` | REPL原始工具集 |
| `tools/SyntheticOutputTool/` | 结构化输出工具 |
| `tools/ReadMcpResourceTool/` | 读取MCP资源 |
| `tools/ListMcpResourcesTool/` | 列出MCP资源 |
| `tools/TaskUpdateTool/` | 更新任务元数据 |
| `tools/shared/` | 工具共享函数 |
| `tools/testing/` | 测试辅助工具 |

---

## T2 — UI 层（UI / TUI Layer）

> **职责：** Ink/React 组件、REPL 渲染、输入处理、动画。  
> 依赖：T0、T1（只读展示）、T3（hooks）、T7。不得直接调用 API。

| 目录 | 职责说明 |
|------|---------|
| `screens/REPL.tsx` | REPL主屏幕（核心渲染入口） |
| `screens/Doctor.tsx` | /doctor 诊断屏幕 |
| `screens/ResumeConversation.tsx` | 恢复会话屏幕 |
| `components/design-system/` | 设计系统组件库（Dialog/Pane/FuzzyPicker等） |
| `components/messages/` | 各类消息渲染组件 |
| `components/permissions/` | 权限对话框组件 |
| `components/Spinner/` | 加载动画组件集 |
| `components/StructuredDiff/` | 结构化差异渲染 |
| `components/CustomSelect/` | 键盘导航选择器 |
| `components/agents/` | Agent相关UI组件 |
| `components/wizard/` | 多步向导系统 |
| `components/mcp/` | MCP组件集 |
| `components/PromptInput/` | 输入框组件集 |
| `components/FeedbackSurvey/` | 反馈调查组件 |
| `components/diff/` | Diff视图组件 |
| `components/hooks/` | Hook配置UI组件 |
| `components/sandbox/` | 沙箱UI组件 |
| `components/shell/` | Shell输出组件 |
| `components/tasks/` | 任务UI组件 |
| `components/Settings/` | 设置面板UI |
| `components/LogoV2/` | 吉祥物/欢迎UI |
| `components/*.tsx` | 其他根组件（REPL/StatusBar等） |
| `components/HelpV2/` | 帮助V2组件 |
| `buddy/` | 吉祥物精灵组件 |
| `vim/` | Vim模式状态机（在输入框中） |

---

## T3 — Hooks 层（React Hooks Layer）

> **职责：** React hooks（业务逻辑与UI的桥接层）。  
> 依赖：T0、T1、T5、T7。不直接渲染 Ink。

| 目录 | 职责说明 |
|------|---------|
| `hooks/useSearchInput.ts` | 搜索输入全功能hook |
| `hooks/useTextInput.ts` | 完整文本输入hook |
| `hooks/useVimInput.ts` | Vim输入模式hook |
| `hooks/useArrowKeyHistory.tsx` | 方向键历史导航 |
| `hooks/useInputBuffer.ts` | 输入撤销缓冲区 |
| `hooks/useTurnDiffs.ts` | 轮次差异分析 |
| `hooks/useVirtualScroll.ts` | 虚拟滚动列表 |
| `hooks/usePasteHandler.ts` | 粘贴处理 |
| `hooks/useExitOnCtrlCD.ts` | 双击Ctrl+C/D退出 |
| `hooks/useQueueProcessor.ts` | 队列处理器 |
| `hooks/useCopyOnSelect.ts` | 选中自动复制 |
| `hooks/useDiffData.ts` | Git diff数据 |
| `hooks/useIdeConnectionStatus.ts` | IDE连接状态 |
| `hooks/useIdeAtMentioned.ts` | IDE @提及通知 |
| `hooks/useIdeSelection.ts` | IDE文本选择 |
| `hooks/useCommandKeybindings.tsx` | 命令快捷键注册 |
| `hooks/fileSuggestions.ts` | 文件建议补全 |
| `hooks/unifiedSuggestions.ts` | 统一建议系统 |
| `hooks/notifs/` | 启动通知hooks |
| `hooks/render*.ts` | 渲染辅助hooks |
| `hooks/use*.ts` (其余) | 各类业务hooks |

---

## T4 — Ink 基础设施（Ink Infrastructure）

> **职责：** CC 内部 Ink fork：渲染引擎、事件系统、布局、终端 I/O。  
> 这是 T2 的底层，QiLing 中用 npm ink 包替代大部分内容。

| 目录 | 职责说明 |
|------|---------|
| `ink/` | CC内部Ink fork全部实现 |
| `ink/termio/` | ANSI解析器（parser/tokenizer/sgr/esc/osc） |
| `ink/events/` | DOM式事件系统（click/focus/keyboard） |
| `ink/layout/` | Yoga布局引擎适配 |
| `ink/hooks/` | Ink内部hooks（useInput/useTerminalFocus等） |
| `ink/components/` | Ink内部组件（Box/Text/ScrollBox等） |
| `context/` | React Context层（通知/模态/统计/主题等） |
| `keybindings/` | 快捷键解析+配置系统 |

---

## T5 — 服务层（Services Layer）

> **职责：** 后台长期运行服务（MCP连接、压缩、记忆、Analytics、OAuth等）。  
> 依赖：T0、T7。不依赖 T2（UI）。

| 目录 | 职责说明 |
|------|---------|
| `services/api/` | Anthropic API调用封装 |
| `services/mcp/` | MCP服务器连接管理 |
| `services/compact/` | 上下文自动压缩 |
| `services/memory/` | 内存存储服务 |
| `services/memdir/` | 记忆目录服务 |
| `services/analytics/` | 分析事件系统 |
| `services/oauth/` | OAuth认证服务 |
| `services/featureFlags/` | 功能开关服务 |
| `services/lsp/` | LSP语言服务协议 |
| `services/background/` | 后台会话管理 |
| `services/cron/` | 定时任务服务 |
| `services/messaging/` | 进程间消息服务 |
| `services/toolUseSummary/` | 工具使用摘要生成 |
| `services/tools/` | 工具编排/StreamingExecutor |
| `services/PromptSuggestion/` | 提示词建议/推测 |
| `services/SessionMemory/` | 会话记忆服务 |
| `services/awaySummary.ts` | 离线摘要 |
| `services/brief/` | Brief推送服务 |
| `services/contextCollapse/` | 上下文折叠 |
| `services/extractMemories/` | 记忆提取 |
| `services/diagnosticTracking.ts` | 诊断事件追踪 |
| `services/outputStyles/` | 输出风格服务 |
| `services/voice.ts` | 语音识别服务 |
| `services/rateLimitMocking.ts` | 速率限制模拟 |
| `services/remoteManagedSettings/` | 远程托管设置同步 |
| `services/settingsSync/` | 用户设置云同步 |

---

## T6 — 基础工具层（Foundation Utils）

> **职责：** 纯函数工具库、文件系统、网络、安全存储、Shell执行等。  
> 依赖：T7（类型）。被所有层依赖，自身不依赖业务层。

| 目录 | 职责说明 |
|------|---------|
| `utils/` (根) | 通用工具函数（array/format/errors/truncate等） |
| `utils/bash/` | Bash命令解析/引用/规格 |
| `utils/permissions/` | 权限规则匹配/加载/验证 |
| `utils/settings/` | 设置读写/验证/缓存/MDM |
| `utils/secureStorage/` | 安全凭据存储（Keychain/明文） |
| `utils/plugins/` | 插件系统工具集 |
| `utils/model/` | 模型名称/别名/验证 |
| `utils/shell/` | Shell检测/执行/限制 |
| `utils/sandbox/` | 沙箱适配/UI工具 |
| `utils/suggestions/` | 自动补全建议生成 |
| `utils/mcp/` | MCP elicitation/日期解析 |
| `utils/hooks/` | Hook执行/配置工具 |
| `utils/filePersistence/` | 文件持久化扫描 |
| `utils/telemetry/` | OTEL诊断日志 |
| `utils/ultraplan/` | ultraplan关键词检测 |
| `utils/task/` | 任务输出/进度工具 |
| `utils/memory/` | 记忆管理工具 |
| `utils/processUserInput/` | 用户输入处理管道 |
| `native-ts/` | Native模块TS绑定（Yoga/color-diff） |
| `outputStyles/` | 输出风格目录加载 |
| `plugins/` | 插件加载器 |
| `skills/` | 技能目录加载 |
| `memdir/` | 记忆目录核心逻辑 |

---

## T7 — 类型 / 常量层（Types & Constants）

> **职责：** 纯类型定义、Zod Schema、常量枚举。  
> 被所有层依赖；自身不包含业务逻辑，不依赖任何层。

| 目录 | 职责说明 |
|------|---------|
| `types/` | 全局类型（message/command/permissions/tools等） |
| `types/generated/` | Protobuf自动生成类型 |
| `constants/` | 全局常量（figures/tools/xml/apiLimits等） |
| `entrypoints/` | SDK/Sandbox入口类型 |
| `schemas/` | 独立Schema定义 |

---

## 补充：外部集成目录

> 不属于 T0–T7 核心，但重要的外部/平台集成。

| 目录 | 职责说明 |
|------|---------|
| `bridge/` | Remote Control Bridge（移动/Web端连接） |
| `cli/` | CLI子命令处理/传输层 |
| `commands/` | 所有斜杠命令实现（60+命令） |
| `server/` | 服务器模式（会话管理API） |
| `moreright/` | MoreRight AI功能（ANT内部） |
| `assistant/` | 会话历史辅助 |
| `root/` | 入口根文件 |
| `remote/` | 远程模式 |
| `upstreamproxy/` | 上游代理配置 |
| `voice/` | 语音输入功能 |
