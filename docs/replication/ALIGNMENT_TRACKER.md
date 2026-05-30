# ALIGNMENT_TRACKER.md

> **Current Phase:** A.5 → B (decisions locked)
> **Last Updated:** 2026-05-29T23:30
> **Audit Progress:** T0 ✅ | T1 ✅ | T2 ✅ | T3 ✅ | T4 ✅ | T5 ✅ | T6 ✅ | T7 ✅ | EXT ✅  
> **Verdict Distribution:** FULLY_ALIGNED 366 | PARTIAL 194 | DIVERGED 89 | RESTRUCTURED 156 | NEW 52 | MISSING 1186  
> **Active Batch / Audit Task:** B-T1-TOOLS-01 🟡 — session 6 done: treeSitterAnalysis/ParsedCommand/readOnlyCommandValidation(full)/bashCommandHelpers(complete)/readOnlyValidation(adapt-new) ✅
> **Effective Alignment:** 265/2045 FULL + 299/2045 PARTIAL ≈ 20% weighted

---

## 判定说明

| Verdict | 定义 | Status | 默认 Op |
|---------|------|--------|---------|
| `FULLY_ALIGNED` | 核心逻辑一致，差异 < 10% | ALIGNED | — |
| `PARTIAL` | 有对应但不完整，差异 10–50% | MAPPED | adapt-complete |
| `DIVERGED` | 显著偏离，差异 > 50% | BLOCKED | DECIDE |
| `RESTRUCTURED` | 路径重组（N:1 或 1:N） | MAPPED | — |
| `NEW` | QiLing 新增，CC 无对应 | KEPT | skip |
| `MISSING` | CC 有，QiLing 未移植 | UNTOUCHED | copy / adapt-new |

---

## 按 T 层覆盖率

| T 层 | 总计 | FULL | PARTIAL | DIVERGED | RESTR. | KEPT | skip |
|------|------|------|---------|----------|--------|-----|---------|
| **T0** 核心运行时 | 28 | 2 | 1 | 2 | 3 | 2 | 18 |
| **T1** 工具层 | 236 | 19 | 52 | 3 | 44 | 8 | 110 |
| **T2** UI层 | 417 | 74 | 25 | 5 | 8 | 6 | 299 |
| **T3** Hooks层 | 106 | 20 | 5 | 1 | 2 | 0 | 78 |
| **T4** Ink基础 | 122 | 40 | 34 | 7 | 2 | 1 | 38 |
| **T5** 服务层 | 163 | 7 | 23 | 9 | 17 | 8 | 99 |
| **T6** 基础工具 | 663 | 98 | 141 | 40 | 26 | 16 | 342 |
| **T7** 类型/常量 | 46 | 1 | 12 | 5 | 2 | 3 | 23 |
| **EXT** 外部集成 | 264 | 4 | 6 | 0 | 5 | 8 | 241 |

---

## 文件明细表

| ID | CC Path | Target Path | Cat | Verdict | Conf | Status | Op | Notes |
|----|---------|-------------|-----|---------|------|--------|----|-------|
| 1 | `bridge/bridgePermissionCallbacks.ts` | `bridge/bridgePermissionCallbacks.ts` | EXT | FULLY_ALIGNED | high | ALIGNED | — |  |
| 2 | `bridge/bridgeStatusUtil.ts` | `bridge/bridgeStatusUtil.ts` | EXT | PARTIAL | medium | ALIGNED | adapt-complete | added getClaudeAiBaseUrl/getRemoteSessionUrl for URL builders |
| 3 | `bridge/capacityWake.ts` | `bridge/capacityWake.ts` | EXT | FULLY_ALIGNED | high | ALIGNED | — |  |
| 4 | `bridge/flushGate.ts` | `bridge/flushGate.ts` | EXT | PARTIAL | medium | ALIGNED | — | functionally identical; compact style only |
| 5 | `buddy/CompanionSprite.tsx` | `buddy/CompanionSprite.tsx` | T2 | PARTIAL | high | KEPT | skip | L1 protected |
| 6 | `buddy/companion.ts` | `buddy/companion.ts` | T2 | FULLY_ALIGNED | high | ALIGNED | — | QL extended |
| 7 | `buddy/prompt.ts` | `buddy/prompt.ts` | T2 | DIVERGED | high | KEPT | skip | overlap=16% |
| 8 | `buddy/sprites.ts` | `buddy/sprites.ts` | T2 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 9 | `buddy/types.ts` | `buddy/types.ts` | T2 | PARTIAL | high | KEPT | skip | L1 protected |
| 10 | `cli/exit.ts` | `cli/exit.ts` | EXT | PARTIAL | medium | ALIGNED | — | functionally identical; QiLing skips biome-ignore comment |
| 11 | `cli/ndjsonSafeStringify.ts` | `cli/ndjsonSafeStringify.ts` | EXT | PARTIAL | medium | ALIGNED | adapt-complete | fixed regex to use \uXXXX escapes (was literal U+2028/U+2029) |
| 12 | `cli/transports/WorkerStateUploader.ts` | `cli/transports/WorkerStateUploader.ts` | EXT | PARTIAL | medium | ALIGNED | adapt-complete | added null/type guard in coalescePatches for RFC 7396 correctness |
| 13 | `commands/rename/generateSessionName.ts` | `commands/rename/generateSessionName.ts` | EXT | DIVERGED | medium | KEPT | skip | QiLing uses sideQuery+Provider (plain text); CC uses queryHaiku+JSON schema |
| 14 | `components/AgentProgressLine.tsx` | `components/AgentProgressLine.tsx` | T2 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 15 | `components/ClickableImageRef.tsx` | `components/ClickableImageRef.tsx` | T2 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 16 | `components/ConfigurableShortcutHint.tsx` | `components/ConfigurableShortcutHint.tsx` | T2 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 17 | `components/ContextSuggestions.tsx` | `components/ContextSuggestions.tsx` | T2 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 18 | `components/CtrlOToExpand.tsx` | `components/CtrlOToExpand.tsx` | T2 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 19 | `components/CustomSelect/index.ts` | `components/CustomSelect/index.ts` | T2 | DIVERGED | medium | ALIGNED | adapt-complete | QiLing exports from use-select-navigation/state/option-map; CC exports from select/SelectMulti |
| 20 | `components/CustomSelect/option-map.ts` | `components/CustomSelect/option-map.ts` | T2 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 21 | `components/CustomSelect/select-option.tsx` | `components/CustomSelect/select-option.tsx` | T2 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 22 | `components/CustomSelect/use-select-navigation.ts` | `components/CustomSelect/use-select-navigation.ts` | T2 | FULLY_ALIGNED | high | ALIGNED | — | QL extended |
| 23 | `components/CustomSelect/use-select-state.ts` | `components/CustomSelect/use-select-state.ts` | T2 | PARTIAL | medium | ALIGNED | — | type uses SelectNavigation intersection; functionally identical |
| 24 | `components/EffortIndicator.ts` | `components/EffortIndicator.ts` | T2 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 25 | `components/FallbackToolUseRejectedMessage.tsx` | `components/FallbackToolUseRejectedMessage.tsx` | T2 | PARTIAL | medium | ALIGNED | — | CC wraps in MessageResponse; QiLing uses Box — functionally equivalent |
| 26 | `components/FastIcon.tsx` | `components/FastIcon.tsx` | T2 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 27 | `components/FeedbackSurvey/FeedbackSurveyView.tsx` | `components/FeedbackSurvey/FeedbackSurveyView.tsx` | T2 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 28 | `components/FeedbackSurvey/TranscriptSharePrompt.tsx` | `components/FeedbackSurvey/TranscriptSharePrompt.tsx` | T2 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 29 | `components/FeedbackSurvey/useDebouncedDigitInput.ts` | `components/FeedbackSurvey/useDebouncedDigitInput.ts` | T2 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 30 | `components/FilePathLink.tsx` | `components/FilePathLink.tsx` | T2 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 31 | `components/IdeStatusIndicator.tsx` | `components/IdeStatusIndicator.tsx` | T2 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 32 | `components/InterruptedByUser.tsx` | `components/InterruptedByUser.tsx` | T2 | FULLY_ALIGNED | high | ALIGNED | — | // LOC: interrupt text |
| 33 | `components/KeybindingWarnings.tsx` | `components/KeybindingWarnings.tsx` | T2 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 34 | `components/MCPServerDialogCopy.tsx` | `components/MCPServerDialogCopy.tsx` | T2 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 35 | `components/Message.tsx` | `components/Message.tsx` | T2 | PARTIAL | high | KEPT | skip | L2 protected |
| 36 | `components/MessageModel.tsx` | `components/MessageModel.tsx` | T2 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 37 | `components/MessageResponse.tsx` | `components/MessageResponse.tsx` | T2 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 38 | `components/MessageTimestamp.tsx` | `components/MessageTimestamp.tsx` | T2 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 39 | `components/OffscreenFreeze.tsx` | `components/OffscreenFreeze.tsx` | T2 | DIVERGED | high | KEPT | skip | overlap=34% |
| 40 | `components/PrBadge.tsx` | `components/PrBadge.tsx` | T2 | FULLY_ALIGNED | high | ALIGNED | — | QL extended |
| 41 | `components/PressEnterToContinue.tsx` | `components/PressEnterToContinue.tsx` | T2 | FULLY_ALIGNED | high | ALIGNED | — | // LOC: prompt text; color="cyan" vs color="permission" |
| 42 | `components/PromptInput/IssueFlagBanner.tsx` | `components/PromptInput/IssueFlagBanner.tsx` | T2 | FULLY_ALIGNED | high | ALIGNED | — | ANT-ONLY returns null in both |
| 43 | `components/PromptInput/PromptInputStashNotice.tsx` | `components/PromptInput/PromptInputStashNotice.tsx` | T2 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 44 | `components/PromptInput/inputModes.ts` | `components/PromptInput/inputModes.ts` | T2 | FULLY_ALIGNED | high | ALIGNED | — | QL extended |
| 45 | `components/PromptInput/inputPaste.ts` | `components/PromptInput/inputPaste.ts` | T2 | PARTIAL | medium | ALIGNED | copy-block | added maybeTruncateMessageForInput + inlined getPastedTextRefNumLines |
| 46 | `components/PromptInput/useMaybeTruncateInput.ts` | `components/PromptInput/useMaybeTruncateInput.ts` | T2 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 47 | `components/PromptInput/useShowFastIconHint.ts` | `components/PromptInput/useShowFastIconHint.ts` | T2 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 48 | `components/PromptInput/utils.ts` | `components/PromptInput/utils.ts` | T2 | PARTIAL | medium | ALIGNED | adapt-complete | added pageUp/pageDown to isNonSpacePrintable; isVimModeEnabled stub correct (QiLing vim is separate) |
| 49 | `components/SearchBox.tsx` | `components/SearchBox.tsx` | T2 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 50 | `components/SentryErrorBoundary.ts` | `components/SentryErrorBoundary.ts` | T2 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 51 | `components/Spinner/FlashingChar.tsx` | `components/Spinner/FlashingChar.tsx` | T2 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 52 | `components/Spinner/ShimmerChar.tsx` | `components/Spinner/ShimmerChar.tsx` | T2 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 53 | `components/Spinner/SpinnerGlyph.tsx` | `components/Spinner/SpinnerGlyph.tsx` | T2 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 54 | `components/Spinner/index.ts` | `components/Spinner/index.ts` | T2 | PARTIAL | medium | ALIGNED | copy-block | added GlimmerMessage re-export |
| 55 | `components/Spinner/teammateSelectHint.ts` | `components/Spinner/teammateSelectHint.ts` | T2 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 56 | `components/Spinner/useShimmerAnimation.ts` | `components/Spinner/useShimmerAnimation.ts` | T2 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 57 | `components/Spinner/useStalledAnimation.ts` | `components/Spinner/useStalledAnimation.ts` | T2 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 58 | `components/Spinner/utils.ts` | `components/Spinner/utils.ts` | T2 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 59 | `components/Stats.tsx` | `components/Stats.tsx` | T2 | DIVERGED | high | KEPT | skip | overlap=7% |
| 60 | `components/StructuredDiff/colorDiff.ts` | `components/StructuredDiff/colorDiff.ts` | T2 | PARTIAL | medium | ALIGNED | adapt-complete | stubs all fns; color-diff-napi is CC-internal |
| 61 | `components/StructuredDiffList.tsx` | `components/StructuredDiffList.tsx` | T2 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 62 | `components/ToolUseLoader.tsx` | `components/ToolUseLoader.tsx` | T2 | PARTIAL | medium | ALIGNED | copy-block | added ref={ref} to Box |
| 63 | `components/agents/AgentNavigationFooter.tsx` | `components/agents/AgentNavigationFooter.tsx` | T2 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 64 | `components/agents/types.ts` | `components/agents/types.ts` | T2 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 65 | `components/agents/utils.ts` | `components/agents/utils.ts` | T2 | FULLY_ALIGNED | high | ALIGNED | — | QL extended |
| 66 | `components/design-system/Byline.tsx` | `components/design-system/Byline.tsx` | T2 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 67 | `components/design-system/Dialog.tsx` | `components/design-system/Dialog.tsx` | T2 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 68 | `components/design-system/Divider.tsx` | `components/design-system/Divider.tsx` | T2 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 69 | `components/design-system/FuzzyPicker.tsx` | `components/design-system/FuzzyPicker.tsx` | T2 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 70 | `components/design-system/KeyboardShortcutHint.tsx` | `components/design-system/KeyboardShortcutHint.tsx` | T2 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 71 | `components/design-system/ListItem.tsx` | `components/design-system/ListItem.tsx` | T2 | DIVERGED | high | KEPT | skip | overlap=30% |
| 72 | `components/design-system/LoadingState.tsx` | `components/design-system/LoadingState.tsx` | T2 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 73 | `components/design-system/Pane.tsx` | `components/design-system/Pane.tsx` | T2 | PARTIAL | medium | ALIGNED | — | functionally identical; overlap undercount |
| 74 | `components/design-system/ProgressBar.tsx` | `components/design-system/ProgressBar.tsx` | T2 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 75 | `components/design-system/Ratchet.tsx` | `components/design-system/Ratchet.tsx` | T2 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 76 | `components/design-system/StatusIcon.tsx` | `components/design-system/StatusIcon.tsx` | T2 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 77 | `components/design-system/ThemeProvider.tsx` | `components/design-system/ThemeProvider.tsx` | T2 | DIVERGED | high | KEPT | skip | overlap=12% |
| 78 | `components/design-system/ThemedBox.tsx` | `components/design-system/ThemedBox.tsx` | T2 | PARTIAL | medium | ALIGNED | copy-block | added resolveColor prefix checks (rgb/hex/ansi256/ansi:) |
| 79 | `components/design-system/ThemedText.tsx` | `components/design-system/ThemedText.tsx` | T2 | PARTIAL | medium | ALIGNED | copy-block | added resolveColor prefix checks (rgb/hex/ansi256/ansi:) |
| 80 | `components/design-system/color.ts` | `components/design-system/color.ts` | T2 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 81 | `components/mcp/CapabilitiesSection.tsx` | `components/mcp/CapabilitiesSection.tsx` | T2 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 82 | `components/memory/MemoryUpdateNotification.tsx` | `components/memory/MemoryUpdateNotification.tsx` | T2 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 83 | `components/messages/AssistantRedactedThinkingMessage.tsx` | `components/messages/AssistantRedactedThinkingMessage.tsx` | T2 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 84 | `components/messages/CompactBoundaryMessage.tsx` | `components/messages/CompactBoundaryMessage.tsx` | T2 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 85 | `components/messages/HighlightedThinkingText.tsx` | `components/messages/HighlightedThinkingText.tsx` | T2 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 86 | `components/messages/UserAgentNotificationMessage.tsx` | `components/messages/UserAgentNotificationMessage.tsx` | T2 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 87 | `components/messages/UserBashInputMessage.tsx` | `components/messages/UserBashInputMessage.tsx` | T2 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 88 | `components/messages/UserBashOutputMessage.tsx` | `components/messages/UserBashOutputMessage.tsx` | T2 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 89 | `components/messages/UserChannelMessage.tsx` | `components/messages/UserChannelMessage.tsx` | T2 | PARTIAL | medium | ALIGNED | copy-block | content normalization + truncateToWidth + TRUNCATE_AT=60 |
| 90 | `components/messages/UserCommandMessage.tsx` | `components/messages/UserCommandMessage.tsx` | T2 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 91 | `components/messages/UserImageMessage.tsx` | `components/messages/UserImageMessage.tsx` | T2 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 92 | `components/messages/UserMemoryInputMessage.tsx` | `components/messages/UserMemoryInputMessage.tsx` | T2 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 93 | `components/messages/UserToolResultMessage/RejectedToolUseM…` | `components/messages/UserToolResultMessage/RejectedToolUseM…` | T2 | PARTIAL | medium | ALIGNED | — | Box→MessageResponse diff; added LOC: marker; Chinese text intentional |
| 94 | `components/messages/UserToolResultMessage/UserToolCanceled…` | `components/messages/UserToolResultMessage/UserToolCanceled…` | T2 | PARTIAL | medium | ALIGNED | — | Box→MessageResponse wrapper diff; functionally equivalent |
| 95 | `components/permissions/FilePermissionDialog/ideDiffConfig.ts` | `components/permissions/FilePermissionDialog/ideDiffConfig.ts` | T2 | FULLY_ALIGNED | high | ALIGNED | — | QL extended |
| 96 | `components/permissions/PermissionRequestTitle.tsx` | `components/permissions/PermissionRequestTitle.tsx` | T2 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 97 | `components/permissions/WorkerBadge.tsx` | `components/permissions/WorkerBadge.tsx` | T2 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 98 | `components/shell/ExpandShellOutputContext.tsx` | `components/shell/ExpandShellOutputContext.tsx` | T2 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 99 | `components/shell/ShellProgressMessage.tsx` | `components/shell/ShellProgressMessage.tsx` | T2 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 100 | `components/shell/ShellTimeDisplay.tsx` | `components/shell/ShellTimeDisplay.tsx` | T2 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 101 | `components/ui/OrderedList.tsx` | `components/ui/OrderedList.tsx` | T2 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 102 | `components/ui/OrderedListItem.tsx` | `components/ui/OrderedListItem.tsx` | T2 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 103 | `components/wizard/WizardDialogLayout.tsx` | `components/wizard/WizardDialogLayout.tsx` | T2 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 104 | `components/wizard/WizardNavigationFooter.tsx` | `components/wizard/WizardNavigationFooter.tsx` | T2 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 105 | `components/wizard/WizardProvider.tsx` | `components/wizard/WizardProvider.tsx` | T2 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 106 | `components/wizard/index.ts` | `components/wizard/index.ts` | T2 | PARTIAL | medium | ALIGNED | — | all exports present |
| 107 | `components/wizard/useWizard.ts` | `components/wizard/useWizard.ts` | T2 | PARTIAL | medium | ALIGNED | — | functionally identical |
| 108 | `constants/apiLimits.ts` | `constants/apiLimits.ts` | T7 | DIVERGED | high | KEPT | skip | overlap=18% |
| 109 | `constants/betas.ts` | `constants/betas.ts` | T7 | PARTIAL | medium | ALIGNED | adapt-complete | added 4 missing consts (SUMMARIZE_CONNECTOR_TEXT/AFK_MODE/CLI_INTERNAL/ADVISOR); feature() flags → '' |
| 110 | `constants/common.ts` | `constants/common.ts` | T7 | DIVERGED | high | KEPT | skip | overlap=33% |
| 111 | `constants/cyberRiskInstruction.ts` | `constants/cyberRiskInstruction.ts` | T7 | FULLY_ALIGNED | medium | ALIGNED | — | identical to CC |
| 112 | `constants/errorIds.ts` | `constants/errorIds.ts` | T7 | FULLY_ALIGNED | medium | ALIGNED | — | identical to CC |
| 113 | `constants/figures.ts` | `constants/figures.ts` | T7 | FULLY_ALIGNED | high | ALIGNED | copy-block | added BRIDGE_SPINNER_FRAMES/READY/FAILED indicators |
| 114 | `constants/files.ts` | `constants/files.ts` | T7 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 115 | `constants/github-app.ts` | `constants/github-app.ts` | T7 | DIVERGED | high | KEPT | skip | overlap=32% |
| 116 | `constants/messages.ts` | `constants/messages.ts` | T7 | FULLY_ALIGNED | medium | ALIGNED | — | identical to CC |
| 117 | `constants/product.ts` | `constants/product.ts` | T7 | PARTIAL | high | ALIGNED | adapt-complete | added CLAUDE_AI_STAGING_BASE_URL/CLAUDE_AI_LOCAL_BASE_URL/getClaudeAiBaseUrl; getRemoteSessionUrl still simplified (no bridge) |
| 118 | `constants/spinnerVerbs.ts` | `constants/spinnerVerbs.ts` | T7 | DIVERGED | high | KEPT | skip | overlap=25% |
| 119 | `constants/toolLimits.ts` | `constants/toolLimits.ts` | T7 | FULLY_ALIGNED | medium | ALIGNED | — | identical to CC |
| 120 | `constants/tools.ts` | `constants/tools.ts` | T7 | PARTIAL | medium | ALIGNED | copy-block | added CUSTOM/ASYNC/IN_PROCESS_TEAMMATE tool sets + TOOL_SEARCH import + conditional AGENT_TOOL; COORDINATOR diverged (QiLing expanded) |
| 121 | `constants/turnCompletionVerbs.ts` | `constants/turnCompletionVerbs.ts` | T7 | FULLY_ALIGNED | medium | ALIGNED | — | identical to CC |
| 122 | `constants/xml.ts` | `constants/xml.ts` | T7 | FULLY_ALIGNED | high | VERIFIED | skip | all exports present; overlap note was stale |
| 123 | `context.ts` | `context.ts` | T6 | DIVERGED | high | KEPT | skip | B-T6-04: IMPROVED: QiLing is self-contained Bun.spawn impl; CC proxies via bootstrap/state+memoize |
| 124 | `context/QueuedMessageContext.tsx` | `context/QueuedMessageContext.tsx` | T4 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 125 | `context/fpsMetrics.tsx` | `context/fpsMetrics.tsx` | T4 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 126 | `context/mailbox.tsx` | `context/mailbox.tsx` | T4 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 127 | `context/modalContext.tsx` | `context/modalContext.tsx` | T4 | PARTIAL | medium | ALIGNED | — | export集合完整 |
| 128 | `context/notifications.tsx` | `context/notifications.tsx` | T4 | DIVERGED | high | KEPT | skip | overlap=33% |
| 129 | `context/promptOverlayContext.tsx` | `context/promptOverlayContext.tsx` | T4 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 130 | `context/stats.tsx` | `context/stats.tsx` | T4 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 131 | `coordinator/coordinatorMode.ts` | `coordinator/coordinatorMode.ts` | T0 | DIVERGED | high | KEPT | skip | overlap=11% |
| 132 | `cost-tracker.ts` | `cost-tracker.ts` | T6 | DIVERGED | high | KEPT | skip | B-T6-04: IMPROVED: self-contained pricing table + Chinese providers; CC is thin proxy to bootstrap/state |
| 133 | `entrypoints/sandboxTypes.ts` | `entrypoints/sandboxTypes.ts` | T7 | DIVERGED | high | KEPT | skip | overlap=24% |
| 134 | `entrypoints/sdk/coreTypes.ts` | `entrypoints/sdk/coreTypes.ts` | T7 | FULLY_ALIGNED | high | VERIFIED | skip | HOOK_EVENTS/EXIT_REASONS identical; QiLing defines HookEvent/ExitReason inline vs CC generated file |
| 135 | `hooks/notifs/useStartupNotification.ts` | `hooks/notifs/useStartupNotification.ts` | T3 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 136 | `hooks/renderPlaceholder.ts` | `hooks/renderPlaceholder.ts` | T3 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 137 | `hooks/useAfterFirstRender.ts` | `hooks/useAfterFirstRender.ts` | T3 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 138 | `hooks/useBlink.ts` | `hooks/useBlink.ts` | T3 | PARTIAL | medium | ALIGNED | copy-block | rewritten: useAnimationFrame+useTerminalFocus (synced, offscreen-aware) |
| 139 | `hooks/useDeferredHookMessages.ts` | `hooks/useDeferredHookMessages.ts` | T3 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 140 | `hooks/useDiffData.ts` | `hooks/useDiffData.ts` | T3 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 141 | `hooks/useDoublePress.ts` | `hooks/useDoublePress.ts` | T3 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 142 | `hooks/useDynamicConfig.ts` | `hooks/useDynamicConfig.ts` | T3 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 143 | `hooks/useElapsedTime.ts` | `hooks/useElapsedTime.ts` | T3 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 144 | `hooks/useExitOnCtrlCD.ts` | `hooks/useExitOnCtrlCD.ts` | T3 | PARTIAL | medium | ALIGNED | copy-block | added context: 'Global' to keybinding registration |
| 145 | `hooks/useExitOnCtrlCDWithKeybindings.ts` | `hooks/useExitOnCtrlCDWithKeybindings.ts` | T3 | PARTIAL | medium | ALIGNED | — | functionally identical |
| 146 | `hooks/useFileHistorySnapshotInit.ts` | `hooks/useFileHistorySnapshotInit.ts` | T3 | FULLY_ALIGNED | high | ALIGNED | — | QL extended |
| 147 | `hooks/useIdeAtMentioned.ts` | `hooks/useIdeAtMentioned.ts` | T3 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 148 | `hooks/useIdeConnectionStatus.ts` | `hooks/useIdeConnectionStatus.ts` | T3 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 149 | `hooks/useInputBuffer.ts` | `hooks/useInputBuffer.ts` | T3 | FULLY_ALIGNED | high | ALIGNED | — | QL extended |
| 150 | `hooks/useMailboxBridge.ts` | `hooks/useMailboxBridge.ts` | T3 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 151 | `hooks/useMemoryUsage.ts` | `hooks/useMemoryUsage.ts` | T3 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 152 | `hooks/useMergedClients.ts` | `hooks/useMergedClients.ts` | T3 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 153 | `hooks/useMergedCommands.ts` | `hooks/useMergedCommands.ts` | T3 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 154 | `hooks/useMinDisplayTime.ts` | `hooks/useMinDisplayTime.ts` | T3 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 155 | `hooks/useSearchInput.ts` | `hooks/useSearchInput.ts` | T3 | PARTIAL | medium | ALIGNED | copy-block | UNHANDLED_SPECIAL_KEYS: add mouse/lowercase wheel; prevWord/nextWord (CJK) |
| 156 | `hooks/useSettingsChange.ts` | `hooks/useSettingsChange.ts` | T3 | DIVERGED | high | KEPT | skip | overlap=29% |
| 157 | `hooks/useTerminalSize.ts` | `hooks/useTerminalSize.ts` | T3 | PARTIAL | medium | ALIGNED | copy-block | rewritten: useContext(TerminalSizeContext) instead of process.stdout polling |
| 158 | `hooks/useTimeout.ts` | `hooks/useTimeout.ts` | T3 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 159 | `hooks/useTurnDiffs.ts` | `hooks/useTurnDiffs.ts` | T3 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 160 | `hooks/useUpdateNotification.ts` | `hooks/useUpdateNotification.ts` | T3 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 161 | `ink/Ansi.tsx` | `ink/Ansi.tsx` | T4 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 162 | `ink/clearTerminal.ts` | `ink/clearTerminal.ts` | T4 | PARTIAL | medium | ALIGNED | — | export集合完整 |
| 163 | `ink/components/AppContext.ts` | `ink/components/AppContext.ts` | T4 | PARTIAL | medium | ALIGNED | — | export集合完整 |
| 164 | `ink/components/ClockContext.tsx` | `ink/components/ClockContext.tsx` | T4 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 165 | `ink/components/CursorDeclarationContext.ts` | `ink/components/CursorDeclarationContext.ts` | T4 | PARTIAL | medium | ALIGNED | — | export集合完整 |
| 166 | `ink/components/Link.tsx` | `ink/components/Link.tsx` | T4 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 167 | `ink/components/Newline.tsx` | `ink/components/Newline.tsx` | T4 | PARTIAL | medium | ALIGNED | — | export集合完整 |
| 168 | `ink/components/NoSelect.tsx` | `ink/components/NoSelect.tsx` | T4 | DIVERGED | high | KEPT | skip | overlap=34% |
| 169 | `ink/components/RawAnsi.tsx` | `ink/components/RawAnsi.tsx` | T4 | PARTIAL | medium | ALIGNED | — | export集合完整 |
| 170 | `ink/components/Spacer.tsx` | `ink/components/Spacer.tsx` | T4 | PARTIAL | medium | ALIGNED | — | impl等效; 用ink.Box替代内部Box |
| 171 | `ink/components/TerminalFocusContext.tsx` | `ink/components/TerminalFocusContext.tsx` | T4 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 172 | `ink/components/TerminalSizeContext.tsx` | `ink/components/TerminalSizeContext.tsx` | T4 | PARTIAL | medium | ALIGNED | — | export集合完整 |
| 173 | `ink/constants.ts` | `ink/constants.ts` | T4 | PARTIAL | medium | ALIGNED | — | export集合完整 |
| 174 | `ink/events/click-event.ts` | `ink/events/click-event.ts` | T4 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 175 | `ink/events/emitter.ts` | `ink/events/emitter.ts` | T4 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 176 | `ink/events/event-handlers.ts` | `ink/events/event-handlers.ts` | T4 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 177 | `ink/events/event.ts` | `ink/events/event.ts` | T4 | PARTIAL | medium | ALIGNED | — | export集合完整 |
| 178 | `ink/events/focus-event.ts` | `ink/events/focus-event.ts` | T4 | PARTIAL | medium | ALIGNED | — | export集合完整 |
| 179 | `ink/events/keyboard-event.ts` | `ink/events/keyboard-event.ts` | T4 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 180 | `ink/events/terminal-event.ts` | `ink/events/terminal-event.ts` | T4 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 181 | `ink/events/terminal-focus-event.ts` | `ink/events/terminal-focus-event.ts` | T4 | PARTIAL | medium | ALIGNED | — | export集合完整 |
| 182 | `ink/focus.ts` | `ink/focus.ts` | T4 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 183 | `ink/get-max-width.ts` | `ink/get-max-width.ts` | T4 | PARTIAL | medium | ALIGNED | — | export集合完整 |
| 184 | `ink/hit-test.ts` | `ink/hit-test.ts` | T4 | FULLY_ALIGNED | high | DONE | — | export集合完整，confirmed |
| 185 | `ink/hooks/use-animation-frame.ts` | `ink/hooks/use-animation-frame.ts` | T4 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 186 | `ink/hooks/use-app.ts` | `ink/hooks/use-app.ts` | T4 | PARTIAL | medium | ALIGNED | — | export集合完整 |
| 187 | `ink/hooks/use-declared-cursor.ts` | `ink/hooks/use-declared-cursor.ts` | T4 | PARTIAL | medium | ALIGNED | — | export集合完整 |
| 188 | `ink/hooks/use-input.ts` | `ink/hooks/use-input.ts` | T4 | PARTIAL | medium | ALIGNED | — | export集合完整 |
| 189 | `ink/hooks/use-interval.ts` | `ink/hooks/use-interval.ts` | T4 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 190 | `ink/hooks/use-stdin.ts` | `ink/hooks/use-stdin.ts` | T4 | PARTIAL | medium | ALIGNED | — | export集合完整 |
| 191 | `ink/hooks/use-tab-status.ts` | `ink/hooks/use-tab-status.ts` | T4 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 192 | `ink/hooks/use-terminal-focus.ts` | `ink/hooks/use-terminal-focus.ts` | T4 | PARTIAL | medium | ALIGNED | — | export集合完整 |
| 193 | `ink/hooks/use-terminal-title.ts` | `ink/hooks/use-terminal-title.ts` | T4 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 194 | `ink/hooks/use-terminal-viewport.ts` | `ink/hooks/use-terminal-viewport.ts` | T4 | DIVERGED | high | KEPT | skip | overlap=32% |
| 195 | `ink/instances.ts` | `ink/instances.ts` | T4 | PARTIAL | medium | ALIGNED | — | export集合完整 |
| 196 | `ink/layout/engine.ts` | `ink/layout/engine.ts` | T4 | PARTIAL | medium | ALIGNED | — | export集合完整 |
| 197 | `ink/layout/geometry.ts` | `ink/layout/geometry.ts` | T4 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 198 | `ink/layout/node.ts` | `ink/layout/node.ts` | T4 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 199 | `ink/line-width-cache.ts` | `ink/line-width-cache.ts` | T4 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 200 | `ink/measure-element.ts` | `ink/measure-element.ts` | T4 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 201 | `ink/measure-text.ts` | `ink/measure-text.ts` | T4 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 202 | `ink/node-cache.ts` | `ink/node-cache.ts` | T4 | PARTIAL | medium | ALIGNED | — | export集合完整 |
| 203 | `ink/optimizer.ts` | `ink/optimizer.ts` | T4 | FULLY_ALIGNED | high | DONE | — | export集合完整，confirmed |
| 204 | `ink/squash-text-nodes.ts` | `ink/squash-text-nodes.ts` | T4 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 205 | `ink/stringWidth.ts` | `ink/stringWidth.ts` | T4 | PARTIAL | medium | ALIGNED | — | export集合完整 |
| 206 | `ink/supports-hyperlinks.ts` | `ink/supports-hyperlinks.ts` | T4 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 207 | `ink/tabstops.ts` | `ink/tabstops.ts` | T4 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 208 | `ink/terminal-focus-state.ts` | `ink/terminal-focus-state.ts` | T4 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 209 | `ink/termio.ts` | `ink/termio.ts` | T4 | PARTIAL | medium | ALIGNED | — | export集合完整 |
| 210 | `ink/termio/ansi.ts` | `ink/termio/ansi.ts` | T4 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 211 | `ink/termio/csi.ts` | `ink/termio/csi.ts` | T4 | PARTIAL | high | ALIGNED | adapt-complete | 追加30个缺失常量/函数(cursorUp/eraseLines/PASTE_START等) |
| 212 | `ink/termio/dec.ts` | `ink/termio/dec.ts` | T4 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 213 | `ink/termio/esc.ts` | `ink/termio/esc.ts` | T4 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 214 | `ink/termio/osc.ts` | `ink/termio/osc.ts` | T4 | PARTIAL | medium | ALIGNED | — | export集合完整 |
| 215 | `ink/termio/parser.ts` | `ink/termio/parser.ts` | T4 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 216 | `ink/termio/sgr.ts` | `ink/termio/sgr.ts` | T4 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 217 | `ink/termio/tokenize.ts` | `ink/termio/tokenize.ts` | T4 | PARTIAL | medium | ALIGNED | — | export集合完整 |
| 218 | `ink/termio/types.ts` | `ink/termio/types.ts` | T4 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 219 | `ink/useTerminalNotification.ts` | `ink/useTerminalNotification.ts` | T4 | FULLY_ALIGNED | high | ALIGNED | — | QL extended |
| 220 | `ink/warn.ts` | `ink/warn.ts` | T4 | PARTIAL | medium | ALIGNED | — | export集合完整 |
| 221 | `ink/widest-line.ts` | `ink/widest-line.ts` | T4 | PARTIAL | medium | ALIGNED | — | export集合完整 |
| 222 | `ink/wrap-text.ts` | `ink/wrap-text.ts` | T4 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 223 | `ink/wrapAnsi.ts` | `ink/wrapAnsi.ts` | T4 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 224 | `keybindings/defaultBindings.ts` | `keybindings/defaultBindings.ts` | T4 | DIVERGED | high | KEPT | skip | overlap=19% |
| 225 | `keybindings/match.ts` | `keybindings/match.ts` | T4 | FULLY_ALIGNED | high | DONE | — | export集合完整，confirmed |
| 226 | `keybindings/parser.ts` | `keybindings/parser.ts` | T4 | DIVERGED | high | KEPT | skip | overlap=30% |
| 227 | `keybindings/reservedShortcuts.ts` | `keybindings/reservedShortcuts.ts` | T4 | PARTIAL | medium | ALIGNED | — | export集合完整 |
| 228 | `keybindings/resolver.ts` | `keybindings/resolver.ts` | T4 | PARTIAL | medium | ALIGNED | — | export集合完整 |
| 229 | `keybindings/schema.ts` | `keybindings/schema.ts` | T4 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 230 | `keybindings/shortcutFormat.ts` | `keybindings/shortcutFormat.ts` | T4 | PARTIAL | medium | ALIGNED | — | export集合完整 |
| 231 | `keybindings/template.ts` | `keybindings/template.ts` | T4 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 232 | `keybindings/useKeybinding.ts` | `keybindings/useKeybinding.ts` | T4 | DIVERGED | high | KEPT | skip | overlap=28% |
| 233 | `keybindings/useShortcutDisplay.ts` | `keybindings/useShortcutDisplay.ts` | T4 | DIVERGED | high | KEPT | skip | overlap=34% |
| 234 | `keybindings/validate.ts` | `keybindings/validate.ts` | T4 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 235 | `main.tsx` | `main.tsx` | T6 | DIVERGED | high | KEPT | skip | overlap=9% |
| 236 | `migrations/migrateReplBridgeEnabledToRemoteControlAtStartu…` | `migrations/migrateReplBridgeEnabledToRemoteControlAtStartu…` | T0 | PARTIAL | medium | ALIGNED | adapt-complete | stub→complete; no-op (QL schema differs) |
| 237 | `moreright/useMoreRight.tsx` | `moreright/useMoreRight.tsx` | EXT | FULLY_ALIGNED | high | ALIGNED | — |  |
| 238 | `native-ts/yoga-layout/enums.ts` | `native-ts/yoga-layout/enums.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 239 | `plugins/bundled/index.ts` | `plugins/bundled/index.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — | identical stub; initBuiltinPlugins() export matches |
| 240 | `query.ts` | `query.ts` | T6 | DIVERGED | high | KEPT | skip | overlap=18% |
| 241 | `query/config.ts` | `query/config.ts` | T0 | DIVERGED | high | KEPT | skip | overlap=24% |
| 242 | `query/tokenBudget.ts` | `query/tokenBudget.ts` | T0 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 243 | `server/types.ts` | `server/types.ts` | EXT | FULLY_ALIGNED | high | ALIGNED | — |  |
| 244 | `services/AgentSummary/agentSummary.ts` | `services/AgentSummary/agentSummary.ts` | T5 | PARTIAL | medium | ALIGNED | — | valid adapt: provider.stream() (CC uses runForkedAgent unavailable in QL) |
| 245 | `services/MagicDocs/magicDocs.ts` | `services/MagicDocs/magicDocs.ts` | T5 | DIVERGED | high | KEPT | skip | overlap=31% |
| 246 | `services/MagicDocs/prompts.ts` | `services/MagicDocs/prompts.ts` | T5 | DIVERGED | high | KEPT | skip | overlap=22% |
| 247 | `services/PromptSuggestion/promptSuggestion.ts` | `services/PromptSuggestion/promptSuggestion.ts` | T5 | PARTIAL | high | ALIGNED | — | CC runForkedAgent/AppState/analytics not portable |
| 248 | `services/SessionMemory/prompts.ts` | `services/SessionMemory/prompts.ts` | T5 | DIVERGED | high | KEPT | skip | overlap=25% |
| 249 | `services/SessionMemory/sessionMemory.ts` | `services/SessionMemory/sessionMemory.ts` | T5 | PARTIAL | high | ALIGNED | — | CC runForkedAgent/postSamplingHook/state-module not portable |
| 250 | `services/analytics/config.ts` | `services/analytics/config.ts` | T5 | PARTIAL | medium | ALIGNED | — |  |
| 251 | `services/api/emptyUsage.ts` | `services/api/emptyUsage.ts` | T5 | PARTIAL | medium | ALIGNED | — | QiLing uses TokenUsage (leaner) vs CC NonNullableUsage; intentional |
| 252 | `services/api/errorUtils.ts` | `services/api/errorUtils.ts` | T5 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 253 | `services/awaySummary.ts` | `services/awaySummary.ts` | T5 | PARTIAL | medium | ALIGNED | — |  |
| 254 | `services/compact/compactWarningHook.ts` | `services/compact/compactWarningHook.ts` | T5 | PARTIAL | medium | ALIGNED | — |  |
| 255 | `services/compact/compactWarningState.ts` | `services/compact/compactWarningState.ts` | T5 | PARTIAL | medium | ALIGNED | — |  |
| 256 | `services/compact/grouping.ts` | `services/compact/grouping.ts` | T5 | DIVERGED | high | KEPT | skip | overlap=27% |
| 257 | `services/extractMemories/prompts.ts` | `services/extractMemories/prompts.ts` | T5 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 258 | `services/lsp/LSPClient.ts` | `services/lsp/LSPClient.ts` | T5 | PARTIAL | medium | ALIGNED | — |  |
| 259 | `services/lsp/LSPDiagnosticRegistry.ts` | `services/lsp/LSPDiagnosticRegistry.ts` | T5 | PARTIAL | high | ALIGNED | adapt-complete | added clearAllLSPDiagnostics/resetAllLSPDiagnosticState/clearDeliveredDiagnosticsForFile/getPendingLSPDiagnosticCount; checkForLSPDiagnostics return type still differs |
| 260 | `services/lsp/LSPServerInstance.ts` | `services/lsp/LSPServerInstance.ts` | T5 | PARTIAL | medium | ALIGNED | — |  |
| 261 | `services/lsp/LSPServerManager.ts` | `services/lsp/LSPServerManager.ts` | T5 | PARTIAL | medium | ALIGNED | — |  |
| 262 | `services/lsp/config.ts` | `services/lsp/config.ts` | T5 | DIVERGED | high | KEPT | skip | overlap=32% |
| 263 | `services/lsp/manager.ts` | `services/lsp/manager.ts` | T5 | DIVERGED | high | KEPT | skip | overlap=30% |
| 264 | `services/lsp/passiveFeedback.ts` | `services/lsp/passiveFeedback.ts` | T5 | PARTIAL | medium | ALIGNED | — |  |
| 265 | `services/mcp/InProcessTransport.ts` | `services/mcp/InProcessTransport.ts` | T5 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 266 | `services/mcp/SdkControlTransport.ts` | `services/mcp/SdkControlTransport.ts` | T5 | DIVERGED | high | KEPT | skip | overlap=34% |
| 267 | `services/mcp/client.ts` | `services/mcp/client.ts` | T5 | PARTIAL | high | ALIGNED | — | CC-specific transports/OAuth/analytics removed by design |
| 268 | `services/mcp/envExpansion.ts` | `services/mcp/envExpansion.ts` | T5 | FULLY_ALIGNED | high | ALIGNED | — | QL extended |
| 269 | `services/mcp/mcpStringUtils.ts` | `services/mcp/mcpStringUtils.ts` | T5 | PARTIAL | high | ALIGNED | adapt-complete | added getMcpDisplayName/extractMcpToolDisplayName; getToolNameForPermissionCheck still simplified |
| 270 | `services/mcp/normalization.ts` | `services/mcp/normalization.ts` | T5 | PARTIAL | medium | ALIGNED | — | identical implementation |
| 271 | `services/mcp/oauthPort.ts` | `services/mcp/oauthPort.ts` | T5 | PARTIAL | medium | ALIGNED | — |  |
| 272 | `services/mcp/officialRegistry.ts` | `services/mcp/officialRegistry.ts` | T5 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 273 | `services/mcp/types.ts` | `services/mcp/types.ts` | T5 | PARTIAL | high | ALIGNED | — | CC 7-scope/XAA/OAuth/IDE types all CC-infra specific |
| 274 | `services/oauth/crypto.ts` | `services/oauth/crypto.ts` | T5 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 275 | `services/oauth/index.ts` | `services/oauth/index.ts` | T5 | DIVERGED | high | KEPT | skip | overlap=31% |
| 276 | `services/policyLimits/types.ts` | `services/policyLimits/types.ts` | T5 | PARTIAL | medium | ALIGNED | — |  |
| 277 | `services/preventSleep.ts` | `services/preventSleep.ts` | T5 | PARTIAL | medium | ALIGNED | — | added darwin early-return to startRestartInterval |
| 278 | `services/remoteManagedSettings/types.ts` | `services/remoteManagedSettings/types.ts` | T5 | PARTIAL | medium | ALIGNED | — |  |
| 279 | `services/settingsSync/types.ts` | `services/settingsSync/types.ts` | T5 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 280 | `services/tips/tipHistory.ts` | `services/tips/tipHistory.ts` | T5 | PARTIAL | medium | ALIGNED | — | valid adapt: in-memory (CC uses numStartups/globalConfig) |
| 281 | `services/tips/tipScheduler.ts` | `services/tips/tipScheduler.ts` | T5 | PARTIAL | medium | ALIGNED | — | getTipToShowOnSpinner in tips.ts (restructured) |
| 282 | `services/tokenEstimation.ts` | `services/tokenEstimation.ts` | T5 | DIVERGED | high | KEPT | skip | overlap=13% |
| 283 | `skills/mcpSkillBuilders.ts` | `skills/mcpSkillBuilders.ts` | T6 | PARTIAL | medium | ALIGNED | adapt-complete | `unknown` typing correct (loadSkillsDir.ts MISSING); IMPROVED: isMCPSkillBuildersRegistered() |
| 284 | `state/store.ts` | `state/store.ts` | T0 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 285 | `tools/AgentTool/agentColorManager.ts` | `tools/AgentTool/agentColorManager.ts` | T1 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 286 | `tools/AgentTool/agentDisplay.ts` | `tools/AgentTool/agentDisplay.ts` | T1 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 287 | `tools/AgentTool/agentMemory.ts` | `tools/AgentTool/agentMemory.ts` | T1 | PARTIAL | medium | ALIGNED | copy-block | added getLocalAgentMemoryDir + QILING_REMOTE_MEMORY_DIR support; inline sanitizePath; isAgentMemoryPath updated |
| 288 | `tools/AgentTool/agentMemorySnapshot.ts` | `tools/AgentTool/agentMemorySnapshot.ts` | T1 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 289 | `tools/AgentTool/built-in/exploreAgent.ts` | `tools/AgentTool/built-in/exploreAgent.ts` | T1 | DIVERGED | medium | ALIGNED | — | file is orphaned — Explore agent fully implemented in builtInAgents.ts; EXPLORE_AGENT_MIN_QUERIES unused |
| 290 | `tools/AgentTool/built-in/generalPurposeAgent.ts` | `tools/AgentTool/built-in/generalPurposeAgent.ts` | T1 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 291 | `tools/AgentTool/built-in/planAgent.ts` | `tools/AgentTool/built-in/planAgent.ts` | T1 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 292 | `tools/AgentTool/builtInAgents.ts` | `tools/AgentTool/builtInAgents.ts` | T1 | PARTIAL | high | ALIGNED | adapt-complete | CC uses growthbook feature flags for agent gating; QiLing inlines static agents (valid adaptation) |
| 293 | `tools/AgentTool/constants.ts` | `tools/AgentTool/constants.ts` | T1 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 294 | `tools/AgentTool/loadAgentsDir.ts` | `tools/AgentTool/loadAgentsDir.ts` | T1 | DIVERGED | high | BLOCKED | adapt-rewrite | CC: async memoized, BaseAgentDefinition/BuiltInAgentDefinition/CustomAgentDefinition, getSystemPrompt(), plugins, effort/permissionMode/hooks/maxTurns; QiLing: sync, systemPrompt:string; needs loadPluginAgents+parseEffortValue+getBuiltInAgents() |
| 295 | `tools/AskUserQuestionTool/prompt.ts` | `tools/AskUserQuestionTool/prompt.ts` | T1 | FULLY_ALIGNED | high | ALIGNED | copy-block | added PREVIEW_FEATURE_PROMPT + ASK_USER_QUESTION_TOOL_PROMPT |
| 296 | `tools/BashTool/bashSecurity.ts` | `tools/BashTool/bashSecurity.ts` | T1 | DIVERGED | high | ALIGNED | adapt-complete | CC is 2593 lines tree-sitter/PermissionResult/analytics; QiLing is regex-only (208 lines, valid adaptation) |
| 297 | `tools/BashTool/commandSemantics.ts` | `tools/BashTool/commandSemantics.ts` | T1 | FULLY_ALIGNED | high | ALIGNED | — | QiLing adds robocopy; drops deprecated splitCommand_DEPRECATED |
| 298 | `tools/BashTool/commentLabel.ts` | `tools/BashTool/commentLabel.ts` | T1 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 299 | `tools/BashTool/destructiveCommandWarning.ts` | `tools/BashTool/destructiveCommandWarning.ts` | T1 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 300 | `tools/BashTool/sedValidation.ts` | `tools/BashTool/sedValidation.ts` | T1 | FULLY_ALIGNED | high | ALIGNED | copy-block | rewrote to CC allowlist-first + denylist double-check; kept checkSedSecurity() adapter |
| 301 | `tools/BashTool/toolName.ts` | `tools/BashTool/toolName.ts` | T1 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 302 | `tools/BashTool/utils.ts` | `tools/BashTool/utils.ts` | T1 | PARTIAL | high | ALIGNED | adapt-complete | CC has cwd-management/pathInAllowedWorkingPath/logEvent analytics deps; QiLing missing those integrated exports |
| 303 | `tools/BriefTool/prompt.ts` | `tools/BriefTool/prompt.ts` | T1 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 304 | `tools/ConfigTool/constants.ts` | `tools/ConfigTool/constants.ts` | T1 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 305 | `tools/EnterPlanModeTool/constants.ts` | `tools/EnterPlanModeTool/constants.ts` | T1 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 306 | `tools/EnterWorktreeTool/constants.ts` | `tools/EnterWorktreeTool/constants.ts` | T1 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 307 | `tools/EnterWorktreeTool/prompt.ts` | `tools/EnterWorktreeTool/prompt.ts` | T1 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 308 | `tools/ExitPlanModeTool/constants.ts` | `tools/ExitPlanModeTool/constants.ts` | T1 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 309 | `tools/ExitPlanModeTool/prompt.ts` | `tools/ExitPlanModeTool/prompt.ts` | T1 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 310 | `tools/ExitWorktreeTool/constants.ts` | `tools/ExitWorktreeTool/constants.ts` | T1 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 311 | `tools/ExitWorktreeTool/prompt.ts` | `tools/ExitWorktreeTool/prompt.ts` | T1 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 312 | `tools/FileEditTool/constants.ts` | `tools/FileEditTool/constants.ts` | T1 | DIVERGED | high | ALIGNED | adapt-complete | // NAME: FileEdit vs Edit; // QILING-IDENTITY: .qiling vs .claude permission patterns |
| 313 | `tools/FileEditTool/prompt.ts` | `tools/FileEditTool/prompt.ts` | T1 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 314 | `tools/FileEditTool/types.ts` | `tools/FileEditTool/types.ts` | T1 | PARTIAL | high | ALIGNED | copy-block | added hunkSchema/gitDiffSchema/outputSchema/FileEditOutput/FileEdit; zod/v4+lazySchema; inline semanticBoolean preprocess |
| 315 | `tools/FileReadTool/imageProcessor.ts` | `tools/FileReadTool/imageProcessor.ts` | T1 | PARTIAL | medium | ALIGNED | copy-block | added getImageCreator+SharpCreatorOptions+SharpCreator; skipped image-processor-napi (ANT bundled) |
| 316 | `tools/FileReadTool/prompt.ts` | `tools/FileReadTool/prompt.ts` | T1 | PARTIAL | high | ALIGNED | adapt-complete | CC has renderPromptTemplate() + more exports; QiLing has inline desc in FileReadTool.ts |
| 317 | `tools/FileWriteTool/prompt.ts` | `tools/FileWriteTool/prompt.ts` | T1 | PARTIAL | high | ALIGNED | adapt-complete | CC has getWriteToolDescription(); QiLing has inline desc in FileWriteTool.ts |
| 318 | `tools/GlobTool/prompt.ts` | `tools/GlobTool/prompt.ts` | T1 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 319 | `tools/GrepTool/prompt.ts` | `tools/GrepTool/prompt.ts` | T1 | FULLY_ALIGNED | high | ALIGNED | — | hardcoded vs dynamic tool refs; same output |
| 320 | `tools/ListMcpResourcesTool/prompt.ts` | `tools/ListMcpResourcesTool/prompt.ts` | T1 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 321 | `tools/NotebookEditTool/constants.ts` | `tools/NotebookEditTool/constants.ts` | T1 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 322 | `tools/NotebookEditTool/prompt.ts` | `tools/NotebookEditTool/prompt.ts` | T1 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 323 | `tools/PowerShellTool/clmTypes.ts` | `tools/PowerShellTool/clmTypes.ts` | T1 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 324 | `tools/PowerShellTool/commandSemantics.ts` | `tools/PowerShellTool/commandSemantics.ts` | T1 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 325 | `tools/PowerShellTool/commonParameters.ts` | `tools/PowerShellTool/commonParameters.ts` | T1 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 326 | `tools/PowerShellTool/destructiveCommandWarning.ts` | `tools/PowerShellTool/destructiveCommandWarning.ts` | T1 | FULLY_ALIGNED | high | ALIGNED | — | QiLing has more patterns + getDestructiveCommandWarningPS() returns undefined |
| 327 | `tools/PowerShellTool/gitSafety.ts` | `tools/PowerShellTool/gitSafety.ts` | T1 | FULLY_ALIGNED | high | ALIGNED | — | uses process.cwd() vs getCwd(); has extra commandWritesToGitInternalPath() |
| 328 | `tools/PowerShellTool/powershellSecurity.ts` | `tools/PowerShellTool/powershellSecurity.ts` | T1 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 329 | `tools/PowerShellTool/toolName.ts` | `tools/PowerShellTool/toolName.ts` | T1 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 330 | `tools/REPLTool/constants.ts` | `tools/REPLTool/constants.ts` | T1 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 331 | `tools/ReadMcpResourceTool/prompt.ts` | `tools/ReadMcpResourceTool/prompt.ts` | T1 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 332 | `tools/RemoteTriggerTool/prompt.ts` | `tools/RemoteTriggerTool/prompt.ts` | T1 | PARTIAL | medium | ALIGNED | — | CC PROMPT mentions claude.ai CCR API (ANT-only); kept NAME+DESCRIPTION only |
| 333 | `tools/ScheduleCronTool/prompt.ts` | `tools/ScheduleCronTool/prompt.ts` | T1 | DIVERGED | medium | ALIGNED | — | CC uses bun-bundle+GrowthBook+cronTasks (ANT); QiLing has simpler 5-constant version |
| 334 | `tools/SendMessageTool/constants.ts` | `tools/SendMessageTool/constants.ts` | T1 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 335 | `tools/SendMessageTool/prompt.ts` | `tools/SendMessageTool/prompt.ts` | T1 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 336 | `tools/SkillTool/constants.ts` | `tools/SkillTool/constants.ts` | T1 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 337 | `tools/SleepTool/prompt.ts` | `tools/SleepTool/prompt.ts` | T1 | PARTIAL | medium | ALIGNED | copy-block | added TICK_TAG prompt + concurrency note + prefer-over-bash note |
| 338 | `tools/TaskCreateTool/constants.ts` | `tools/TaskCreateTool/constants.ts` | T1 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 339 | `tools/TaskCreateTool/prompt.ts` | `tools/TaskCreateTool/prompt.ts` | T1 | DIVERGED | high | KEPT | skip | overlap=19% |
| 340 | `tools/TaskGetTool/constants.ts` | `tools/TaskGetTool/constants.ts` | T1 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 341 | `tools/TaskGetTool/prompt.ts` | `tools/TaskGetTool/prompt.ts` | T1 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 342 | `tools/TaskListTool/constants.ts` | `tools/TaskListTool/constants.ts` | T1 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 343 | `tools/TaskListTool/prompt.ts` | `tools/TaskListTool/prompt.ts` | T1 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 344 | `tools/TaskOutputTool/constants.ts` | `tools/TaskOutputTool/constants.ts` | T1 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 345 | `tools/TaskStopTool/prompt.ts` | `tools/TaskStopTool/prompt.ts` | T1 | PARTIAL | medium | ALIGNED | copy-block | added 2 extra DESCRIPTION bullet points |
| 346 | `tools/TaskUpdateTool/constants.ts` | `tools/TaskUpdateTool/constants.ts` | T1 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 347 | `tools/TaskUpdateTool/prompt.ts` | `tools/TaskUpdateTool/prompt.ts` | T1 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 348 | `tools/TeamCreateTool/constants.ts` | `tools/TeamCreateTool/constants.ts` | T1 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 349 | `tools/TeamCreateTool/prompt.ts` | `tools/TeamCreateTool/prompt.ts` | T1 | DIVERGED | high | KEPT | skip | overlap=27% |
| 350 | `tools/TeamDeleteTool/constants.ts` | `tools/TeamDeleteTool/constants.ts` | T1 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 351 | `tools/TeamDeleteTool/prompt.ts` | `tools/TeamDeleteTool/prompt.ts` | T1 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 352 | `tools/TodoWriteTool/constants.ts` | `tools/TodoWriteTool/constants.ts` | T1 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 353 | `tools/ToolSearchTool/constants.ts` | `tools/ToolSearchTool/constants.ts` | T1 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 354 | `tools/ToolSearchTool/prompt.ts` | `tools/ToolSearchTool/prompt.ts` | T1 | PARTIAL | medium | ALIGNED | — | CC has KAIROS/bun-bundle ANT additions; QiLing core getPrompt()+formatDeferredToolLine() aligned |
| 355 | `tools/WebFetchTool/preapproved.ts` | `tools/WebFetchTool/preapproved.ts` | T1 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 356 | `tools/WebFetchTool/prompt.ts` | `tools/WebFetchTool/prompt.ts` | T1 | PARTIAL | medium | ALIGNED | copy-block | IMPORTANT MCP note, redirect note, makeSecondaryModelPrompt added |
| 357 | `tools/WebSearchTool/prompt.ts` | `tools/WebSearchTool/prompt.ts` | T1 | PARTIAL | medium | ALIGNED | copy-block | expanded CRITICAL REQUIREMENT + usage notes + domain filtering |
| 358 | `tools/shared/gitOperationTracking.ts` | `tools/shared/gitOperationTracking.ts` | T1 | DIVERGED | high | KEPT | skip | overlap=20% |
| 359 | `types/ids.ts` | `types/ids.ts` | T7 | FULLY_ALIGNED | high | VERIFIED | skip | all 4 exports identical; overlap note was stale |
| 360 | `utils/CircularBuffer.ts` | `utils/CircularBuffer.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 361 | `utils/Cursor.ts` | `utils/Cursor.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | copy-block | B-T6-06: added getViewportCharOffset/End, nextWord/endOfWord/prevWord, getKillRingItem/Size; skip render()/imageRef/deleteTokenBefore (no image chips) |
| 362 | `utils/QueryGuard.ts` | `utils/QueryGuard.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — | B-T6-05: identical state machine and API |
| 363 | `utils/abortController.ts` | `utils/abortController.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — | B-T6-04: identical logic, same WeakRef pattern |
| 364 | `utils/activityManager.ts` | `utils/activityManager.ts` | T6 | DIVERGED | high | KEPT | skip | overlap=27% |
| 365 | `utils/agentContext.ts` | `utils/agentContext.ts` | T6 | DIVERGED | high | BLOCKED | DECIDE | B-T6-04: CC type system = SubagentContext/TeammateAgentContext; QiLing = simple AgentContext; coordinator BLOCKED |
| 366 | `utils/agentId.ts` | `utils/agentId.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — | B-T6-03: verified exact match with CC |
| 367 | `utils/agentSwarmsEnabled.ts` | `utils/agentSwarmsEnabled.ts` | T6 | DIVERGED | high | KEPT | skip | overlap=21% |
| 368 | `utils/analyzeContext.ts` | `utils/analyzeContext.ts` | T6 | DIVERGED | high | BLOCKED | DECIDE | B-T6-04: CC=1383-line token API+grid viz; QiLing=110-line simple analysis; different purposes |
| 369 | `utils/apiPreconnect.ts` | `utils/apiPreconnect.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — | IMPROVED: _resetPreconnectFlagForTesting + QILING_ env vars; CC adds FOUNDRY check (skip) |
| 370 | `utils/argumentSubstitution.ts` | `utils/argumentSubstitution.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — | B-T6-04: IMPROVED: custom tokenizer (avoids bash/shellQuote dep); substituteArguments identical |
| 371 | `utils/array.ts` | `utils/array.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — | B-T6-02: verified exact match with CC |
| 372 | `utils/auth.ts` | `utils/auth.ts` | T6 | PARTIAL | high | ALIGNED | — | CC OAuth/keychain/SubscriptionType all CC-specific |
| 373 | `utils/autoModeDenials.ts` | `utils/autoModeDenials.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — | QL extended |
| 374 | `utils/autoRunIssue.tsx` | `utils/autoRunIssue.tsx` | T6 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 375 | `utils/aws.ts` | `utils/aws.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 376 | `utils/awsAuthStatusManager.ts` | `utils/awsAuthStatusManager.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 377 | `utils/backgroundHousekeeping.ts` | `utils/backgroundHousekeeping.ts` | T6 | DIVERGED | high | KEPT | skip | overlap=29% |
| 378 | `utils/bash/ast.ts` | `utils/bash/ast.ts` | T6 | DIVERGED | high | KEPT | skip | overlap=1% |
| 379 | `utils/bash/commands.ts` | `utils/bash/commands.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — | QL extended |
| 380 | `utils/bash/heredoc.ts` | `utils/bash/heredoc.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 381 | `utils/bash/registry.ts` | `utils/bash/registry.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 382 | `utils/bash/shellPrefix.ts` | `utils/bash/shellPrefix.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 383 | `utils/bash/shellQuote.ts` | `utils/bash/shellQuote.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 384 | `utils/bash/shellQuoting.ts` | `utils/bash/shellQuoting.ts` | T6 | DIVERGED | high | KEPT | skip | overlap=27% |
| 385 | `utils/bash/specs/alias.ts` | `utils/bash/specs/alias.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — | B-T6-07: identical logic |
| 386 | `utils/bash/specs/index.ts` | `utils/bash/specs/index.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — | B-T6-07: identical exports array |
| 387 | `utils/bash/specs/nohup.ts` | `utils/bash/specs/nohup.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — | B-T6-07: identical logic |
| 388 | `utils/bash/specs/pyright.ts` | `utils/bash/specs/pyright.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 389 | `utils/bash/specs/sleep.ts` | `utils/bash/specs/sleep.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — | B-T6-07: identical logic |
| 390 | `utils/bash/specs/srun.ts` | `utils/bash/specs/srun.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — | B-T6-07: identical logic |
| 391 | `utils/bash/specs/time.ts` | `utils/bash/specs/time.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — | B-T6-07: identical logic |
| 392 | `utils/bash/specs/timeout.ts` | `utils/bash/specs/timeout.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — | B-T6-07: identical logic |
| 393 | `utils/binaryCheck.ts` | `utils/binaryCheck.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — | B-T6-04: IMPROVED: added isBinaryInstalledSync; CC only has isBinaryInstalled+clearBinaryCache |
| 394 | `utils/browser.ts` | `utils/browser.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 395 | `utils/bufferedWriter.ts` | `utils/bufferedWriter.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 396 | `utils/bundledMode.ts` | `utils/bundledMode.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — | B-T6-03: verified exact match with CC |
| 397 | `utils/caCerts.ts` | `utils/caCerts.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 398 | `utils/caCertsConfig.ts` | `utils/caCertsConfig.ts` | T6 | DIVERGED | high | KEPT | skip | overlap=23% |
| 399 | `utils/cachePaths.ts` | `utils/cachePaths.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 400 | `utils/classifierApprovals.ts` | `utils/classifierApprovals.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 401 | `utils/classifierApprovalsHook.ts` | `utils/classifierApprovalsHook.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — | B-T6-07: identical useSyncExternalStore hook |
| 402 | `utils/claudeCodeHints.ts` | `utils/claudeCodeHints.ts` | T6 | FULLY_ALIGNED | medium | ALIGNED | — | added collapsed-newline step + _test export; parseAttrs while-loop functionally equiv |
| 403 | `utils/claudemd.ts` | `utils/claudemd.ts` | T6 | DIVERGED | high | BLOCKED | DECIDE | B-T6-04: CC deps memoize+analytics+memdir+fileStateCache; QiLing is clean fs-only impl; IMPROVED |
| 404 | `utils/cleanupRegistry.ts` | `utils/cleanupRegistry.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — | B-T6-04: identical; QiLing adds .catch(()=>{}) safety in Promise.all |
| 405 | `utils/cliArgs.ts` | `utils/cliArgs.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — | B-T6-04: identical exports and logic |
| 406 | `utils/cliHighlight.ts` | `utils/cliHighlight.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — | B-T6-04: same API; QiLing uses eval-import for Bun compat, CC uses typed imports |
| 407 | `utils/codeIndexing.ts` | `utils/codeIndexing.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 408 | `utils/collapseReadSearch.ts` | `utils/collapseReadSearch.ts` | T6 | DIVERGED | high | BLOCKED | DECIDE | B-T6-04: CC deps RenderableMessage/CollapsibleMessage from CC msg types; QiLing is standalone util |
| 409 | `utils/combinedAbortSignal.ts` | `utils/combinedAbortSignal.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 410 | `utils/commandLifecycle.ts` | `utils/commandLifecycle.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — | B-T6-07: identical listener pattern |
| 411 | `utils/completionCache.ts` | `utils/completionCache.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 412 | `utils/configConstants.ts` | `utils/configConstants.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — | QL extended |
| 413 | `utils/contentArray.ts` | `utils/contentArray.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 414 | `utils/contextSuggestions.ts` | `utils/contextSuggestions.ts` | T6 | DIVERGED | high | KEPT | skip | overlap=24% |
| 415 | `utils/controlMessageCompat.ts` | `utils/controlMessageCompat.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 416 | `utils/cron.ts` | `utils/cron.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 417 | `utils/crypto.ts` | `utils/crypto.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — | B-T6-03: verified exact match with CC |
| 418 | `utils/cwd.ts` | `utils/cwd.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 419 | `utils/debugFilter.ts` | `utils/debugFilter.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — | B-T6-05: IMPROVED: manual Map memoize (no lodash dep); added _resetDebugFilterCacheForTesting |
| 420 | `utils/detectRepository.ts` | `utils/detectRepository.ts` | T6 | PARTIAL | high | ALIGNED | adapt-complete | B-T6-01: +getCachedRepository +parseGitHubRepository |
| 421 | `utils/diagLogs.ts` | `utils/diagLogs.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 422 | `utils/diff.ts` | `utils/diff.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — | B-T6-05: IMPROVED: stripped analytics deps; added formatPatchAsUnifiedDiff+hasDiff |
| 423 | `utils/directMemberMessage.ts` | `utils/directMemberMessage.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 424 | `utils/displayTags.ts` | `utils/displayTags.ts` | T6 | DIVERGED | high | KEPT | skip | overlap=32% |
| 425 | `utils/earlyInput.ts` | `utils/earlyInput.ts` | T6 | DIVERGED | high | KEPT | skip | overlap=34% |
| 426 | `utils/editor.ts` | `utils/editor.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — | IMPROVED: ANSI alt-screen (no Ink dep) + getEditorDisplayName + wider default editor list |
| 427 | `utils/effort.ts` | `utils/effort.ts` | T6 | PARTIAL | high | ALIGNED | adapt-complete | added EFFORT_LEVELS/EffortValue/isEffortLevel/isValidNumericEffort/convertEffortValueToLevel/toPersistableEffort; auth/growthbook fns omitted |
| 428 | `utils/embeddedTools.ts` | `utils/embeddedTools.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — | always-false correct for QiLing; CC checks EMBEDDED_SEARCH_TOOLS env (ant-native only) |
| 429 | `utils/env.ts` | `utils/env.ts` | T6 | PARTIAL | high | ALIGNED | adapt-complete | B-T6-01: +JETBRAINS_IDES +detectDeploymentEnvironment +getHostPlatformForAnalytics; getGlobalClaudeFile skipped (fileSuffixForOauthConfig missing) |
| 430 | `utils/envUtils.ts` | `utils/envUtils.ts` | T6 | PARTIAL | high | ALIGNED | adapt-complete | B-T6-01: +getClaudeConfigHomeDir +getTeamsDir +hasNodeOption +getAWSRegion +getDefaultVertexRegion +shouldMaintainProjectWorkingDir +isAntUser +isRunningOnHomespace +VERTEX_REGION_OVERRIDES +getVertexRegionForModel; isInProtectedNamespace skipped |
| 431 | `utils/envValidation.ts` | `utils/envValidation.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — | QL extended |
| 432 | `utils/errors.ts` | `utils/errors.ts` | T6 | PARTIAL | high | ALIGNED | adapt-complete | B-T6-01: +ClaudeError +MalformedCommandError +ConfigParseError +ShellError +TeleportOperationError +TelemetrySafeError_* +AxiosErrorKind +classifyAxiosError |
| 433 | `utils/exampleCommands.ts` | `utils/exampleCommands.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 434 | `utils/execFileNoThrow.ts` | `utils/execFileNoThrow.ts` | T6 | DIVERGED | high | KEPT | skip | overlap=30% |
| 435 | `utils/execSyncWrapper.ts` | `utils/execSyncWrapper.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 436 | `utils/file.ts` | `utils/file.ts` | T6 | PARTIAL | high | ALIGNED | adapt-complete | added getFileModificationTimeAsync/addLineNumbers/stripLineNumberPrefix/isFileWithinReadSizeLimit; analytics deps omitted |
| 437 | `utils/fileHistory.ts` | `utils/fileHistory.ts` | T6 | PARTIAL | high | ALIGNED | — | CC deps: bootstrap/state/analytics/vscodeMcp/diffLines not portable |
| 438 | `utils/filePersistence/outputsScanner.ts` | `utils/filePersistence/outputsScanner.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — | same 3 exports + algorithm; inline types vs CC's external EnvironmentKind/TurnStartTime |
| 439 | `utils/fileRead.ts` | `utils/fileRead.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — | same 4 exports + algorithms; plain fs replaces FsOperations (B-T6-11 pattern) |
| 440 | `utils/fileReadCache.ts` | `utils/fileReadCache.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — | same singleton interface; plain fs + detectEncodingForResolvedPath replaces FsOperations |
| 441 | `utils/fileStateCache.ts` | `utils/fileStateCache.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 442 | `utils/findExecutable.ts` | `utils/findExecutable.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — | B-T6-07: identical logic |
| 443 | `utils/fingerprint.ts` | `utils/fingerprint.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — | algorithm identical; adapted message type access |
| 444 | `utils/format.ts` | `utils/format.ts` | T6 | PARTIAL | medium | ALIGNED | adapt-complete | added truncate re-exports; formatRelativeTime/formatResetTime intentionally adapted |
| 445 | `utils/formatBriefTimestamp.ts` | `utils/formatBriefTimestamp.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 446 | `utils/fpsTracker.ts` | `utils/fpsTracker.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 447 | `utils/frontmatterParser.ts` | `utils/frontmatterParser.ts` | T6 | PARTIAL | high | ALIGNED | adapt-complete | B-T6-01: export FRONTMATTER_REGEX +parseBooleanFrontmatter +FrontmatterShell +parseShellFrontmatter; upgraded splitPathInFrontmatter w/ brace expansion |
| 448 | `utils/fsOperations.ts` | `utils/fsOperations.ts` | T6 | DIVERGED | high | KEPT | — | B-T6-11: CC's FsOperations abstraction layer (getFsImpl/setFsImpl/NodeFsImpl) not needed in QiLing; QiLing uses plain fs directly; getPathsForPermissionCheck also skipped |
| 449 | `utils/generatedFiles.ts` | `utils/generatedFiles.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 450 | `utils/generators.ts` | `utils/generators.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 451 | `utils/genericProcessUtils.ts` | `utils/genericProcessUtils.ts` | T6 | PARTIAL | high | ALIGNED | adapt-complete | B-T6-02: +getAncestorPidsAsync +getAncestorCommandsAsync; getChildPids skipped (execSyncWithDefaults_DEPRECATED missing) |
| 452 | `utils/getWorktreePaths.ts` | `utils/getWorktreePaths.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — | B-T6-10: re-exports getWorktreePathsPortable; IMPROVED: no analytics deps |
| 453 | `utils/getWorktreePathsPortable.ts` | `utils/getWorktreePathsPortable.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 454 | `utils/ghPrStatus.ts` | `utils/ghPrStatus.ts` | T6 | PARTIAL | medium | ALIGNED | adapt-complete | added getDefaultBranch() dynamic detection; IMPROVED: cwd param + Bun.spawn retained |
| 455 | `utils/git.ts` | `utils/git.ts` | T6 | PARTIAL | high | ALIGNED | — | CC deps: gitFilesystem/diagLogs/memoizeWithLRU not portable |
| 456 | `utils/git/gitConfigParser.ts` | `utils/git/gitConfigParser.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 457 | `utils/git/gitFilesystem.ts` | `utils/git/gitFilesystem.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 458 | `utils/git/gitignore.ts` | `utils/git/gitignore.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 459 | `utils/gitDiff.ts` | `utils/gitDiff.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — | core functions matched; Bun.spawn replaces execFileNoThrow; git.ts funcs folded in (RESTRUCTURED) |
| 460 | `utils/gitSettings.ts` | `utils/gitSettings.ts` | T6 | DIVERGED | high | KEPT | skip | overlap=25% |
| 461 | `utils/github/ghAuthStatus.ts` | `utils/github/ghAuthStatus.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 462 | `utils/glob.ts` | `utils/glob.ts` | T6 | DIVERGED | high | KEPT | skip | overlap=30% |
| 463 | `utils/gracefulShutdown.ts` | `utils/gracefulShutdown.ts` | T6 | DIVERGED | high | KEPT | — | B-T6-08: QiLing intentionally simplified (no analytics/terminal cleanup/signal-exit); CC 200+ lines vs QiLing ~100 |
| 464 | `utils/hash.ts` | `utils/hash.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — | B-T6-03: verified exact match with CC |
| 465 | `utils/heatmap.ts` | `utils/heatmap.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 466 | `utils/highlightMatch.tsx` | `utils/highlightMatch.tsx` | T6 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 467 | `utils/hooks/hookEvents.ts` | `utils/hooks/hookEvents.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 468 | `utils/hooks/postSamplingHooks.ts` | `utils/hooks/postSamplingHooks.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — | same exports + logic; inline types vs CC's SystemPrompt/ToolUseContext/QuerySource |
| 469 | `utils/hooks/registerSkillHooks.ts` | `utils/hooks/registerSkillHooks.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 470 | `utils/horizontalScroll.ts` | `utils/horizontalScroll.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — | identical algorithm; minor var name differences (cumulativeWidths→cumulative) |
| 471 | `utils/http.ts` | `utils/http.ts` | T6 | DIVERGED | high | KEPT | skip | overlap=26% |
| 472 | `utils/hyperlink.ts` | `utils/hyperlink.ts` | T6 | PARTIAL | medium | ALIGNED | adapt-complete | B-T6-03: +chalk.blue coloring, import supportsHyperlinks from ink, export HyperlinkOptions |
| 473 | `utils/idePathConversion.ts` | `utils/idePathConversion.ts` | T6 | PARTIAL | medium | ALIGNED | adapt-complete | fixed checkWSLDistroMatch to return true for non-WSL paths; IMPROVED: IdentityPathConverter retained |
| 474 | `utils/idleTimeout.ts` | `utils/idleTimeout.ts` | T6 | DIVERGED | medium | KEPT | — | B-T6-08: env var renamed (QILING_EXIT_AFTER_IDLE_MS); QiLing uses process.exit+stderr vs CC gracefulShutdownSync+logForDebugging; IMPROVED: timer.unref |
| 475 | `utils/imageResizer.ts` | `utils/imageResizer.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — | added compressImageBlock/detectImageFormatFromBase64/createImageMetadataText; analytics omitted (intentional) |
| 476 | `utils/imageValidation.ts` | `utils/imageValidation.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — | QL extended |
| 477 | `utils/ink.ts` | `utils/ink.ts` | T6 | PARTIAL | medium | ALIGNED | adapt-complete | default 'cyan' (CC 'cyan_FOR_SUBAGENTS_ONLY' needs theme key); ansi: prefix omitted — QiLing theme doesn't handle it |
| 478 | `utils/intl.ts` | `utils/intl.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 479 | `utils/json.ts` | `utils/json.ts` | T6 | DIVERGED | high | KEPT | skip | overlap=14% |
| 480 | `utils/jsonRead.ts` | `utils/jsonRead.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — | B-T6-07: identical stripBOM |
| 481 | `utils/keyboardShortcuts.ts` | `utils/keyboardShortcuts.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 482 | `utils/lazySchema.ts` | `utils/lazySchema.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — | B-T6-07: identical factory memoization |
| 483 | `utils/lockfile.ts` | `utils/lockfile.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — | B-T6-08: same 4 exports; IMPROVED: fallback simple lock when proper-lockfile absent |
| 484 | `utils/log.ts` | `utils/log.ts` | T6 | DIVERGED | high | KEPT | copy-block | B-T6-09: added dateToFilename; ErrorLogSink/attachErrorLogSink (sink infra), loadErrorLogs/getErrorLogByIndex (CACHE_PATHS), captureAPIRequest (analytics) all DIVERGED; QiLing=direct console approach |
| 485 | `utils/mailbox.ts` | `utils/mailbox.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 486 | `utils/managedEnvConstants.ts` | `utils/managedEnvConstants.ts` | T6 | FULLY_ALIGNED | medium | ALIGNED | — | SAFE_ENV_VARS fully ported from CC (~80 entries) |
| 487 | `utils/markdown.ts` | `utils/markdown.ts` | T6 | DIVERGED | high | KEPT | — | B-T6-08: QiLing=chalk-based renderer (renderMarkdown/renderDiff); CC=marked+token pipeline (configureMarked/applyMarkdown/formatToken/padAligned); different approach |
| 488 | `utils/markdownConfigLoader.ts` | `utils/markdownConfigLoader.ts` | T6 | DIVERGED | high | KEPT | skip | overlap=16% |
| 489 | `utils/mcpOutputStorage.ts` | `utils/mcpOutputStorage.ts` | T6 | PARTIAL | high | ALIGNED | adapt-complete | added isBinaryContentType/persistBinaryContent/full MIME types; storage dir differs (QiLing: getMcpOutputStorageDir vs CC: toolResultStorage) |
| 490 | `utils/mcpValidation.ts` | `utils/mcpValidation.ts` | T6 | DIVERGED | high | KEPT | skip | overlap=30% |
| 491 | `utils/mcpWebSocketTransport.ts` | `utils/mcpWebSocketTransport.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 492 | `utils/memoize.ts` | `utils/memoize.ts` | T6 | DIVERGED | high | KEPT | skip | overlap=34% |
| 493 | `utils/memory/versions.ts` | `utils/memory/versions.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — | B-T6-07: identical; imports findGitRoot from gitDiff instead of git (same function) |
| 494 | `utils/memoryFileDetection.ts` | `utils/memoryFileDetection.ts` | T6 | DIVERGED | high | KEPT | skip | overlap=20% |
| 495 | `utils/messagePredicates.ts` | `utils/messagePredicates.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — | adapted to QiLing role/content fields; same semantic |
| 496 | `utils/messages.ts` | `utils/messages.ts` | T6 | PARTIAL | high | ALIGNED | — | CC 90+ exports all depend on CC analytics/growthbook/buddy |
| 497 | `utils/model/aliases.ts` | `utils/model/aliases.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — | re-export shim; all 5 exports match CC |
| 498 | `utils/model/check1mAccess.ts` | `utils/model/check1mAccess.ts` | T6 | DIVERGED | high | KEPT | skip | overlap=23% |
| 499 | `utils/model/configs.ts` | `utils/model/configs.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 500 | `utils/model/contextWindowUpgradeCheck.ts` | `utils/model/contextWindowUpgradeCheck.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 501 | `utils/model/deprecation.ts` | `utils/model/deprecation.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 502 | `utils/model/modelAllowlist.ts` | `utils/model/modelAllowlist.ts` | T6 | PARTIAL | medium | BLOCKED | adapt-complete | bidirectional alias resolution needs parseUserSpecifiedModel (model.ts MISSING) + resolveOverriddenModel (modelStrings.ts MISSING) |
| 503 | `utils/model/modelSupportOverrides.ts` | `utils/model/modelSupportOverrides.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 504 | `utils/model/providers.ts` | `utils/model/providers.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 505 | `utils/modelCost.ts` | `utils/modelCost.ts` | T6 | PARTIAL | high | ALIGNED | — | valid adapt: no CC model-config/analytics/fastMode imports |
| 506 | `utils/modifiers.ts` | `utils/modifiers.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 507 | `utils/mtls.ts` | `utils/mtls.ts` | T6 | FULLY_ALIGNED | medium | ALIGNED | — | added configureGlobalMTLS; QILING_ env var aliases preserved |
| 508 | `utils/notebook.ts` | `utils/notebook.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 509 | `utils/objectGroupBy.ts` | `utils/objectGroupBy.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — | B-T6-07: identical logic |
| 510 | `utils/pasteStore.ts` | `utils/pasteStore.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 511 | `utils/path.ts` | `utils/path.ts` | T6 | DIVERGED | high | KEPT | skip | overlap=31% |
| 512 | `utils/pdf.ts` | `utils/pdf.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 513 | `utils/pdfUtils.ts` | `utils/pdfUtils.ts` | T6 | FULLY_ALIGNED | medium | ALIGNED | — | added isPDFSupported() (adapted via selectMainLoopModel/getAppState) |
| 514 | `utils/peerAddress.ts` | `utils/peerAddress.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 515 | `utils/permissions/PermissionMode.ts` | `utils/permissions/PermissionMode.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — | QL extended |
| 516 | `utils/permissions/PermissionResult.ts` | `utils/permissions/PermissionResult.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — | QiLing has all CC types inline + extra |
| 517 | `utils/permissions/PermissionRule.ts` | `utils/permissions/PermissionRule.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — | same schemas; types inline vs CC re-exports |
| 518 | `utils/permissions/PermissionUpdateSchema.ts` | `utils/permissions/PermissionUpdateSchema.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | copy-block | B-T6-11: added permissionUpdateDestinationSchema + permissionUpdateSchema; also added permissionModeSchema/externalPermissionModeSchema to PermissionMode.ts |
| 519 | `utils/permissions/bashClassifier.ts` | `utils/permissions/bashClassifier.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 520 | `utils/permissions/classifierShared.ts` | `utils/permissions/classifierShared.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 521 | `utils/permissions/dangerousPatterns.ts` | `utils/permissions/dangerousPatterns.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — | B-T6-11: QiLing is superset (re-exports CC's arrays + adds isDangerousBashPattern/isDangerousPowerShellPattern) |
| 522 | `utils/permissions/denialTracking.ts` | `utils/permissions/denialTracking.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — | B-T6-07: re-export shim; impl at permissions/denialTracking.ts is identical |
| 523 | `utils/permissions/shellRuleMatching.ts` | `utils/permissions/shellRuleMatching.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — | same 7 exports confirmed |
| 524 | `utils/plans.ts` | `utils/plans.ts` | T6 | DIVERGED | high | KEPT | skip | overlap=15% |
| 525 | `utils/platform.ts` | `utils/platform.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | copy-block | B-T6-10: added SUPPORTED_PLATFORMS, getWslVersion, LinuxDistroInfo, getLinuxDistroInfo, detectVcs; adapted: plain fs instead of getFsImplementation; IMPROVED: isWSL/isMacOS/isWindows/isLinux helpers |
| 526 | `utils/plugins/gitAvailability.ts` | `utils/plugins/gitAvailability.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — | IMPROVED: module-level Promise cache vs lodash memoize; same 3 exports |
| 527 | `utils/plugins/managedPlugins.ts` | `utils/plugins/managedPlugins.ts` | T6 | PARTIAL | medium | ALIGNED | — | stub; no policySettings in QL OSS |
| 528 | `utils/plugins/officialMarketplace.ts` | `utils/plugins/officialMarketplace.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — | same 2 CC exports + values; IMPROVED: inline MarketplaceSource + QILING_MARKETPLACE_NAME |
| 529 | `utils/plugins/pluginDirectories.ts` | `utils/plugins/pluginDirectories.ts` | T6 | DIVERGED | high | KEPT | skip | overlap=28% |
| 530 | `utils/plugins/pluginIdentifier.ts` | `utils/plugins/pluginIdentifier.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — | added SETTING_SOURCE_TO_SCOPE/scopeToSettingSource/settingSourceToScope with inline types |
| 531 | `utils/plugins/pluginPolicy.ts` | `utils/plugins/pluginPolicy.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — | QL extended |
| 532 | `utils/plugins/walkPluginMarkdown.ts` | `utils/plugins/walkPluginMarkdown.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 533 | `utils/powershell/dangerousCmdlets.ts` | `utils/powershell/dangerousCmdlets.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 534 | `utils/powershell/parser.ts` | `utils/powershell/parser.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — | IMPROVED: Bun.spawn vs execa, module-level LRU vs memoizeWithLRU, inlined pwsh detection; all exports/algorithm identical |
| 535 | `utils/powershell/staticPrefix.ts` | `utils/powershell/staticPrefix.ts` | T6 | DIVERGED | high | KEPT | skip | overlap=15% |
| 536 | `utils/privacyLevel.ts` | `utils/privacyLevel.ts` | T6 | DIVERGED | high | KEPT | skip | overlap=32% |
| 537 | `utils/process.ts` | `utils/process.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — | B-T6-08: identical logic; QiLing inlines writeOut helper inline, same effect |
| 538 | `utils/profilerBase.ts` | `utils/profilerBase.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 539 | `utils/promptShellExecution.ts` | `utils/promptShellExecution.ts` | T6 | DIVERGED | high | KEPT | skip | overlap=29% |
| 540 | `utils/proxy.ts` | `utils/proxy.ts` | T6 | PARTIAL | high | ALIGNED | — | added getAddressFamily/getNoProxy/shouldBypassProxy; CC axios/undici/mTLS stack excluded |
| 541 | `utils/queryHelpers.ts` | `utils/queryHelpers.ts` | T6 | DIVERGED | high | KEPT | skip | CC extras (isResultSuccessful/normalizeMessage/handleOrphanedPermission) need SDK types; QiLing has own extras |
| 542 | `utils/releaseNotes.ts` | `utils/releaseNotes.ts` | T6 | PARTIAL | medium | ALIGNED | skip | migrateChangelogFromConfig: QiLing started with file-based storage (no config migration needed); ant checks CC-specific |
| 543 | `utils/renderOptions.ts` | `utils/renderOptions.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — | QL extended |
| 544 | `utils/ripgrep.ts` | `utils/ripgrep.ts` | T6 | DIVERGED | high | KEPT | skip | Bun-native rewrite; CC extras (embedded mode/EAGAIN/codesign/countFilesRoundedRg) are CC-infra-specific |
| 545 | `utils/sandbox/sandbox-ui-utils.ts` | `utils/sandbox/sandbox-ui-utils.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — | identical removeSandboxViolationTags |
| 546 | `utils/sanitization.ts` | `utils/sanitization.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — | Unicode literal chars vs hex escapes — functionally identical |
| 547 | `utils/secureStorage/fallbackStorage.ts` | `utils/secureStorage/fallbackStorage.ts` | T6 | FULLY_ALIGNED | medium | ALIGNED | — | delete() bug fixed: both primary+secondary always deleted |
| 548 | `utils/secureStorage/index.ts` | `utils/secureStorage/index.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 549 | `utils/secureStorage/plainTextStorage.ts` | `utils/secureStorage/plainTextStorage.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 550 | `utils/semanticBoolean.ts` | `utils/semanticBoolean.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — | identical logic; zod vs zod/v4 import only |
| 551 | `utils/semanticNumber.ts` | `utils/semanticNumber.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — | regex /^-?\d+(\.\d+)?$/ makes isFinite check redundant; functionally equal |
| 552 | `utils/semver.ts` | `utils/semver.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — | Bun paths identical; fallback simplified (QiLing always runs on Bun) |
| 553 | `utils/sequential.ts` | `utils/sequential.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 554 | `utils/sessionActivity.ts` | `utils/sessionActivity.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 555 | `utils/sessionEnvVars.ts` | `utils/sessionEnvVars.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — | QL extended |
| 556 | `utils/sessionStorage.ts` | `utils/sessionStorage.ts` | T6 | PARTIAL | high | ALIGNED | — | CC 44+ exports all depend on CC-only bootstrap/state/sessionIngress/growthbook |
| 557 | `utils/sessionTitle.ts` | `utils/sessionTitle.ts` | T6 | PARTIAL | medium | ALIGNED | adapt-complete | fetch-based impl correct (no queryHaiku); logEvent omitted intentionally; msg type adapted |
| 558 | `utils/sessionUrl.ts` | `utils/sessionUrl.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 559 | `utils/set.ts` | `utils/set.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 560 | `utils/settings/internalWrites.ts` | `utils/settings/internalWrites.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — | identical 3 exports |
| 561 | `utils/settings/managedPath.ts` | `utils/settings/managedPath.ts` | T6 | PARTIAL | medium | ALIGNED | adapt-complete | added ant env override (USER_TYPE=ant + CLAUDE_CODE_MANAGED_SETTINGS_PATH); // NAME: marked |
| 562 | `utils/settings/pluginOnlyPolicy.ts` | `utils/settings/pluginOnlyPolicy.ts` | T6 | PARTIAL | medium | ALIGNED | adapt-complete | env-var approach correct (no policySettings layer); isSourceAdminTrusted identical |
| 563 | `utils/settings/schemaOutput.ts` | `utils/settings/schemaOutput.ts` | T6 | DIVERGED | medium | KEPT | skip | CC uses toJSONSchema from zod/v4; QiLing uses plain zod — stub intentional until zod upgrade |
| 564 | `utils/settings/toolValidationConfig.ts` | `utils/settings/toolValidationConfig.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — | identical structure and content |
| 565 | `utils/settings/validationTips.ts` | `utils/settings/validationTips.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — | identical; DOCUMENTATION_BASE URL is // NAME: for Phase C |
| 566 | `utils/shell/outputLimits.ts` | `utils/shell/outputLimits.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 567 | `utils/shell/powershellDetection.ts` | `utils/shell/powershellDetection.ts` | T6 | DIVERGED | high | KEPT | skip | overlap=34% |
| 568 | `utils/shell/resolveDefaultShell.ts` | `utils/shell/resolveDefaultShell.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 569 | `utils/shell/shellProvider.ts` | `utils/shell/shellProvider.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 570 | `utils/shell/shellToolUtils.ts` | `utils/shell/shellToolUtils.ts` | T6 | PARTIAL | medium | ALIGNED | adapt-complete | default-ON for all Windows is correct QiLing behavior; checks both QILING_ and CC env vars |
| 571 | `utils/shellConfig.ts` | `utils/shellConfig.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — | IMPROVED: inlines getLocalClaudePath vs CC import from localInstaller.js; same 6 exports + algorithm |
| 572 | `utils/sideQuery.ts` | `utils/sideQuery.ts` | T6 | DIVERGED | high | KEPT | skip | overlap=16% |
| 573 | `utils/signal.ts` | `utils/signal.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 574 | `utils/slashCommandParsing.ts` | `utils/slashCommandParsing.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — | identical 2 exports and parsing logic |
| 575 | `utils/sleep.ts` | `utils/sleep.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — | functionally identical; minor typing differences in unref guard |
| 576 | `utils/sliceAnsi.ts` | `utils/sliceAnsi.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — | identical logic; CC has more verbose inline comments only |
| 577 | `utils/slowOperations.ts` | `utils/slowOperations.ts` | T6 | PARTIAL | high | ALIGNED | adapt-complete | added callerFrame(); slowLogging/writeFileSync_DEPRECATED omitted (need bootstrap/state); env var QiLing-adapted |
| 578 | `utils/startupProfiler.ts` | `utils/startupProfiler.ts` | T6 | DIVERGED | high | KEPT | skip | overlap=24% |
| 579 | `utils/staticRender.tsx` | `utils/staticRender.tsx` | T6 | FULLY_ALIGNED | high | ALIGNED | — | IMPROVED: inline ANSI strip regex vs strip-ansi package; same 2 exports + algorithm |
| 580 | `utils/statsCache.ts` | `utils/statsCache.ts` | T6 | DIVERGED | high | KEPT | skip | overlap=19% |
| 581 | `utils/statusNoticeHelpers.ts` | `utils/statusNoticeHelpers.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 582 | `utils/stream.ts` | `utils/stream.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 583 | `utils/streamJsonStdoutGuard.ts` | `utils/streamJsonStdoutGuard.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — | same 3 exports + logic; split('\n') vs CC indexOf loop (equivalent) |
| 584 | `utils/stringUtils.ts` | `utils/stringUtils.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 585 | `utils/subprocessEnv.ts` | `utils/subprocessEnv.ts` | T6 | DIVERGED | high | KEPT | skip | overlap=33% |
| 586 | `utils/suggestions/directoryCompletion.ts` | `utils/suggestions/directoryCompletion.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — | IMPROVED: direct fs.readdir vs getFsImplementation; SuggestionItem inlined; same exports + algorithm |
| 587 | `utils/suggestions/shellHistoryCompletion.ts` | `utils/suggestions/shellHistoryCompletion.ts` | T6 | PARTIAL | medium | ALIGNED | — | stub; no getHistory() iterator in QL |
| 588 | `utils/suggestions/skillUsageTracking.ts` | `utils/suggestions/skillUsageTracking.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — | IMPROVED: standalone JSON file vs CC globalConfig storage; same 2 exports + 7-day decay algorithm |
| 589 | `utils/swarm/constants.ts` | `utils/swarm/constants.ts` | T6 | FULLY_ALIGNED | medium | ALIGNED | — | all exports already present; values branded (// NAME:) |
| 590 | `utils/swarm/leaderPermissionBridge.ts` | `utils/swarm/leaderPermissionBridge.ts` | T6 | PARTIAL | high | ALIGNED | — | generic types (CC-specific ToolUseConfirm/ToolPermissionContext not portable) |
| 591 | `utils/swarm/teammateModel.ts` | `utils/swarm/teammateModel.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 592 | `utils/systemDirectories.ts` | `utils/systemDirectories.ts` | T6 | DIVERGED | high | KEPT | skip | overlap=25% |
| 593 | `utils/systemPrompt.ts` | `utils/systemPrompt.ts` | T6 | DIVERGED | high | KEPT | skip | overlap=22% |
| 594 | `utils/systemPromptType.ts` | `utils/systemPromptType.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — | identical type + asSystemPrompt function |
| 595 | `utils/systemTheme.ts` | `utils/systemTheme.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 596 | `utils/taggedId.ts` | `utils/taggedId.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 597 | `utils/task/outputFormatting.ts` | `utils/task/outputFormatting.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 598 | `utils/teammateContext.ts` | `utils/teammateContext.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 599 | `utils/telemetry/logger.ts` | `utils/telemetry/logger.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — | QL extended |
| 600 | `utils/tempfile.ts` | `utils/tempfile.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — | // NAME: prefix 'qiling-prompt'; logic identical |
| 601 | `utils/terminal.ts` | `utils/terminal.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — | identical 2 exports and wrapText algorithm |
| 602 | `utils/textHighlighting.ts` | `utils/textHighlighting.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 603 | `utils/theme.ts` | `utils/theme.ts` | T6 | DIVERGED | high | KEPT | skip | overlap=34% |
| 604 | `utils/thinking.ts` | `utils/thinking.ts` | T6 | DIVERGED | high | KEPT | skip | overlap=29% |
| 605 | `utils/timeouts.ts` | `utils/timeouts.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 606 | `utils/todo/types.ts` | `utils/todo/types.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — | QL extended |
| 607 | `utils/tokenBudget.ts` | `utils/tokenBudget.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — | QL extended |
| 608 | `utils/tokens.ts` | `utils/tokens.ts` | T6 | PARTIAL | high | ALIGNED | adapt-complete | added tokenCountFromLastAPIResponse/finalContextTokensFromLastResponse/messageTokenCountFromLastAPIResponse; msg.role vs CC msg.type; CNY pricing preserved |
| 609 | `utils/toolErrors.ts` | `utils/toolErrors.ts` | T6 | PARTIAL | medium | ALIGNED | adapt-complete | added getErrorParts + fixed formatError (AbortError/ShellError); still zod not zod/v4 |
| 610 | `utils/toolPool.ts` | `utils/toolPool.ts` | T6 | PARTIAL | medium | ALIGNED | adapt-complete | added mode param; env check vs CC feature-flag; manual dedup vs lodash (functional equiv) |
| 611 | `utils/toolResultStorage.ts` | `utils/toolResultStorage.ts` | T6 | PARTIAL | high | ALIGNED | adapt-complete | getPersistenceThreshold already present; PERSIST_THRESHOLD_OVERRIDE_FLAG is GrowthBook-only, omitted correctly |
| 612 | `utils/toolSchemaCache.ts` | `utils/toolSchemaCache.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — | all CC exports present; adds getCachedToolSchema helper (IMPROVED) |
| 613 | `utils/treeify.ts` | `utils/treeify.ts` | T6 | DIVERGED | high | KEPT | skip | overlap=31% |
| 614 | `utils/truncate.ts` | `utils/truncate.ts` | T6 | DIVERGED | medium | KEPT | skip | intentional: custom displayWidth avoids ink dep; same exported API (PLATFORM: cjk-width) |
| 615 | `utils/ultraplan/keyword.ts` | `utils/ultraplan/keyword.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — | identical logic; condensed early-return equivalent |
| 616 | `utils/unaryLogging.ts` | `utils/unaryLogging.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 617 | `utils/userAgent.ts` | `utils/userAgent.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — | QL extended |
| 618 | `utils/userPromptKeywords.ts` | `utils/userPromptKeywords.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 619 | `utils/uuid.ts` | `utils/uuid.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 620 | `utils/warningHandler.ts` | `utils/warningHandler.ts` | T6 | DIVERGED | high | KEPT | skip | overlap=24% |
| 621 | `utils/which.ts` | `utils/which.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — | Bun.spawn vs execa; same exported API (IMPROVED: Bun-native) |
| 622 | `utils/windowsPaths.ts` | `utils/windowsPaths.ts` | T6 | DIVERGED | high | KEPT | skip | overlap=21% |
| 623 | `utils/withResolvers.ts` | `utils/withResolvers.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — | identical polyfill |
| 624 | `utils/words.ts` | `utils/words.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 625 | `utils/workloadContext.ts` | `utils/workloadContext.ts` | T6 | DIVERGED | high | KEPT | skip | overlap=29% |
| 626 | `utils/worktree.ts` | `utils/worktree.ts` | T6 | PARTIAL | high | ALIGNED | — | CC deps: hooks/tmux/iterm2/feature-flags/chalk not portable |
| 627 | `utils/worktreeModeEnabled.ts` | `utils/worktreeModeEnabled.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — | identical; worktree unconditionally enabled |
| 628 | `utils/xdg.ts` | `utils/xdg.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 629 | `utils/xml.ts` | `utils/xml.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — | identical escapeXml + escapeXmlAttr |
| 630 | `utils/yaml.ts` | `utils/yaml.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — | same Bun.YAML/yaml fallback; QiLing adds try/catch (IMPROVED) |
| 631 | `utils/zodToJsonSchema.ts` | `utils/zodToJsonSchema.ts` | T6 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 632 | `vim/motions.ts` | `vim/motions.ts` | T2 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 633 | `vim/operators.ts` | `vim/operators.ts` | T2 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 634 | `vim/textObjects.ts` | `vim/textObjects.ts` | T2 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 635 | `vim/transitions.ts` | `vim/transitions.ts` | T2 | FULLY_ALIGNED | high | ALIGNED | — |  |
| 636 | `vim/types.ts` | `vim/types.ts` | T2 | FULLY_ALIGNED | high | ALIGNED | — | same exports; CC has verbose comments+inline inline formatting only |
| 637 | `commands/fast/index.ts` | `commands/index.ts` | EXT | RESTRUCTURED | medium | ALIGNED | skip | → CC:commands/fast/index.ts |
| 638 | `utils/model/model.ts` | `commands/model.ts` | EXT | RESTRUCTURED | medium | ALIGNED | skip | → CC:utils/model/model.ts |
| 639 | `utils/claudeInChrome/setup.ts` | `commands/setup.ts` | EXT | RESTRUCTURED | medium | ALIGNED | skip | → CC:utils/claudeInChrome/setup.ts |
| 640 | `services/compact/autoCompact.ts` | `compact/autoCompact.ts` | T6 | RESTRUCTURED | medium | ALIGNED | skip | → CC:services/compact/autoCompact.ts |
| 641 | `ink/layout/engine.ts` | `compact/engine.ts` | T6 | RESTRUCTURED | medium | ALIGNED | — | export集合完整 |
| 642 | `services/compact/postCompactCleanup.ts` | `compact/postCompactCleanup.ts` | T6 | RESTRUCTURED | medium | ALIGNED | skip | → CC:services/compact/postCompactCleanup.ts |
| 643 | `` | `compact/reactiveCompact.ts` | T6 | NEW | high | KEPT | skip |  |
| 644 | `` | `compact/snipCompact.ts` | T6 | NEW | high | KEPT | skip |  |
| 645 | `services/compact/timeBasedMCConfig.ts` | `compact/timeBasedMCConfig.ts` | T6 | RESTRUCTURED | medium | ALIGNED | skip | → CC:services/compact/timeBasedMCConfig.ts |
| 646 | `query/tokenBudget.ts` | `compact/tokenBudget.ts` | T6 | RESTRUCTURED | medium | ALIGNED | skip | → CC:query/tokenBudget.ts |
| 647 | `` | `compact/warningHook.ts` | T6 | NEW | high | KEPT | skip |  |
| 648 | `` | `compact/warningState.ts` | T6 | NEW | high | KEPT | skip |  |
| 649 | `` | `components/AskUserQuestionDialog.tsx` | T2 | NEW | high | KEPT | skip |  |
| 650 | `` | `components/DiffView.tsx` | T2 | NEW | high | KEPT | skip |  |
| 651 | `components/TrustDialog/utils.ts` | `components/FeedbackSurvey/utils.ts` | T2 | RESTRUCTURED | medium | ALIGNED | skip | → CC:components/TrustDialog/utils.ts |
| 652 | `components/permissions/PermissionDialog.tsx` | `components/PermissionDialog.tsx` | T2 | RESTRUCTURED | medium | ALIGNED | skip | → CC:components/permissions/PermissionDialog.tsx |
| 653 | `` | `components/PlanApprovalDialog.tsx` | T2 | NEW | high | KEPT | skip |  |
| 654 | `components/PromptInput/PromptInput.tsx` | `components/PromptInput.tsx` | T2 | RESTRUCTURED | medium | ALIGNED | skip | → CC:components/PromptInput/PromptInput.tsx |
| 655 | `screens/REPL.tsx` | `components/REPL.tsx` | T2 | RESTRUCTURED | medium | ALIGNED | skip | → CC:screens/REPL.tsx |
| 656 | `components/agents/types.ts` | `components/Spinner/types.ts` | T2 | RESTRUCTURED | medium | ALIGNED | skip | → CC:components/agents/types.ts |
| 657 | `` | `components/StartupBanner.tsx` | T2 | NEW | high | KEPT | skip |  |
| 658 | `` | `components/StatusBar.tsx` | T2 | NEW | high | KEPT | skip |  |
| 659 | `` | `components/ToolCallDisplay.tsx` | T2 | NEW | high | KEPT | skip |  |
| 660 | `components/tasks/taskStatusUtils.tsx` | `components/tasks/taskStatusUtils.ts` | T2 | RESTRUCTURED | medium | ALIGNED | skip | → CC:components/tasks/taskStatusUtils.tsx |
| 661 | `components/agents/types.ts` | `components/wizard/types.ts` | T2 | RESTRUCTURED | medium | ALIGNED | skip | → CC:components/agents/types.ts |
| 662 | `services/lsp/manager.ts` | `history/manager.ts` | T6 | RESTRUCTURED | medium | ALIGNED | skip | → CC:services/lsp/manager.ts |
| 663 | `commands/hooks/index.ts` | `hooks/index.ts` | T3 | RESTRUCTURED | medium | ALIGNED | skip | → CC:commands/hooks/index.ts |
| 664 | `hooks/notifs/useDeprecationWarningNotification.tsx` | `hooks/notifs/useDeprecationWarningNotification.ts` | T3 | RESTRUCTURED | medium | ALIGNED | skip | → CC:hooks/notifs/useDeprecationWarningNotificat… |
| 665 | `commands/keybindings/index.ts` | `keybindings/index.ts` | T4 | RESTRUCTURED | medium | ALIGNED | skip | → CC:commands/keybindings/index.ts |
| 666 | `` | `keybindings/loader.ts` | T4 | NEW | high | KEPT | skip |  |
| 667 | `components/agents/types.ts` | `keybindings/types.ts` | T4 | RESTRUCTURED | medium | ALIGNED | skip | → CC:components/agents/types.ts |
| 668 | `services/lsp/manager.ts` | `mcp/manager.ts` | T6 | RESTRUCTURED | medium | ALIGNED | skip | → CC:services/lsp/manager.ts |
| 669 | `` | `modes/planMode.ts` | T0 | NEW | high | KEPT | skip |  |
| 670 | `utils/permissions/PermissionUpdate.ts` | `permissions/PermissionUpdate.ts` | T6 | RESTRUCTURED | medium | ALIGNED | skip | → CC:utils/permissions/PermissionUpdate.ts |
| 671 | `utils/permissions/autoModeState.ts` | `permissions/autoModeState.ts` | T6 | RESTRUCTURED | medium | ALIGNED | skip | → CC:utils/permissions/autoModeState.ts |
| 672 | `` | `permissions/classifier.ts` | T6 | NEW | high | KEPT | skip |  |
| 673 | `utils/permissions/dangerousPatterns.ts` | `permissions/dangerousPatterns.ts` | T6 | RESTRUCTURED | medium | ALIGNED | skip | → CC:utils/permissions/dangerousPatterns.ts |
| 674 | `utils/permissions/denialTracking.ts` | `permissions/denialTracking.ts` | T6 | RESTRUCTURED | medium | ALIGNED | skip | → CC:utils/permissions/denialTracking.ts |
| 675 | `commands/permissions/index.ts` | `permissions/index.ts` | T6 | RESTRUCTURED | medium | ALIGNED | skip | → CC:commands/permissions/index.ts |
| 676 | `services/lsp/manager.ts` | `permissions/manager.ts` | T6 | RESTRUCTURED | medium | ALIGNED | skip | → CC:services/lsp/manager.ts |
| 677 | `utils/permissions/pathValidation.ts` | `permissions/pathValidation.ts` | T6 | RESTRUCTURED | medium | ALIGNED | skip | → CC:utils/permissions/pathValidation.ts |
| 678 | `utils/permissions/permissionExplainer.ts` | `permissions/permissionExplainer.ts` | T6 | RESTRUCTURED | medium | ALIGNED | skip | → CC:utils/permissions/permissionExplainer.ts |
| 679 | `utils/permissions/permissionRuleParser.ts` | `permissions/permissionRuleParser.ts` | T6 | RESTRUCTURED | medium | ALIGNED | skip | → CC:utils/permissions/permissionRuleParser.ts |
| 680 | `` | `permissions/rules.ts` | T6 | NEW | high | KEPT | skip |  |
| 681 | `utils/permissions/shadowedRuleDetection.ts` | `permissions/shadowedRuleDetection.ts` | T6 | RESTRUCTURED | medium | ALIGNED | skip | → CC:utils/permissions/shadowedRuleDetection.ts |
| 682 | `utils/permissions/shellRuleMatching.ts` | `permissions/shellRuleMatching.ts` | T6 | RESTRUCTURED | medium | ALIGNED | skip | → CC:utils/permissions/shellRuleMatching.ts |
| 683 | `utils/permissions/yoloClassifier.ts` | `permissions/yoloClassifier.ts` | T6 | RESTRUCTURED | medium | ALIGNED | skip | → CC:utils/permissions/yoloClassifier.ts |
| 684 | `` | `plugins/loader.ts` | T6 | NEW | high | KEPT | skip |  |
| 685 | `components/agents/types.ts` | `plugins/types.ts` | T6 | RESTRUCTURED | medium | ALIGNED | skip | → CC:components/agents/types.ts |
| 686 | `` | `providers/anthropic.ts` | EXT | NEW | high | KEPT | skip |  |
| 687 | `utils/model/bedrock.ts` | `providers/bedrock.ts` | EXT | RESTRUCTURED | medium | ALIGNED | skip | → CC:utils/model/bedrock.ts |
| 688 | `` | `providers/doubao.ts` | EXT | NEW | high | KEPT | skip |  |
| 689 | `` | `providers/glm.ts` | EXT | NEW | high | KEPT | skip |  |
| 690 | `commands/fast/index.ts` | `providers/index.ts` | EXT | RESTRUCTURED | medium | ALIGNED | skip | → CC:commands/fast/index.ts |
| 691 | `` | `providers/ollama.ts` | EXT | NEW | high | KEPT | skip |  |
| 692 | `` | `providers/openai-compat.ts` | EXT | NEW | high | KEPT | skip |  |
| 693 | `` | `providers/qwen.ts` | EXT | NEW | high | KEPT | skip |  |
| 694 | `` | `providers/vertex.ts` | EXT | NEW | high | KEPT | skip |  |
| 695 | `services/tools/StreamingToolExecutor.ts` | `query/StreamingToolExecutor.ts` | T0 | RESTRUCTURED | medium | ALIGNED | skip | → CC:services/tools/StreamingToolExecutor.ts |
| 696 | `services/api/withRetry.ts` | `retry/withRetry.ts` | T6 | RESTRUCTURED | medium | ALIGNED | skip | → CC:services/api/withRetry.ts |
| 697 | `` | `services/background/sessions.ts` | T5 | NEW | high | KEPT | skip |  |
| 698 | `state/store.ts` | `services/brief/store.ts` | T5 | RESTRUCTURED | medium | ALIGNED | skip | → CC:state/store.ts |
| 699 | `services/oauth/index.ts` | `services/contextCollapse/index.ts` | T5 | RESTRUCTURED | medium | ALIGNED | skip | → CC:services/oauth/index.ts |
| 700 | `` | `services/cron/scheduler.ts` | T5 | NEW | high | KEPT | skip |  |
| 701 | `services/oauth/index.ts` | `services/extractMemories/index.ts` | T5 | RESTRUCTURED | medium | ALIGNED | skip | → CC:services/oauth/index.ts |
| 702 | `services/oauth/index.ts` | `services/featureFlags/index.ts` | T5 | RESTRUCTURED | medium | ALIGNED | skip | → CC:services/oauth/index.ts |
| 703 | `services/policyLimits/types.ts` | `services/lsp/types.ts` | T5 | RESTRUCTURED | medium | ALIGNED | skip | → CC:services/policyLimits/types.ts |
| 704 | `services/lsp/manager.ts` | `services/mcp/manager.ts` | T5 | RESTRUCTURED | medium | ALIGNED | skip | → CC:services/lsp/manager.ts |
| 705 | `services/oauth/index.ts` | `services/memdir/index.ts` | T5 | RESTRUCTURED | medium | ALIGNED | skip | → CC:services/oauth/index.ts |
| 706 | `memdir/memoryAge.ts` | `services/memdir/memoryAge.ts` | T5 | RESTRUCTURED | medium | ALIGNED | skip | → CC:memdir/memoryAge.ts |
| 707 | `memdir/memoryScan.ts` | `services/memdir/memoryScan.ts` | T5 | RESTRUCTURED | medium | ALIGNED | skip | → CC:memdir/memoryScan.ts |
| 708 | `memdir/memoryTypes.ts` | `services/memdir/memoryTypes.ts` | T5 | RESTRUCTURED | medium | ALIGNED | skip | → CC:memdir/memoryTypes.ts |
| 709 | `memdir/paths.ts` | `services/memdir/paths.ts` | T5 | RESTRUCTURED | medium | ALIGNED | skip | → CC:memdir/paths.ts |
| 710 | `` | `services/memory/extractor.ts` | T5 | NEW | high | KEPT | skip |  |
| 711 | `state/store.ts` | `services/memory/store.ts` | T5 | RESTRUCTURED | medium | ALIGNED | skip | → CC:state/store.ts |
| 712 | `` | `services/messaging/bus.ts` | T5 | NEW | high | KEPT | skip |  |
| 713 | `` | `services/oauth/authCodeListener.ts` | T5 | NEW | high | KEPT | skip |  |
| 714 | `` | `services/outputStyles/loader.ts` | T5 | NEW | high | KEPT | skip |  |
| 715 | `utils/stats.ts` | `services/stats.ts` | T5 | RESTRUCTURED | medium | ALIGNED | skip | → CC:utils/stats.ts |
| 716 | `state/store.ts` | `services/tasks/store.ts` | T5 | RESTRUCTURED | medium | ALIGNED | skip | → CC:state/store.ts |
| 717 | `state/store.ts` | `services/teams/store.ts` | T5 | RESTRUCTURED | medium | ALIGNED | skip | → CC:state/store.ts |
| 718 | `` | `services/tips.ts` | T5 | NEW | high | KEPT | skip |  |
| 719 | `` | `services/toolUseSummary/generator.ts` | T5 | NEW | high | KEPT | skip |  |
| 720 | `state/store.ts` | `services/triggers/store.ts` | T5 | RESTRUCTURED | medium | ALIGNED | skip | → CC:state/store.ts |
| 721 | `state/store.ts` | `services/worktree/store.ts` | T5 | RESTRUCTURED | medium | ALIGNED | skip | → CC:state/store.ts |
| 722 | `commands/resume/resume.tsx` | `session/resume.ts` | T6 | RESTRUCTURED | medium | ALIGNED | skip | → CC:commands/resume/resume.tsx |
| 723 | `commands/fast/index.ts` | `settings/index.ts` | T0 | RESTRUCTURED | medium | ALIGNED | skip | → CC:commands/fast/index.ts |
| 724 | `` | `settings/loader.ts` | T0 | NEW | high | KEPT | skip |  |
| 725 | `keybindings/schema.ts` | `settings/schema.ts` | T0 | RESTRUCTURED | medium | ALIGNED | skip | → CC:keybindings/schema.ts |
| 726 | `` | `skills/loader.ts` | T6 | NEW | high | KEPT | skip |  |
| 727 | `` | `stubs/react-devtools-core.ts` | EXT | NEW | high | KEPT | skip |  |
| 728 | `tools/AgentTool/AgentTool.tsx` | `tools/AgentTool.ts` | T1 | RESTRUCTURED | medium | ALIGNED | skip | → CC:tools/AgentTool/AgentTool.tsx |
| 729 | `` | `tools/AgentTool/built-in/qilingGuideAgent.ts` | T1 | NEW | high | KEPT | skip |  |
| 730 | `tools/AskUserQuestionTool/AskUserQuestionTool.tsx` | `tools/AskUserQuestionTool.ts` | T1 | RESTRUCTURED | medium | ALIGNED | skip | → CC:tools/AskUserQuestionTool/AskUserQuestionTo… |
| 731 | `tools/BashTool/BashTool.tsx` | `tools/BashTool.ts` | T1 | RESTRUCTURED | medium | ALIGNED | skip | → CC:tools/BashTool/BashTool.tsx |
| 732 | `tools/BriefTool/BriefTool.ts` | `tools/BriefTool.ts` | T1 | RESTRUCTURED | medium | ALIGNED | skip | → CC:tools/BriefTool/BriefTool.ts |
| 733 | `tools/ConfigTool/ConfigTool.ts` | `tools/ConfigTool.ts` | T1 | RESTRUCTURED | medium | ALIGNED | skip | → CC:tools/ConfigTool/ConfigTool.ts |
| 734 | `tools/ScheduleCronTool/CronCreateTool.ts` | `tools/CronCreateTool.ts` | T1 | RESTRUCTURED | medium | ALIGNED | skip | → CC:tools/ScheduleCronTool/CronCreateTool.ts |
| 735 | `tools/ScheduleCronTool/CronDeleteTool.ts` | `tools/CronDeleteTool.ts` | T1 | RESTRUCTURED | medium | ALIGNED | skip | → CC:tools/ScheduleCronTool/CronDeleteTool.ts |
| 736 | `tools/ScheduleCronTool/CronListTool.ts` | `tools/CronListTool.ts` | T1 | RESTRUCTURED | medium | ALIGNED | skip | → CC:tools/ScheduleCronTool/CronListTool.ts |
| 737 | `tools/EnterPlanModeTool/EnterPlanModeTool.ts` | `tools/EnterPlanModeTool.ts` | T1 | RESTRUCTURED | medium | ALIGNED | skip | → CC:tools/EnterPlanModeTool/EnterPlanModeTool.ts |
| 738 | `tools/EnterWorktreeTool/EnterWorktreeTool.ts` | `tools/EnterWorktreeTool.ts` | T1 | RESTRUCTURED | medium | ALIGNED | skip | → CC:tools/EnterWorktreeTool/EnterWorktreeTool.ts |
| 739 | `` | `tools/ExitPlanModeTool.ts` | T1 | NEW | high | KEPT | skip |  |
| 740 | `tools/ExitWorktreeTool/ExitWorktreeTool.ts` | `tools/ExitWorktreeTool.ts` | T1 | RESTRUCTURED | medium | ALIGNED | skip | → CC:tools/ExitWorktreeTool/ExitWorktreeTool.ts |
| 741 | `tools/FileEditTool/FileEditTool.ts` | `tools/FileEditTool.ts` | T1 | RESTRUCTURED | medium | ALIGNED | skip | → CC:tools/FileEditTool/FileEditTool.ts |
| 742 | `tools/FileReadTool/FileReadTool.ts` | `tools/FileReadTool.ts` | T1 | RESTRUCTURED | medium | ALIGNED | skip | → CC:tools/FileReadTool/FileReadTool.ts |
| 743 | `tools/FileWriteTool/FileWriteTool.ts` | `tools/FileWriteTool.ts` | T1 | RESTRUCTURED | medium | ALIGNED | skip | → CC:tools/FileWriteTool/FileWriteTool.ts |
| 744 | `tools/GlobTool/GlobTool.ts` | `tools/GlobTool.ts` | T1 | RESTRUCTURED | medium | ALIGNED | skip | → CC:tools/GlobTool/GlobTool.ts |
| 745 | `tools/GrepTool/GrepTool.ts` | `tools/GrepTool.ts` | T1 | RESTRUCTURED | medium | ALIGNED | skip | → CC:tools/GrepTool/GrepTool.ts |
| 746 | `tools/ListMcpResourcesTool/ListMcpResourcesTool.ts` | `tools/ListMcpResourcesTool.ts` | T1 | RESTRUCTURED | medium | ALIGNED | skip | → CC:tools/ListMcpResourcesTool/ListMcpResources… |
| 747 | `` | `tools/LspTool.ts` | T1 | NEW | high | KEPT | skip |  |
| 748 | `tools/LSPTool/formatters.ts` | `tools/LspTool/formatters.ts` | T1 | RESTRUCTURED | medium | ALIGNED | skip | → CC:tools/LSPTool/formatters.ts |
| 749 | `tools/ExitPlanModeTool/prompt.ts` | `tools/LspTool/prompt.ts` | T1 | RESTRUCTURED | medium | ALIGNED | skip | → CC:tools/ExitPlanModeTool/prompt.ts |
| 750 | `tools/LSPTool/schemas.ts` | `tools/LspTool/schemas.ts` | T1 | RESTRUCTURED | medium | ALIGNED | skip | → CC:tools/LSPTool/schemas.ts |
| 751 | `tools/LSPTool/symbolContext.ts` | `tools/LspTool/symbolContext.ts` | T1 | RESTRUCTURED | medium | ALIGNED | skip | → CC:tools/LSPTool/symbolContext.ts |
| 752 | `tools/McpAuthTool/McpAuthTool.ts` | `tools/McpAuthTool.ts` | T1 | RESTRUCTURED | medium | ALIGNED | skip | → CC:tools/McpAuthTool/McpAuthTool.ts |
| 753 | `` | `tools/McpTool.ts` | T1 | NEW | high | KEPT | skip |  |
| 754 | `tools/MCPTool/classifyForCollapse.ts` | `tools/McpTool/classifyForCollapse.ts` | T1 | RESTRUCTURED | medium | ALIGNED | skip | → CC:tools/MCPTool/classifyForCollapse.ts |
| 755 | `tools/ExitPlanModeTool/prompt.ts` | `tools/McpTool/prompt.ts` | T1 | RESTRUCTURED | medium | ALIGNED | skip | → CC:tools/ExitPlanModeTool/prompt.ts |
| 756 | `tools/NotebookEditTool/NotebookEditTool.ts` | `tools/NotebookEditTool.ts` | T1 | RESTRUCTURED | medium | ALIGNED | skip | → CC:tools/NotebookEditTool/NotebookEditTool.ts |
| 757 | `` | `tools/NotebookReadTool.ts` | T1 | NEW | high | KEPT | skip |  |
| 758 | `tools/PowerShellTool/PowerShellTool.tsx` | `tools/PowerShellTool.ts` | T1 | RESTRUCTURED | medium | ALIGNED | skip | → CC:tools/PowerShellTool/PowerShellTool.tsx |
| 759 | `tools/ReadMcpResourceTool/ReadMcpResourceTool.ts` | `tools/ReadMcpResourceTool.ts` | T1 | RESTRUCTURED | medium | ALIGNED | skip | → CC:tools/ReadMcpResourceTool/ReadMcpResourceTo… |
| 760 | `tools/RemoteTriggerTool/RemoteTriggerTool.ts` | `tools/RemoteTriggerTool.ts` | T1 | RESTRUCTURED | medium | ALIGNED | skip | → CC:tools/RemoteTriggerTool/RemoteTriggerTool.ts |
| 761 | `` | `tools/RepoMapTool.ts` | T1 | NEW | high | KEPT | skip |  |
| 762 | `tools/SendMessageTool/SendMessageTool.ts` | `tools/SendMessageTool.ts` | T1 | RESTRUCTURED | medium | ALIGNED | skip | → CC:tools/SendMessageTool/SendMessageTool.ts |
| 763 | `tools/SkillTool/SkillTool.ts` | `tools/SkillTool.ts` | T1 | RESTRUCTURED | medium | ALIGNED | skip | → CC:tools/SkillTool/SkillTool.ts |
| 764 | `` | `tools/SleepTool.ts` | T1 | NEW | high | KEPT | skip |  |
| 765 | `tools/SyntheticOutputTool/SyntheticOutputTool.ts` | `tools/SyntheticOutputTool.ts` | T1 | RESTRUCTURED | medium | ALIGNED | skip | → CC:tools/SyntheticOutputTool/SyntheticOutputTo… |
| 766 | `tools/TaskCreateTool/TaskCreateTool.ts` | `tools/TaskCreateTool.ts` | T1 | RESTRUCTURED | medium | ALIGNED | skip | → CC:tools/TaskCreateTool/TaskCreateTool.ts |
| 767 | `tools/TaskGetTool/TaskGetTool.ts` | `tools/TaskGetTool.ts` | T1 | RESTRUCTURED | medium | ALIGNED | skip | → CC:tools/TaskGetTool/TaskGetTool.ts |
| 768 | `tools/TaskListTool/TaskListTool.ts` | `tools/TaskListTool.ts` | T1 | RESTRUCTURED | medium | ALIGNED | skip | → CC:tools/TaskListTool/TaskListTool.ts |
| 769 | `tools/TaskOutputTool/TaskOutputTool.tsx` | `tools/TaskOutputTool.ts` | T1 | RESTRUCTURED | medium | ALIGNED | skip | → CC:tools/TaskOutputTool/TaskOutputTool.tsx |
| 770 | `tools/TaskStopTool/TaskStopTool.ts` | `tools/TaskStopTool.ts` | T1 | RESTRUCTURED | medium | ALIGNED | skip | → CC:tools/TaskStopTool/TaskStopTool.ts |
| 771 | `tools/TaskUpdateTool/TaskUpdateTool.ts` | `tools/TaskUpdateTool.ts` | T1 | RESTRUCTURED | medium | ALIGNED | skip | → CC:tools/TaskUpdateTool/TaskUpdateTool.ts |
| 772 | `tools/TeamCreateTool/TeamCreateTool.ts` | `tools/TeamCreateTool.ts` | T1 | RESTRUCTURED | medium | ALIGNED | skip | → CC:tools/TeamCreateTool/TeamCreateTool.ts |
| 773 | `tools/TeamDeleteTool/TeamDeleteTool.ts` | `tools/TeamDeleteTool.ts` | T1 | RESTRUCTURED | medium | ALIGNED | skip | → CC:tools/TeamDeleteTool/TeamDeleteTool.ts |
| 774 | `tools/TodoWriteTool/TodoWriteTool.ts` | `tools/TodoWriteTool.ts` | T1 | RESTRUCTURED | medium | ALIGNED | skip | → CC:tools/TodoWriteTool/TodoWriteTool.ts |
| 775 | `tools/ToolSearchTool/ToolSearchTool.ts` | `tools/ToolSearchTool.ts` | T1 | RESTRUCTURED | medium | ALIGNED | skip | → CC:tools/ToolSearchTool/ToolSearchTool.ts |
| 776 | `tools/WebFetchTool/WebFetchTool.ts` | `tools/WebFetchTool.ts` | T1 | RESTRUCTURED | medium | ALIGNED | skip | → CC:tools/WebFetchTool/WebFetchTool.ts |
| 777 | `tools/WebSearchTool/WebSearchTool.ts` | `tools/WebSearchTool.ts` | T1 | RESTRUCTURED | medium | ALIGNED | skip | → CC:tools/WebSearchTool/WebSearchTool.ts |
| 778 | `commands/fast/index.ts` | `tools/index.ts` | T1 | RESTRUCTURED | medium | ALIGNED | skip | → CC:commands/fast/index.ts |
| 779 | `` | `tools/toolUtils.ts` | T1 | NEW | high | KEPT | skip |  |
| 780 | `commands/fast/index.ts` | `types/index.ts` | T7 | RESTRUCTURED | medium | ALIGNED | skip | → CC:commands/fast/index.ts |
| 781 | `` | `types/message.ts` | T7 | NEW | high | KEPT | skip |  |
| 782 | `utils/notebook.ts` | `types/notebook.ts` | T7 | RESTRUCTURED | medium | ALIGNED | skip | → CC:utils/notebook.ts |
| 783 | `` | `types/provider.ts` | T7 | NEW | high | KEPT | skip |  |
| 784 | `` | `types/tool.ts` | T7 | NEW | high | KEPT | skip |  |
| 785 | `utils/bash/specs/index.ts` | `utils/computerUse/index.ts` | T6 | RESTRUCTURED | medium | ALIGNED | skip | → CC:utils/bash/specs/index.ts |
| 786 | `` | `utils/errorMessages.ts` | T6 | NEW | high | KEPT | skip |  |
| 787 | `` | `utils/mentions.ts` | T6 | NEW | high | KEPT | skip |  |
| 788 | `` | `utils/migrations.ts` | T6 | NEW | high | KEPT | skip |  |
| 789 | `` | `utils/modelAliases.ts` | T6 | NEW | high | KEPT | skip |  |
| 790 | `cli/ndjsonSafeStringify.ts` | `utils/ndjsonSafeStringify.ts` | T6 | RESTRUCTURED | medium | ALIGNED | skip | → CC:cli/ndjsonSafeStringify.ts |
| 791 | `` | `utils/processUtils.ts` | T6 | NEW | high | KEPT | skip |  |
| 792 | `` | `utils/renderMarkdown.ts` | T6 | NEW | high | KEPT | skip |  |
| 793 | `utils/bash/specs/index.ts` | `utils/sandbox/index.ts` | T6 | RESTRUCTURED | medium | ALIGNED | skip | → CC:utils/bash/specs/index.ts |
| 794 | `utils/memory/types.ts` | `utils/secureStorage/types.ts` | T6 | RESTRUCTURED | medium | ALIGNED | skip | → CC:utils/memory/types.ts |
| 795 | `` | `utils/themeContext.tsx` | T6 | NEW | high | KEPT | skip |  |
| 796 | `` | `utils/updater.ts` | T6 | NEW | high | KEPT | skip |  |
| 797 | `ink/layout/engine.ts` | `vim/engine.ts` | T2 | RESTRUCTURED | medium | ALIGNED | — | export集合完整 |
| 798 | `QueryEngine.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 799 | `Task.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 800 | `Tool.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 801 | `assistant/sessionHistory.ts` | `` | EXT | MISSING | high | UNTOUCHED | copy |  |
| 802 | `bootstrap/state.ts` | `` | T0 | MISSING | high | ALIGNED | adapt-new | lightweight adapter; 200+ fns; OTEL=stub |
| 803 | `bridge/bridgeApi.ts` | `` | EXT | MISSING | high | UNTOUCHED | copy |  |
| 804 | `bridge/bridgeConfig.ts` | `` | EXT | MISSING | high | UNTOUCHED | copy |  |
| 805 | `bridge/bridgeDebug.ts` | `` | EXT | MISSING | high | UNTOUCHED | copy |  |
| 806 | `bridge/bridgeEnabled.ts` | `` | EXT | MISSING | high | UNTOUCHED | copy |  |
| 807 | `bridge/bridgeMain.ts` | `` | EXT | MISSING | high | UNTOUCHED | copy |  |
| 808 | `bridge/bridgeMessaging.ts` | `` | EXT | MISSING | high | UNTOUCHED | copy |  |
| 809 | `bridge/bridgePointer.ts` | `` | EXT | MISSING | high | UNTOUCHED | copy |  |
| 810 | `bridge/bridgeUI.ts` | `` | EXT | MISSING | high | UNTOUCHED | copy |  |
| 811 | `bridge/codeSessionApi.ts` | `` | EXT | MISSING | high | UNTOUCHED | copy |  |
| 812 | `bridge/createSession.ts` | `` | EXT | MISSING | high | UNTOUCHED | copy |  |
| 813 | `bridge/debugUtils.ts` | `` | EXT | MISSING | high | UNTOUCHED | copy |  |
| 814 | `bridge/envLessBridgeConfig.ts` | `` | EXT | MISSING | high | UNTOUCHED | copy |  |
| 815 | `bridge/inboundAttachments.ts` | `` | EXT | MISSING | high | UNTOUCHED | copy |  |
| 816 | `bridge/inboundMessages.ts` | `` | EXT | MISSING | high | UNTOUCHED | copy |  |
| 817 | `bridge/initReplBridge.ts` | `` | EXT | MISSING | high | UNTOUCHED | copy |  |
| 818 | `bridge/jwtUtils.ts` | `` | EXT | MISSING | high | UNTOUCHED | copy |  |
| 819 | `bridge/pollConfig.ts` | `` | EXT | MISSING | high | UNTOUCHED | copy |  |
| 820 | `bridge/pollConfigDefaults.ts` | `` | EXT | MISSING | high | UNTOUCHED | copy |  |
| 821 | `bridge/remoteBridgeCore.ts` | `` | EXT | MISSING | high | UNTOUCHED | copy |  |
| 822 | `bridge/replBridge.ts` | `` | EXT | MISSING | high | UNTOUCHED | copy |  |
| 823 | `bridge/replBridgeHandle.ts` | `` | EXT | MISSING | high | UNTOUCHED | copy |  |
| 824 | `bridge/replBridgeTransport.ts` | `` | EXT | MISSING | high | UNTOUCHED | copy |  |
| 825 | `bridge/sessionIdCompat.ts` | `` | EXT | MISSING | high | UNTOUCHED | copy |  |
| 826 | `bridge/sessionRunner.ts` | `` | EXT | MISSING | high | UNTOUCHED | copy |  |
| 827 | `bridge/trustedDevice.ts` | `` | EXT | MISSING | high | UNTOUCHED | copy |  |
| 828 | `bridge/types.ts` | `` | EXT | MISSING | high | UNTOUCHED | copy |  |
| 829 | `bridge/workSecret.ts` | `` | EXT | MISSING | high | UNTOUCHED | copy |  |
| 830 | `buddy/useBuddyNotification.tsx` | `` | T2 | MISSING | high | UNTOUCHED | copy |  |
| 831 | `cli/handlers/agents.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 832 | `cli/handlers/auth.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 833 | `cli/handlers/autoMode.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 834 | `cli/handlers/mcp.tsx` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 835 | `cli/handlers/plugins.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 836 | `cli/handlers/util.tsx` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 837 | `cli/print.ts` | `` | EXT | MISSING | high | UNTOUCHED | copy |  |
| 838 | `cli/remoteIO.ts` | `` | EXT | MISSING | high | UNTOUCHED | copy |  |
| 839 | `cli/structuredIO.ts` | `` | EXT | MISSING | high | UNTOUCHED | copy |  |
| 840 | `cli/transports/HybridTransport.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 841 | `cli/transports/SSETransport.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 842 | `cli/transports/SerialBatchEventUploader.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 843 | `cli/transports/WebSocketTransport.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 844 | `cli/transports/ccrClient.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 845 | `cli/transports/transportUtils.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 846 | `cli/update.ts` | `` | EXT | MISSING | high | UNTOUCHED | copy |  |
| 847 | `commands.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 848 | `commands/add-dir/add-dir.tsx` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 849 | `commands/add-dir/index.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 850 | `commands/add-dir/validation.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 851 | `commands/advisor.ts` | `` | EXT | MISSING | high | UNTOUCHED | copy |  |
| 852 | `commands/agents/agents.tsx` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 853 | `commands/agents/index.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 854 | `commands/branch/branch.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 855 | `commands/branch/index.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 856 | `commands/bridge-kick.ts` | `` | EXT | MISSING | high | UNTOUCHED | copy |  |
| 857 | `commands/bridge/bridge.tsx` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 858 | `commands/bridge/index.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 859 | `commands/brief.ts` | `` | EXT | MISSING | high | UNTOUCHED | copy |  |
| 860 | `commands/btw/btw.tsx` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 861 | `commands/btw/index.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 862 | `commands/chrome/chrome.tsx` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 863 | `commands/chrome/index.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 864 | `commands/clear/caches.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 865 | `commands/clear/clear.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 866 | `commands/clear/conversation.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 867 | `commands/clear/index.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 868 | `commands/color/color.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 869 | `commands/color/index.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 870 | `commands/commit-push-pr.ts` | `` | EXT | MISSING | high | UNTOUCHED | copy |  |
| 871 | `commands/commit.ts` | `` | EXT | MISSING | high | UNTOUCHED | copy |  |
| 872 | `commands/compact/compact.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 873 | `commands/compact/index.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 874 | `commands/config/config.tsx` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 875 | `commands/config/index.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 876 | `commands/context/context-noninteractive.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 877 | `commands/context/context.tsx` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 878 | `commands/context/index.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 879 | `commands/copy/copy.tsx` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 880 | `commands/copy/index.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 881 | `commands/cost/cost.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 882 | `commands/cost/index.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 883 | `commands/createMovedToPluginCommand.ts` | `` | EXT | MISSING | high | UNTOUCHED | copy |  |
| 884 | `commands/desktop/desktop.tsx` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 885 | `commands/desktop/index.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 886 | `commands/diff/diff.tsx` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 887 | `commands/diff/index.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 888 | `commands/doctor/doctor.tsx` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 889 | `commands/doctor/index.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 890 | `commands/effort/effort.tsx` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 891 | `commands/effort/index.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 892 | `commands/exit/exit.tsx` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 893 | `commands/exit/index.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 894 | `commands/export/export.tsx` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 895 | `commands/export/index.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 896 | `commands/extra-usage/extra-usage-core.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 897 | `commands/extra-usage/extra-usage-noninteractive.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 898 | `commands/extra-usage/extra-usage.tsx` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 899 | `commands/extra-usage/index.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 900 | `commands/fast/fast.tsx` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 901 | `commands/fast/index.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 902 | `commands/feedback/feedback.tsx` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 903 | `commands/feedback/index.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 904 | `commands/files/files.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 905 | `commands/files/index.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 906 | `commands/heapdump/heapdump.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 907 | `commands/heapdump/index.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 908 | `commands/help/help.tsx` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 909 | `commands/help/index.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 910 | `commands/hooks/hooks.tsx` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 911 | `commands/hooks/index.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 912 | `commands/ide/ide.tsx` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 913 | `commands/ide/index.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 914 | `commands/init-verifiers.ts` | `` | EXT | MISSING | high | UNTOUCHED | copy |  |
| 915 | `commands/init.ts` | `` | EXT | MISSING | high | UNTOUCHED | copy |  |
| 916 | `commands/insights.ts` | `` | EXT | MISSING | high | UNTOUCHED | copy |  |
| 917 | `commands/install-github-app/ApiKeyStep.tsx` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 918 | `commands/install-github-app/CheckExistingSecretStep.tsx` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 919 | `commands/install-github-app/CheckGitHubStep.tsx` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 920 | `commands/install-github-app/ChooseRepoStep.tsx` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 921 | `commands/install-github-app/CreatingStep.tsx` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 922 | `commands/install-github-app/ErrorStep.tsx` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 923 | `commands/install-github-app/ExistingWorkflowStep.tsx` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 924 | `commands/install-github-app/InstallAppStep.tsx` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 925 | `commands/install-github-app/OAuthFlowStep.tsx` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 926 | `commands/install-github-app/SuccessStep.tsx` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 927 | `commands/install-github-app/WarningsStep.tsx` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 928 | `commands/install-github-app/index.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 929 | `commands/install-github-app/install-github-app.tsx` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 930 | `commands/install-github-app/setupGitHubActions.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 931 | `commands/install-slack-app/index.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 932 | `commands/install-slack-app/install-slack-app.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 933 | `commands/install.tsx` | `` | EXT | MISSING | high | UNTOUCHED | copy |  |
| 934 | `commands/keybindings/index.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 935 | `commands/keybindings/keybindings.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 936 | `commands/login/index.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 937 | `commands/login/login.tsx` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 938 | `commands/logout/index.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 939 | `commands/logout/logout.tsx` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 940 | `commands/mcp/addCommand.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 941 | `commands/mcp/index.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 942 | `commands/mcp/mcp.tsx` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 943 | `commands/mcp/xaaIdpCommand.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 944 | `commands/memory/index.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 945 | `commands/memory/memory.tsx` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 946 | `commands/mobile/index.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 947 | `commands/mobile/mobile.tsx` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 948 | `commands/model/index.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 949 | `commands/model/model.tsx` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 950 | `commands/output-style/index.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 951 | `commands/output-style/output-style.tsx` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 952 | `commands/passes/index.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 953 | `commands/passes/passes.tsx` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 954 | `commands/permissions/index.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 955 | `commands/permissions/permissions.tsx` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 956 | `commands/plan/index.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 957 | `commands/plan/plan.tsx` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 958 | `commands/plugin/AddMarketplace.tsx` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 959 | `commands/plugin/BrowseMarketplace.tsx` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 960 | `commands/plugin/DiscoverPlugins.tsx` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 961 | `commands/plugin/ManageMarketplaces.tsx` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 962 | `commands/plugin/ManagePlugins.tsx` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 963 | `commands/plugin/PluginErrors.tsx` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 964 | `commands/plugin/PluginOptionsDialog.tsx` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 965 | `commands/plugin/PluginOptionsFlow.tsx` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 966 | `commands/plugin/PluginSettings.tsx` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 967 | `commands/plugin/PluginTrustWarning.tsx` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 968 | `commands/plugin/UnifiedInstalledCell.tsx` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 969 | `commands/plugin/ValidatePlugin.tsx` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 970 | `commands/plugin/index.tsx` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 971 | `commands/plugin/parseArgs.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 972 | `commands/plugin/plugin.tsx` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 973 | `commands/plugin/pluginDetailsHelpers.tsx` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 974 | `commands/plugin/usePagination.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 975 | `commands/pr_comments/index.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 976 | `commands/privacy-settings/index.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 977 | `commands/privacy-settings/privacy-settings.tsx` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 978 | `commands/rate-limit-options/index.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 979 | `commands/rate-limit-options/rate-limit-options.tsx` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 980 | `commands/release-notes/index.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 981 | `commands/release-notes/release-notes.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 982 | `commands/reload-plugins/index.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 983 | `commands/reload-plugins/reload-plugins.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 984 | `commands/remote-env/index.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 985 | `commands/remote-env/remote-env.tsx` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 986 | `commands/remote-setup/api.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 987 | `commands/remote-setup/index.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 988 | `commands/remote-setup/remote-setup.tsx` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 989 | `commands/rename/index.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 990 | `commands/rename/rename.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 991 | `commands/resume/index.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 992 | `commands/resume/resume.tsx` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 993 | `commands/review.ts` | `` | EXT | MISSING | high | UNTOUCHED | copy |  |
| 994 | `commands/review/UltrareviewOverageDialog.tsx` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 995 | `commands/review/reviewRemote.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 996 | `commands/review/ultrareviewCommand.tsx` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 997 | `commands/review/ultrareviewEnabled.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 998 | `commands/rewind/index.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 999 | `commands/rewind/rewind.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 1000 | `commands/sandbox-toggle/index.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 1001 | `commands/sandbox-toggle/sandbox-toggle.tsx` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 1002 | `commands/security-review.ts` | `` | EXT | MISSING | high | UNTOUCHED | copy |  |
| 1003 | `commands/session/index.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 1004 | `commands/session/session.tsx` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 1005 | `commands/skills/index.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 1006 | `commands/skills/skills.tsx` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 1007 | `commands/stats/index.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 1008 | `commands/stats/stats.tsx` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 1009 | `commands/status/index.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 1010 | `commands/status/status.tsx` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 1011 | `commands/statusline.tsx` | `` | EXT | MISSING | high | UNTOUCHED | copy |  |
| 1012 | `commands/stickers/index.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 1013 | `commands/stickers/stickers.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 1014 | `commands/tag/index.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 1015 | `commands/tag/tag.tsx` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 1016 | `commands/tasks/index.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 1017 | `commands/tasks/tasks.tsx` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 1018 | `commands/terminalSetup/index.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 1019 | `commands/terminalSetup/terminalSetup.tsx` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 1020 | `commands/theme/index.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 1021 | `commands/theme/theme.tsx` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 1022 | `commands/thinkback-play/index.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 1023 | `commands/thinkback-play/thinkback-play.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 1024 | `commands/thinkback/index.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 1025 | `commands/thinkback/thinkback.tsx` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 1026 | `commands/ultraplan.tsx` | `` | EXT | MISSING | high | UNTOUCHED | copy |  |
| 1027 | `commands/upgrade/index.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 1028 | `commands/upgrade/upgrade.tsx` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 1029 | `commands/usage/index.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 1030 | `commands/usage/usage.tsx` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 1031 | `commands/version.ts` | `` | EXT | MISSING | high | UNTOUCHED | copy |  |
| 1032 | `commands/vim/index.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 1033 | `commands/vim/vim.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 1034 | `commands/voice/index.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 1035 | `commands/voice/voice.ts` | `` | EXT | MISSING | high | UNTOUCHED | adapt-new |  |
| 1036 | `components/App.tsx` | `` | T2 | MISSING | high | UNTOUCHED | copy |  |
| 1037 | `components/ApproveApiKey.tsx` | `` | T2 | MISSING | high | UNTOUCHED | copy |  |
| 1038 | `components/AutoModeOptInDialog.tsx` | `` | T2 | MISSING | high | UNTOUCHED | copy |  |
| 1039 | `components/AutoUpdater.tsx` | `` | T2 | MISSING | high | UNTOUCHED | copy |  |
| 1040 | `components/AutoUpdaterWrapper.tsx` | `` | T2 | MISSING | high | UNTOUCHED | copy |  |
| 1041 | `components/AwsAuthStatusBox.tsx` | `` | T2 | MISSING | high | UNTOUCHED | copy |  |
| 1042 | `components/BaseTextInput.tsx` | `` | T2 | MISSING | high | UNTOUCHED | copy |  |
| 1043 | `components/BashModeProgress.tsx` | `` | T2 | MISSING | high | UNTOUCHED | copy |  |
| 1044 | `components/BridgeDialog.tsx` | `` | T2 | MISSING | high | UNTOUCHED | copy |  |
| 1045 | `components/BypassPermissionsModeDialog.tsx` | `` | T2 | MISSING | high | UNTOUCHED | copy |  |
| 1046 | `components/ChannelDowngradeDialog.tsx` | `` | T2 | MISSING | high | UNTOUCHED | copy |  |
| 1047 | `components/ClaudeCodeHint/PluginHintMenu.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1048 | `components/ClaudeInChromeOnboarding.tsx` | `` | T2 | MISSING | high | UNTOUCHED | copy |  |
| 1049 | `components/ClaudeMdExternalIncludesDialog.tsx` | `` | T2 | MISSING | high | UNTOUCHED | copy |  |
| 1050 | `components/CompactSummary.tsx` | `` | T2 | MISSING | high | UNTOUCHED | copy |  |
| 1051 | `components/ConsoleOAuthFlow.tsx` | `` | T2 | MISSING | high | UNTOUCHED | copy |  |
| 1052 | `components/ContextVisualization.tsx` | `` | T2 | MISSING | high | UNTOUCHED | copy |  |
| 1053 | `components/CoordinatorAgentStatus.tsx` | `` | T2 | MISSING | high | UNTOUCHED | copy |  |
| 1054 | `components/CostThresholdDialog.tsx` | `` | T2 | MISSING | high | UNTOUCHED | copy |  |
| 1055 | `components/CustomSelect/SelectMulti.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1056 | `components/CustomSelect/select-input-option.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1057 | `components/CustomSelect/select.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1058 | `components/CustomSelect/use-multi-select-state.ts` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1059 | `components/CustomSelect/use-select-input.ts` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1060 | `components/DesktopHandoff.tsx` | `` | T2 | MISSING | high | UNTOUCHED | copy |  |
| 1061 | `components/DesktopUpsell/DesktopUpsellStartup.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1062 | `components/DevBar.tsx` | `` | T2 | MISSING | high | UNTOUCHED | copy |  |
| 1063 | `components/DevChannelsDialog.tsx` | `` | T2 | MISSING | high | UNTOUCHED | copy |  |
| 1064 | `components/DiagnosticsDisplay.tsx` | `` | T2 | MISSING | high | UNTOUCHED | copy |  |
| 1065 | `components/EffortCallout.tsx` | `` | T2 | MISSING | high | UNTOUCHED | copy |  |
| 1066 | `components/ExitFlow.tsx` | `` | T2 | MISSING | high | UNTOUCHED | copy |  |
| 1067 | `components/ExportDialog.tsx` | `` | T2 | MISSING | high | UNTOUCHED | copy |  |
| 1068 | `components/FallbackToolUseErrorMessage.tsx` | `components/FallbackToolUseErrorMessage.tsx` | T2 | PARTIAL | high | ALIGNED | adapt-new | stripped CC-only imports; uses QiLing ink/useShortcutDisplay |
| 1069 | `components/Feedback.tsx` | `` | T2 | MISSING | high | UNTOUCHED | copy |  |
| 1070 | `components/FeedbackSurvey/FeedbackSurvey.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1071 | `components/FeedbackSurvey/submitTranscriptShare.ts` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1072 | `components/FeedbackSurvey/useFeedbackSurvey.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1073 | `components/FeedbackSurvey/useMemorySurvey.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1074 | `components/FeedbackSurvey/usePostCompactSurvey.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1075 | `components/FeedbackSurvey/useSurveyState.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1076 | `components/FileEditToolDiff.tsx` | `` | T2 | MISSING | high | UNTOUCHED | copy |  |
| 1077 | `components/FileEditToolUpdatedMessage.tsx` | `` | T2 | MISSING | high | UNTOUCHED | copy |  |
| 1078 | `components/FileEditToolUseRejectedMessage.tsx` | `` | T2 | MISSING | high | UNTOUCHED | copy |  |
| 1079 | `components/FullscreenLayout.tsx` | `` | T2 | MISSING | high | UNTOUCHED | copy |  |
| 1080 | `components/GlobalSearchDialog.tsx` | `` | T2 | MISSING | high | UNTOUCHED | copy |  |
| 1081 | `components/HelpV2/Commands.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1082 | `components/HelpV2/General.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1083 | `components/HelpV2/HelpV2.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1084 | `components/HighlightedCode.tsx` | `` | T2 | MISSING | high | UNTOUCHED | copy |  |
| 1085 | `components/HighlightedCode/Fallback.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1086 | `components/HistorySearchDialog.tsx` | `` | T2 | MISSING | high | UNTOUCHED | copy |  |
| 1087 | `components/IdeAutoConnectDialog.tsx` | `` | T2 | MISSING | high | UNTOUCHED | copy |  |
| 1088 | `components/IdeOnboardingDialog.tsx` | `` | T2 | MISSING | high | UNTOUCHED | copy |  |
| 1089 | `components/IdleReturnDialog.tsx` | `` | T2 | MISSING | high | UNTOUCHED | copy |  |
| 1090 | `components/InvalidConfigDialog.tsx` | `` | T2 | MISSING | high | UNTOUCHED | copy |  |
| 1091 | `components/InvalidSettingsDialog.tsx` | `` | T2 | MISSING | high | UNTOUCHED | copy |  |
| 1092 | `components/LanguagePicker.tsx` | `` | T2 | MISSING | high | UNTOUCHED | copy |  |
| 1093 | `components/LogSelector.tsx` | `` | T2 | MISSING | high | UNTOUCHED | copy |  |
| 1094 | `components/LogoV2/AnimatedAsterisk.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1095 | `components/LogoV2/AnimatedClawd.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1096 | `components/LogoV2/ChannelsNotice.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1097 | `components/LogoV2/Clawd.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1098 | `components/LogoV2/CondensedLogo.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1099 | `components/LogoV2/EmergencyTip.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1100 | `components/LogoV2/Feed.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1101 | `components/LogoV2/FeedColumn.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1102 | `components/LogoV2/GuestPassesUpsell.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1103 | `components/LogoV2/LogoV2.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1104 | `components/LogoV2/Opus1mMergeNotice.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1105 | `components/LogoV2/OverageCreditUpsell.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1106 | `components/LogoV2/VoiceModeNotice.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1107 | `components/LogoV2/WelcomeV2.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1108 | `components/LogoV2/feedConfigs.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1109 | `components/LspRecommendation/LspRecommendationMenu.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1110 | `components/MCPServerApprovalDialog.tsx` | `` | T2 | MISSING | high | UNTOUCHED | copy |  |
| 1111 | `components/MCPServerDesktopImportDialog.tsx` | `` | T2 | MISSING | high | UNTOUCHED | copy |  |
| 1112 | `components/MCPServerMultiselectDialog.tsx` | `` | T2 | MISSING | high | UNTOUCHED | copy |  |
| 1113 | `components/ManagedSettingsSecurityDialog/ManagedSettingsSe…` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1114 | `components/ManagedSettingsSecurityDialog/utils.ts` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1115 | `components/Markdown.tsx` | `` | T2 | MISSING | high | UNTOUCHED | copy |  |
| 1116 | `components/MarkdownTable.tsx` | `` | T2 | MISSING | high | UNTOUCHED | copy |  |
| 1117 | `components/MemoryUsageIndicator.tsx` | `` | T2 | MISSING | high | UNTOUCHED | copy |  |
| 1118 | `components/MessageRow.tsx` | `` | T2 | MISSING | high | UNTOUCHED | copy |  |
| 1119 | `components/MessageSelector.tsx` | `` | T2 | MISSING | high | UNTOUCHED | copy |  |
| 1120 | `components/Messages.tsx` | `` | T2 | MISSING | high | UNTOUCHED | copy |  |
| 1121 | `components/ModelPicker.tsx` | `` | T2 | MISSING | high | UNTOUCHED | copy |  |
| 1122 | `components/NativeAutoUpdater.tsx` | `` | T2 | MISSING | high | UNTOUCHED | copy |  |
| 1123 | `components/NotebookEditToolUseRejectedMessage.tsx` | `` | T2 | MISSING | high | UNTOUCHED | copy |  |
| 1124 | `components/Onboarding.tsx` | `` | T2 | MISSING | high | UNTOUCHED | copy |  |
| 1125 | `components/OutputStylePicker.tsx` | `` | T2 | MISSING | high | UNTOUCHED | copy |  |
| 1126 | `components/PackageManagerAutoUpdater.tsx` | `` | T2 | MISSING | high | UNTOUCHED | copy |  |
| 1127 | `components/Passes/Passes.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1128 | `components/PromptInput/HistorySearchInput.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1129 | `components/PromptInput/Notifications.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1130 | `components/PromptInput/PromptInput.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1131 | `components/PromptInput/PromptInputFooter.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1132 | `components/PromptInput/PromptInputFooterLeftSide.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1133 | `components/PromptInput/PromptInputFooterSuggestions.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1134 | `components/PromptInput/PromptInputHelpMenu.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1135 | `components/PromptInput/PromptInputModeIndicator.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1136 | `components/PromptInput/PromptInputQueuedCommands.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1137 | `components/PromptInput/SandboxPromptFooterHint.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1138 | `components/PromptInput/ShimmeredInput.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1139 | `components/PromptInput/VoiceIndicator.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1140 | `components/PromptInput/usePromptInputPlaceholder.ts` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1141 | `components/PromptInput/useSwarmBanner.ts` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1142 | `components/QuickOpenDialog.tsx` | `` | T2 | MISSING | high | UNTOUCHED | copy |  |
| 1143 | `components/RemoteCallout.tsx` | `` | T2 | MISSING | high | UNTOUCHED | copy |  |
| 1144 | `components/RemoteEnvironmentDialog.tsx` | `` | T2 | MISSING | high | UNTOUCHED | copy |  |
| 1145 | `components/ResumeTask.tsx` | `` | T2 | MISSING | high | UNTOUCHED | copy |  |
| 1146 | `components/SandboxViolationExpandedView.tsx` | `` | T2 | MISSING | high | UNTOUCHED | copy |  |
| 1147 | `components/ScrollKeybindingHandler.tsx` | `` | T2 | MISSING | high | UNTOUCHED | copy |  |
| 1148 | `components/SessionBackgroundHint.tsx` | `` | T2 | MISSING | high | UNTOUCHED | copy |  |
| 1149 | `components/SessionPreview.tsx` | `` | T2 | MISSING | high | UNTOUCHED | copy |  |
| 1150 | `components/Settings/Config.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1151 | `components/Settings/Settings.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1152 | `components/Settings/Status.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1153 | `components/Settings/Usage.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1154 | `components/ShowInIDEPrompt.tsx` | `` | T2 | MISSING | high | UNTOUCHED | copy |  |
| 1155 | `components/SkillImprovementSurvey.tsx` | `` | T2 | MISSING | high | UNTOUCHED | copy |  |
| 1156 | `components/Spinner.tsx` | `` | T2 | MISSING | high | UNTOUCHED | copy |  |
| 1157 | `components/Spinner/GlimmerMessage.tsx` | `components/Spinner/GlimmerMessage.tsx` | T2 | MISSING | high | ALIGNED | adapt-new | clean uncompiled port; SpinnerMode+'tool-use' added to types.ts |
| 1158 | `components/Spinner/SpinnerAnimationRow.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1159 | `components/Spinner/TeammateSpinnerLine.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1160 | `components/Spinner/TeammateSpinnerTree.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1161 | `components/StatusLine.tsx` | `` | T2 | MISSING | high | UNTOUCHED | copy |  |
| 1162 | `components/StatusNotices.tsx` | `` | T2 | MISSING | high | UNTOUCHED | copy |  |
| 1163 | `components/StructuredDiff.tsx` | `` | T2 | MISSING | high | UNTOUCHED | copy |  |
| 1164 | `components/StructuredDiff/Fallback.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1165 | `components/TagTabs.tsx` | `` | T2 | MISSING | high | UNTOUCHED | copy |  |
| 1166 | `components/TaskListV2.tsx` | `` | T2 | MISSING | high | UNTOUCHED | copy |  |
| 1167 | `components/TeammateViewHeader.tsx` | `` | T2 | MISSING | high | UNTOUCHED | copy |  |
| 1168 | `components/TeleportError.tsx` | `` | T2 | MISSING | high | UNTOUCHED | copy |  |
| 1169 | `components/TeleportProgress.tsx` | `` | T2 | MISSING | high | UNTOUCHED | copy |  |
| 1170 | `components/TeleportRepoMismatchDialog.tsx` | `` | T2 | MISSING | high | UNTOUCHED | copy |  |
| 1171 | `components/TeleportResumeWrapper.tsx` | `` | T2 | MISSING | high | UNTOUCHED | copy |  |
| 1172 | `components/TeleportStash.tsx` | `` | T2 | MISSING | high | UNTOUCHED | copy |  |
| 1173 | `components/TextInput.tsx` | `` | T2 | MISSING | high | UNTOUCHED | copy |  |
| 1174 | `components/ThemePicker.tsx` | `` | T2 | MISSING | high | UNTOUCHED | copy |  |
| 1175 | `components/ThinkingToggle.tsx` | `` | T2 | MISSING | high | UNTOUCHED | copy |  |
| 1176 | `components/TokenWarning.tsx` | `` | T2 | MISSING | high | UNTOUCHED | copy |  |
| 1177 | `components/TrustDialog/TrustDialog.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1178 | `components/TrustDialog/utils.ts` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1179 | `components/ValidationErrorsList.tsx` | `` | T2 | MISSING | high | UNTOUCHED | copy |  |
| 1180 | `components/VimTextInput.tsx` | `` | T2 | MISSING | high | UNTOUCHED | copy |  |
| 1181 | `components/VirtualMessageList.tsx` | `` | T2 | MISSING | high | UNTOUCHED | copy |  |
| 1182 | `components/WorkflowMultiselectDialog.tsx` | `` | T2 | MISSING | high | UNTOUCHED | copy |  |
| 1183 | `components/WorktreeExitDialog.tsx` | `` | T2 | MISSING | high | UNTOUCHED | copy |  |
| 1184 | `components/agents/AgentDetail.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1185 | `components/agents/AgentEditor.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1186 | `components/agents/AgentsList.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1187 | `components/agents/AgentsMenu.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1188 | `components/agents/ColorPicker.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1189 | `components/agents/ModelSelector.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1190 | `components/agents/ToolSelector.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1191 | `components/agents/agentFileUtils.ts` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1192 | `components/agents/generateAgent.ts` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1193 | `components/agents/new-agent-creation/CreateAgentWizard.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1194 | `components/agents/new-agent-creation/wizard-steps/ColorSte…` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1195 | `components/agents/new-agent-creation/wizard-steps/ConfirmS…` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1196 | `components/agents/new-agent-creation/wizard-steps/ConfirmS…` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1197 | `components/agents/new-agent-creation/wizard-steps/Descript…` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1198 | `components/agents/new-agent-creation/wizard-steps/Generate…` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1199 | `components/agents/new-agent-creation/wizard-steps/Location…` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1200 | `components/agents/new-agent-creation/wizard-steps/MemorySt…` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1201 | `components/agents/new-agent-creation/wizard-steps/MethodSt…` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1202 | `components/agents/new-agent-creation/wizard-steps/ModelSte…` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1203 | `components/agents/new-agent-creation/wizard-steps/PromptSt…` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1204 | `components/agents/new-agent-creation/wizard-steps/ToolsSte…` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1205 | `components/agents/new-agent-creation/wizard-steps/TypeStep…` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1206 | `components/agents/validateAgent.ts` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1207 | `components/design-system/Tabs.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1208 | `components/diff/DiffDetailView.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1209 | `components/diff/DiffDialog.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1210 | `components/diff/DiffFileList.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1211 | `components/grove/Grove.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1212 | `components/hooks/HooksConfigMenu.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1213 | `components/hooks/PromptDialog.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1214 | `components/hooks/SelectEventMode.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1215 | `components/hooks/SelectHookMode.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1216 | `components/hooks/SelectMatcherMode.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1217 | `components/hooks/ViewHookMode.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1218 | `components/mcp/ElicitationDialog.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1219 | `components/mcp/MCPAgentServerMenu.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1220 | `components/mcp/MCPListPanel.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1221 | `components/mcp/MCPReconnect.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1222 | `components/mcp/MCPRemoteServerMenu.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1223 | `components/mcp/MCPSettings.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1224 | `components/mcp/MCPStdioServerMenu.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1225 | `components/mcp/MCPToolDetailView.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1226 | `components/mcp/MCPToolListView.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1227 | `components/mcp/McpParsingWarnings.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1228 | `components/mcp/index.ts` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1229 | `components/mcp/utils/reconnectHelpers.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1230 | `components/memory/MemoryFileSelector.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1231 | `components/messageActions.tsx` | `` | T2 | MISSING | high | UNTOUCHED | copy |  |
| 1232 | `components/messages/AdvisorMessage.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1233 | `components/messages/AssistantTextMessage.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1234 | `components/messages/AssistantThinkingMessage.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1235 | `components/messages/AssistantToolUseMessage.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1236 | `components/messages/AttachmentMessage.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1237 | `components/messages/CollapsedReadSearchContent.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1238 | `components/messages/GroupedToolUseContent.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1239 | `components/messages/HookProgressMessage.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1240 | `components/messages/PlanApprovalMessage.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1241 | `components/messages/RateLimitMessage.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1242 | `components/messages/ShutdownMessage.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1243 | `components/messages/SystemAPIErrorMessage.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1244 | `components/messages/SystemTextMessage.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1245 | `components/messages/TaskAssignmentMessage.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1246 | `components/messages/UserLocalCommandOutputMessage.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1247 | `components/messages/UserPlanMessage.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1248 | `components/messages/UserPromptMessage.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1249 | `components/messages/UserResourceUpdateMessage.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1250 | `components/messages/UserTeammateMessage.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1251 | `components/messages/UserTextMessage.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1252 | `components/messages/UserToolResultMessage/RejectedPlanMess…` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1253 | `components/messages/UserToolResultMessage/UserToolErrorMes…` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1254 | `components/messages/UserToolResultMessage/UserToolRejectMe…` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1255 | `components/messages/UserToolResultMessage/UserToolResultMe…` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1256 | `components/messages/UserToolResultMessage/UserToolSuccessM…` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1257 | `components/messages/UserToolResultMessage/utils.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1258 | `components/messages/nullRenderingAttachments.ts` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1259 | `components/messages/teamMemCollapsed.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1260 | `components/messages/teamMemSaved.ts` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1261 | `components/permissions/AskUserQuestionPermissionRequest/As…` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1262 | `components/permissions/AskUserQuestionPermissionRequest/Pr…` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1263 | `components/permissions/AskUserQuestionPermissionRequest/Pr…` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1264 | `components/permissions/AskUserQuestionPermissionRequest/Qu…` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1265 | `components/permissions/AskUserQuestionPermissionRequest/Qu…` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1266 | `components/permissions/AskUserQuestionPermissionRequest/Su…` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1267 | `components/permissions/AskUserQuestionPermissionRequest/us…` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1268 | `components/permissions/BashPermissionRequest/BashPermissio…` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1269 | `components/permissions/BashPermissionRequest/bashToolUseOp…` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1270 | `components/permissions/ComputerUseApproval/ComputerUseAppr…` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1271 | `components/permissions/EnterPlanModePermissionRequest/Ente…` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1272 | `components/permissions/ExitPlanModePermissionRequest/ExitP…` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1273 | `components/permissions/FallbackPermissionRequest.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1274 | `components/permissions/FileEditPermissionRequest/FileEditP…` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1275 | `components/permissions/FilePermissionDialog/FilePermission…` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1276 | `components/permissions/FilePermissionDialog/permissionOpti…` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1277 | `components/permissions/FilePermissionDialog/useFilePermiss…` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1278 | `components/permissions/FilePermissionDialog/usePermissionH…` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1279 | `components/permissions/FileWritePermissionRequest/FileWrit…` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1280 | `components/permissions/FileWritePermissionRequest/FileWrit…` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1281 | `components/permissions/FilesystemPermissionRequest/Filesys…` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1282 | `components/permissions/NotebookEditPermissionRequest/Noteb…` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1283 | `components/permissions/NotebookEditPermissionRequest/Noteb…` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1284 | `components/permissions/PermissionDecisionDebugInfo.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1285 | `components/permissions/PermissionDialog.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1286 | `components/permissions/PermissionExplanation.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1287 | `components/permissions/PermissionPrompt.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1288 | `components/permissions/PermissionRequest.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1289 | `components/permissions/PermissionRuleExplanation.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1290 | `components/permissions/PowerShellPermissionRequest/PowerSh…` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1291 | `components/permissions/PowerShellPermissionRequest/powersh…` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1292 | `components/permissions/SandboxPermissionRequest.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1293 | `components/permissions/SedEditPermissionRequest/SedEditPer…` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1294 | `components/permissions/SkillPermissionRequest/SkillPermiss…` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1295 | `components/permissions/WebFetchPermissionRequest/WebFetchP…` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1296 | `components/permissions/WorkerPendingPermission.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1297 | `components/permissions/hooks.ts` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1298 | `components/permissions/rules/AddPermissionRules.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1299 | `components/permissions/rules/AddWorkspaceDirectory.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1300 | `components/permissions/rules/PermissionRuleDescription.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1301 | `components/permissions/rules/PermissionRuleInput.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1302 | `components/permissions/rules/PermissionRuleList.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1303 | `components/permissions/rules/RecentDenialsTab.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1304 | `components/permissions/rules/RemoveWorkspaceDirectory.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1305 | `components/permissions/rules/WorkspaceTab.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1306 | `components/permissions/shellPermissionHelpers.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1307 | `components/permissions/useShellPermissionFeedback.ts` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1308 | `components/permissions/utils.ts` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1309 | `components/sandbox/SandboxConfigTab.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1310 | `components/sandbox/SandboxDependenciesTab.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1311 | `components/sandbox/SandboxDoctorSection.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1312 | `components/sandbox/SandboxOverridesTab.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1313 | `components/sandbox/SandboxSettings.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1314 | `components/shell/OutputLine.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1315 | `components/skills/SkillsMenu.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1316 | `components/tasks/AsyncAgentDetailDialog.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1317 | `components/tasks/BackgroundTask.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1318 | `components/tasks/BackgroundTaskStatus.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1319 | `components/tasks/BackgroundTasksDialog.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1320 | `components/tasks/DreamDetailDialog.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1321 | `components/tasks/InProcessTeammateDetailDialog.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1322 | `components/tasks/RemoteSessionDetailDialog.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1323 | `components/tasks/RemoteSessionProgress.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1324 | `components/tasks/ShellDetailDialog.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1325 | `components/tasks/ShellProgress.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1326 | `components/tasks/renderToolActivity.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1327 | `components/tasks/taskStatusUtils.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1328 | `components/teams/TeamStatus.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1329 | `components/teams/TeamsDialog.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1330 | `components/ui/TreeSelect.tsx` | `` | T2 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1331 | `constants/keys.ts` | `constants/keys.ts` | T7 | MISSING | high | ALIGNED | adapt-new | stub: returns non-ANT GrowthBook key; ANT staging key removed |
| 1332 | `constants/oauth.ts` | `constants/oauth.ts` | T7 | MISSING | high | ALIGNED | adapt-new | drop ANT staging/local configs; fixed import path; prod-only |
| 1333 | `constants/outputStyles.ts` | `` | T7 | MISSING | high | UNTOUCHED | copy |  |
| 1334 | `constants/prompts.ts` | `constants/prompts.ts` | T7 | PARTIAL | high | ALIGNED | copy | minimal stub: prependBullets only; full 914-line file deferred (deep T6+ deps) |
| 1335 | `constants/system.ts` | `constants/system.ts` | T7 | MISSING | high | ALIGNED | adapt-new | NAME: Claude Code; drop bun:bundle/GrowthBook/cch attestation; MACRO.VERSION→npm_package_version |
| 1336 | `constants/systemPromptSections.ts` | `constants/systemPromptSections.ts` | T7 | MISSING | high | ALIGNED | copy-verbatim | all deps in bootstrap/state.ts |
| 1337 | `context/overlayContext.tsx` | `context/overlayContext.tsx` | T4 | FULLY_ALIGNED | high | DONE | adapt-new | OverlayProvider+useOverlayRegistration; depth计数支持嵌套overlay |
| 1338 | `context/voice.tsx` | `` | T4 | MISSING | high | ALIGNED | adapt-new | 语音状态Context; Phase D接入实际语音后端 |
| 1339 | `costHook.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1340 | `dialogLaunchers.tsx` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1341 | `entrypoints/agentSdkTypes.ts` | `` | T7 | MISSING | high | UNTOUCHED | copy |  |
| 1342 | `entrypoints/cli.tsx` | `` | T7 | MISSING | high | UNTOUCHED | copy |  |
| 1343 | `entrypoints/init.ts` | `` | T7 | MISSING | high | UNTOUCHED | copy |  |
| 1344 | `entrypoints/mcp.ts` | `` | T7 | MISSING | high | UNTOUCHED | copy |  |
| 1345 | `entrypoints/sdk/controlSchemas.ts` | `` | T7 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1346 | `entrypoints/sdk/coreSchemas.ts` | `` | T7 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1347 | `history.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1348 | `hooks/fileSuggestions.ts` | `` | T3 | MISSING | high | UNTOUCHED | copy |  |
| 1349 | `hooks/notifs/useAutoModeUnavailableNotification.ts` | `` | T3 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1350 | `hooks/notifs/useCanSwitchToExistingSubscription.tsx` | `` | T3 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1351 | `hooks/notifs/useDeprecationWarningNotification.tsx` | `` | T3 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1352 | `hooks/notifs/useFastModeNotification.tsx` | `` | T3 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1353 | `hooks/notifs/useIDEStatusIndicator.tsx` | `` | T3 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1354 | `hooks/notifs/useInstallMessages.tsx` | `` | T3 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1355 | `hooks/notifs/useLspInitializationNotification.tsx` | `` | T3 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1356 | `hooks/notifs/useMcpConnectivityStatus.tsx` | `` | T3 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1357 | `hooks/notifs/useModelMigrationNotifications.tsx` | `` | T3 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1358 | `hooks/notifs/useNpmDeprecationNotification.tsx` | `` | T3 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1359 | `hooks/notifs/usePluginAutoupdateNotification.tsx` | `` | T3 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1360 | `hooks/notifs/usePluginInstallationStatus.tsx` | `` | T3 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1361 | `hooks/notifs/useRateLimitWarningNotification.tsx` | `` | T3 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1362 | `hooks/notifs/useSettingsErrors.tsx` | `` | T3 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1363 | `hooks/notifs/useTeammateShutdownNotification.ts` | `` | T3 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1364 | `hooks/toolPermission/PermissionContext.ts` | `` | T3 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1365 | `hooks/toolPermission/handlers/coordinatorHandler.ts` | `` | T3 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1366 | `hooks/toolPermission/handlers/interactiveHandler.ts` | `` | T3 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1367 | `hooks/toolPermission/handlers/swarmWorkerHandler.ts` | `` | T3 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1368 | `hooks/toolPermission/permissionLogging.ts` | `` | T3 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1369 | `hooks/unifiedSuggestions.ts` | `` | T3 | MISSING | high | UNTOUCHED | copy |  |
| 1370 | `hooks/useApiKeyVerification.ts` | `` | T3 | MISSING | high | UNTOUCHED | copy |  |
| 1371 | `hooks/useArrowKeyHistory.tsx` | `` | T3 | MISSING | high | UNTOUCHED | copy |  |
| 1372 | `hooks/useAssistantHistory.ts` | `` | T3 | MISSING | high | UNTOUCHED | copy |  |
| 1373 | `hooks/useAwaySummary.ts` | `hooks/useAwaySummary.ts` | T3 | MISSING | high | ALIGNED | adapt-new | stub: feature('AWAY_SUMMARY') ANT-only, no-op until Phase D |
| 1374 | `hooks/useBackgroundTaskNavigation.ts` | `` | T3 | MISSING | high | UNTOUCHED | copy |  |
| 1375 | `hooks/useCanUseTool.tsx` | `` | T3 | MISSING | high | UNTOUCHED | copy |  |
| 1376 | `hooks/useCancelRequest.ts` | `` | T3 | MISSING | high | UNTOUCHED | copy |  |
| 1377 | `hooks/useChromeExtensionNotification.tsx` | `` | T3 | MISSING | high | UNTOUCHED | copy |  |
| 1378 | `hooks/useClaudeCodeHintRecommendation.tsx` | `` | T3 | MISSING | high | UNTOUCHED | copy |  |
| 1379 | `hooks/useClipboardImageHint.ts` | `hooks/useClipboardImageHint.ts` | T3 | MISSING | high | ALIGNED | copy-verbatim | +utils/imagePaste.ts stub (osascript/darwin only) |
| 1380 | `hooks/useCommandKeybindings.tsx` | `` | T3 | MISSING | high | UNTOUCHED | copy |  |
| 1381 | `hooks/useCommandQueue.ts` | `` | T3 | MISSING | high | UNTOUCHED | copy |  |
| 1382 | `hooks/useCopyOnSelect.ts` | `` | T3 | MISSING | high | UNTOUCHED | copy |  |
| 1383 | `hooks/useDiffInIDE.ts` | `` | T3 | MISSING | high | UNTOUCHED | copy |  |
| 1384 | `hooks/useDirectConnect.ts` | `` | T3 | MISSING | high | UNTOUCHED | copy |  |
| 1385 | `hooks/useGlobalKeybindings.tsx` | `` | T3 | MISSING | high | UNTOUCHED | copy |  |
| 1386 | `hooks/useHistorySearch.ts` | `` | T3 | MISSING | high | UNTOUCHED | copy |  |
| 1387 | `hooks/useIDEIntegration.tsx` | `` | T3 | MISSING | high | UNTOUCHED | copy |  |
| 1388 | `hooks/useIdeLogging.ts` | `` | T3 | MISSING | high | UNTOUCHED | copy |  |
| 1389 | `hooks/useIdeSelection.ts` | `` | T3 | MISSING | high | UNTOUCHED | copy |  |
| 1390 | `hooks/useInboxPoller.ts` | `` | T3 | MISSING | high | UNTOUCHED | copy |  |
| 1391 | `hooks/useIssueFlagBanner.ts` | `` | T3 | MISSING | high | UNTOUCHED | copy |  |
| 1392 | `hooks/useLogMessages.ts` | `` | T3 | MISSING | high | UNTOUCHED | copy |  |
| 1393 | `hooks/useLspPluginRecommendation.tsx` | `` | T3 | MISSING | high | UNTOUCHED | copy |  |
| 1394 | `hooks/useMainLoopModel.ts` | `` | T3 | MISSING | high | UNTOUCHED | copy |  |
| 1395 | `hooks/useManagePlugins.ts` | `` | T3 | MISSING | high | UNTOUCHED | copy |  |
| 1396 | `hooks/useMergedTools.ts` | `` | T3 | MISSING | high | UNTOUCHED | copy |  |
| 1397 | `hooks/useNotifyAfterTimeout.ts` | `` | T3 | MISSING | high | UNTOUCHED | copy |  |
| 1398 | `hooks/useOfficialMarketplaceNotification.tsx` | `` | T3 | MISSING | high | UNTOUCHED | copy |  |
| 1399 | `hooks/usePasteHandler.ts` | `` | T3 | MISSING | high | UNTOUCHED | copy |  |
| 1400 | `hooks/usePluginRecommendationBase.tsx` | `` | T3 | MISSING | high | UNTOUCHED | copy |  |
| 1401 | `hooks/usePrStatus.ts` | `` | T3 | MISSING | high | UNTOUCHED | copy |  |
| 1402 | `hooks/usePromptSuggestion.ts` | `` | T3 | MISSING | high | UNTOUCHED | copy |  |
| 1403 | `hooks/usePromptsFromClaudeInChrome.tsx` | `` | T3 | MISSING | high | UNTOUCHED | copy |  |
| 1404 | `hooks/useQueueProcessor.ts` | `` | T3 | MISSING | high | UNTOUCHED | copy |  |
| 1405 | `hooks/useRemoteSession.ts` | `` | T3 | MISSING | high | UNTOUCHED | copy |  |
| 1406 | `hooks/useReplBridge.tsx` | `` | T3 | MISSING | high | UNTOUCHED | copy |  |
| 1407 | `hooks/useSSHSession.ts` | `` | T3 | MISSING | high | UNTOUCHED | copy |  |
| 1408 | `hooks/useScheduledTasks.ts` | `` | T3 | MISSING | high | UNTOUCHED | copy |  |
| 1409 | `hooks/useSessionBackgrounding.ts` | `` | T3 | MISSING | high | UNTOUCHED | copy |  |
| 1410 | `hooks/useSettings.ts` | `` | T3 | MISSING | high | UNTOUCHED | copy |  |
| 1411 | `hooks/useSkillImprovementSurvey.ts` | `` | T3 | MISSING | high | UNTOUCHED | copy |  |
| 1412 | `hooks/useSkillsChange.ts` | `` | T3 | MISSING | high | UNTOUCHED | copy |  |
| 1413 | `hooks/useSwarmInitialization.ts` | `` | T3 | MISSING | high | UNTOUCHED | copy |  |
| 1414 | `hooks/useSwarmPermissionPoller.ts` | `` | T3 | MISSING | high | UNTOUCHED | copy |  |
| 1415 | `hooks/useTaskListWatcher.ts` | `` | T3 | MISSING | high | UNTOUCHED | copy |  |
| 1416 | `hooks/useTasksV2.ts` | `` | T3 | MISSING | high | UNTOUCHED | copy |  |
| 1417 | `hooks/useTeammateViewAutoExit.ts` | `` | T3 | MISSING | high | UNTOUCHED | copy |  |
| 1418 | `hooks/useTeleportResume.tsx` | `` | T3 | MISSING | high | UNTOUCHED | copy |  |
| 1419 | `hooks/useTextInput.ts` | `` | T3 | MISSING | high | UNTOUCHED | copy |  |
| 1420 | `hooks/useTypeahead.tsx` | `` | T3 | MISSING | high | UNTOUCHED | copy |  |
| 1421 | `hooks/useVimInput.ts` | `` | T3 | MISSING | high | UNTOUCHED | copy |  |
| 1422 | `hooks/useVirtualScroll.ts` | `` | T3 | MISSING | high | UNTOUCHED | copy |  |
| 1423 | `hooks/useVoice.ts` | `` | T3 | MISSING | high | UNTOUCHED | copy |  |
| 1424 | `hooks/useVoiceEnabled.ts` | `` | T3 | MISSING | high | UNTOUCHED | copy |  |
| 1425 | `hooks/useVoiceIntegration.tsx` | `` | T3 | MISSING | high | UNTOUCHED | copy |  |
| 1426 | `ink.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1427 | `ink/bidi.ts` | `ink/bidi.ts` | T4 | FULLY_ALIGNED | high | DONE | adapt-new | RTL检测+reorderLine+splitBidiRuns; QiLing中文LTR优先; Phase D接bidi-js |
| 1428 | `ink/colorize.ts` | `ink/colorize.ts` | T4 | FULLY_ALIGNED | high | DONE | adapt-new | openStyle/closeStyle/colorize; ansi256+truecolor+named颜色 |
| 1429 | `ink/components/AlternateScreen.tsx` | `` | T4 | MISSING | high | ALIGNED | adapt-new | 备用屏幕组件; 省略ink内部instances; improved:useInsertionEffect |
| 1430 | `ink/components/App.tsx` | `ink/components/App.tsx` | T4 | FULLY_ALIGNED | high | DONE | adapt-new | 根组件+ErrorBoundary; 省略Bridge/Swarm(Phase D) |
| 1431 | `ink/components/Box.tsx` | `ink/components/Box.tsx` | T4 | FULLY_ALIGNED | high | DONE | adapt-new | improved: re-export ink Box; Ink5原生支持border/flex无需fork |
| 1432 | `ink/components/Button.tsx` | `ink/components/Button.tsx` | T4 | FULLY_ALIGNED | high | DONE | adapt-new | 可聚焦按钮; useFocus+useInput; Enter/Space激活 |
| 1433 | `ink/components/ErrorOverview.tsx` | `ink/components/ErrorOverview.tsx` | T4 | FULLY_ALIGNED | high | DONE | adapt-new | ink Box/Text替换CC内部组件，graceful stack-utils/code-excerpt |
| 1434 | `ink/components/ScrollBox.tsx` | `ink/components/ScrollBox.tsx` | T4 | FULLY_ALIGNED | high | DONE | adapt-new | 垂直滚动容器; pageUp/Down; computeScrollBar辅助 |
| 1435 | `ink/components/StdinContext.ts` | `ink/components/StdinContext.ts` | T4 | FULLY_ALIGNED | high | DONE | adapt-new | StdinContext+useStdin; rawMode包装 |
| 1436 | `ink/components/Text.tsx` | `ink/components/Text.tsx` | T4 | FULLY_ALIGNED | high | DONE | adapt-new | improved: re-export ink Text; Ink5原生支持无需fork |
| 1437 | `ink/dom.ts` | `ink/dom.ts` | T4 | FULLY_ALIGNED | high | DONE | adapt-new | DOMElement+TextNode类型; walkDOM/findDOMNode; createDOMElement stub |
| 1438 | `ink/events/dispatcher.ts` | `ink/events/dispatcher.ts` | T4 | FULLY_ALIGNED | high | DONE | adapt-new | EventDispatcher; 键盘/鼠标路由; 委托hit-test |
| 1439 | `ink/events/input-event.ts` | `ink/events/input-event.ts` | T4 | FULLY_ALIGNED | high | DONE | adapt-new | InputEvent类型+工厂; keypress/paste/mouse/resize |
| 1440 | `ink/frame.ts` | `ink/frame.ts` | T4 | FULLY_ALIGNED | high | DONE | adapt-new | Frame/Patch/Diff类型完整；Screen为宽松stub兼容optimizer |
| 1441 | `ink/hooks/use-search-highlight.ts` | `ink/hooks/use-search-highlight.ts` | T4 | FULLY_ALIGNED | high | DONE | adapt-new | B-T4-11: 真实React state; setMatchCount供render pipeline更新计数 |
| 1442 | `ink/hooks/use-selection.ts` | `ink/hooks/use-selection.ts` | T4 | FULLY_ALIGNED | high | DONE | adapt-new | no-op stub；依赖ink/selection.ts待B-T4-11 |
| 1443 | `ink/ink.tsx` | `` | T4 | DIVERGED | high | KEPT | skip | 方案B: CC自定义渲染管线; 依赖auto-bind+bootstrap/state; QiLing委托Ink5; Phase D再决定 |
| 1444 | `ink/layout/yoga.ts` | `ink/layout/yoga.ts` | T4 | FULLY_ALIGNED | high | DONE | adapt-new | YogaRect/Edges+常量枚举; getLayoutRect/getPaddingEdges; 委托Ink5 |
| 1445 | `ink/log-update.ts` | `ink/log-update.ts` | T4 | FULLY_ALIGNED | high | DONE | adapt-new | createLogUpdate; ANSI erase-in-place; clear+done |
| 1446 | `ink/output.ts` | `ink/output.ts` | T4 | DIVERGED | high | KEPT | skip | 方案B: CC版797L含blit/shift/clip/noSelect; QiLing版88L简化委托Ink5; Phase D再决定 |
| 1447 | `ink/parse-keypress.ts` | `ink/parse-keypress.ts` | T4 | FULLY_ALIGNED | high | DONE | adapt-new | parseKeypress; CSI/Alt/Ctrl解析; F1-F12/方向键/特殊键 |
| 1448 | `ink/reconciler.ts` | `ink/reconciler.ts` | T4 | FULLY_ALIGNED | high | DONE | adapt-new | ReconcilerContainer; createContainer/updateContainer stub; 委托Ink5 |
| 1449 | `ink/render-border.ts` | `ink/render-border.ts` | T4 | FULLY_ALIGNED | high | DONE | adapt-new | BORDER_STYLES 8种; renderBorder+getBorderChar |
| 1450 | `ink/render-node-to-output.ts` | `` | T4 | DIVERGED | high | KEPT | skip | 方案B: 依赖CC全量Output.blit/shift/clip(797L); 随ink.tsx+output.ts一起跳过 |
| 1451 | `ink/render-to-screen.ts` | `ink/render-to-screen.ts` | T4 | FULLY_ALIGNED | high | DONE | adapt-new | stub; 实际渲染委托Ink5内部pipeline; 签名对齐 |
| 1452 | `ink/renderer.ts` | `ink/renderer.ts` | T4 | FULLY_ALIGNED | high | DONE | adapt-new | createRenderer; 公共API完整; 内部pipeline待B-T4-13接入 |
| 1453 | `ink/root.ts` | `ink/root.ts` | T4 | FULLY_ALIGNED | high | DONE | adapt-new | RootInstance+wrapInstance+getRootDimensions; B-T4-14接入ink.tsx |
| 1454 | `ink/screen.ts` | `ink/screen.ts` | T4 | PARTIAL | high | ALIGNED | adapt-new | B-T4-11: simplified impl ~204L vs CC~1486L; 覆盖公开API; 完整style-pools/hyperlinks/bidi留Phase C |
| 1455 | `ink/searchHighlight.ts` | `ink/searchHighlight.ts` | T4 | FULLY_ALIGNED | high | DONE | adapt-new | B-T4-11: 真实实现; applySearchHighlight逐行查找+inverse; applyPositionedHighlight黄色高亮 |
| 1456 | `ink/selection.ts` | `ink/selection.ts` | T4 | FULLY_ALIGNED | high | DONE | adapt-new | B-T4-11: copySelection/copySelectionNoClear接入Screen.extractText(); _extractText处理行列范围 |
| 1457 | `ink/styles.ts` | `ink/styles.ts` | T4 | FULLY_ALIGNED | high | DONE | adapt-new | TextStyle/BoxStyle; textStyleToConfig+mergeTextStyles |
| 1458 | `ink/terminal-querier.ts` | `ink/terminal-querier.ts` | T4 | FULLY_ALIGNED | high | DONE | adapt-new | detectCapabilities; 颜色/unicode/kitty/WT/vscode检测; 缓存 |
| 1459 | `ink/terminal.ts` | `ink/terminal.ts` | T4 | FULLY_ALIGNED | high | DONE | adapt-new | rawMode/cursor/altScreen/mouse/resize/getTerminalSize |
| 1460 | `interactiveHelpers.tsx` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1461 | `keybindings/KeybindingContext.tsx` | `keybindings/KeybindingContext.tsx` | T4 | FULLY_ALIGNED | high | DONE | adapt-new | KeybindingProvider+useKeybinding+useContextBindings |
| 1462 | `keybindings/KeybindingProviderSetup.tsx` | `keybindings/KeybindingProviderSetup.tsx` | T4 | FULLY_ALIGNED | high | DONE | adapt-new | 异步加载用户绑定; 渲染不阻塞; 错误静默降级 |
| 1463 | `keybindings/loadUserBindings.ts` | `keybindings/loadUserBindings.ts` | T4 | FULLY_ALIGNED | high | DONE | adapt-new | async加载~/.qiling/keybindings.json; mergeBindings+默认回退 |
| 1464 | `memdir/findRelevantMemories.ts` | `` | T5 | MISSING | high | UNTOUCHED | copy |  |
| 1465 | `memdir/memdir.ts` | `` | T5 | MISSING | high | UNTOUCHED | copy |  |
| 1466 | `memdir/memoryAge.ts` | `memdir/memoryAge.ts` | T5 | MISSING | high | ALIGNED | copy-verbatim | zero external deps |
| 1467 | `memdir/memoryScan.ts` | `` | T5 | MISSING | high | UNTOUCHED | copy |  |
| 1468 | `memdir/memoryTypes.ts` | `memdir/memoryTypes.ts` | T5 | MISSING | high | ALIGNED | copy-verbatim | zero external deps; prompt constants + type taxonomy |
| 1469 | `memdir/paths.ts` | `` | T5 | MISSING | high | UNTOUCHED | copy |  |
| 1470 | `memdir/teamMemPaths.ts` | `` | T5 | MISSING | high | UNTOUCHED | copy |  |
| 1471 | `memdir/teamMemPrompts.ts` | `` | T5 | MISSING | high | UNTOUCHED | copy |  |
| 1472 | `migrations/migrateAutoUpdatesToSettings.ts` | `` | T0 | MISSING | high | ALIGNED | — | no-op stub; QL schema differs |
| 1473 | `migrations/migrateBypassPermissionsAcceptedToSettings.ts` | `` | T0 | MISSING | high | ALIGNED | — | no-op stub; QL uses mode state machine |
| 1474 | `migrations/migrateEnableAllProjectMcpServersToSettings.ts` | `` | T0 | MISSING | high | ALIGNED | — | no-op stub; QL MCP in settings.json |
| 1475 | `migrations/migrateFennecToOpus.ts` | `` | T0 | MISSING | high | ALIGNED | — | no-op stub; no Fennec aliases in QL |
| 1476 | `migrations/migrateLegacyOpusToCurrent.ts` | `` | T0 | MISSING | high | ALIGNED | — | no-op stub; QL resolves at runtime |
| 1477 | `migrations/migrateOpusToOpus1m.ts` | `` | T0 | MISSING | high | ALIGNED | — | no-op stub; model alias runtime |
| 1478 | `migrations/migrateSonnet1mToSonnet45.ts` | `` | T0 | MISSING | high | ALIGNED | — | no-op stub; model alias runtime |
| 1479 | `migrations/migrateSonnet45ToSonnet46.ts` | `` | T0 | MISSING | high | ALIGNED | — | no-op stub; firstParty/subscription |
| 1480 | `migrations/resetAutoModeOptInForDefaultOffer.ts` | `` | T0 | MISSING | high | ALIGNED | — | no-op stub; ANT feature flag |
| 1481 | `migrations/resetProToOpusDefault.ts` | `` | T0 | MISSING | high | ALIGNED | — | no-op stub; 1P Pro specific |
| 1482 | `native-ts/color-diff/index.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1483 | `native-ts/file-index/index.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1484 | `native-ts/yoga-layout/index.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1485 | `outputStyles/loadOutputStylesDir.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1486 | `plugins/builtinPlugins.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1487 | `projectOnboardingState.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1488 | `query/deps.ts` | `` | T0 | MISSING | high | ALIGNED | adapt-new | DI types + productionDeps for QL |
| 1489 | `query/stopHooks.ts` | `` | T0 | MISSING | high | ALIGNED | adapt-new | Stop hook executor; ANT features stub; improved: extracted from query.ts |
| 1490 | `remote/RemoteSessionManager.ts` | `` | EXT | MISSING | high | UNTOUCHED | copy |  |
| 1491 | `remote/SessionsWebSocket.ts` | `` | EXT | MISSING | high | UNTOUCHED | copy |  |
| 1492 | `remote/remotePermissionBridge.ts` | `` | EXT | MISSING | high | UNTOUCHED | copy |  |
| 1493 | `remote/sdkMessageAdapter.ts` | `` | EXT | MISSING | high | UNTOUCHED | copy |  |
| 1494 | `replLauncher.tsx` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1495 | `schemas/hooks.ts` | `` | T7 | MISSING | high | UNTOUCHED | copy |  |
| 1496 | `screens/Doctor.tsx` | `` | T2 | MISSING | high | UNTOUCHED | copy |  |
| 1497 | `screens/REPL.tsx` | `` | T2 | MISSING | high | UNTOUCHED | copy |  |
| 1498 | `screens/ResumeConversation.tsx` | `` | T2 | MISSING | high | UNTOUCHED | copy |  |
| 1499 | `server/createDirectConnectSession.ts` | `` | EXT | MISSING | high | UNTOUCHED | copy |  |
| 1500 | `server/directConnectManager.ts` | `` | EXT | MISSING | high | UNTOUCHED | copy |  |
| 1501 | `services/PromptSuggestion/speculation.ts` | `` | T5 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1502 | `services/SessionMemory/sessionMemoryUtils.ts` | `` | T5 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1503 | `services/analytics/datadog.ts` | `` | T5 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1504 | `services/analytics/firstPartyEventLogger.ts` | `` | T5 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1505 | `services/analytics/firstPartyEventLoggingExporter.ts` | `` | T5 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1506 | `services/analytics/growthbook.ts` | `` | T5 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1507 | `services/analytics/index.ts` | `` | T5 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1508 | `services/analytics/metadata.ts` | `` | T5 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1509 | `services/analytics/sink.ts` | `` | T5 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1510 | `services/analytics/sinkKillswitch.ts` | `` | T5 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1511 | `services/api/adminRequests.ts` | `` | T5 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1512 | `services/api/bootstrap.ts` | `` | T5 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1513 | `services/api/claude.ts` | `` | T5 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1514 | `services/api/client.ts` | `` | T5 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1515 | `services/api/dumpPrompts.ts` | `` | T5 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1516 | `services/api/errors.ts` | `` | T5 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1517 | `services/api/filesApi.ts` | `` | T5 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1518 | `services/api/firstTokenDate.ts` | `` | T5 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1519 | `services/api/grove.ts` | `` | T5 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1520 | `services/api/logging.ts` | `` | T5 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1521 | `services/api/metricsOptOut.ts` | `` | T5 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1522 | `services/api/overageCreditGrant.ts` | `` | T5 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1523 | `services/api/promptCacheBreakDetection.ts` | `` | T5 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1524 | `services/api/referral.ts` | `` | T5 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1525 | `services/api/sessionIngress.ts` | `` | T5 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1526 | `services/api/ultrareviewQuota.ts` | `` | T5 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1527 | `services/api/usage.ts` | `` | T5 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1528 | `services/api/withRetry.ts` | `` | T5 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1529 | `services/autoDream/autoDream.ts` | `` | T5 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1530 | `services/autoDream/config.ts` | `` | T5 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1531 | `services/autoDream/consolidationLock.ts` | `` | T5 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1532 | `services/autoDream/consolidationPrompt.ts` | `` | T5 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1533 | `services/claudeAiLimits.ts` | `` | T5 | MISSING | high | UNTOUCHED | copy |  |
| 1534 | `services/claudeAiLimitsHook.ts` | `` | T5 | MISSING | high | UNTOUCHED | copy |  |
| 1535 | `services/compact/apiMicrocompact.ts` | `` | T5 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1536 | `services/compact/autoCompact.ts` | `` | T5 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1537 | `services/compact/compact.ts` | `` | T5 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1538 | `services/compact/microCompact.ts` | `` | T5 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1539 | `services/compact/postCompactCleanup.ts` | `` | T5 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1540 | `services/compact/prompt.ts` | `` | T5 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1541 | `services/compact/sessionMemoryCompact.ts` | `` | T5 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1542 | `services/compact/timeBasedMCConfig.ts` | `` | T5 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1543 | `services/diagnosticTracking.ts` | `` | T5 | MISSING | high | UNTOUCHED | copy |  |
| 1544 | `services/extractMemories/extractMemories.ts` | `` | T5 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1545 | `services/internalLogging.ts` | `` | T5 | MISSING | high | UNTOUCHED | copy |  |
| 1546 | `services/mcp/MCPConnectionManager.tsx` | `` | T5 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1547 | `services/mcp/auth.ts` | `` | T5 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1548 | `services/mcp/channelAllowlist.ts` | `` | T5 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1549 | `services/mcp/channelNotification.ts` | `` | T5 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1550 | `services/mcp/channelPermissions.ts` | `` | T5 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1551 | `services/mcp/claudeai.ts` | `` | T5 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1552 | `services/mcp/config.ts` | `` | T5 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1553 | `services/mcp/elicitationHandler.ts` | `` | T5 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1554 | `services/mcp/headersHelper.ts` | `` | T5 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1555 | `services/mcp/useManageMCPConnections.ts` | `` | T5 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1556 | `services/mcp/utils.ts` | `` | T5 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1557 | `services/mcp/vscodeSdkMcp.ts` | `` | T5 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1558 | `services/mcp/xaa.ts` | `` | T5 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1559 | `services/mcp/xaaIdpLogin.ts` | `` | T5 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1560 | `services/mcpServerApproval.tsx` | `` | T5 | MISSING | high | UNTOUCHED | copy |  |
| 1561 | `services/mockRateLimits.ts` | `` | T5 | MISSING | high | UNTOUCHED | copy |  |
| 1562 | `services/notifier.ts` | `` | T5 | MISSING | high | UNTOUCHED | copy |  |
| 1563 | `services/oauth/auth-code-listener.ts` | `` | T5 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1564 | `services/oauth/client.ts` | `` | T5 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1565 | `services/oauth/getOauthProfile.ts` | `` | T5 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1566 | `services/plugins/PluginInstallationManager.ts` | `` | T5 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1567 | `services/plugins/pluginCliCommands.ts` | `` | T5 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1568 | `services/plugins/pluginOperations.ts` | `` | T5 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1569 | `services/policyLimits/index.ts` | `` | T5 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1570 | `services/rateLimitMessages.ts` | `` | T5 | MISSING | high | UNTOUCHED | copy |  |
| 1571 | `services/rateLimitMocking.ts` | `` | T5 | MISSING | high | UNTOUCHED | copy |  |
| 1572 | `services/remoteManagedSettings/index.ts` | `` | T5 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1573 | `services/remoteManagedSettings/securityCheck.tsx` | `` | T5 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1574 | `services/remoteManagedSettings/syncCache.ts` | `` | T5 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1575 | `services/remoteManagedSettings/syncCacheState.ts` | `` | T5 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1576 | `services/settingsSync/index.ts` | `` | T5 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1577 | `services/teamMemorySync/index.ts` | `` | T5 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1578 | `services/teamMemorySync/secretScanner.ts` | `` | T5 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1579 | `services/teamMemorySync/teamMemSecretGuard.ts` | `` | T5 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1580 | `services/teamMemorySync/types.ts` | `` | T5 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1581 | `services/teamMemorySync/watcher.ts` | `` | T5 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1582 | `services/tips/tipRegistry.ts` | `` | T5 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1583 | `services/toolUseSummary/toolUseSummaryGenerator.ts` | `` | T5 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1584 | `services/tools/StreamingToolExecutor.ts` | `` | T5 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1585 | `services/tools/toolExecution.ts` | `` | T5 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1586 | `services/tools/toolHooks.ts` | `` | T5 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1587 | `services/tools/toolOrchestration.ts` | `` | T5 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1588 | `services/vcr.ts` | `` | T5 | MISSING | high | UNTOUCHED | copy |  |
| 1589 | `services/voice.ts` | `` | T5 | MISSING | high | UNTOUCHED | copy |  |
| 1590 | `services/voiceKeyterms.ts` | `` | T5 | MISSING | high | UNTOUCHED | copy |  |
| 1591 | `services/voiceStreamSTT.ts` | `` | T5 | MISSING | high | UNTOUCHED | copy |  |
| 1592 | `setup.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1593 | `skills/bundled/batch.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1594 | `skills/bundled/claudeApi.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1595 | `skills/bundled/claudeApiContent.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1596 | `skills/bundled/claudeInChrome.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1597 | `skills/bundled/debug.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1598 | `skills/bundled/index.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1599 | `skills/bundled/keybindings.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1600 | `skills/bundled/loop.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1601 | `skills/bundled/loremIpsum.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1602 | `skills/bundled/remember.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1603 | `skills/bundled/scheduleRemoteAgents.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1604 | `skills/bundled/simplify.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1605 | `skills/bundled/skillify.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1606 | `skills/bundled/stuck.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1607 | `skills/bundled/updateConfig.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1608 | `skills/bundled/verify.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1609 | `skills/bundled/verifyContent.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1610 | `skills/bundledSkills.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1611 | `skills/loadSkillsDir.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1612 | `state/AppState.tsx` | `` | T0 | MISSING | high | ALIGNED | adapt-new | React层; useAppState/useSetAppState/global store |
| 1613 | `state/AppStateStore.ts` | `` | T0 | MISSING | high | ALIGNED | adapt-new | 精简AppState类型; 去除Bridge/Swarm; improved:更小更可追踪 |
| 1614 | `state/onChangeAppState.ts` | `` | T0 | MISSING | high | ALIGNED | adapt-new | 状态副作用; 同步bootstrap/state.ts; ANT sink裁剪 |
| 1615 | `state/selectors.ts` | `` | T0 | MISSING | high | ALIGNED | adapt-new | 20个纯选择器; 去除Swarm路由 |
| 1616 | `state/teammateViewHelpers.ts` | `` | T0 | MISSING | high | ALIGNED | adapt-new | Swarm视图助手存根; Phase D候选 |
| 1617 | `tasks.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1618 | `tasks/DreamTask/DreamTask.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1619 | `tasks/InProcessTeammateTask/InProcessTeammateTask.tsx` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1620 | `tasks/InProcessTeammateTask/types.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1621 | `tasks/LocalAgentTask/LocalAgentTask.tsx` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1622 | `tasks/LocalMainSessionTask.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1623 | `tasks/LocalShellTask/LocalShellTask.tsx` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1624 | `tasks/LocalShellTask/guards.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1625 | `tasks/LocalShellTask/killShellTasks.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1626 | `tasks/RemoteAgentTask/RemoteAgentTask.tsx` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1627 | `tasks/pillLabel.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1628 | `tasks/stopTask.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1629 | `tasks/types.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1630 | `tools.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1631 | `tools/AgentTool/AgentTool.tsx` | `tools/AgentTool.ts` | T1 | RESTRUCTURED | medium | ALIGNED | skip |  |
| 1632 | `tools/AgentTool/UI.tsx` | `` | T1 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1633 | `tools/AgentTool/agentToolUtils.ts` | `` | T1 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1634 | `tools/AgentTool/built-in/claudeCodeGuideAgent.ts` | `` | T1 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1635 | `tools/AgentTool/built-in/statuslineSetup.ts` | `tools/AgentTool/built-in/statuslineSetup.ts` | T1 | RESTRUCTURED | high | ALIGNED | adapt-new | created; QiLing consolidates agent defs in builtInAgents.ts |
| 1636 | `tools/AgentTool/built-in/verificationAgent.ts` | `tools/AgentTool/built-in/verificationAgent.ts` | T1 | PARTIAL | high | ALIGNED | adapt-new | systemPrompt replaces getSystemPrompt(); wired into builtInAgents.ts |
| 1637 | `tools/AgentTool/forkSubagent.ts` | `` | T1 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1638 | `tools/AgentTool/prompt.ts` | `` | T1 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1639 | `tools/AgentTool/resumeAgent.ts` | `` | T1 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1640 | `tools/AgentTool/runAgent.ts` | `` | T1 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1641 | `tools/AskUserQuestionTool/AskUserQuestionTool.tsx` | `tools/AskUserQuestionTool.ts` | T1 | RESTRUCTURED | medium | ALIGNED | skip |  |
| 1642 | `tools/BashTool/BashTool.tsx` | `tools/BashTool.ts` | T1 | RESTRUCTURED | medium | ALIGNED | skip |  |
| 1643 | `tools/BashTool/BashToolResultMessage.tsx` | `` | T1 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1644 | `tools/BashTool/UI.tsx` | `` | T1 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1645 | `tools/BashTool/bashCommandHelpers.ts` | `tools/BashTool/bashCommandHelpers.ts` | T1 | MISSING | high | ALIGNED | adapt-new | full port; ParsedCommand.ts ported; BashTool import ../BashTool.js |
| 1646 | `tools/BashTool/bashPermissions.ts` | `tools/BashTool/bashPermissions.ts` | T1 | MISSING | high | ALIGNED | adapt-new | full port; stripped bun-bundle/ANT analytics; type shims for ToolPermissionContext/PermissionResult |
| 1647 | `tools/BashTool/modeValidation.ts` | `src/tools/BashTool/modeValidation.ts` | T1 | PARTIAL | high | ALIGNED | adapt-new | PermissionDecision\|null (null=passthrough); ToolPermissionContext from state/AppStateStore |
| 1648 | `tools/BashTool/pathValidation.ts` | `tools/BashTool/pathValidation.ts` | T1 | MISSING | high | ALIGNED | adapt-new | stub: passthrough; blocked on filesystem.ts |
| 1649 | `tools/BashTool/prompt.ts` | `tools/BashTool/prompt.ts` | T1 | MISSING | high | ALIGNED | adapt-new | stripped bun-bundle/ANT features; simplified sandbox section; prependBullets from constants/prompts |
| 1650 | `tools/BashTool/readOnlyValidation.ts` | `tools/BashTool/readOnlyValidation.ts` | T1 | MISSING | high | ALIGNED | adapt-new | adapt-new; drop ANT_ONLY; bashCommandIsSafe_DEPRECATED→bashCommandIsSafe(.behavior!=='allow') |
| 1651 | `tools/BashTool/sedEditParser.ts` | `src/tools/BashTool/sedEditParser.ts` | T1 | FULLY_ALIGNED | high | ALIGNED | — | file exists; tracker had empty target path |
| 1652 | `tools/BashTool/shouldUseSandbox.ts` | `tools/BashTool/shouldUseSandbox.ts` | T1 | MISSING | high | ALIGNED | adapt-new | full port; stripped ANT analytics; getSettings_DEPRECATED → empty stub |
| 1653 | `tools/BriefTool/BriefTool.ts` | `tools/BriefTool.ts` | T1 | RESTRUCTURED | medium | ALIGNED | skip |  |
| 1654 | `tools/BriefTool/UI.tsx` | `` | T1 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1655 | `tools/BriefTool/attachments.ts` | `` | T1 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1656 | `tools/BriefTool/upload.ts` | `` | T1 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1657 | `tools/ConfigTool/ConfigTool.ts` | `tools/ConfigTool.ts` | T1 | RESTRUCTURED | medium | ALIGNED | skip |  |
| 1658 | `tools/ConfigTool/UI.tsx` | `` | T1 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1659 | `tools/ConfigTool/prompt.ts` | `tools/ConfigTool/prompt.ts` | T1 | PARTIAL | high | ALIGNED | adapt-new | stripped GrowthBook voice flag; path → ~/.qiling; LOC marked |
| 1660 | `tools/ConfigTool/supportedSettings.ts` | `tools/ConfigTool/supportedSettings.ts` | T1 | PARTIAL | high | ALIGNED | adapt-new | stripped remote-control/GrowthBook; hardcoded model options |
| 1661 | `tools/EnterPlanModeTool/EnterPlanModeTool.ts` | `tools/EnterPlanModeTool.ts` | T1 | RESTRUCTURED | medium | ALIGNED | skip |  |
| 1662 | `tools/EnterPlanModeTool/UI.tsx` | `` | T1 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1663 | `tools/EnterPlanModeTool/prompt.ts` | `tools/EnterPlanModeTool/prompt.ts` | T1 | PARTIAL | high | ALIGNED | adapt-new | external-only; isPlanModeInterviewPhaseEnabled removed |
| 1664 | `tools/EnterWorktreeTool/EnterWorktreeTool.ts` | `tools/EnterWorktreeTool.ts` | T1 | RESTRUCTURED | medium | ALIGNED | skip |  |
| 1665 | `tools/EnterWorktreeTool/UI.tsx` | `` | T1 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1666 | `tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts` | `tools/ExitPlanModeTool.ts` | T1 | RESTRUCTURED | medium | ALIGNED | skip |  |
| 1667 | `tools/ExitPlanModeTool/UI.tsx` | `` | T1 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1668 | `tools/ExitWorktreeTool/ExitWorktreeTool.ts` | `tools/ExitWorktreeTool.ts` | T1 | RESTRUCTURED | medium | ALIGNED | skip |  |
| 1669 | `tools/ExitWorktreeTool/UI.tsx` | `` | T1 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1670 | `tools/FileEditTool/FileEditTool.ts` | `tools/FileEditTool.ts` | T1 | RESTRUCTURED | medium | ALIGNED | skip |  |
| 1671 | `tools/FileEditTool/UI.tsx` | `` | T1 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1672 | `tools/FileEditTool/utils.ts` | `src/tools/FileEditTool/utils.ts` | T1 | PARTIAL | high | ALIGNED | adapt-new | readFileSyncCached→readFileSync('utf-8'); getPatchForDisplay sig adapted |
| 1673 | `tools/FileReadTool/FileReadTool.ts` | `tools/FileReadTool.ts` | T1 | RESTRUCTURED | medium | ALIGNED | skip |  |
| 1674 | `tools/FileReadTool/UI.tsx` | `` | T1 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1675 | `tools/FileReadTool/limits.ts` | `tools/FileReadTool/limits.ts` | T1 | PARTIAL | high | ALIGNED | adapt-new | GrowthBook/memoize removed; env var + hardcoded defaults only |
| 1676 | `tools/FileWriteTool/FileWriteTool.ts` | `tools/FileWriteTool.ts` | T1 | RESTRUCTURED | medium | ALIGNED | skip |  |
| 1677 | `tools/FileWriteTool/UI.tsx` | `` | T1 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1678 | `tools/GlobTool/GlobTool.ts` | `tools/GlobTool.ts` | T1 | RESTRUCTURED | medium | ALIGNED | skip |  |
| 1679 | `tools/GlobTool/UI.tsx` | `` | T1 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1680 | `tools/GrepTool/GrepTool.ts` | `tools/GrepTool.ts` | T1 | RESTRUCTURED | medium | ALIGNED | skip |  |
| 1681 | `tools/GrepTool/UI.tsx` | `` | T1 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1682 | `tools/LSPTool/LSPTool.ts` | `tools/LspTool.ts` | T1 | RESTRUCTURED | medium | ALIGNED | skip |  |
| 1683 | `tools/LSPTool/UI.tsx` | `` | T1 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1684 | `tools/LSPTool/formatters.ts` | `tools/LspTool/formatters.ts` | T1 | RESTRUCTURED | medium | ALIGNED | skip |  |
| 1685 | `tools/LSPTool/prompt.ts` | `tools/LspTool/prompt.ts` | T1 | PARTIAL | high | ALIGNED | adapt-new | file existed; descriptions slightly shortened |
| 1686 | `tools/LSPTool/schemas.ts` | `tools/LspTool/schemas.ts` | T1 | RESTRUCTURED | medium | ALIGNED | skip |  |
| 1687 | `tools/LSPTool/symbolContext.ts` | `tools/LspTool/symbolContext.ts` | T1 | RESTRUCTURED | medium | ALIGNED | skip |  |
| 1688 | `tools/ListMcpResourcesTool/ListMcpResourcesTool.ts` | `tools/ListMcpResourcesTool.ts` | T1 | RESTRUCTURED | medium | ALIGNED | skip |  |
| 1689 | `tools/ListMcpResourcesTool/UI.tsx` | `` | T1 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1690 | `tools/MCPTool/MCPTool.ts` | `tools/McpTool.ts` | T1 | RESTRUCTURED | medium | ALIGNED | skip |  |
| 1691 | `tools/MCPTool/UI.tsx` | `` | T1 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1692 | `tools/MCPTool/classifyForCollapse.ts` | `tools/McpTool/classifyForCollapse.ts` | T1 | RESTRUCTURED | medium | ALIGNED | skip |  |
| 1693 | `tools/MCPTool/prompt.ts` | `tools/McpTool/prompt.ts` | T1 | RESTRUCTURED | medium | ALIGNED | skip |  |
| 1694 | `tools/McpAuthTool/McpAuthTool.ts` | `tools/McpAuthTool.ts` | T1 | RESTRUCTURED | medium | ALIGNED | skip |  |
| 1695 | `tools/NotebookEditTool/NotebookEditTool.ts` | `tools/NotebookEditTool.ts` | T1 | RESTRUCTURED | medium | ALIGNED | skip |  |
| 1696 | `tools/NotebookEditTool/UI.tsx` | `` | T1 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1697 | `tools/PowerShellTool/PowerShellTool.tsx` | `tools/PowerShellTool.ts` | T1 | RESTRUCTURED | medium | ALIGNED | skip |  |
| 1698 | `tools/PowerShellTool/UI.tsx` | `` | T1 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1699 | `tools/PowerShellTool/modeValidation.ts` | `tools/PowerShellTool/modeValidation.ts` | T1 | MISSING | high | ALIGNED | copy-verbatim | decisionReason.type 'mode'→'other' |
| 1700 | `tools/PowerShellTool/pathValidation.ts` | `tools/PowerShellTool/pathValidation.ts` | T1 | MISSING | high | ALIGNED | copy-verbatim | PermissionRule→PermissionRule.ts; safeResolvePath→safeResolvePathCC; blockedPath removed |
| 1701 | `tools/PowerShellTool/powershellPermissions.ts` | `tools/PowerShellTool/powershellPermissions.ts` | T1 | MISSING | high | ALIGNED | adapt-new | PermissionResult/PermissionDecisionReason from PermissionResult.ts; all 4 PS deps complete |
| 1702 | `tools/PowerShellTool/prompt.ts` | `tools/PowerShellTool/prompt.ts` | T1 | NEW | high | ALIGNED | adapt-new | created; getPrompt() with edition-specific guidance via getPowerShellEdition() |
| 1703 | `tools/PowerShellTool/readOnlyValidation.ts` | `tools/PowerShellTool/readOnlyValidation.ts` | T1 | MISSING | high | ALIGNED | adapt-new | drop isGhSafe ANT guard; GH_READ_ONLY_COMMANDS empty |
| 1704 | `tools/REPLTool/primitiveTools.ts` | `tools/REPLTool/primitiveTools.ts` | T1 | PARTIAL | high | ALIGNED | adapt-new | flat QiLing imports; lazy getter preserved |
| 1705 | `tools/ReadMcpResourceTool/ReadMcpResourceTool.ts` | `tools/ReadMcpResourceTool.ts` | T1 | RESTRUCTURED | medium | ALIGNED | skip |  |
| 1706 | `tools/ReadMcpResourceTool/UI.tsx` | `` | T1 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1707 | `tools/RemoteTriggerTool/RemoteTriggerTool.ts` | `tools/RemoteTriggerTool.ts` | T1 | RESTRUCTURED | medium | ALIGNED | skip |  |
| 1708 | `tools/RemoteTriggerTool/UI.tsx` | `` | T1 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1709 | `tools/ScheduleCronTool/CronCreateTool.ts` | `tools/CronCreateTool.ts` | T1 | RESTRUCTURED | medium | ALIGNED | skip |  |
| 1710 | `tools/ScheduleCronTool/CronDeleteTool.ts` | `tools/CronDeleteTool.ts` | T1 | RESTRUCTURED | medium | ALIGNED | skip |  |
| 1711 | `tools/ScheduleCronTool/CronListTool.ts` | `tools/CronListTool.ts` | T1 | RESTRUCTURED | medium | ALIGNED | skip |  |
| 1712 | `tools/ScheduleCronTool/UI.tsx` | `` | T1 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1713 | `tools/SendMessageTool/SendMessageTool.ts` | `tools/SendMessageTool.ts` | T1 | RESTRUCTURED | medium | ALIGNED | skip |  |
| 1714 | `tools/SendMessageTool/UI.tsx` | `` | T1 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1715 | `tools/SkillTool/SkillTool.ts` | `tools/SkillTool.ts` | T1 | RESTRUCTURED | medium | ALIGNED | skip |  |
| 1716 | `tools/SkillTool/UI.tsx` | `` | T1 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1717 | `tools/SkillTool/prompt.ts` | `` | T1 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1718 | `tools/SyntheticOutputTool/SyntheticOutputTool.ts` | `tools/SyntheticOutputTool.ts` | T1 | RESTRUCTURED | medium | ALIGNED | skip |  |
| 1719 | `tools/TaskCreateTool/TaskCreateTool.ts` | `tools/TaskCreateTool.ts` | T1 | RESTRUCTURED | medium | ALIGNED | skip |  |
| 1720 | `tools/TaskGetTool/TaskGetTool.ts` | `tools/TaskGetTool.ts` | T1 | RESTRUCTURED | medium | ALIGNED | skip |  |
| 1721 | `tools/TaskListTool/TaskListTool.ts` | `tools/TaskListTool.ts` | T1 | RESTRUCTURED | medium | ALIGNED | skip |  |
| 1722 | `tools/TaskOutputTool/TaskOutputTool.tsx` | `tools/TaskOutputTool.ts` | T1 | RESTRUCTURED | medium | ALIGNED | skip |  |
| 1723 | `tools/TaskStopTool/TaskStopTool.ts` | `tools/TaskStopTool.ts` | T1 | RESTRUCTURED | medium | ALIGNED | skip |  |
| 1724 | `tools/TaskStopTool/UI.tsx` | `` | T1 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1725 | `tools/TaskUpdateTool/TaskUpdateTool.ts` | `tools/TaskUpdateTool.ts` | T1 | RESTRUCTURED | medium | ALIGNED | skip |  |
| 1726 | `tools/TeamCreateTool/TeamCreateTool.ts` | `tools/TeamCreateTool.ts` | T1 | RESTRUCTURED | medium | ALIGNED | skip |  |
| 1727 | `tools/TeamCreateTool/UI.tsx` | `` | T1 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1728 | `tools/TeamDeleteTool/TeamDeleteTool.ts` | `tools/TeamDeleteTool.ts` | T1 | RESTRUCTURED | medium | ALIGNED | skip |  |
| 1729 | `tools/TeamDeleteTool/UI.tsx` | `` | T1 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1730 | `tools/TodoWriteTool/TodoWriteTool.ts` | `tools/TodoWriteTool.ts` | T1 | RESTRUCTURED | medium | ALIGNED | skip |  |
| 1731 | `tools/TodoWriteTool/prompt.ts` | `tools/TodoWriteTool/prompt.ts` | T1 | FULLY_ALIGNED | high | ALIGNED | copy-verbatim |  |
| 1732 | `tools/ToolSearchTool/ToolSearchTool.ts` | `tools/ToolSearchTool.ts` | T1 | RESTRUCTURED | medium | ALIGNED | skip |  |
| 1733 | `tools/WebFetchTool/UI.tsx` | `` | T1 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1734 | `tools/WebFetchTool/WebFetchTool.ts` | `tools/WebFetchTool.ts` | T1 | RESTRUCTURED | medium | ALIGNED | skip |  |
| 1735 | `tools/WebFetchTool/utils.ts` | `` | T1 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1736 | `tools/WebSearchTool/UI.tsx` | `` | T1 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1737 | `tools/WebSearchTool/WebSearchTool.ts` | `tools/WebSearchTool.ts` | T1 | RESTRUCTURED | medium | ALIGNED | skip |  |
| 1738 | `tools/shared/spawnMultiAgent.ts` | `` | T1 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1739 | `tools/testing/TestingPermissionTool.tsx` | `` | T1 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1740 | `tools/utils.ts` | `tools/toolUtils.ts` | T1 | RESTRUCTURED | medium | ALIGNED | skip | renamed toolUtils.ts; same two exports (tagMessagesWithToolUseID, getToolUseIDFromParentMessage) |
| 1741 | `types/command.ts` | `` | T7 | MISSING | high | UNTOUCHED | copy |  |
| 1742 | `types/generated/events_mono/claude_code/v1/claude_code_int…` | `` | T7 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1743 | `types/generated/events_mono/common/v1/auth.ts` | `` | T7 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1744 | `types/generated/events_mono/growthbook/v1/growthbook_exper…` | `` | T7 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1745 | `types/generated/google/protobuf/timestamp.ts` | `` | T7 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1746 | `types/hooks.ts` | `` | T7 | MISSING | high | UNTOUCHED | copy |  |
| 1747 | `types/logs.ts` | `` | T7 | MISSING | high | UNTOUCHED | copy |  |
| 1748 | `types/permissions.ts` | `types/permissions.ts` | T7 | MISSING | high | ALIGNED | copy | partial: PendingClassifierCheck + Working/AdditionalDirectory types |
| 1749 | `types/plugin.ts` | `` | T7 | MISSING | high | UNTOUCHED | copy |  |
| 1750 | `types/textInputTypes.ts` | `` | T7 | MISSING | high | UNTOUCHED | copy |  |
| 1751 | `upstreamproxy/relay.ts` | `` | EXT | MISSING | high | UNTOUCHED | copy |  |
| 1752 | `upstreamproxy/upstreamproxy.ts` | `` | EXT | MISSING | high | UNTOUCHED | copy |  |
| 1753 | `utils/Shell.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1754 | `utils/ShellCommand.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1755 | `utils/advisor.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1756 | `utils/agenticSessionSearch.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1757 | `utils/ansiToPng.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1758 | `utils/ansiToSvg.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1759 | `utils/api.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1760 | `utils/appleTerminalBackup.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1761 | `utils/asciicast.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1762 | `utils/attachments.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1763 | `utils/attribution.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1764 | `utils/authFileDescriptor.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1765 | `utils/authPortable.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1766 | `utils/autoUpdater.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1767 | `utils/background/remote/preconditions.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1768 | `utils/background/remote/remoteSession.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1769 | `utils/bash/ParsedCommand.ts` | `utils/bash/ParsedCommand.ts` | T6 | MISSING | high | ALIGNED | adapt-new | copy-with-refs; Node=unknown→BashNode cast; parseCommandRaw; getTreeSitterAvailable |
| 1770 | `utils/bash/ShellSnapshot.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1771 | `utils/bash/bashParser.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1772 | `utils/bash/bashPipeCommand.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1773 | `utils/bash/parser.ts` | `utils/bash/parser.ts` | T6 | MISSING | high | ALIGNED | adapt-new | stub: parseCommandRaw returns null (tree-sitter deferred) |
| 1774 | `utils/bash/prefix.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1775 | `utils/bash/shellCompletion.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1776 | `utils/bash/treeSitterAnalysis.ts` | `utils/bash/treeSitterAnalysis.ts` | T6 | MISSING | high | ALIGNED | copy-verbatim | no external deps; self-contained AST analysis |
| 1777 | `utils/betas.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1778 | `utils/billing.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1779 | `utils/claudeDesktop.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1780 | `utils/claudeInChrome/chromeNativeHost.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1781 | `utils/claudeInChrome/common.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1782 | `utils/claudeInChrome/mcpServer.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1783 | `utils/claudeInChrome/prompt.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1784 | `utils/claudeInChrome/setup.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1785 | `utils/claudeInChrome/setupPortable.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1786 | `utils/claudeInChrome/toolRendering.tsx` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1787 | `utils/cleanup.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1788 | `utils/collapseBackgroundBashNotifications.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1789 | `utils/collapseHookSummaries.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1790 | `utils/collapseTeammateShutdowns.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1791 | `utils/commitAttribution.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1792 | `utils/computerUse/appNames.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1793 | `utils/computerUse/cleanup.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1794 | `utils/computerUse/common.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1795 | `utils/computerUse/computerUseLock.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1796 | `utils/computerUse/drainRunLoop.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1797 | `utils/computerUse/escHotkey.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1798 | `utils/computerUse/executor.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1799 | `utils/computerUse/gates.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1800 | `utils/computerUse/hostAdapter.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1801 | `utils/computerUse/inputLoader.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1802 | `utils/computerUse/mcpServer.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1803 | `utils/computerUse/setup.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1804 | `utils/computerUse/swiftLoader.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1805 | `utils/computerUse/toolRendering.tsx` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1806 | `utils/computerUse/wrapper.tsx` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1807 | `utils/concurrentSessions.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1808 | `utils/config.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1809 | `utils/context.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1810 | `utils/contextAnalysis.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1811 | `utils/conversationRecovery.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1812 | `utils/cronJitterConfig.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1813 | `utils/cronScheduler.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1814 | `utils/cronTasks.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1815 | `utils/cronTasksLock.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1816 | `utils/crossProjectResume.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1817 | `utils/debug.ts` | `utils/debug.ts` | T6 | MISSING | high | ALIGNED | copy | stub re-export from utils/log.ts |
| 1818 | `utils/deepLink/banner.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1819 | `utils/deepLink/parseDeepLink.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1820 | `utils/deepLink/protocolHandler.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1821 | `utils/deepLink/registerProtocol.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1822 | `utils/deepLink/terminalLauncher.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1823 | `utils/deepLink/terminalPreference.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1824 | `utils/desktopDeepLink.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1825 | `utils/doctorContextWarnings.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1826 | `utils/doctorDiagnostic.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1827 | `utils/dxt/helpers.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1828 | `utils/dxt/zip.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1829 | `utils/envDynamic.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1830 | `utils/errorLogSink.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1831 | `utils/execFileNoThrowPortable.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1832 | `utils/exportRenderer.tsx` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1833 | `utils/extraUsage.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1834 | `utils/fastMode.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1835 | `utils/fileOperationAnalytics.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1836 | `utils/filePersistence/filePersistence.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1837 | `utils/forkedAgent.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1838 | `utils/fullscreen.ts` | `utils/fullscreen.ts` | T6 | MISSING | high | ALIGNED | copy-verbatim | useCwd→omit; USER_TYPE=ant → false for QiLing (opt-in) |
| 1839 | `utils/githubRepoPathMapping.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1840 | `utils/groupToolUses.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1841 | `utils/handlePromptSubmit.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1842 | `utils/headlessProfiler.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1843 | `utils/heapDumpService.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1844 | `utils/hooks.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1845 | `utils/hooks/AsyncHookRegistry.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1846 | `utils/hooks/apiQueryHookHelper.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1847 | `utils/hooks/execAgentHook.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1848 | `utils/hooks/execHttpHook.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1849 | `utils/hooks/execPromptHook.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1850 | `utils/hooks/fileChangedWatcher.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1851 | `utils/hooks/hookHelpers.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1852 | `utils/hooks/hooksConfigManager.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1853 | `utils/hooks/hooksConfigSnapshot.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1854 | `utils/hooks/hooksSettings.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1855 | `utils/hooks/registerFrontmatterHooks.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1856 | `utils/hooks/sessionHooks.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1857 | `utils/hooks/skillImprovement.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1858 | `utils/hooks/ssrfGuard.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1859 | `utils/iTermBackup.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1860 | `utils/ide.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1861 | `utils/imagePaste.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1862 | `utils/imageStore.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1863 | `utils/immediateCommand.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1864 | `utils/inProcessTeammateHelpers.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1865 | `utils/jetbrains.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1866 | `utils/listSessionsImpl.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1867 | `utils/localInstaller.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1868 | `utils/logoV2Utils.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1869 | `utils/managedEnv.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1870 | `utils/mcp/dateTimeParser.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1871 | `utils/mcp/elicitationValidation.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1872 | `utils/mcpInstructionsDelta.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1873 | `utils/memory/types.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1874 | `utils/messageQueueManager.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1875 | `utils/messages/mappers.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1876 | `utils/messages/systemInit.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1877 | `utils/model/agent.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1878 | `utils/model/antModels.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1879 | `utils/model/bedrock.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1880 | `utils/model/model.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1881 | `utils/model/modelCapabilities.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1882 | `utils/model/modelOptions.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1883 | `utils/model/modelStrings.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1884 | `utils/model/validateModel.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1885 | `utils/nativeInstaller/download.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1886 | `utils/nativeInstaller/index.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1887 | `utils/nativeInstaller/installer.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1888 | `utils/nativeInstaller/packageManagers.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1889 | `utils/nativeInstaller/pidLock.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1890 | `utils/permissions/PermissionPromptToolResultSchema.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1891 | `utils/permissions/PermissionUpdate.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1892 | `utils/permissions/autoModeState.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1893 | `utils/permissions/bypassPermissionsKillswitch.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1894 | `utils/permissions/classifierDecision.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1895 | `utils/permissions/filesystem.ts` | `utils/permissions/filesystem.ts` | T6 | MISSING | high | ALIGNED | adapt-new | full port; inline stubs for memdir/agentMemory/settings/UNC; adapted getPlanSlug/getPlansDirectory; isScratchpadEnabled=false |
| 1896 | `utils/permissions/getNextPermissionMode.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1897 | `utils/permissions/pathValidation.ts` | `utils/permissions/pathValidation.ts` | T6 | MISSING | high | ALIGNED | adapt-new | full port; sandbox-adapter→index; safeResolvePathCC adapter |
| 1898 | `utils/permissions/permissionExplainer.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1899 | `utils/permissions/permissionRuleParser.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1900 | `utils/permissions/permissionSetup.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1901 | `utils/permissions/permissions.ts` | `utils/permissions/permissions.ts` | T6 | MISSING | high | ALIGNED | adapt-new | stub: createPermissionRequestMessage + getRuleByContentsForTool |
| 1902 | `utils/permissions/permissionsLoader.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1903 | `utils/permissions/shadowedRuleDetection.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1904 | `utils/permissions/yoloClassifier.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1905 | `utils/planModeV2.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1906 | `utils/plugins/addDirPluginSettings.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1907 | `utils/plugins/cacheUtils.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1908 | `utils/plugins/dependencyResolver.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1909 | `utils/plugins/fetchTelemetry.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1910 | `utils/plugins/headlessPluginInstall.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1911 | `utils/plugins/hintRecommendation.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1912 | `utils/plugins/installCounts.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1913 | `utils/plugins/installedPluginsManager.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1914 | `utils/plugins/loadPluginAgents.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1915 | `utils/plugins/loadPluginCommands.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1916 | `utils/plugins/loadPluginHooks.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1917 | `utils/plugins/loadPluginOutputStyles.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1918 | `utils/plugins/lspPluginIntegration.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1919 | `utils/plugins/lspRecommendation.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1920 | `utils/plugins/marketplaceHelpers.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1921 | `utils/plugins/marketplaceManager.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1922 | `utils/plugins/mcpPluginIntegration.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1923 | `utils/plugins/mcpbHandler.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1924 | `utils/plugins/officialMarketplaceGcs.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1925 | `utils/plugins/officialMarketplaceStartupCheck.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1926 | `utils/plugins/orphanedPluginFilter.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1927 | `utils/plugins/parseMarketplaceInput.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1928 | `utils/plugins/performStartupChecks.tsx` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1929 | `utils/plugins/pluginAutoupdate.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1930 | `utils/plugins/pluginBlocklist.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1931 | `utils/plugins/pluginFlagging.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1932 | `utils/plugins/pluginInstallationHelpers.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1933 | `utils/plugins/pluginLoader.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1934 | `utils/plugins/pluginOptionsStorage.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1935 | `utils/plugins/pluginStartupCheck.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1936 | `utils/plugins/pluginVersioning.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1937 | `utils/plugins/reconciler.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1938 | `utils/plugins/refresh.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1939 | `utils/plugins/schemas.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1940 | `utils/plugins/validatePlugin.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1941 | `utils/plugins/zipCache.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1942 | `utils/plugins/zipCacheAdapters.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1943 | `utils/preflightChecks.tsx` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1944 | `utils/processUserInput/processBashCommand.tsx` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1945 | `utils/processUserInput/processSlashCommand.tsx` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1946 | `utils/processUserInput/processTextPrompt.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1947 | `utils/processUserInput/processUserInput.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1948 | `utils/promptCategory.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1949 | `utils/promptEditor.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1950 | `utils/queryContext.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1951 | `utils/queryProfiler.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1952 | `utils/queueProcessor.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1953 | `utils/readEditContext.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1954 | `utils/readFileInRange.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1955 | `utils/sandbox/sandbox-adapter.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1956 | `utils/screenshotClipboard.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1957 | `utils/sdkEventQueue.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1958 | `utils/secureStorage/keychainPrefetch.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1959 | `utils/secureStorage/macOsKeychainHelpers.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1960 | `utils/secureStorage/macOsKeychainStorage.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1961 | `utils/sessionEnvironment.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1962 | `utils/sessionFileAccessHooks.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1963 | `utils/sessionIngressAuth.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1964 | `utils/sessionRestore.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1965 | `utils/sessionStart.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1966 | `utils/sessionState.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1967 | `utils/sessionStoragePortable.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1968 | `utils/settings/allErrors.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1969 | `utils/settings/applySettingsChange.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1970 | `utils/settings/changeDetector.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1971 | `utils/settings/constants.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1972 | `utils/settings/mdm/constants.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1973 | `utils/settings/mdm/rawRead.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1974 | `utils/settings/mdm/settings.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1975 | `utils/settings/permissionValidation.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1976 | `utils/settings/settings.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1977 | `utils/settings/settingsCache.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1978 | `utils/settings/types.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1979 | `utils/settings/validateEditTool.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1980 | `utils/settings/validation.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1981 | `utils/shell/bashProvider.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1982 | `utils/shell/powershellProvider.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1983 | `utils/shell/prefix.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1984 | `utils/shell/readOnlyCommandValidation.ts` | `utils/shell/readOnlyCommandValidation.ts` | T6 | MISSING | high | ALIGNED | adapt-new | full port; GH_READ_ONLY_COMMANDS→empty (ANT-only); all git/rg/docker/pyright maps + validateFlags |
| 1985 | `utils/shell/specPrefix.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1986 | `utils/sideQuestion.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1987 | `utils/sinks.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1988 | `utils/skills/skillChangeDetector.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1989 | `utils/standaloneAgent.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1990 | `utils/stats.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1991 | `utils/status.tsx` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1992 | `utils/statusNoticeDefinitions.tsx` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1993 | `utils/streamlinedTransform.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 1994 | `utils/suggestions/commandSuggestions.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1995 | `utils/suggestions/slackChannelSuggestions.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1996 | `utils/swarm/It2SetupPrompt.tsx` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1997 | `utils/swarm/backends/ITermBackend.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1998 | `utils/swarm/backends/InProcessBackend.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 1999 | `utils/swarm/backends/PaneBackendExecutor.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 2000 | `utils/swarm/backends/TmuxBackend.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 2001 | `utils/swarm/backends/detection.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 2002 | `utils/swarm/backends/it2Setup.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 2003 | `utils/swarm/backends/registry.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 2004 | `utils/swarm/backends/teammateModeSnapshot.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 2005 | `utils/swarm/backends/types.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 2006 | `utils/swarm/inProcessRunner.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 2007 | `utils/swarm/permissionSync.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 2008 | `utils/swarm/reconnection.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 2009 | `utils/swarm/spawnInProcess.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 2010 | `utils/swarm/spawnUtils.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 2011 | `utils/swarm/teamHelpers.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 2012 | `utils/swarm/teammateInit.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 2013 | `utils/swarm/teammateLayoutManager.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 2014 | `utils/swarm/teammatePromptAddendum.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 2015 | `utils/task/TaskOutput.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 2016 | `utils/task/diskOutput.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 2017 | `utils/task/framework.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 2018 | `utils/task/sdkProgress.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 2019 | `utils/tasks.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 2020 | `utils/teamDiscovery.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 2021 | `utils/teamMemoryOps.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 2022 | `utils/teammate.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 2023 | `utils/teammateMailbox.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 2024 | `utils/telemetry/betaSessionTracing.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 2025 | `utils/telemetry/bigqueryExporter.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 2026 | `utils/telemetry/events.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 2027 | `utils/telemetry/instrumentation.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 2028 | `utils/telemetry/perfettoTracing.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 2029 | `utils/telemetry/pluginTelemetry.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 2030 | `utils/telemetry/sessionTracing.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 2031 | `utils/telemetry/skillLoadedEvent.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 2032 | `utils/telemetryAttributes.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 2033 | `utils/teleport.tsx` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 2034 | `utils/teleport/api.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 2035 | `utils/teleport/environmentSelection.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 2036 | `utils/teleport/environments.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 2037 | `utils/teleport/gitBundle.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 2038 | `utils/terminalPanel.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 2039 | `utils/tmuxSocket.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 2040 | `utils/toolSearch.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 2041 | `utils/transcriptSearch.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 2042 | `utils/ultraplan/ccrSession.ts` | `` | T6 | MISSING | high | UNTOUCHED | adapt-new |  |
| 2043 | `utils/undercover.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 2044 | `utils/user.ts` | `` | T6 | MISSING | high | UNTOUCHED | copy |  |
| 2045 | `voice/voiceModeEnabled.ts` | `` | EXT | MISSING | high | UNTOUCHED | copy |  |
