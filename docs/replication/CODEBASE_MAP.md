# CC Source Codebase Map

> **Source:** `D:\Git-Clone\CC-SRC\claude-code-sourcemap\restored-src\src`
> **Total files:** 1884 (`.ts` / `.tsx`)
> **Mapping date:** 2026-05-20
> **Method:** 文件名 + 顶部 20 行提取描述，单条 ≤25 汉字

---

## assistant/

- `assistant/sessionHistory.ts` — 会话历史读写工具

## bootstrap/

- `bootstrap/state.ts` — 启动期全局状态（cwd/mode/flags）

## bridge/

- `bridge/bridgeApi.ts` — Bridge REST API 客户端封装
- `bridge/bridgeConfig.ts` — Bridge 配置读取与校验
- `bridge/bridgeDebug.ts` — Bridge 调试日志工具
- `bridge/bridgeEnabled.ts` — Bridge 功能开关检测
- `bridge/bridgeMain.ts` — Bridge 轮询主循环
- `bridge/bridgeMessaging.ts` — Bridge 消息发送/订阅
- `bridge/bridgePermissionCallbacks.ts` — Bridge 权限请求回调类型
- `bridge/bridgePointer.ts` — Bridge 崩溃恢复指针文件
- `bridge/bridgeStatusUtil.ts` — Bridge 状态标签/shimmer工具
- `bridge/bridgeUI.ts` — Bridge TUI 渲染（chalk版）
- `bridge/capacityWake.ts` — 容量等待唤醒原语
- `bridge/codeSessionApi.ts` — CodeSession REST API 封装
- `bridge/createSession.ts` — 创建 Bridge 会话
- `bridge/debugUtils.ts` — Bridge 调试辅助
- `bridge/envLessBridgeConfig.ts` — 无环境变量的Bridge配置
- `bridge/flushGate.ts` — 消息刷新门控状态机
- `bridge/inboundAttachments.ts` — 入站附件解析
- `bridge/inboundMessages.ts` — 入站消息规范化
- `bridge/replBridge.ts` — REPL Bridge 主状态机
- `bridge/replBridgeHandle.ts` — REPL Bridge 全局句柄指针
- `bridge/replBridgeTransport.ts` — REPL Bridge WebSocket传输层
- `bridge/sessionIdCompat.ts` — 会话ID格式兼容转换
- `bridge/types.ts` — Bridge 共享类型定义
- `bridge/useReplBridge.tsx` — REPL Bridge React hook
- `bridge/workSecret.ts` — Work Secret 解码与URL构建

## buddy/

- `buddy/CompanionSprite.tsx` — 吉祥物精灵渲染组件
- `buddy/buddyConfig.ts` — 吉祥物配置加载
- `buddy/buddyTypes.ts` — 吉祥物类型定义

## cli/

- `cli/exit.ts` — CLI 退出辅助函数
- `cli/handlers/agents.ts` — agents 子命令处理器
- `cli/handlers/autoMode.ts` — auto-mode 子命令处理器
- `cli/ndjsonSafeStringify.ts` — NDJSON 安全序列化
- `cli/transports/HybridTransport.ts` — WS读+HTTP写混合传输
- `cli/transports/SSETransport.ts` — SSE 读 + POST 写传输
- `cli/transports/SerialBatchEventUploader.ts` — 批量事件串行上传
- `cli/transports/Transport.ts` — 传输层基接口
- `cli/transports/WebSocketTransport.ts` — WebSocket 双向传输
- `cli/transports/WorkerStateUploader.ts` — Worker状态合并上传器
- `cli/transports/ccrClient.ts` — CCR WebSocket 客户端
- `cli/transports/transportUtils.ts` — 传输层选择工具函数

## commands/ （斜杠命令实现，每目录一条）

- `commands/add-dir/` — /add-dir 添加工作目录
- `commands/agents/` — /agents 列出代理配置
- `commands/ant-trace/` — ANT内部调用跟踪
- `commands/autofix-pr/` — 自动修复PR（ANT）
- `commands/backfill-sessions/` — 补填会话元数据
- `commands/branch/` — /branch 分支管理
- `commands/break-cache/` — 强制清除提示缓存
- `commands/bridge/` — /bridge 远程控制命令
- `commands/btw/` — /btw ANT内部记录命令
- `commands/bughunter/` — Bug猎手模式（ANT）
- `commands/chrome/` — Claude in Chrome集成
- `commands/clear/` — /clear 清空会话上下文
- `commands/color/` — /color 颜色选择
- `commands/compact/` — /compact 压缩上下文
- `commands/config/` — /config 设置面板
- `commands/context/` — /context 上下文管理
- `commands/copy/` — /copy 复制内容
- `commands/cost/` — /cost 费用展示
- `commands/ctx_viz/` — 上下文可视化
- `commands/debug-tool-call/` — 调试工具调用
- `commands/desktop/` — Claude Desktop集成
- `commands/diff/` — /diff 显示变更差异
- `commands/doctor/` — /doctor 环境诊断
- `commands/effort/` — /effort 思考强度控制
- `commands/env/` — /env 环境变量管理
- `commands/exit/` — /exit 退出REPL
- `commands/export/` — /export 导出会话
- `commands/extra-usage/` — /extra-usage 额外用量
- `commands/fast/` — /fast 切换快速模式
- `commands/feedback/` — /feedback 反馈收集
- `commands/files/` — /files 文件管理
- `commands/good-claude/` — ANT内部正向反馈
- `commands/heapdump/` — /heapdump 内存快照
- `commands/help/` — /help 帮助信息
- `commands/hooks/` — /hooks 钩子管理
- `commands/ide/` — /ide IDE集成状态
- `commands/install-github-app/` — 安装GitHub App
- `commands/install-slack-app/` — 安装Slack App
- `commands/issue/` — /issue 问题上报
- `commands/keybindings/` — /keybindings 快捷键配置
- `commands/login/` — /login 认证登录
- `commands/logout/` — /logout 退出登录
- `commands/mcp/` — /mcp MCP服务器管理
- `commands/memory/` — /memory 记忆文件编辑
- `commands/mobile/` — 移动端集成
- `commands/mock-limits/` — 模拟速率限制测试
- `commands/model/` — /model 模型切换
- `commands/oauth-refresh/` — OAuth令牌刷新
- `commands/onboarding/` — 新用户引导流程
- `commands/output-style/` — /output-style 输出风格
- `commands/passes/` — 多轮重写Passes
- `commands/perf-issue/` — 性能问题上报
- `commands/permissions/` — /permissions 权限规则
- `commands/plan/` — /plan 计划模式
- `commands/plugin/` — /plugin 插件管理
- `commands/pr_comments/` — PR评论查看
- `commands/privacy-settings/` — 隐私设置
- `commands/rate-limit-options/` — 速率限制选项
- `commands/release-notes/` — 版本发布说明
- `commands/reload-plugins/` — /reload-plugins 重载插件
- `commands/remote-env/` — 远程环境管理
- `commands/remote-setup/` — 远程环境配置
- `commands/rename/` — /rename 重命名会话
- `commands/reset-limits/` — 重置使用限制
- `commands/resume/` — /resume 恢复会话
- `commands/review/` — /review 代码审查
- `commands/rewind/` — /rewind 消息回滚
- `commands/sandbox-toggle/` — 沙箱开关
- `commands/session/` — 会话管理命令
- `commands/share/` — /share 分享会话
- `commands/skills/` — /skills 技能列表
- `commands/stats/` — /stats 统计面板
- `commands/stickers/` — 彩蛋贴纸命令
- `commands/stop/` — 停止当前任务
- `commands/tasks/` — /tasks 后台任务管理
- `commands/terminalSetup/` — 终端环境设置
- `commands/theme/` — /theme 主题切换
- `commands/thinkback/` — ANT回顾模式
- `commands/usage/` — /usage 用量展示
- `commands/vim/` — /vim Vim模式切换
- `commands/voice/` — /voice 语音输入

## components/

### components/CustomSelect/
- `components/CustomSelect/SelectMulti.tsx` — 多选选择器组件
- `components/CustomSelect/index.ts` — CustomSelect公开入口
- `components/CustomSelect/option-map.ts` — 双链表选项映射
- `components/CustomSelect/select-input-option.tsx` — 内嵌输入选项
- `components/CustomSelect/select-option.tsx` — 单个选项行渲染
- `components/CustomSelect/select.tsx` — 主Select组件（完整）
- `components/CustomSelect/SelectMulti.tsx` — 多选组件
- `components/CustomSelect/use-multi-select-state.ts` — 多选状态hook
- `components/CustomSelect/use-select-input.ts` — 选项内嵌输入hook
- `components/CustomSelect/use-select-navigation.ts` — 键盘导航状态机
- `components/CustomSelect/use-select-state.ts` — 单选状态hook

### components/FeedbackSurvey/
- `components/FeedbackSurvey/FeedbackSurveyView.tsx` — 会话质量评分视图
- `components/FeedbackSurvey/TranscriptSharePrompt.tsx` — 记录共享确认提示
- `components/FeedbackSurvey/useDebouncedDigitInput.ts` — 防抖数字键输入
- `components/FeedbackSurvey/utils.ts` — 反馈响应类型定义

### components/HelpV2/
- `components/HelpV2/Commands.tsx` — 帮助-命令列表
- `components/HelpV2/General.tsx` — 帮助-通用页面

### components/LspRecommendation/
- `components/LspRecommendation/LspRecommendationMenu.tsx` — LSP推荐菜单

### components/LogoV2/
- `components/LogoV2/AnimatedClawd.tsx` — 动画吉祥物（V2）
- `components/LogoV2/Clawd.tsx` — 静态吉祥物渲染
- `components/LogoV2/Feed.tsx` — 活动Feed展示
- `components/LogoV2/FeedColumn.tsx` — Feed列布局
- `components/LogoV2/Opus1mMergeNotice.tsx` — Opus-1M合并通知
- `components/LogoV2/feedConfigs.tsx` — Feed配置数据
- `components/LogoV2/WelcomeV2.tsx` — V2欢迎页面

### components/ManagedSettingsSecurityDialog/
- `components/ManagedSettingsSecurityDialog/ManagedSettingsSecurityDialog.tsx` — 托管设置安全确认
- `components/ManagedSettingsSecurityDialog/utils.ts` — 安全对话框工具

### components/PromptInput/
- `components/PromptInput/HistorySearchInput.tsx` — 历史搜索输入框
- `components/PromptInput/IssueFlagBanner.tsx` — 问题标记横幅（ANT）
- `components/PromptInput/Notifications.tsx` — 提示输入区通知
- `components/PromptInput/PromptInputFooter.tsx` — 输入框底部区域
- `components/PromptInput/PromptInputFooterSuggestions.tsx` — 底部建议列表
- `components/PromptInput/PromptInputHelpMenu.tsx` — 输入框帮助菜单
- `components/PromptInput/PromptInputModeIndicator.tsx` — 模式指示器
- `components/PromptInput/SandboxPromptFooterHint.tsx` — 沙箱违规提示
- `components/PromptInput/ShimmeredInput.tsx` — 闪光高亮输入框
- `components/PromptInput/inputModes.ts` — 输入模式枚举
- `components/PromptInput/inputPaste.ts` — 粘贴截断处理
- `components/PromptInput/useMaybeTruncateInput.ts` — 大输入截断hook
- `components/PromptInput/utils.ts` — vim模式/换行提示工具

### components/Settings/
- `components/Settings/Settings.tsx` — 设置面板主组件

### components/Spinner/
- `components/Spinner/FlashingChar.tsx` — 双色插值闪烁字符
- `components/Spinner/ShimmerChar.tsx` — Shimmer单字符渲染
- `components/Spinner/SpinnerGlyph.tsx` — 旋转字符渲染器
- `components/Spinner/index.ts` — Spinner组件入口
- `components/Spinner/teammateSelectHint.ts` — 团队选择提示
- `components/Spinner/types.ts` — Spinner模式类型
- `components/Spinner/useStalledAnimation.ts` — 停滞动画hook
- `components/Spinner/utils.ts` — 颜色解析/插值工具

### components/StructuredDiff/
- `components/StructuredDiff/Fallback.tsx` — 结构化差异降级渲染
- `components/StructuredDiff/colorDiff.ts` — color-diff-napi可用性检测
- `components/StructuredDiff/index.tsx` — 结构化差异主组件

### components/agents/
- `components/agents/AgentNavigationFooter.tsx` — Agent导航底栏
- `components/agents/ColorPicker.tsx` — Agent颜色选择器
- `components/agents/ModelSelector.tsx` — Agent模型选择器
- `components/agents/new-agent-creation/CreateAgentWizard.tsx` — 新建Agent向导
- `components/agents/new-agent-creation/types.ts` — 向导数据类型
- `components/agents/new-agent-creation/wizard-steps/ColorStep.tsx` — 颜色选择步骤
- `components/agents/new-agent-creation/wizard-steps/ConfirmStep.tsx` — 确认步骤
- `components/agents/new-agent-creation/wizard-steps/DescriptionStep.tsx` — 描述输入步骤
- `components/agents/new-agent-creation/wizard-steps/LocationStep.tsx` — 存储位置步骤
- `components/agents/new-agent-creation/wizard-steps/MethodStep.tsx` — 触发方式步骤
- `components/agents/new-agent-creation/wizard-steps/ModelStep.tsx` — 模型选择步骤
- `components/agents/new-agent-creation/wizard-steps/PromptStep.tsx` — 提示词编辑步骤
- `components/agents/new-agent-creation/wizard-steps/ToolsStep.tsx` — 工具选择步骤
- `components/agents/types.ts` — Agent组件类型
- `components/agents/utils.ts` — Agent源显示名称

### components/design-system/
- `components/design-system/Byline.tsx` — 元数据行分隔符
- `components/design-system/Dialog.tsx` — 确认对话框组件
- `components/design-system/Divider.tsx` — 水平分割线
- `components/design-system/FuzzyPicker.tsx` — 模糊搜索选择器
- `components/design-system/KeyboardShortcutHint.tsx` — 快捷键提示文本
- `components/design-system/ListItem.tsx` — 列表项（focus/selected）
- `components/design-system/LoadingState.tsx` — 加载状态组件
- `components/design-system/Pane.tsx` — 斜杠命令容器区域
- `components/design-system/Panel.tsx` — 圆角卡片容器
- `components/design-system/ProgressBar.tsx` — Unicode块进度条
- `components/design-system/Ratchet.tsx` — 最小高度棘轮锁定
- `components/design-system/StatusIcon.tsx` — 状态图标（success/error）
- `components/design-system/ThemeProvider.tsx` — 主题Context提供者
- `components/design-system/ThemedBox.tsx` — 主题感知Box
- `components/design-system/ThemedText.tsx` — 主题感知Text
- `components/design-system/color.ts` — 设计系统颜色工具
- `components/design-system/Tabs.tsx` — 标签导航组件

### components/diff/
- `components/diff/DiffDetailView.tsx` — Diff详情展开视图
- `components/diff/DiffFileList.tsx` — Diff文件列表

### components/hooks/
- `components/hooks/PromptDialog.tsx` — 提示词响应对话框
- `components/hooks/SelectEventMode.tsx` — Hook事件类型选择
- `components/hooks/SelectHookMode.tsx` — Hook模式选择
- `components/hooks/SelectMatcherMode.tsx` — Hook匹配器选择
- `components/hooks/ViewHookMode.tsx` — Hook配置查看

### components/mcp/
- `components/mcp/CapabilitiesSection.tsx` — MCP能力展示
- `components/mcp/MCPAgentServerMenu.tsx` — MCP Agent服务器菜单
- `components/mcp/MCPListPanel.tsx` — MCP列表面板
- `components/mcp/MCPReconnect.tsx` — MCP重连操作
- `components/mcp/MCPRemoteServerMenu.tsx` — MCP远程服务器菜单
- `components/mcp/MCPSettings.tsx` — MCP设置面板
- `components/mcp/MCPStdioServerMenu.tsx` — MCP Stdio服务器菜单
- `components/mcp/MCPToolDetailView.tsx` — MCP工具详情
- `components/mcp/MCPToolListView.tsx` — MCP工具列表
- `components/mcp/index.ts` — MCP组件入口
- `components/mcp/types.ts` — MCP组件类型
- `components/mcp/utils/reconnectHelpers.tsx` — MCP重连辅助

### components/messages/
- `components/messages/AdvisorMessage.tsx` — Advisor消息渲染
- `components/messages/AssistantTextMessage.tsx` — 助手文本消息
- `components/messages/AssistantThinkingMessage.tsx` — 思考块渲染
- `components/messages/AssistantToolUseMessage.tsx` — 工具调用消息
- `components/messages/AttachmentMessage.tsx` — 附件消息渲染
- `components/messages/CollapsedReadSearchContent.tsx` — 折叠读取/搜索
- `components/messages/GroupedToolUseContent.tsx` — 工具调用分组
- `components/messages/HookProgressMessage.tsx` — Hook进度消息
- `components/messages/PlanApprovalMessage.tsx` — 计划审批消息
- `components/messages/RateLimitMessage.tsx` — 速率限制消息
- `components/messages/ShutdownMessage.tsx` — 关闭消息渲染
- `components/messages/SystemAPIErrorMessage.tsx` — API错误消息
- `components/messages/SystemTextMessage.tsx` — 系统文本消息
- `components/messages/TaskAssignmentMessage.tsx` — 任务分配消息
- `components/messages/TurnDurationMessage.tsx` — 轮次耗时消息
- `components/messages/UserBashInputMessage.tsx` — Bash输入消息
- `components/messages/UserImageMessage.tsx` — 用户图片消息
- `components/messages/UserPlanMessage.tsx` — 用户计划消息
- `components/messages/UserTextMessage.tsx` — 用户文本消息
- `components/messages/UserToolResultMessage/` — 工具结果消息
- `components/messages/nullRenderingAttachments.ts` — 空渲染附件集合

### components/permissions/
- `components/permissions/AskUserQuestionPermissionRequest/` — 问用户权限请求
- `components/permissions/FileEditPermissionRequest/` — 文件编辑权限
- `components/permissions/FilePermissionDialog/` — 文件权限对话框
- `components/permissions/FileWritePermissionRequest/` — 文件写入权限
- `components/permissions/FilesystemPermissionRequest/` — 文件系统权限
- `components/permissions/NotebookEditPermissionRequest/` — Notebook编辑权限
- `components/permissions/PermissionDialog.tsx` — 通用权限对话框
- `components/permissions/WorkerBadge.tsx` — Worker彩色徽章
- `components/permissions/WorkerPendingPermission.tsx` — Worker等待权限
- `components/permissions/rules/` — 权限规则组件
- `components/permissions/utils.ts` — 权限日志工具

### components/sandbox/
- `components/sandbox/SandboxDoctorSection.tsx` — 沙箱诊断区块

### components/shell/
- `components/shell/ExpandShellOutputContext.tsx` — 展开输出上下文
- `components/shell/OutputLine.tsx` — 输出行格式化渲染
- `components/shell/ShellProgressMessage.tsx` — Shell进度消息
- `components/shell/ShellTimeDisplay.tsx` — 耗时/超时显示

### components/tasks/
- `components/tasks/ShellProgress.tsx` — Shell任务进度
- `components/tasks/renderToolActivity.tsx` — 工具活动渲染
- `components/tasks/taskStatusUtils.tsx` — 任务状态工具

### components/wizard/
- `components/wizard/WizardDialogLayout.tsx` — 向导对话框布局
- `components/wizard/WizardNavigationFooter.tsx` — 向导导航底栏
- `components/wizard/WizardProvider.tsx` — 多步向导状态机
- `components/wizard/index.ts` — 向导组件入口
- `components/wizard/types.ts` — 向导类型定义
- `components/wizard/useWizard.ts` — 向导状态hook

### components/ (根目录)
- `components/AgentProgressLine.tsx` — Agent树形进度行
- `components/ApproveApiKey.tsx` — API Key确认对话框
- `components/AwsAuthStatusBox.tsx` — AWS认证状态盒
- `components/BaseTextInput.tsx` — 基础文本输入组件
- `components/BashModeProgress.tsx` — Bash模式进度显示
- `components/ChannelDowngradeDialog.tsx` — 频道降级确认
- `components/ClickableImageRef.tsx` — 可点击图片引用
- `components/ClaudeCodeHint/` — CC功能提示组件
- `components/CompactSummary.tsx` — 压缩摘要展示
- `components/ConfigurableShortcutHint.tsx` — 可配置快捷键提示
- `components/CostThresholdDialog.tsx` — 费用阈值提示
- `components/CtrlOToExpand.tsx` — ctrl+o展开提示
- `components/DiagnosticsDisplay.tsx` — 诊断信息展示
- `components/ExitFlow.tsx` — 退出流程处理
- `components/ExportDialog.tsx` — 导出对话框
- `components/FallbackToolUseErrorMessage.tsx` — 工具错误降级消息
- `components/FileEditToolDiff.tsx` — 文件编辑差异视图
- `components/FileEditToolUpdatedMessage.tsx` — 文件更新消息
- `components/FileEditToolUseRejectedMessage.tsx` — 文件编辑拒绝消息
- `components/FileBrowse.tsx` — 文件浏览组件
- `components/FilePathLink.tsx` — 文件路径超链接
- `components/Feedback.tsx` — 反馈入口组件
- `components/HelpV2/` — 帮助V2组件
- `components/IdleReturnDialog.tsx` — 空闲返回确认
- `components/IdeAutoConnectDialog.tsx` — IDE自动连接对话框
- `components/IdeOnboardingDialog.tsx` — IDE引导对话框
- `components/IdeStatusIndicator.tsx` — IDE连接状态指示
- `components/InvalidSettingsDialog.tsx` — 无效设置对话框
- `components/KeybindingWarnings.tsx` — 快捷键配置警告
- `components/LanguagePicker.tsx` — 语言选择器
- `components/MCPParsingWarnings.tsx` — MCP解析警告
- `components/MCPServerDialogCopy.tsx` — MCP服务器披露文本
- `components/Markdown.tsx` — Markdown渲染组件
- `components/ManagedSettingsSecurityDialog/` — 托管设置安全确认
- `components/Message.tsx` — 消息根组件
- `components/MessageActions.tsx` — 消息操作按钮
- `components/MessageModel.tsx` — 消息模型名显示
- `components/MessageResponse.tsx` — 工具响应⎿格式
- `components/NotebookEditToolUseRejectedMessage.tsx` — Notebook编辑拒绝
- `components/OffscreenFreeze.tsx` — 离屏内容冻结优化
- `components/OutputStylePicker.tsx` — 输出风格选择器
- `components/PackageManagerAutoUpdater.tsx` — 包管理器自动更新
- `components/PermissionTypeSelector.tsx` — 权限类型选择器
- `components/PrBadge.tsx` — PR状态徽章
- `components/REPL.tsx` — ← 核心 REPL 根组件
- `components/REPL/` — REPL子组件
- `components/SandboxViolationExpandedView.tsx` — 沙箱违规详情
- `components/SearchBox.tsx` — 搜索输入框
- `components/SessionPreview.tsx` — 会话预览卡片
- `components/ShowInIDEPrompt.tsx` — IDE中显示提示
- `components/Spinner/` — 加载动画组件集
- `components/StatusBar.tsx` — 状态栏Token/费用
- `components/StatusNotices.tsx` — 启动通知区域
- `components/StructuredDiffList.tsx` — 结构化差异列表
- `components/SubAgentNavigator.tsx` — 子Agent导航器
- `components/TeleportRepoMismatchDialog.tsx` — Teleport仓库不匹配
- `components/ThemePicker.tsx` — 主题选择器
- `components/ToolCallDisplay.tsx` — 工具调用状态展示
- `components/ToolUseLoader.tsx` — 工具调用加载动画
- `components/ValidationErrorsList.tsx` — 验证错误列表
- `components/VimTextInput.tsx` — Vim模式文本输入
- `components/WorkflowMultiselectDialog.tsx` — 工作流多选对话框
- `components/WorktreeExitDialog.tsx` — Worktree退出对话框
- `components/messageActions.ts` — 消息操作工具函数

## constants/

- `constants/apiLimits.ts` — API限制常量
- `constants/betas.ts` — Beta功能标志
- `constants/common.ts` — 通用常量
- `constants/cyberRiskInstruction.ts` — 网络安全风险说明
- `constants/errorIds.ts` — 错误ID枚举
- `constants/figures.ts` — Unicode图形字符
- `constants/files.ts` — 文件路径常量
- `constants/github-app.ts` — GitHub App集成常量
- `constants/messages.ts` — 通用消息常量
- `constants/outputStyles.ts` — 输出风格配置
- `constants/product.ts` — 产品URL/名称常量
- `constants/querySource.ts` — 查询来源枚举
- `constants/spinnerVerbs.ts` — Spinner动作词
- `constants/toolLimits.ts` — 工具输出大小限制
- `constants/tools.ts` — 工具名称常量
- `constants/turnCompletionVerbs.ts` — 轮次完成动词
- `constants/xml.ts` — XML标签常量

## context/

- `context/QueuedMessageContext.tsx` — 排队消息React Context
- `context/fpsMetrics.tsx` — FPS指标Context
- `context/mailbox.tsx` — 邮箱通信Context
- `context/modalContext.tsx` — 模态弹层Context
- `context/notifications.tsx` — 通知系统Context
- `context/overlayContext.tsx` — 浮层Context
- `context/promptOverlayContext.tsx` — Prompt浮层Context
- `context/stats.tsx` — 统计指标Context
- `context/voice.tsx` — 语音功能Context

## coordinator/

- `coordinator/coordinatorMode.ts` — 协调者模式入口
- `coordinator/engine.ts` — 协调者引擎（多Agent并行）

## entrypoints/

- `entrypoints/agentSdkTypes.ts` — Agent SDK类型定义
- `entrypoints/mcp.ts` — MCP入口点
- `entrypoints/sandboxTypes.ts` — 沙箱配置类型
- `entrypoints/sdk/` — SDK入口类型

## hooks/

- `hooks/fileSuggestions.ts` — 文件建议补全
- `hooks/notifs/` — 通知hooks
- `hooks/renderPlaceholder.ts` — 占位符渲染
- `hooks/unifiedSuggestions.ts` — 统一建议系统
- `hooks/useAfterFirstRender.ts` — 首次渲染后回调
- `hooks/useArrowKeyHistory.tsx` — 方向键历史导航
- `hooks/useBlink.ts` — 光标闪烁hook
- `hooks/useClipboardImageHint.ts` — 剪贴板图片提示
- `hooks/useCommandKeybindings.tsx` — 命令快捷键注册
- `hooks/useCommandQueue.ts` — 命令队列订阅
- `hooks/useCopyOnSelect.ts` — 选中自动复制
- `hooks/useDeferredHookMessages.ts` — 延迟Hook消息
- `hooks/useDiffData.ts` — Git diff数据hook
- `hooks/useDoublePress.ts` — 双击检测
- `hooks/useDynamicConfig.ts` — 动态配置读取
- `hooks/useElapsedTime.ts` — 计时器hook
- `hooks/useExitOnCtrlCD.ts` — Ctrl+C/D双击退出
- `hooks/useExitOnCtrlCDWithKeybindings.ts` — 带keybinding的退出
- `hooks/useFileHistorySnapshotInit.ts` — 文件历史初始化
- `hooks/useIDEIntegration.tsx` — IDE集成hook
- `hooks/useIdeAtMentioned.ts` — IDE @提及通知
- `hooks/useIdeConnectionStatus.ts` — IDE连接状态
- `hooks/useIdeSelection.ts` — IDE文本选择
- `hooks/useInputBuffer.ts` — 输入撤销缓冲区
- `hooks/useMailboxBridge.ts` — 邮箱桥接hook
- `hooks/useMaybeTruncateInput.ts` → PromptInput目录
- `hooks/useMemoryUsage.ts` — 内存用量监控
- `hooks/useMergedClients.ts` — MCP客户端去重
- `hooks/useMergedCommands.ts` — 命令去重合并
- `hooks/useMinDisplayTime.ts` — 最小展示时间
- `hooks/usePasteHandler.ts` — 粘贴处理hook
- `hooks/usePromptsFromClaudeInChrome.tsx` — Chrome输入接收
- `hooks/useQueueProcessor.ts` — 队列处理器hook
- `hooks/useSearchInput.ts` — 搜索输入完整hook
- `hooks/useSettingsChange.ts` — 设置变更监听
- `hooks/useSSHSession.ts` — SSH会话管理
- `hooks/useSwarmPermissionPoller.ts` — Swarm权限轮询
- `hooks/useTaskListWatcher.ts` — 任务列表监听
- `hooks/useTextInput.ts` — 完整文本输入hook
- `hooks/useTimeout.ts` — 超时hook
- `hooks/useTurnDiffs.ts` — 轮次差异分析
- `hooks/useUpdateNotification.ts` — 更新通知
- `hooks/useVimInput.ts` — Vim输入模式hook
- `hooks/useVirtualScroll.ts` — 虚拟滚动hook

## ink/

- `ink/Ansi.tsx` — ANSI字符串React渲染
- `ink/bidi.ts` — 双向文字重排序
- `ink/clearTerminal.ts` — 跨平台终端清屏
- `ink/colorize.ts` — chalk颜色级别配置
- `ink/components/AlternateScreen.tsx` — 备用屏幕模式
- `ink/components/AppContext.ts` — App上下文
- `ink/components/Box.tsx` — Ink内部Box实现
- `ink/components/Button.tsx` — 可交互按钮
- `ink/components/ClockContext.tsx` — 动画时钟Context
- `ink/components/CursorDeclarationContext.ts` — 光标声明Context
- `ink/components/ErrorOverview.tsx` — 错误概览展示
- `ink/components/Link.tsx` — OSC 8超链接组件
- `ink/components/Newline.tsx` — 换行符组件
- `ink/components/NoSelect.tsx` — 非选中区域包装
- `ink/components/RawAnsi.tsx` — 原始ANSI直通
- `ink/components/ScrollBox.tsx` — 可滚动Box
- `ink/components/Spacer.tsx` — Flex间隔填充
- `ink/components/StdinContext.ts` — Stdin上下文
- `ink/components/TerminalFocusContext.tsx` — 终端焦点Context
- `ink/components/TerminalSizeContext.tsx` — 终端尺寸Context
- `ink/components/Text.tsx` — Ink内部Text实现
- `ink/dom.ts` — DOM节点类型定义
- `ink/events/click-event.ts` — 点击事件类
- `ink/events/dispatcher.ts` — 事件分发器
- `ink/events/emitter.ts` — 事件发射器
- `ink/events/event-handlers.ts` — 事件处理器类型
- `ink/events/event.ts` — 基础Event类
- `ink/events/focus-event.ts` — 焦点事件类
- `ink/events/input-event.ts` — 键盘输入事件
- `ink/events/keyboard-event.ts` — 键盘事件类
- `ink/events/terminal-event.ts` — 终端事件基类
- `ink/events/terminal-focus-event.ts` — 终端焦点事件
- `ink/focus.ts` — 焦点管理器
- `ink/frame.ts` — 帧数据类型
- `ink/get-max-width.ts` — Yoga内容宽度计算
- `ink/hit-test.ts` — 鼠标命中测试
- `ink/hooks/use-animation-frame.ts` — 动画帧hook
- `ink/hooks/use-app.ts` — useApp包装
- `ink/hooks/use-declared-cursor.ts` — 光标位置声明
- `ink/hooks/use-input.ts` — useInput包装
- `ink/hooks/use-interval.ts` — 定时器hook
- `ink/hooks/use-search-highlight.ts` — 搜索高亮hook
- `ink/hooks/use-selection.ts` — 文本选择hook
- `ink/hooks/use-stdin.ts` — useStdin包装
- `ink/hooks/use-tab-status.ts` — 标签状态OSC hook
- `ink/hooks/use-terminal-focus.ts` — 终端焦点hook
- `ink/hooks/use-terminal-title.ts` — 终端标题hook
- `ink/hooks/use-terminal-viewport.ts` — 终端视口hook
- `ink/ink.tsx` — Ink实例主类
- `ink/instances.ts` — Ink实例映射Map
- `ink/layout/engine.ts` — Yoga布局引擎工厂
- `ink/layout/geometry.ts` — 几何基础类型
- `ink/layout/node.ts` — Yoga节点接口
- `ink/layout/yoga.ts` — Yoga适配器
- `ink/line-width-cache.ts` — 行宽LRU缓存
- `ink/log-update.ts` — 终端差量更新
- `ink/measure-element.ts` — 元素尺寸测量
- `ink/measure-text.ts` — 文本尺寸测量
- `ink/node-cache.ts` — Yoga节点布局缓存
- `ink/optimizer.ts` — 终端diff优化器
- `ink/output.ts` — 渲染输出缓冲
- `ink/parse-keypress.ts` — 原始键盘事件解析
- `ink/reconciler.ts` — React协调器适配
- `ink/render-border.ts` — 边框渲染
- `ink/render-node-to-output.ts` — 节点转输出
- `ink/render-to-screen.ts` — 渲染到屏幕缓冲
- `ink/renderer.ts` — 主渲染器
- `ink/root.ts` — Ink根实例管理
- `ink/screen.ts` — 屏幕缓冲区
- `ink/searchHighlight.ts` — 屏幕搜索高亮
- `ink/selection.ts` — 文本选择状态
- `ink/squash-text-nodes.ts` — 文本节点展平
- `ink/styles.ts` — 样式类型定义
- `ink/supports-hyperlinks.ts` — 超链接终端检测
- `ink/tabstops.ts` — Tab字符展开
- `ink/terminal-focus-state.ts` — 终端焦点信号
- `ink/terminal-querier.ts` — 终端能力查询
- `ink/terminal.ts` — 终端渲染核心
- `ink/termio.ts` — ANSI解析器入口
- `ink/termio/ansi.ts` — ANSI控制字符常量
- `ink/termio/csi.ts` — CSI序列工具
- `ink/termio/dec.ts` — DEC私有模式常量
- `ink/termio/esc.ts` — ESC序列解析器
- `ink/termio/osc.ts` — OSC序列工具
- `ink/termio/parser.ts` — ANSI语义解析器
- `ink/termio/sgr.ts` — SGR图形渲染参数
- `ink/termio/tokenize.ts` — 转义序列分词器
- `ink/termio/types.ts` — 解析器语义类型
- `ink/useTerminalNotification.ts` — 终端通知Context
- `ink/warn.ts` — Ink警告工具
- `ink/widest-line.ts` — 最宽行计算
- `ink/wrap-text.ts` — ANSI感知换行
- `ink/wrapAnsi.ts` — wrap-ansi包装

## keybindings/

- `keybindings/KeybindingContext.tsx` — 快捷键解析Context
- `keybindings/KeybindingProviderSetup.tsx` — 快捷键提供者设置
- `keybindings/defaultBindings.ts` — 默认快捷键配置
- `keybindings/index.ts` — 快捷键模块入口
- `keybindings/loader.ts` — 快捷键文件加载器
- `keybindings/loadUserBindings.ts` — 用户配置加载+热重载
- `keybindings/match.ts` — 按键匹配逻辑
- `keybindings/parser.ts` — 按键串解析器
- `keybindings/reservedShortcuts.ts` — 保留快捷键列表
- `keybindings/resolver.ts` — 快捷键解析引擎
- `keybindings/schema.ts` — 快捷键Zod Schema
- `keybindings/shortcutFormat.ts` — 快捷键显示格式化
- `keybindings/template.ts` — 快捷键模板生成
- `keybindings/types.ts` — 快捷键类型定义
- `keybindings/useKeybinding.ts` — useKeybinding hook
- `keybindings/useShortcutDisplay.ts` — 快捷键显示hook
- `keybindings/validate.ts` — 用户配置验证器

## memdir/

- `memdir/findRelevantMemories.ts` — 相关记忆查找
- `memdir/memdir.ts` — 记忆目录主逻辑
- `memdir/memoryAge.ts` — 记忆年龄格式化
- `memdir/memoryScan.ts` — 记忆目录扫描
- `memdir/memoryTypes.ts` — 记忆类型定义
- `memdir/paths.ts` — 记忆路径管理
- `memdir/teamMemPaths.ts` — 团队记忆路径
- `memdir/teamMemPrompts.ts` — 团队记忆提示词

## migrations/

- `migrations/migrateReplBridgeEnabledToRemoteControlAtStartup.ts` — Bridge配置键迁移

## modes/

- `modes/planMode.ts` — 权限模式状态机

## moreright/

- `moreright/useMoreRight.tsx` — MoreRight功能存根

## native-ts/

- `native-ts/color-diff/` — 颜色差异Native实现
- `native-ts/file-index/` — 文件索引Native实现
- `native-ts/yoga-layout/enums.ts` — Yoga枚举常量
- `native-ts/yoga-layout/index.ts` — Yoga布局Native绑定

## outputStyles/

- `outputStyles/loadOutputStylesDir.ts` — 输出风格目录加载

## plugins/

- `plugins/bundled/index.ts` — 内置插件初始化
- `plugins/loader.ts` — 插件加载器

## query/

- `query/StreamingToolExecutor.ts` — 并发工具执行器
- `query/deps.ts` — 查询依赖注入
- `query/tokenBudget.ts` — Token预算追踪器

## remote/

- `remote/` — 远程模式相关

## root/

- `root/` — 根级入口文件

## schemas/

- `schemas/` — Schema定义

## screens/

- `screens/Doctor.tsx` — 诊断页面
- `screens/REPL.tsx` — REPL主屏幕（核心）
- `screens/ResumeConversation.tsx` — 恢复会话屏幕

## server/

- `server/types.ts` — 服务器会话类型

## services/

- `services/PromptSuggestion/` — 提示词建议
- `services/SessionMemory/` — 会话记忆
- `services/analytics/config.ts` — 分析禁用逻辑
- `services/api/` — Anthropic API调用层
- `services/awaySummary.ts` — 离线摘要服务
- `services/background/` — 后台会话服务
- `services/brief/` — Brief服务
- `services/compact/` — 上下文压缩服务
- `services/contextCollapse/` — 上下文折叠
- `services/cron/` — 定时任务服务
- `services/diagnosticTracking.ts` — 诊断事件追踪
- `services/extractMemories/` — 记忆提取
- `services/featureFlags/` — 功能开关
- `services/lsp/` — LSP服务集成
- `services/mcp/` — MCP服务管理
- `services/memdir/` — 记忆目录服务
- `services/memory/` — 内存存储服务
- `services/messaging/` — 消息服务
- `services/oauth/` — OAuth认证
- `services/outputStyles/` — 输出风格服务
- `services/rateLimitMocking.ts` — 速率限制模拟
- `services/remoteManagedSettings/types.ts` — 远程托管设置类型
- `services/settingsSync/types.ts` — 设置同步类型
- `services/toolUseSummary/` — 工具使用摘要
- `services/tools/` — 工具编排服务
- `services/voice.ts` — 语音服务

## settings/

- `settings/loader.ts` — 设置级联加载
- `settings/schema.ts` — 设置Zod Schema

## skills/

- `skills/bundled/` — 内置技能集
- `skills/bundledSkills.ts` — 技能注册框架
- `skills/loadSkillsDir.ts` — 技能目录加载

## state/

- `state/AppState.tsx` — 应用状态React层
- `state/AppStateStore.ts` — 应用状态核心Store
- `state/onChangeAppState.ts` — 状态变更副作用
- `state/selectors.ts` — 状态派生选择器
- `state/store.ts` — 通用响应式Store
- `state/teammateViewHelpers.ts` — Teammate视图助手

## tasks/

- `tasks/DreamTask/` — Dream后台任务
- `tasks/InProcessTeammateTask/` — 进程内Teammate任务
- `tasks/LocalAgentTask/` — 本地Agent任务
- `tasks/LocalMainSessionTask.ts` — 本地主会话任务
- `tasks/LocalShellTask/` — 本地Shell任务
- `tasks/LocalWorkflowTask/` — 本地工作流任务
- `tasks/MonitorMcpTask/` — Monitor MCP任务
- `tasks/RemoteAgentTask/` — 远程Agent任务
- `tasks/pillLabel.ts` — 任务Pill标签生成
- `tasks/stopTask.ts` — 停止任务逻辑
- `tasks/types.ts` — 任务联合类型

## tools/

- `tools/AgentTool/` — 子Agent工具
- `tools/AskUserQuestionTool/` — 问用户工具
- `tools/BashTool/` — Bash命令工具
- `tools/BriefTool/` — Brief发送工具
- `tools/ConfigTool/` — 配置读写工具
- `tools/EnterPlanModeTool/` — 进入计划模式
- `tools/EnterWorktreeTool/` — 进入Worktree
- `tools/ExitPlanModeTool/` — 退出计划模式
- `tools/ExitWorktreeTool/` — 退出Worktree
- `tools/FileEditTool/` — 文件编辑工具
- `tools/FileReadTool/` — 文件读取工具
- `tools/FileWriteTool/` — 文件写入工具
- `tools/GlobTool/` — 文件通配搜索
- `tools/GrepTool/` — 代码内容搜索
- `tools/LSPTool/` — LSP诊断工具
- `tools/ListMcpResourcesTool/` — MCP资源列表
- `tools/MCPTool/` — MCP工具执行
- `tools/NotebookEditTool/` — Notebook编辑
- `tools/NotebookReadTool/` — Notebook读取
- `tools/PowerShellTool/` — PowerShell工具
- `tools/REPLTool/` — REPL原始工具
- `tools/ReadMcpResourceTool/` — MCP资源读取
- `tools/RemoteTriggerTool/` — 远程触发工具
- `tools/ScheduleCronTool/` — 定时任务调度
- `tools/SendMessageTool/` — 消息发送工具
- `tools/SkillTool/` — 技能调用工具
- `tools/SyntheticOutputTool/` — 结构化输出工具
- `tools/TaskCreateTool/` — 创建后台任务
- `tools/TaskGetTool/` — 获取任务状态
- `tools/TaskListTool/` — 列出后台任务
- `tools/TaskOutputTool/` — 任务输出读取
- `tools/TaskStopTool/` — 停止后台任务
- `tools/TaskUpdateTool/` — 更新任务信息
- `tools/TeamCreateTool/` — 创建Swarm团队
- `tools/TeamDeleteTool/` — 删除Swarm团队
- `tools/TodoWriteTool/` — Todo列表写入
- `tools/ToolSearchTool/` — 工具schema查找
- `tools/WebFetchTool/` — HTTP抓取工具
- `tools/WebSearchTool/` — Web搜索工具
- `tools/shared/` — 工具共享工具函数
- `tools/testing/` — 测试辅助工具
- `tools/utils.ts` — 工具消息标注工具

## types/

- `types/command.ts` — 命令类型定义
- `types/generated/` — Protobuf生成类型
- `types/ids.ts` — ID类型（AgentId等）
- `types/logs.ts` — 日志/事件类型
- `types/message.ts` — 消息结构类型
- `types/permissions.ts` — 权限类型
- `types/plugin.ts` — 插件类型定义
- `types/textInputTypes.ts` — 文本输入组件类型
- `types/tools.ts` — 工具类型定义
- `types/utils.ts` — 通用工具类型

## upstreamproxy/

- `upstreamproxy/` — 上游代理配置

## utils/

### utils/background/
- `utils/background/` — 后台任务工具

### utils/bash/
- `utils/bash/ParsedCommand.ts` — 命令解析结构
- `utils/bash/ast.ts` — Bash AST解析
- `utils/bash/bashParser.ts` — Bash语法解析器（大型）
- `utils/bash/bashPipeCommand.ts` — 管道命令处理
- `utils/bash/commands.ts` — 命令分割/重定向
- `utils/bash/heredoc.ts` — Heredoc处理
- `utils/bash/parser.ts` — tree-sitter解析入口
- `utils/bash/prefix.ts` — 命令前缀提取
- `utils/bash/registry.ts` — 命令规格注册表
- `utils/bash/shellCompletion.ts` — Shell补全
- `utils/bash/shellPrefix.ts` — Shell前缀检测
- `utils/bash/shellQuote.ts` — Shell引用封装
- `utils/bash/shellQuoting.ts` — Shell安全引用
- `utils/bash/specs/` — 各命令规格定义
- `utils/bash/treeSitterAnalysis.ts` — tree-sitter分析

### utils/computerUse/
- `utils/computerUse/` — 计算机使用工具（CUA）

### utils/deepLink/
- `utils/deepLink/` — 深度链接处理

### utils/dxt/
- `utils/dxt/helpers.ts` — DXT扩展包工具

### utils/filePersistence/
- `utils/filePersistence/outputsScanner.ts` — 输出文件扫描

### utils/git/
- `utils/git/` — Git操作工具

### utils/github/
- `utils/github/` — GitHub API工具

### utils/hooks/
- `utils/hooks/apiQueryHookHelper.ts` — API查询Hook助手
- `utils/hooks/execPromptHook.ts` — 执行Prompt Hook
- `utils/hooks/fileChangedWatcher.ts` — 文件变更监听器
- `utils/hooks/hookHelpers.ts` — Hook注册工具
- `utils/hooks/hooksConfigSnapshot.ts` — Hooks配置快照
- `utils/hooks/postSamplingHooks.ts` — 采样后Hook注册表
- `utils/hooks/sessionHooks.ts` — 会话级Hook管理
- `utils/hooks/ssrfGuard.ts` — SSRF防护Hook

### utils/mcp/
- `utils/mcp/dateTimeParser.ts` — 自然语言日期解析
- `utils/mcp/elicitationValidation.ts` — Elicitation验证

### utils/memory/
- `utils/memory/` — 记忆管理工具

### utils/messages/
- `utils/messages/` — 消息工具函数

### utils/model/
- `utils/model/agent.ts` — Agent模型解析
- `utils/model/aliases.ts` — 模型别名映射
- `utils/model/bedrock.ts` — Bedrock模型工具
- `utils/model/model.ts` — 模型名称工具
- `utils/model/modelAllowlist.ts` — 模型允许列表
- `utils/model/modelStrings.ts` — 模型字符串常量
- `utils/model/providers.ts` — 提供商识别
- `utils/model/validateModel.ts` — 模型合法性验证

### utils/nativeInstaller/
- `utils/nativeInstaller/` — 原生安装器工具

### utils/permissions/
- `utils/permissions/PermissionMode.ts` — 权限模式枚举
- `utils/permissions/PermissionPromptToolResultSchema.ts` — 权限结果Schema
- `utils/permissions/PermissionResult.ts` — 权限结果类型
- `utils/permissions/PermissionRule.ts` — 权限规则类型
- `utils/permissions/PermissionUpdate.ts` — 权限更新操作
- `utils/permissions/PermissionUpdateSchema.ts` — 权限更新Schema
- `utils/permissions/filesystem.ts` — 文件系统权限检查
- `utils/permissions/pathValidation.ts` — 路径权限验证
- `utils/permissions/permissionsLoader.ts` — 权限规则加载
- `utils/permissions/permissionSetup.ts` — 权限初始化
- `utils/permissions/permissionValidation.ts` — 权限规则验证
- `utils/permissions/shadowedRuleDetection.ts` — 规则遮蔽检测
- `utils/permissions/shellRuleMatching.ts` — Shell规则匹配

### utils/plugins/
- `utils/plugins/cacheUtils.ts` — 插件缓存工具
- `utils/plugins/dependencyResolver.ts` — 插件依赖解析
- `utils/plugins/gitAvailability.ts` — Git可用性检测
- `utils/plugins/installCounts.ts` — 安装计数统计
- `utils/plugins/loadPluginAgents.ts` — 插件Agent加载
- `utils/plugins/loadPluginOutputStyles.ts` — 插件输出风格
- `utils/plugins/lspPluginIntegration.ts` — LSP插件集成
- `utils/plugins/lspRecommendation.ts` — LSP推荐逻辑
- `utils/plugins/managedPlugins.ts` — 托管插件名称
- `utils/plugins/marketplaceHelpers.ts` — 插件市场工具
- `utils/plugins/mcpPluginIntegration.ts` — MCP插件集成
- `utils/plugins/mcpbHandler.ts` — MCPB包处理器
- `utils/plugins/officialMarketplace.ts` — 官方市场工具
- `utils/plugins/orphanedPluginFilter.ts` — 孤立插件过滤
- `utils/plugins/parseMarketplaceInput.ts` — 市场输入解析
- `utils/plugins/pluginAutoupdate.ts` — 插件自动更新
- `utils/plugins/pluginBlocklist.ts` — 插件黑名单
- `utils/plugins/pluginDirectories.ts` — 插件目录配置
- `utils/plugins/pluginFlagging.ts` — 插件标记机制
- `utils/plugins/pluginIdentifier.ts` — 插件ID解析
- `utils/plugins/pluginOptionsStorage.ts` — 插件选项存储
- `utils/plugins/pluginPolicy.ts` — 插件策略检查
- `utils/plugins/pluginStartupCheck.ts` — 插件启动检查
- `utils/plugins/pluginVersioning.ts` — 插件版本管理
- `utils/plugins/schemas.ts` — 插件Schema定义（大型）
- `utils/plugins/validatePlugin.ts` — 插件合法性验证
- `utils/plugins/walkPluginMarkdown.ts` — 插件Markdown遍历
- `utils/plugins/zipCache.ts` — Zip插件缓存
- `utils/plugins/zipCacheAdapters.ts` — Zip缓存适配器

### utils/powershell/
- `utils/powershell/` — PowerShell工具

### utils/processUserInput/
- `utils/processUserInput/` — 用户输入处理

### utils/sandbox/
- `utils/sandbox/sandbox-adapter.ts` — 沙箱适配器
- `utils/sandbox/sandbox-ui-utils.ts` — 沙箱UI工具

### utils/secureStorage/
- `utils/secureStorage/fallbackStorage.ts` — 降级存储策略
- `utils/secureStorage/index.ts` — 安全存储工厂
- `utils/secureStorage/keychainPrefetch.ts` — Keychain预取
- `utils/secureStorage/macOsKeychainHelpers.ts` — macOS Keychain辅助
- `utils/secureStorage/macOsKeychainStorage.ts` — macOS Keychain存储
- `utils/secureStorage/plainTextStorage.ts` — 明文凭据存储
- `utils/secureStorage/types.ts` — 安全存储类型

### utils/settings/
- `utils/settings/allErrors.ts` — 全量设置错误聚合
- `utils/settings/applySettingsChange.ts` — 设置变更应用
- `utils/settings/changeDetector.ts` — 设置文件变更检测
- `utils/settings/constants.ts` — 设置常量（源、范围）
- `utils/settings/internalWrites.ts` — 内部写入时间戳
- `utils/settings/mdm/` — MDM企业设置
- `utils/settings/permissionValidation.ts` — 权限设置验证
- `utils/settings/schemaOutput.ts` — 设置JSON Schema输出
- `utils/settings/settings.ts` — 设置读写核心（大型）
- `utils/settings/settingsCache.ts` — 设置缓存机制
- `utils/settings/toolValidationConfig.ts` — 工具权限验证配置
- `utils/settings/types.ts` — 设置类型定义（大型）
- `utils/settings/validateEditTool.ts` — 编辑工具验证
- `utils/settings/validation.ts` — 设置内容校验
- `utils/settings/validationTips.ts` — 验证错误提示

### utils/shell/
- `utils/shell/outputLimits.ts` — 输出大小限制
- `utils/shell/powershellDetection.ts` — PowerShell检测
- `utils/shell/powershellProvider.ts` — PowerShell执行提供者
- `utils/shell/readOnlyCommandValidation.ts` — 只读命令验证
- `utils/shell/resolveDefaultShell.ts` — 默认Shell解析
- `utils/shell/shellProvider.ts` — Shell提供者接口
- `utils/shell/shellToolUtils.ts` — Shell工具工具函数
- `utils/shell/specPrefix.ts` — 规格前缀工具

### utils/skills/
- `utils/skills/` — 技能工具

### utils/suggestions/
- `utils/suggestions/commandSuggestions.ts` — 命令建议（Fuse.js）
- `utils/suggestions/directoryCompletion.ts` — 目录路径补全
- `utils/suggestions/shellHistoryCompletion.ts` — Shell历史补全
- `utils/suggestions/skillUsageTracking.ts` — 技能使用追踪
- `utils/suggestions/slackChannelSuggestions.ts` — Slack频道建议

### utils/swarm/
- `utils/swarm/` — Swarm多Agent工具

### utils/task/
- `utils/task/diskOutput.ts` — 任务磁盘输出
- `utils/task/sdkProgress.ts` — SDK进度事件发送
- `utils/task/TaskOutput.ts` — 任务输出缓冲

### utils/telemetry/
- `utils/telemetry/logger.ts` — OTEL诊断日志器

### utils/teleport/
- `utils/teleport/` — Teleport远程工具

### utils/todo/
- `utils/todo/` — Todo列表工具

### utils/ultraplan/
- `utils/ultraplan/keyword.ts` — ultraplan关键词检测

### utils/ (根目录)
- `utils/Shell.ts` — Shell接口封装
- `utils/ShellCommand.ts` — Shell命令执行器
- `utils/abortController.ts` — AbortController工厂
- `utils/advisor.ts` — Advisor功能工具
- `utils/agenticSessionSearch.ts` — Agentic会话搜索
- `utils/ansiToPng.ts` — ANSI转PNG工具
- `utils/ansiToSvg.ts` — ANSI转SVG工具
- `utils/api.ts` — 顶层API工具
- `utils/appleTerminalBackup.ts` — Apple Terminal备份
- `utils/array.ts` — 数组工具函数
- `utils/asciicast.ts` — Asciicast录制
- `utils/attachments.ts` — 附件类型定义
- `utils/attribution.ts` — 归因标注工具
- `utils/authFileDescriptor.ts` — 认证文件描述符
- `utils/authPortable.ts` — 可移植认证工具
- `utils/autoRunIssue.tsx` — 自动运行issue工具
- `utils/awsAuthStatusManager.ts` — AWS认证状态管理
- `utils/bash/` → 上方已列出
- `utils/billing.ts` — 计费工具函数
- `utils/browser.ts` — 浏览器打开工具
- `utils/bundledMode.ts` — 打包模式检测
- `utils/cleanupRegistry.ts` — 清理回调注册表
- `utils/claudeDesktop.ts` — Claude Desktop MCP集成
- `utils/claudeInChrome/` — Chrome集成工具
- `utils/cliHighlight.ts` — CLI语法高亮加载
- `utils/collapseBackgroundBashNotifications.ts` — 后台Bash通知折叠
- `utils/collapseHookSummaries.ts` — Hook摘要折叠
- `utils/collapseTeammateShutdowns.ts` — Teammate关闭折叠
- `utils/concurrentSessions.ts` — 并发会话管理
- `utils/config.ts` — 全局配置读写
- `utils/cwd.ts` — 工作目录管理
- `utils/debug.ts` — 调试日志输出
- `utils/defaultsDeep.ts` — 深度合并默认值
- `utils/diagLogs.ts` — 诊断日志（无PII）
- `utils/diskUsage.ts` — 磁盘用量工具
- `utils/doctorContextWarnings.ts` — 诊断上下文警告
- `utils/doctorDiagnostic.ts` — 诊断运行工具
- `utils/earlyInput.ts` — 启动期输入捕获
- `utils/editor.ts` — 外部编辑器调用
- `utils/effort.ts` — 思考强度控制
- `utils/envUtils.ts` — 环境变量工具
- `utils/errors.ts` — 错误类型/工具
- `utils/execFileNoThrow.ts` — 不抛出exec封装
- `utils/execFileNoThrowPortable.ts` — 可移植同步exec
- `utils/fastMode.ts` — 快速模式逻辑
- `utils/file.ts` — 文件路径工具
- `utils/fileHistory.ts` — 文件历史备份
- `utils/fileRead.ts` — 文件读取工具
- `utils/format.ts` — 格式化工具函数
- `utils/fpsFocus.ts` — FPS焦点监控
- `utils/fpsTracker.ts` — FPS性能追踪
- `utils/frontmatterParser.ts` — 前置元数据解析
- `utils/fsOperations.ts` — 文件系统操作
- `utils/fullscreen.ts` — 全屏模式检测
- `utils/getWorktreePathsPortable.ts` — Worktree路径
- `utils/git.ts` — Git操作封装
- `utils/gitDiff.ts` — Git差异获取
- `utils/gracefulShutdown.ts` — 优雅关闭
- `utils/handlePromptSubmit.ts` — 提示词提交处理
- `utils/horizontalScroll.ts` — 水平滚动窗口计算
- `utils/hooks.ts` — Hook执行引擎
- `utils/hyperlink.ts` — 超链接构建
- `utils/ide.ts` — IDE类型/工具
- `utils/idePathConversion.ts` — IDE路径转换
- `utils/imageResizer.ts` — 图片尺寸调整
- `utils/imageStore.ts` — 图片存储管理
- `utils/imagePaste.ts` — 图片粘贴检测
- `utils/intl.ts` — 国际化分词工具
- `utils/iTermBackup.ts` — iTerm2设置备份
- `utils/jetbrains.ts` — JetBrains IDE工具
- `utils/json.ts` — JSON工具函数
- `utils/jsonRead.ts` — JSON文件读取
- `utils/lazySchema.ts` — 懒加载Zod Schema
- `utils/localInstaller.ts` — 本地安装器
- `utils/log.ts` — 日志记录工具
- `utils/managedEnvConstants.ts` — 托管环境变量常量
- `utils/markdownConfigLoader.ts` — Markdown配置加载
- `utils/mcp/` → 上方已列出
- `utils/memoize.ts` — LRU记忆化函数
- `utils/messages.ts` — 消息工具函数
- `utils/messageQueueManager.ts` — 统一消息队列
- `utils/model/` → 上方已列出
- `utils/path.ts` — 路径工具函数
- `utils/permissions/` → 上方已列出
- `utils/plugins/` → 上方已列出
- `utils/privacyLevel.ts` — 隐私级别检测
- `utils/profilerBase.ts` — 性能分析基础
- `utils/promptCategory.ts` — 提示词来源分类
- `utils/promptEditor.ts` — 提示词外部编辑
- `utils/queryHelpers.ts` — 查询辅助函数
- `utils/queryProfiler.ts` — 查询性能分析
- `utils/readFileInRange.ts` — 范围文件读取
- `utils/ripgrep.ts` — Ripgrep封装
- `utils/sdkEventQueue.ts` — SDK事件队列
- `utils/semver.ts` — 语义版本比较
- `utils/sessionActivity.ts` — 会话活动追踪
- `utils/sessionEnvironment.ts` — 会话环境变量
- `utils/sessionEnvVars.ts` — 会话环境变量管理
- `utils/sessionState.ts` — 会话状态通知
- `utils/sessionStoragePortable.ts` — 可移植会话存储
- `utils/shellConfig.ts` — Shell配置文件管理
- `utils/sideQuery.ts` — 侧边查询（Haiku）
- `utils/sideQuestion.ts` — 侧边问题辅助
- `utils/sinks.ts` — 分析/错误sink初始化
- `utils/sliceAnsi.ts` — ANSI感知字符串切片
- `utils/slowOperations.ts` — 慢操作（JSON/sync）
- `utils/staticRender.tsx` — React静态渲染为字符串
- `utils/stringUtils.ts` — 字符串工具函数
- `utils/systemPromptType.ts` — 系统提示类型包装
- `utils/systemTheme.ts` — 系统主题检测
- `utils/systemThemeWatcher.ts` — 主题变化监听
- `utils/tasks.ts` — 后台任务工具
- `utils/teammateContext.ts` — Teammate上下文
- `utils/teammateMailbox.ts` — Teammate邮箱协议
- `utils/teamDiscovery.ts` — 团队成员发现
- `utils/teamMemoryOps.ts` — 团队记忆操作
- `utils/telemetry/` → 上方已列出
- `utils/terminal.ts` — 终端截断渲染
- `utils/textHighlighting.ts` — ANSI文本高亮分段
- `utils/theme.ts` — 主题颜色定义
- `utils/themeContext.tsx` — 主题React Context
- `utils/tmuxSocket.ts` — tmux Socket工具
- `utils/tokenBudget.ts` — Token预算消息
- `utils/truncate.ts` — 宽度感知截断
- `utils/ultraplan/` → 上方已列出
- `utils/unaryLogging.ts` — 单次事件日志
- `utils/which.ts` — 命令路径查找
- `utils/wordCount.ts` — 词数统计工具

## vim/

- `vim/` — Vim模式状态机

## voice/

- `voice/` — 语音输入功能

---

*文件总计：1884*
