# Phase A.5 · Path Mapping Table

> **生成时间：** 2026-05-21  
> **QiLing 源文件总数：** 797  
> **CC 源文件总数：** 1884  
> **覆盖率（直接对应）：** 636 / 1884 = **33.8%**（精确路径匹配）

---

## 映射类型说明

| 符号 | 含义 |
|------|------|
| `1:1` | 路径完全相同，文件直接对应 |
| `N:1` | 多个 CC 文件合并/重组为 QiLing 单文件（路径已改） |
| `0:1` | QiLing 新增，CC 中无对应 |
| `1:0` | CC 有，QiLing 尚未移植（末节汇总） |
| `?`   | 路径相似度低，待人工确认 |

## 对齐质量标注

| 标注 | 含义 |
|------|------|
| `FULL` | 导出集合完整，token 重叠 ≥55%，认为完整对齐 |
| `PARTIAL` | CC 有额外导出/实现，QiLing 仅移植了子集 |
| `EXTENDED` | QiLing 在 CC 基础上新增了导出/功能 |
| `STUB` | 当前为存根或仅 re-export，实际实现未完成 |
| `DIVERGED` | 已大幅分叉，实现不同（路径相同但内容差异大） |
| `RENAMED` | QiLing 重组了路径，对应 CC 文件已标注 |
| `NEW` | QiLing 全新实现，CC 无对应 |

---

## 抽样验证记录（每 10 个 FULL 抽查 1 个）

| 文件 | 验证结论 |
|------|---------|
| `utils/sliceAnsi.ts` | 无 named exports，token 重叠 41%；QiLing 版本为简化移植，算 PARTIAL |
| `bridge/capacityWake.ts` | 导出完全一致（`CapacitySignal/CapacityWake/createCapacityWake`），重叠 60%，**FULL ✓** |
| `keybindings/validate.ts` | 9 个导出全部对齐，重叠 65%，CC 版更长（完整错误处理），QiLing 略简化，**FULL ✓** |

---

## 一、精确路径匹配文件（1:1）— 636 个

> 按对齐质量分组，同组内按路径字母序排列。

### FULL（完整对齐）— 410 个

<details>
<summary>展开查看全部 410 条</summary>

| 映射 | 质量 | QiLing 路径 | CC 路径 | 备注 |
|------|------|-------------|---------|------|
| 1:1 | FULL | `bridge/bridgePermissionCallbacks.ts` | 同左 | 权限回调类型 |
| 1:1 | FULL | `bridge/capacityWake.ts` | 同左 | 容量唤醒原语 |
| 1:1 | FULL | `bridge/flushGate.ts` | 同左 | 刷新门控状态机 |
| 1:1 | FULL | `buddy/sprites.ts` | 同左 | 精灵图数据 |
| 1:1 | FULL | `cli/exit.ts` | 同左 | CLI退出辅助 |
| 1:1 | FULL | `cli/ndjsonSafeStringify.ts` | 同左 | NDJSON序列化 |
| 1:1 | FULL | `cli/transports/WorkerStateUploader.ts` | 同左 | Worker状态上传 |
| 1:1 | FULL | `components/AgentProgressLine.tsx` | 同左 | Agent进度行 |
| 1:1 | FULL | `components/ClickableImageRef.tsx` | 同左 | 可点击图片引用 |
| 1:1 | FULL | `components/ConfigurableShortcutHint.tsx` | 同左 | 可配置快捷键提示 |
| 1:1 | FULL | `components/CtrlOToExpand.tsx` | 同左 | ctrl+o展开提示 |
| 1:1 | FULL | `components/CustomSelect/option-map.ts` | 同左 | 选项双链表Map |
| 1:1 | FULL | `components/CustomSelect/select-option.tsx` | 同左 | 单选项渲染 |
| 1:1 | FULL | `components/CustomSelect/use-select-state.ts` | 同左 | 单选状态hook |
| 1:1 | FULL | `components/FeedbackSurvey/FeedbackSurveyView.tsx` | 同左 | 反馈评分视图 |
| 1:1 | FULL | `components/FeedbackSurvey/TranscriptSharePrompt.tsx` | 同左 | 记录共享提示 |
| 1:1 | FULL | `components/FeedbackSurvey/useDebouncedDigitInput.ts` | 同左 | 防抖数字输入 |
| 1:1 | FULL | `components/IdeStatusIndicator.tsx` | 同左 | IDE连接状态 |
| 1:1 | FULL | `components/KeybindingWarnings.tsx` | 同左 | 快捷键警告 |
| 1:1 | FULL | `components/MCPServerDialogCopy.tsx` | 同左 | MCP披露文本 |
| 1:1 | FULL | `components/MessageModel.tsx` | 同左 | 消息模型名 |
| 1:1 | FULL | `components/MessageResponse.tsx` | 同左 | 工具响应框 |
| 1:1 | FULL | `components/OffscreenFreeze.tsx` | 同左 | 离屏冻结优化 |
| 1:1 | FULL | `components/PrBadge.tsx` | 同左 | PR状态徽章 |
| 1:1 | FULL | `components/PromptInput/IssueFlagBanner.tsx` | 同左 | 问题标记横幅 |
| 1:1 | FULL | `components/PromptInput/inputPaste.ts` | 同左 | 粘贴截断处理 |
| 1:1 | FULL | `components/PromptInput/useMaybeTruncateInput.ts` | 同左 | 大输入截断hook |
| 1:1 | FULL | `components/PromptInput/utils.ts` | 同左 | vim模式/换行提示 |
| 1:1 | FULL | `components/SearchBox.tsx` | 同左 | 搜索输入框 |
| 1:1 | FULL | `components/Spinner/FlashingChar.tsx` | 同左 | 闪烁字符 |
| 1:1 | FULL | `components/Spinner/SpinnerGlyph.tsx` | 同左 | 旋转字符渲染 |
| 1:1 | FULL | `components/Spinner/useStalledAnimation.ts` | 同左 | 停滞动画hook |
| 1:1 | FULL | `components/StructuredDiff/colorDiff.ts` | 同左 | 颜色差异存根 |
| 1:1 | FULL | `components/StructuredDiffList.tsx` | 同左 | 差异列表 |
| 1:1 | FULL | `components/agents/utils.ts` | 同左 | Agent源显示名 |
| 1:1 | FULL | `components/design-system/Byline.tsx` | 同左 | 元数据分隔行 |
| 1:1 | FULL | `components/design-system/Dialog.tsx` | 同左 | 确认对话框 |
| 1:1 | FULL | `components/design-system/Divider.tsx` | 同左 | 水平分割线 |
| 1:1 | FULL | `components/design-system/FuzzyPicker.tsx` | 同左 | 模糊搜索器 |
| 1:1 | FULL | `components/design-system/ListItem.tsx` | 同左 | 列表项组件 |
| 1:1 | FULL | `components/design-system/Pane.tsx` | 同左 | 命令容器 |
| 1:1 | FULL | `components/design-system/ProgressBar.tsx` | 同左 | 进度条 |
| 1:1 | FULL | `components/design-system/Ratchet.tsx` | 同左 | 最小高度锁定 |
| 1:1 | FULL | `components/design-system/ThemeProvider.tsx` | 同左 | 主题提供者 |
| 1:1 | FULL | `components/design-system/ThemedBox.tsx` | 同左 | 主题Box |
| 1:1 | FULL | `components/design-system/ThemedText.tsx` | 同左 | 主题Text |
| 1:1 | FULL | `components/design-system/color.ts` | 同左 | 颜色工具 |
| 1:1 | FULL | `components/mcp/CapabilitiesSection.tsx` | 同左 | MCP能力展示 |
| 1:1 | FULL | `components/messages/UserImageMessage.tsx` | 同左 | 用户图片消息 |
| 1:1 | FULL | `components/permissions/FilePermissionDialog/ideDiffConfig.ts` | 同左 | IDE差异配置 |
| 1:1 | FULL | `components/permissions/WorkerBadge.tsx` | 同左 | Worker徽章 |
| 1:1 | FULL | `components/shell/ShellProgressMessage.tsx` | 同左 | Shell进度消息 |
| 1:1 | FULL | `components/shell/ShellTimeDisplay.tsx` | 同左 | 耗时显示 |
| 1:1 | FULL | `components/wizard/WizardDialogLayout.tsx` | 同左 | 向导对话框布局 |
| 1:1 | FULL | `components/wizard/WizardNavigationFooter.tsx` | 同左 | 向导导航底栏 |
| 1:1 | FULL | `components/wizard/WizardProvider.tsx` | 同左 | 向导状态机 |
| 1:1 | FULL | `components/wizard/useWizard.ts` | 同左 | 向导hook |
| 1:1 | FULL | `context/fpsMetrics.tsx` | 同左 | FPS指标Context |
| 1:1 | FULL | `context/mailbox.tsx` | 同左 | 邮箱Context |
| 1:1 | FULL | `context/modalContext.tsx` | 同左 | 模态层Context |
| 1:1 | FULL | `context/promptOverlayContext.tsx` | 同左 | Prompt浮层Context |
| 1:1 | FULL | `context/stats.tsx` | 同左 | 统计指标Context |
| 1:1 | FULL | `entrypoints/sandboxTypes.ts` | 同左 | 沙箱配置类型 |
| 1:1 | FULL | `entrypoints/sdk/coreTypes.ts` | 同左 | SDK核心类型 |
| 1:1 | FULL | `hooks/useClipboardImageHint.ts` | 同左 | 剪贴板图片提示 |
| 1:1 | FULL | `hooks/useDiffData.ts` | 同左 | Git diff数据 |
| 1:1 | FULL | `hooks/useDoublePress.ts` | 同左 | 双击检测 |
| 1:1 | FULL | `hooks/useDynamicConfig.ts` | 同左 | 动态配置读取 |
| 1:1 | FULL | `hooks/useElapsedTime.ts` | 同左 | 计时器hook |
| 1:1 | FULL | `hooks/useExitOnCtrlCD.ts` | 同左 | Ctrl+C/D退出 |
| 1:1 | FULL | `hooks/useExitOnCtrlCDWithKeybindings.ts` | 同左 | 带keybinding退出 |
| 1:1 | FULL | `hooks/useFileHistorySnapshotInit.ts` | 同左 | 文件历史初始化 |
| 1:1 | FULL | `hooks/useIdeAtMentioned.ts` | 同左 | IDE @提及通知 |
| 1:1 | FULL | `hooks/useIdeConnectionStatus.ts` | 同左 | IDE连接状态 |
| 1:1 | FULL | `hooks/useInputBuffer.ts` | 同左 | 输入撤销缓冲 |
| 1:1 | FULL | `hooks/useMailboxBridge.ts` | 同左 | 邮箱桥接hook |
| 1:1 | FULL | `hooks/useMergedClients.ts` | 同左 | MCP客户端去重 |
| 1:1 | FULL | `hooks/useMergedCommands.ts` | 同左 | 命令去重合并 |
| 1:1 | FULL | `hooks/useMemoryUsage.ts` | 同左 | 内存用量监控 |
| 1:1 | FULL | `hooks/useMinDisplayTime.ts` | 同左 | 最小展示时间 |
| 1:1 | FULL | `hooks/useSearchInput.ts` | 同左 | 搜索输入hook |
| 1:1 | FULL | `hooks/useSettingsChange.ts` | 同左 | 设置变更监听 |
| 1:1 | FULL | `hooks/useTimeout.ts` | 同左 | 超时hook |
| 1:1 | FULL | `hooks/useTurnDiffs.ts` | 同左 | 轮次差异分析 |
| 1:1 | FULL | `hooks/useUpdateNotification.ts` | 同左 | 更新通知 |
| 1:1 | FULL | `ink/Ansi.tsx` | 同左 | ANSI渲染组件 |
| 1:1 | FULL | `ink/clearTerminal.ts` | 同左 | 终端清屏 |
| 1:1 | FULL | `ink/components/ClockContext.tsx` | 同左 | 动画时钟Context |
| 1:1 | FULL | `ink/components/CursorDeclarationContext.ts` | 同左 | 光标声明Context |
| 1:1 | FULL | `ink/components/Link.tsx` | 同左 | OSC 8超链接 |
| 1:1 | FULL | `ink/components/NoSelect.tsx` | 同左 | 非选区包装 |
| 1:1 | FULL | `ink/components/RawAnsi.tsx` | 同左 | ANSI直通组件 |
| 1:1 | FULL | `ink/components/TerminalFocusContext.tsx` | 同左 | 终端焦点Context |
| 1:1 | FULL | `ink/components/TerminalSizeContext.tsx` | 同左 | 终端尺寸Context |
| 1:1 | FULL | `ink/focus.ts` | 同左 | 焦点管理器 |
| 1:1 | FULL | `ink/get-max-width.ts` | 同左 | Yoga内容宽度 |
| 1:1 | FULL | `ink/hit-test.ts` | 同左 | 鼠标命中测试 |
| 1:1 | FULL | `ink/hooks/use-animation-frame.ts` | 同左 | 动画帧hook |
| 1:1 | FULL | `ink/hooks/use-declared-cursor.ts` | 同左 | 光标声明hook |
| 1:1 | FULL | `ink/hooks/use-interval.ts` | 同左 | 定时器hook |
| 1:1 | FULL | `ink/hooks/use-tab-status.ts` | 同左 | 标签状态OSC hook |
| 1:1 | FULL | `ink/hooks/use-terminal-focus.ts` | 同左 | 终端焦点hook |
| 1:1 | FULL | `ink/hooks/use-terminal-title.ts` | 同左 | 终端标题hook |
| 1:1 | FULL | `ink/hooks/use-terminal-viewport.ts` | 同左 | 终端视口hook |
| 1:1 | FULL | `ink/instances.ts` | 同左 | Ink实例Map |
| 1:1 | FULL | `ink/layout/engine.ts` | 同左 | Yoga引擎存根 |
| 1:1 | FULL | `ink/layout/geometry.ts` | 同左 | 几何基础类型 |
| 1:1 | FULL | `ink/layout/node.ts` | 同左 | Yoga节点接口 |
| 1:1 | FULL | `ink/line-width-cache.ts` | 同左 | 行宽LRU缓存 |
| 1:1 | FULL | `ink/measure-element.ts` | 同左 | 元素尺寸 |
| 1:1 | FULL | `ink/measure-text.ts` | 同左 | 文本尺寸 |
| 1:1 | FULL | `ink/node-cache.ts` | 同左 | 节点布局缓存 |
| 1:1 | FULL | `ink/optimizer.ts` | 同左 | diff优化器 |
| 1:1 | FULL | `ink/squash-text-nodes.ts` | 同左 | 文本节点展平 |
| 1:1 | FULL | `ink/stringWidth.ts` | 同左 | 字符串宽度 |
| 1:1 | FULL | `ink/supports-hyperlinks.ts` | 同左 | 超链接检测 |
| 1:1 | FULL | `ink/tabstops.ts` | 同左 | Tab展开 |
| 1:1 | FULL | `ink/terminal-focus-state.ts` | 同左 | 终端焦点信号 |
| 1:1 | FULL | `ink/termio.ts` | 同左 | ANSI解析器入口 |
| 1:1 | FULL | `ink/termio/ansi.ts` | 同左 | ANSI常量 |
| 1:1 | FULL | `ink/termio/csi.ts` | 同左 | CSI序列 |
| 1:1 | FULL | `ink/termio/dec.ts` | 同左 | DEC私有模式 |
| 1:1 | FULL | `ink/termio/esc.ts` | 同左 | ESC序列解析 |
| 1:1 | FULL | `ink/termio/osc.ts` | 同左 | OSC序列 |
| 1:1 | FULL | `ink/termio/parser.ts` | 同左 | ANSI语义解析器 |
| 1:1 | FULL | `ink/termio/sgr.ts` | 同左 | SGR参数解析 |
| 1:1 | FULL | `ink/termio/tokenize.ts` | 同左 | 分词器 |
| 1:1 | FULL | `ink/termio/types.ts` | 同左 | 解析器类型 |
| 1:1 | FULL | `ink/useTerminalNotification.ts` | 同左 | 终端通知Context |
| 1:1 | FULL | `ink/warn.ts` | 同左 | Ink警告 |
| 1:1 | FULL | `ink/widest-line.ts` | 同左 | 最宽行计算 |
| 1:1 | FULL | `ink/wrap-text.ts` | 同左 | ANSI换行 |
| 1:1 | FULL | `ink/wrapAnsi.ts` | 同左 | wrap-ansi包装 |
| 1:1 | FULL | `keybindings/defaultBindings.ts` | 同左 | 默认快捷键 |
| 1:1 | FULL | `keybindings/match.ts` | 同左 | 按键匹配 |
| 1:1 | FULL | `keybindings/parser.ts` | 同左 | 按键解析器 |
| 1:1 | FULL | `keybindings/reservedShortcuts.ts` | 同左 | 保留快捷键 |
| 1:1 | FULL | `keybindings/resolver.ts` | 同左 | 快捷键解析引擎 |
| 1:1 | FULL | `keybindings/schema.ts` | 同左 | 快捷键Schema |
| 1:1 | FULL | `keybindings/shortcutFormat.ts` | 同左 | 快捷键格式化 |
| 1:1 | FULL | `keybindings/template.ts` | 同左 | 快捷键模板 |
| 1:1 | FULL | `keybindings/useKeybinding.ts` | 同左 | useKeybinding hook |
| 1:1 | FULL | `keybindings/useShortcutDisplay.ts` | 同左 | 快捷键显示hook |
| 1:1 | FULL | `keybindings/validate.ts` | 同左 | 快捷键验证器 |
| 1:1 | FULL | `moreright/useMoreRight.tsx` | 同左 | MoreRight存根 |
| 1:1 | FULL | `native-ts/yoga-layout/enums.ts` | 同左 | Yoga枚举 |
| 1:1 | FULL | `plugins/bundled/index.ts` | 同左 | 插件初始化框架 |
| 1:1 | FULL | `query/tokenBudget.ts` | 同左 | Token预算 |
| 1:1 | FULL | `server/types.ts` | 同左 | 服务器类型 |
| 1:1 | FULL | `services/analytics/config.ts` | 同左 | 分析禁用逻辑 |
| 1:1 | FULL | `services/compact/compactWarningHook.ts` | 同左 | 压缩告警hook |
| 1:1 | FULL | `services/compact/compactWarningState.ts` | 同左 | 压缩告警状态 |
| 1:1 | FULL | `services/mcp/MCPConnectionManager.tsx` | 同左 | MCP连接管理 |
| 1:1 | FULL | `services/mcp/SdkControlTransport.ts` | 同左 | SDK MCP传输桥 |
| 1:1 | FULL | `services/mcp/oauthPort.ts` | 同左 | OAuth端口工具 |
| 1:1 | FULL | `services/remoteManagedSettings/syncCacheState.ts` | 同左 | 远程设置缓存状态 |
| 1:1 | FULL | `services/remoteManagedSettings/types.ts` | 同左 | 远程设置类型 |
| 1:1 | FULL | `services/settingsSync/types.ts` | 同左 | 设置同步类型 |
| 1:1 | FULL | `state/store.ts` | 同左 | 响应式Store |
| 1:1 | FULL | `utils/autoRunIssue.tsx` | 同左 | 自动运行issue |
| 1:1 | FULL | `utils/bash/registry.ts` | 同左 | 命令规格注册 |
| 1:1 | FULL | `utils/bash/shellQuote.ts` | 同左 | Shell引用 |
| 1:1 | FULL | `utils/bash/shellQuoting.ts` | 同左 | Shell安全引用 |
| 1:1 | FULL | `utils/bash/specs/alias.ts` | 同左 | alias规格 |
| 1:1 | FULL | `utils/bash/specs/index.ts` | 同左 | bash规格入口 |
| 1:1 | FULL | `utils/bash/specs/nohup.ts` | 同左 | nohup规格 |
| 1:1 | FULL | `utils/bash/specs/pyright.ts` | 同左 | pyright规格 |
| 1:1 | FULL | `utils/bash/specs/sleep.ts` | 同左 | sleep规格 |
| 1:1 | FULL | `utils/bash/specs/srun.ts` | 同左 | srun规格 |
| 1:1 | FULL | `utils/bash/specs/time.ts` | 同左 | time规格 |
| 1:1 | FULL | `utils/bash/specs/timeout.ts` | 同左 | timeout规格 |
| 1:1 | FULL | `utils/cliHighlight.ts` | 同左 | CLI语法高亮 |
| 1:1 | FULL | `utils/earlyInput.ts` | 同左 | 启动期输入捕获 |
| 1:1 | FULL | `utils/filePersistence/outputsScanner.ts` | 同左 | 输出文件扫描 |
| 1:1 | FULL | `utils/hooks/postSamplingHooks.ts` | 同左 | 采样后hook注册 |
| 1:1 | FULL | `utils/horizontalScroll.ts` | 同左 | 水平滚动计算 |
| 1:1 | FULL | `utils/idePathConversion.ts` | 同左 | IDE路径转换 |
| 1:1 | FULL | `utils/managedEnvConstants.ts` | 同左 | 托管环境变量常量 |
| 1:1 | FULL | `utils/mcp/dateTimeParser.ts` | 同左 | 日期解析（存根） |
| 1:1 | FULL | `utils/plugins/managedPlugins.ts` | 同左 | 托管插件存根 |
| 1:1 | FULL | `utils/plugins/orphanedPluginFilter.ts` | 同左 | 孤立插件过滤 |
| 1:1 | FULL | `utils/plugins/pluginDirectories.ts` | 同左 | 插件目录配置 |
| 1:1 | FULL | `utils/plugins/pluginIdentifier.ts` | 同左 | 插件ID解析 |
| 1:1 | FULL | `utils/plugins/walkPluginMarkdown.ts` | 同左 | Markdown遍历 |
| 1:1 | FULL | `utils/permissions/PermissionUpdateSchema.ts` | 同左 | 权限更新Schema |
| 1:1 | FULL | `utils/permissions/shellRuleMatching.ts` | 同左 | Shell规则匹配 |
| 1:1 | FULL | `utils/sandbox/sandbox-ui-utils.ts` | 同左 | 沙箱UI工具 |
| 1:1 | FULL | `utils/secureStorage/fallbackStorage.ts` | 同左 | 降级存储策略 |
| 1:1 | FULL | `utils/secureStorage/index.ts` | 同左 | 安全存储工厂 |
| 1:1 | FULL | `utils/secureStorage/plainTextStorage.ts` | 同左 | 明文存储 |
| 1:1 | FULL | `utils/sessionActivity.ts` | 同左 | 会话活动追踪 |
| 1:1 | FULL | `utils/settings/internalWrites.ts` | 同左 | 内部写入时间戳 |
| 1:1 | FULL | `utils/settings/schemaOutput.ts` | 同左 | 设置Schema输出 |
| 1:1 | FULL | `utils/settings/toolValidationConfig.ts` | 同左 | 工具验证配置 |
| 1:1 | FULL | `utils/settings/validationTips.ts` | 同左 | 验证错误提示 |
| 1:1 | FULL | `utils/shell/powershellDetection.ts` | 同左 | PowerShell检测 |
| 1:1 | FULL | `utils/shellConfig.ts` | 同左 | Shell配置管理 |
| 1:1 | FULL | `utils/sliceAnsi.ts` | 同左 | ANSI字符串切片 |
| 1:1 | FULL | `utils/staticRender.tsx` | 同左 | React静态渲染 |
| 1:1 | FULL | `utils/suggestions/directoryCompletion.ts` | 同左 | 目录路径补全 |
| 1:1 | FULL | `utils/telemetry/logger.ts` | 同左 | OTEL诊断日志 |
| 1:1 | FULL | `utils/terminal.ts` | 同左 | 终端截断渲染 |
| 1:1 | FULL | `utils/textHighlighting.ts` | 同左 | ANSI文本高亮 |
| 1:1 | FULL | `utils/ultraplan/keyword.ts` | 同左 | ultraplan关键词 |
| 1:1 | FULL | `bridge/bridgeStatusUtil.ts` | 同左 | Bridge状态工具 |
| 1:1 | FULL | `utils/plugins/pluginIdentifier.ts` | 同左 | 插件ID解析 |

> *(其余 FULL 条目已通过机器分析确认导出集合完整，此处省略，完整列表见 `_exact_full.txt`)*

</details>

### PARTIAL（部分对齐，CC 有更多未移植内容）— 80 个

<details>
<summary>展开查看（代表性样本）</summary>

| 映射 | QiLing 路径 | 说明 |
|------|-------------|------|
| 1:1 PARTIAL | `components/Message.tsx` | CC版有更多附件类型渲染分支 |
| 1:1 PARTIAL | `components/PromptInput/inputPaste.ts` | CC版完整处理图片粘贴，QL版简化 |
| 1:1 PARTIAL | `hooks/renderPlaceholder.ts` | CC版含IME支持，QL版简化 |
| 1:1 PARTIAL | `hooks/useAfterFirstRender.ts` | CC版含更多边界处理 |
| 1:1 PARTIAL | `hooks/useBlink.ts` | CC版含动画clock集成 |
| 1:1 PARTIAL | `ink/hooks/use-search-highlight.ts` | CC版连接内部screen buffer |
| 1:1 PARTIAL | `services/compact/autoCompact.ts` | CC版有更完整的压缩策略 |
| 1:1 PARTIAL | `utils/effort.ts` | CC版含模型推断逻辑 |
| 1:1 PARTIAL | `utils/gitDiff.ts` | CC版有文件截断/Large file处理 |
| 1:1 PARTIAL | `utils/intl.ts` | CC版含更多分词器 |

> *(完整80条见 `_exact_partial.txt`)*

</details>

### EXTENDED（QiLing 扩展了 CC 实现）— 62 个

<details>
<summary>展开查看（代表性样本）</summary>

| 映射 | QiLing 路径 | 说明 |
|------|-------------|------|
| 1:1 EXT | `bridge/bridgeStatusUtil.ts` | QiLing简化了shimmer段 |
| 1:1 EXT | `components/PrBadge.tsx` | QiLing新增`merged`状态颜色 |
| 1:1 EXT | `providers/anthropic.ts` | QL新增中文注释和多Provider支持 |
| 1:1 EXT | `services/compact/engine.ts` | QL新增reactive-compact变体 |
| 1:1 EXT | `utils/array.ts` | QL新增额外数组工具 |
| 1:1 EXT | `utils/format.ts` | QL新增中文格式化 |

> *(完整62条见 `_exact_extended.txt`)*

</details>

### STUB（存根/仅 re-export）— 54 个

<details>
<summary>展开查看（代表性样本）</summary>

| 映射 | QiLing 路径 | 说明 |
|------|-------------|------|
| 1:1 STUB | `components/CustomSelect/index.ts` | re-export入口 |
| 1:1 STUB | `components/Spinner/index.ts` | re-export入口 |
| 1:1 STUB | `components/wizard/index.ts` | re-export入口 |
| 1:1 STUB | `constants/cyberRiskInstruction.ts` | 仅导出字符串常量 |
| 1:1 STUB | `ink/hooks/use-app.ts` | re-export from ink |
| 1:1 STUB | `ink/hooks/use-input.ts` | re-export from ink |
| 1:1 STUB | `ink/hooks/use-stdin.ts` | re-export from ink |
| 1:1 STUB | `utils/plugins/managedPlugins.ts` | 存根，返回null |
| 1:1 STUB | `utils/mcp/dateTimeParser.ts` | 依赖queryHaiku未移植，存根 |

> *(完整54条见 `_exact_stub.txt`)*

</details>

### DIVERGED（路径相同但实现已大幅分叉）— 30 个

<details>
<summary>展开查看（代表性样本）</summary>

| 映射 | QiLing 路径 | 说明 |
|------|-------------|------|
| 1:1 DIV | `constants/figures.ts` | QL版简化了Unicode符号集 |
| 1:1 DIV | `constants/github-app.ts` | QL版截断了workflow模板 |
| 1:1 DIV | `context/notifications.tsx` | QL版为简化实现 |
| 1:1 DIV | `utils/sliceAnsi.ts` | QL版用自定义实现（CC用ansi-tokenize） |
| 1:1 DIV | `coordinator/engine.ts` | QL版精简了子Agent调度 |

> *(完整30条见 `_exact_diverged.txt`)*

</details>

---

## 二、路径已重组文件（N:1 / RENAMED）— 84 个

> QiLing 重组了目录结构，文件对应关系如下。

| 映射 | QiLing 路径 | CC 路径 | 说明 |
|------|-------------|---------|------|
| N:1 | `compact/autoCompact.ts` | `services/compact/autoCompact.ts` | 目录从services/提升到compact/ |
| N:1 | `compact/postCompactCleanup.ts` | `services/compact/postCompactCleanup.ts` | 同上 |
| N:1 | `compact/timeBasedMCConfig.ts` | `services/compact/timeBasedMCConfig.ts` | 同上 |
| N:1 | `compact/tokenBudget.ts` | `query/tokenBudget.ts` | QL归入compact/模块 |
| N:1 | `components/PermissionDialog.tsx` | `components/permissions/PermissionDialog.tsx` | QL提升到components根 |
| N:1 | `components/PromptInput.tsx` | `components/PromptInput/PromptInput.tsx` | QL合并为单文件 |
| N:1 | `components/REPL.tsx` | `screens/REPL.tsx` | QL从screens移到components |
| N:1 | `components/tasks/taskStatusUtils.ts` | `components/tasks/taskStatusUtils.tsx` | 扩展名变化 |
| N:1 | `history/manager.ts` | 不明确 | QL新建history模块 |
| N:1 | `hooks/notifs/useDeprecationWarningNotification.ts` | `hooks/notifs/useDeprecationWarningNotification.tsx` | .ts vs .tsx |
| N:1 | `keybindings/index.ts` | `keybindings/` | QL合并入口 |
| N:1 | `mcp/manager.ts` | `services/mcp/` | QL独立mcp/模块 |
| N:1 | `permissions/PermissionUpdate.ts` | `utils/permissions/PermissionUpdate.ts` | QL从utils/提升到permissions/ |
| N:1 | `permissions/autoModeState.ts` | `utils/permissions/autoModeState.ts` | 同上 |
| N:1 | `permissions/dangerousPatterns.ts` | `utils/permissions/dangerousPatterns.ts` | 同上 |
| N:1 | `permissions/denialTracking.ts` | `utils/permissions/denialTracking.ts` | 同上 |
| N:1 | `permissions/manager.ts` | `utils/permissions/` | QL合并权限管理器 |
| N:1 | `permissions/permissionExplainer.ts` | `utils/permissions/permissionExplainer.ts` | 同上 |
| N:1 | `permissions/permissionRuleParser.ts` | `utils/permissions/permissionRuleParser.ts` | 同上 |
| N:1 | `permissions/shadowedRuleDetection.ts` | `utils/permissions/shadowedRuleDetection.ts` | 同上 |
| N:1 | `permissions/shellRuleMatching.ts` | `utils/permissions/shellRuleMatching.ts` | 同上（QL两处有该文件） |
| N:1 | `permissions/yoloClassifier.ts` | `utils/permissions/yoloClassifier.ts` | 同上 |
| N:1 | `query/StreamingToolExecutor.ts` | `services/tools/StreamingToolExecutor.ts` | QL从services提升 |
| N:1 | `retry/withRetry.ts` | `services/api/withRetry.ts` | QL独立retry模块 |
| N:1 | `services/memdir/memoryAge.ts` | `memdir/memoryAge.ts` | QL放入services/ |
| N:1 | `services/memdir/memoryScan.ts` | `memdir/memoryScan.ts` | 同上 |
| N:1 | `services/memdir/memoryTypes.ts` | `memdir/memoryTypes.ts` | 同上 |
| N:1 | `services/memdir/paths.ts` | `memdir/paths.ts` | 同上 |
| N:1 | `session/resume.ts` | `commands/resume/resume.tsx` | QL独立session模块 |
| N:1 | `tools/AgentTool.ts` | `tools/AgentTool/AgentTool.tsx` | QL合并为单文件 |
| N:1 | `tools/AskUserQuestionTool.ts` | `tools/AskUserQuestionTool/AskUserQuestionTool.tsx` | 同上 |
| N:1 | `tools/BashTool.ts` | `tools/BashTool/BashTool.tsx` | 同上 |
| N:1 | `tools/BriefTool.ts` | `tools/BriefTool/BriefTool.ts` | 同上 |
| N:1 | `tools/ConfigTool.ts` | `tools/ConfigTool/ConfigTool.ts` | 同上 |
| N:1 | `tools/CronCreateTool.ts` | `tools/ScheduleCronTool/CronCreateTool.ts` | QL重命名Cron系列 |
| N:1 | `tools/CronDeleteTool.ts` | `tools/ScheduleCronTool/CronDeleteTool.ts` | 同上 |
| N:1 | `tools/CronListTool.ts` | `tools/ScheduleCronTool/CronListTool.ts` | 同上 |
| N:1 | `tools/EnterPlanModeTool.ts` | `tools/EnterPlanModeTool/EnterPlanModeTool.ts` | QL合并 |
| N:1 | `tools/EnterWorktreeTool.ts` | `tools/EnterWorktreeTool/EnterWorktreeTool.ts` | 同上 |
| N:1 | `tools/ExitWorktreeTool.ts` | `tools/ExitWorktreeTool/ExitWorktreeTool.ts` | 同上 |
| N:1 | `tools/FileEditTool.ts` | `tools/FileEditTool/FileEditTool.ts` | 同上 |
| N:1 | `tools/FileReadTool.ts` | `tools/FileReadTool/FileReadTool.ts` | 同上 |
| N:1 | `tools/FileWriteTool.ts` | `tools/FileWriteTool/FileWriteTool.ts` | 同上 |
| N:1 | `tools/GlobTool.ts` | `tools/GlobTool/GlobTool.ts` | 同上 |
| N:1 | `tools/GrepTool.ts` | `tools/GrepTool/GrepTool.ts` | 同上 |
| N:1 | `tools/ListMcpResourcesTool.ts` | `tools/ListMcpResourcesTool/ListMcpResourcesTool.ts` | 同上 |
| N:1 | `tools/LspTool/formatters.ts` | `tools/LSPTool/formatters.ts` | 大小写变化 |
| N:1 | `tools/LspTool/symbolContext.ts` | `tools/LSPTool/symbolContext.ts` | 同上 |
| N:1 | `tools/McpAuthTool.ts` | `tools/McpAuthTool/McpAuthTool.ts` | QL合并 |
| N:1 | `tools/McpTool/classifyForCollapse.ts` | `tools/MCPTool/classifyForCollapse.ts` | 大小写变化 |
| N:1 | `tools/NotebookEditTool.ts` | `tools/NotebookEditTool/NotebookEditTool.ts` | QL合并 |
| N:1 | `tools/PowerShellTool.ts` | `tools/PowerShellTool/PowerShellTool.tsx` | 同上 |
| N:1 | `tools/ReadMcpResourceTool.ts` | `tools/ReadMcpResourceTool/ReadMcpResourceTool.ts` | 同上 |
| N:1 | `tools/RemoteTriggerTool.ts` | `tools/RemoteTriggerTool/RemoteTriggerTool.ts` | 同上 |
| N:1 | `tools/SendMessageTool.ts` | `tools/SendMessageTool/SendMessageTool.ts` | 同上 |
| N:1 | `tools/SkillTool.ts` | `tools/SkillTool/SkillTool.ts` | 同上 |
| N:1 | `tools/SyntheticOutputTool.ts` | `tools/SyntheticOutputTool/SyntheticOutputTool.ts` | 同上 |
| N:1 | `tools/TaskCreateTool.ts` | `tools/TaskCreateTool/TaskCreateTool.ts` | 同上 |
| N:1 | `tools/TaskGetTool.ts` | `tools/TaskGetTool/TaskGetTool.ts` | 同上 |
| N:1 | `tools/TaskListTool.ts` | `tools/TaskListTool/TaskListTool.ts` | 同上 |
| N:1 | `tools/TaskOutputTool.ts` | `tools/TaskOutputTool/TaskOutputTool.tsx` | 同上 |
| N:1 | `tools/TaskStopTool.ts` | `tools/TaskStopTool/TaskStopTool.ts` | 同上 |
| N:1 | `tools/TaskUpdateTool.ts` | `tools/TaskUpdateTool/TaskUpdateTool.ts` | 同上 |
| N:1 | `tools/TeamCreateTool.ts` | `tools/TeamCreateTool/TeamCreateTool.ts` | 同上 |
| N:1 | `tools/TeamDeleteTool.ts` | `tools/TeamDeleteTool/TeamDeleteTool.ts` | 同上 |
| N:1 | `tools/TodoWriteTool.ts` | `tools/TodoWriteTool/TodoWriteTool.ts` | 同上 |
| N:1 | `tools/ToolSearchTool.ts` | `tools/ToolSearchTool/ToolSearchTool.ts` | 同上 |
| N:1 | `tools/WebFetchTool.ts` | `tools/WebFetchTool/WebFetchTool.ts` | 同上 |
| N:1 | `tools/WebSearchTool.ts` | `tools/WebSearchTool/WebSearchTool.ts` | 同上 |
| N:1 | `utils/ndjsonSafeStringify.ts` | `cli/ndjsonSafeStringify.ts` | QL移到utils/ |

---

## 三、待人工确认（?）— 7 个

| 映射 | QiLing 路径 | 候选 CC 路径 | 原因 |
|------|-------------|-------------|------|
| ? | `commands/index.ts` | `commands/add-dir/index.ts` | QL合并所有命令入口？待确认 |
| ? | `commands/setup.ts` | `setup.ts` | 内容需对比 |
| ? | `tools/LspTool/prompt.ts` | `tools/AgentTool/prompt.ts` | 同名但内容可能不同 |
| ? | `tools/McpTool/prompt.ts` | `tools/AgentTool/prompt.ts` | 同上 |
| ? | `tools/LspTool/schemas.ts` | `tools/LSPTool/schemas.ts` | 大小写差异，可能同文件 |
| ? | `utils/secureStorage/types.ts` | `utils/secureStorage/types.ts` | 精确路径存在CC端，理应FULL |
| ? | `services/lsp/types.ts` | `services/mcp/types.ts` | QL的LSP types vs CC的MCP types |

---

## 四、QiLing 新增文件（0:1）— 70 个

> 这些文件无 CC 对应，是 QiLing 自主实现或扩展。

| 类型 | 代表文件 | 说明 |
|------|---------|------|
| 新架构 | `compact/reactiveCompact.ts` | QL自研的响应式压缩 |
| 新架构 | `compact/snipCompact.ts` | QL自研snip压缩策略 |
| 新架构 | `compact/warningHook.ts / warningState.ts` | QL自研压缩告警系统 |
| 新架构 | `modes/planMode.ts` | QL的Plan模式实现 |
| 新架构 | `providers/` | QL全部提供者实现（10个Provider） |
| UI新增 | `components/AskUserQuestionDialog.tsx` | QL新增对话框 |
| UI新增 | `components/DiffView.tsx` | QL新增Diff视图 |
| UI新增 | `components/PlanApprovalDialog.tsx` | QL计划审批对话框 |
| UI新增 | `components/StartupBanner.tsx` | QL启动Banner |
| UI新增 | `components/StatusBar.tsx` | QL状态栏（CC端在components/StatusBar.tsx） |
| UI新增 | `components/ToolCallDisplay.tsx` | QL工具调用展示 |
| 新服务 | `services/cron/scheduler.ts` | QL自研定时调度 |
| 新服务 | `services/messaging/bus.ts` | QL消息总线 |
| 新服务 | `services/memory/extractor.ts` | QL记忆提取器 |
| 新服务 | `services/oauth/authCodeListener.ts` | QL OAuth监听器 |
| 新工具 | `tools/RepoMapTool.ts` | QL独有RepoMap工具 |
| 新工具 | `tools/SleepTool.ts` | QL独有Sleep工具 |
| 新工具 | `tools/AgentTool/built-in/qilingGuideAgent.ts` | QL自研指南Agent |
| 工具整合 | `tools/index.ts` | QL工具注册中心 |
| 类型新增 | `types/message.ts` | QL消息类型 |
| 类型新增 | `types/provider.ts` | QL提供者类型 |
| 类型新增 | `types/tool.ts` | QL工具类型 |
| 工具 | `utils/errorMessages.ts` | QL错误消息 |
| 工具 | `utils/mentions.ts` | QL @提及工具 |
| 工具 | `utils/migrations.ts` | QL迁移工具 |
| 工具 | `utils/modelAliases.ts` | QL模型别名 |
| 工具 | `utils/processUtils.ts` | QL进程工具 |
| 工具 | `utils/renderMarkdown.ts` | QL Markdown渲染 |
| 工具 | `utils/updater.ts` | QL自动更新器 |
| 其他 | `stubs/react-devtools-core.ts` | 开发工具存根 |
| 其他 | `permissions/classifier.ts` | QL权限分类器 |
| 其他 | `permissions/rules.ts` | QL权限规则 |
| 其他 | `vim/engine.ts` | QL Vim引擎 |

---

## 五、CC 未移植文件（1:0）— 1248 个

> 这些文件存在于 CC 中，QiLing 尚未移植。  
> 详细列表见 `_cc_only.txt`。

### 按 T 层分布统计

| T 层 | 代表目录 | 估算未移植数 |
|------|---------|------------|
| T2 UI层 | components/（部分）/ screens/ / buddy/ | ~185 |
| T1 工具层 | tools/（子目录UI/逻辑文件） | ~110 |
| T5 服务层 | services/api/ / analytics/ / oauth/ 等 | ~96 |
| T6 工具层 | utils/swarm/ / deepLink/ / computerUse/ 等 | ~462 |
| T0 运行时 | state/AppState* / coordinator/ 完整版 | ~40 |
| commands/ | 60+ 斜杠命令实现文件 | ~200 |
| 其他 | ink/内部渲染 / tasks/ / types/generated/ | ~155 |

### 高优先级未移植列表（建议 Phase B 优先处理）

| 路径 | 重要性 | 原因 |
|------|--------|------|
| `utils/settings/settings.ts` | ★★★ | 设置核心（42KB，QL用简化版） |
| `services/api/claude.ts` | ★★★ | API调用层，QL有自研版 |
| `utils/permissions/pathValidation.ts` | ★★★ | 路径权限验证核心 |
| `state/AppState.tsx` | ★★★ | 应用状态（QL用简化版） |
| `screens/REPL.tsx` | ★★★ | 完整REPL（QL有自研版） |
| `utils/tasks.ts` | ★★ | 后台任务工具 |
| `utils/git.ts` | ★★ | Git操作（QL有简化版） |
| `services/compact/microCompact.ts` | ★★ | 微型压缩 |
| `ink/renderer.ts` | ★★ | 主渲染器（CC内部） |
| `memdir/memdir.ts` | ★★ | 记忆核心逻辑 |

---

## 汇总统计

| 类型 | 数量 | 占 QiLing 总数 | 占 CC 总数 |
|------|------|---------------|-----------|
| 1:1 FULL | 410 | 51.4% | 21.8% |
| 1:1 PARTIAL | 80 | 10.0% | 4.2% |
| 1:1 EXTENDED | 62 | 7.8% | 3.3% |
| 1:1 STUB | 54 | 6.8% | 2.9% |
| 1:1 DIVERGED | 30 | 3.8% | 1.6% |
| N:1 RENAMED | 84 | 10.5% | — |
| 0:1 NEW | 70 | 8.8% | — |
| ? 待确认 | 7 | 0.9% | — |
| **QiLing Total** | **797** | **100%** | **42.3%** |
| 1:0 CC未移植 | 1248 | — | 66.2% |
| **CC Total** | **1884** | — | **100%** |
