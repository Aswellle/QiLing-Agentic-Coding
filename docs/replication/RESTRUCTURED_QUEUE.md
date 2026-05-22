# RESTRUCTURED_QUEUE.md

> Restructured files queue (1:N or N:1 path mapping)
> **Purpose:** Pending user decision — keep QiLing structure or align to CC structure
> **Rule:** Do NOT auto-add to BATCH_PLAN — decide first, then act
> **Total:** 109 files

---

## Restructure Mode Legend

| Mode | Meaning | Suggestion |
|------|---------|------------|
| `FLATTEN` | CC sub-dir multi-file merged into QiLing single file | Verify completeness then mark ALIGNED |
| `PROMOTE` | CC `utils/X/Y` promoted to QiLing `X/Y` | Align to QL path |
| `RENAME` | Casing or extension difference only | Verify then mark ALIGNED / PARTIAL |
| `MERGE` | CC multi-file logic in one QiLing file | Check for missing branches |

---

## File List

| # | CC Path | QiLing Path | T | Mode | Suggested Action |
|---|---------|------------|---|------|------------------|
| 1 | `cli/ndjsonSafeStringify.ts` | `utils/ndjsonSafeStringify.ts` | T6 | MERGE | Check for missing logic branches |
| 2 | `commands/hooks/index.ts` | `hooks/index.ts` | T3 | FLATTEN | Depth simplified — verify then mark ALIGNED |
| 3 | `commands/keybindings/index.ts` | `keybindings/index.ts` | T4 | FLATTEN | Depth simplified — verify then mark ALIGNED |
| 4 | `commands/permissions/index.ts` | `permissions/index.ts` | T6 | FLATTEN | Depth simplified — verify then mark ALIGNED |
| 5 | `commands/resume/resume.tsx` | `session/resume.ts` | T6 | FLATTEN | Depth simplified — verify then mark ALIGNED |
| 6 | `commands/status/index.ts` | `commands/index.ts` | EXT | FLATTEN | Depth simplified — verify then mark ALIGNED |
| 7 | `components/PromptInput/PromptInput.tsx` | `components/PromptInput.tsx` | T2 | FLATTEN | Depth simplified — verify then mark ALIGNED |
| 8 | `components/agents/types.ts` | `components/Spinner/types.ts` | T2 | MERGE | Check for missing logic branches |
| 9 | `components/agents/types.ts` | `components/wizard/types.ts` | T2 | MERGE | Check for missing logic branches |
| 10 | `components/agents/types.ts` | `keybindings/types.ts` | T4 | FLATTEN | Depth simplified — verify then mark ALIGNED |
| 11 | `components/agents/types.ts` | `plugins/types.ts` | T6 | FLATTEN | Depth simplified — verify then mark ALIGNED |
| 12 | `components/agents/utils.ts` | `components/FeedbackSurvey/utils.ts` | T2 | MERGE | Check for missing logic branches |
| 13 | `components/permissions/PermissionDialog.tsx` | `components/PermissionDialog.tsx` | T2 | FLATTEN | Depth simplified — verify then mark ALIGNED |
| 14 | `components/tasks/taskStatusUtils.tsx` | `components/tasks/taskStatusUtils.ts` | T2 | RENAME | Extension diff only — verify then mark ALIGNED |
| 15 | `hooks/notifs/useDeprecationWarningNotification.tsx` | `hooks/notifs/useDeprecationWarningNotification.ts` | T3 | RENAME | Extension diff only — verify then mark ALIGNED |
| 16 | `ink/layout/engine.ts` | `compact/engine.ts` | T6 | FLATTEN | Depth simplified — verify then mark ALIGNED |
| 17 | `ink/layout/engine.ts` | `vim/engine.ts` | T2 | FLATTEN | Depth simplified — verify then mark ALIGNED |
| 18 | `keybindings/schema.ts` | `settings/schema.ts` | T0 | MERGE | Check for missing logic branches |
| 19 | `memdir/memoryAge.ts` | `services/memdir/memoryAge.ts` | T5 | PROMOTE | memdir moved into services/ |
| 20 | `memdir/memoryScan.ts` | `services/memdir/memoryScan.ts` | T5 | PROMOTE | memdir moved into services/ |
| 21 | `memdir/memoryTypes.ts` | `services/memdir/memoryTypes.ts` | T5 | PROMOTE | memdir moved into services/ |
| 22 | `memdir/paths.ts` | `services/memdir/paths.ts` | T5 | PROMOTE | memdir moved into services/ |
| 23 | `query/tokenBudget.ts` | `compact/tokenBudget.ts` | T6 | MERGE | Check for missing logic branches |
| 24 | `screens/REPL.tsx` | `components/REPL.tsx` | T2 | MERGE | Check for missing logic branches |
| 25 | `services/api/withRetry.ts` | `retry/withRetry.ts` | T6 | FLATTEN | Depth simplified — verify then mark ALIGNED |
| 26 | `services/compact/autoCompact.ts` | `compact/autoCompact.ts` | T6 | PROMOTE | compact promoted — align to QL path |
| 27 | `services/compact/postCompactCleanup.ts` | `compact/postCompactCleanup.ts` | T6 | PROMOTE | compact promoted — align to QL path |
| 28 | `services/compact/timeBasedMCConfig.ts` | `compact/timeBasedMCConfig.ts` | T6 | PROMOTE | compact promoted — align to QL path |
| 29 | `services/lsp/manager.ts` | `history/manager.ts` | T6 | FLATTEN | Depth simplified — verify then mark ALIGNED |
| 30 | `services/lsp/manager.ts` | `mcp/manager.ts` | T6 | FLATTEN | Depth simplified — verify then mark ALIGNED |
| 31 | `services/lsp/manager.ts` | `permissions/manager.ts` | T6 | FLATTEN | Depth simplified — verify then mark ALIGNED |
| 32 | `services/lsp/manager.ts` | `services/mcp/manager.ts` | T5 | MERGE | Check for missing logic branches |
| 33 | `services/policyLimits/types.ts` | `services/lsp/types.ts` | T5 | MERGE | Check for missing logic branches |
| 34 | `services/teamMemorySync/index.ts` | `providers/index.ts` | EXT | FLATTEN | Depth simplified — verify then mark ALIGNED |
| 35 | `services/teamMemorySync/index.ts` | `services/contextCollapse/index.ts` | T5 | MERGE | Check for missing logic branches |
| 36 | `services/teamMemorySync/index.ts` | `services/extractMemories/index.ts` | T5 | MERGE | Check for missing logic branches |
| 37 | `services/teamMemorySync/index.ts` | `services/featureFlags/index.ts` | T5 | MERGE | Check for missing logic branches |
| 38 | `services/teamMemorySync/index.ts` | `services/memdir/index.ts` | T5 | MERGE | Check for missing logic branches |
| 39 | `services/teamMemorySync/index.ts` | `settings/index.ts` | T0 | FLATTEN | Depth simplified — verify then mark ALIGNED |
| 40 | `services/teamMemorySync/index.ts` | `tools/index.ts` | T1 | FLATTEN | Depth simplified — verify then mark ALIGNED |
| 41 | `services/teamMemorySync/index.ts` | `types/index.ts` | T7 | FLATTEN | Depth simplified — verify then mark ALIGNED |
| 42 | `services/tools/StreamingToolExecutor.ts` | `query/StreamingToolExecutor.ts` | T0 | FLATTEN | Depth simplified — verify then mark ALIGNED |
| 43 | `state/store.ts` | `services/brief/store.ts` | T5 | MERGE | Check for missing logic branches |
| 44 | `state/store.ts` | `services/memory/store.ts` | T5 | MERGE | Check for missing logic branches |
| 45 | `state/store.ts` | `services/tasks/store.ts` | T5 | MERGE | Check for missing logic branches |
| 46 | `state/store.ts` | `services/teams/store.ts` | T5 | MERGE | Check for missing logic branches |
| 47 | `state/store.ts` | `services/triggers/store.ts` | T5 | MERGE | Check for missing logic branches |
| 48 | `state/store.ts` | `services/worktree/store.ts` | T5 | MERGE | Check for missing logic branches |
| 49 | `tools/AgentTool/AgentTool.tsx` | `tools/AgentTool.ts` | T1 | FLATTEN | Depth simplified — verify then mark ALIGNED |
| 50 | `tools/AskUserQuestionTool/AskUserQuestionTool.tsx` | `tools/AskUserQuestionTool.ts` | T1 | FLATTEN | Depth simplified — verify then mark ALIGNED |
| 51 | `tools/BashTool/BashTool.tsx` | `tools/BashTool.ts` | T1 | FLATTEN | Depth simplified — verify then mark ALIGNED |
| 52 | `tools/BriefTool/BriefTool.ts` | `tools/BriefTool.ts` | T1 | FLATTEN | Depth simplified — verify then mark ALIGNED |
| 53 | `tools/ConfigTool/ConfigTool.ts` | `tools/ConfigTool.ts` | T1 | FLATTEN | Depth simplified — verify then mark ALIGNED |
| 54 | `tools/EnterPlanModeTool/EnterPlanModeTool.ts` | `tools/EnterPlanModeTool.ts` | T1 | FLATTEN | Depth simplified — verify then mark ALIGNED |
| 55 | `tools/EnterWorktreeTool/EnterWorktreeTool.ts` | `tools/EnterWorktreeTool.ts` | T1 | FLATTEN | Depth simplified — verify then mark ALIGNED |
| 56 | `tools/ExitWorktreeTool/ExitWorktreeTool.ts` | `tools/ExitWorktreeTool.ts` | T1 | FLATTEN | Depth simplified — verify then mark ALIGNED |
| 57 | `tools/FileEditTool/FileEditTool.ts` | `tools/FileEditTool.ts` | T1 | FLATTEN | Depth simplified — verify then mark ALIGNED |
| 58 | `tools/FileReadTool/FileReadTool.ts` | `tools/FileReadTool.ts` | T1 | FLATTEN | Depth simplified — verify then mark ALIGNED |
| 59 | `tools/FileWriteTool/FileWriteTool.ts` | `tools/FileWriteTool.ts` | T1 | FLATTEN | Depth simplified — verify then mark ALIGNED |
| 60 | `tools/GlobTool/GlobTool.ts` | `tools/GlobTool.ts` | T1 | FLATTEN | Depth simplified — verify then mark ALIGNED |
| 61 | `tools/GrepTool/GrepTool.ts` | `tools/GrepTool.ts` | T1 | FLATTEN | Depth simplified — verify then mark ALIGNED |
| 62 | `tools/LSPTool/formatters.ts` | `tools/LspTool/formatters.ts` | T1 | RENAME | Casing/naming — verify then mark ALIGNED |
| 63 | `tools/LSPTool/schemas.ts` | `tools/LspTool/schemas.ts` | T1 | RENAME | Casing/naming — verify then mark ALIGNED |
| 64 | `tools/LSPTool/symbolContext.ts` | `tools/LspTool/symbolContext.ts` | T1 | RENAME | Casing/naming — verify then mark ALIGNED |
| 65 | `tools/ListMcpResourcesTool/ListMcpResourcesTool.ts` | `tools/ListMcpResourcesTool.ts` | T1 | FLATTEN | Depth simplified — verify then mark ALIGNED |
| 66 | `tools/MCPTool/classifyForCollapse.ts` | `tools/McpTool/classifyForCollapse.ts` | T1 | RENAME | Casing/naming — verify then mark ALIGNED |
| 67 | `tools/McpAuthTool/McpAuthTool.ts` | `tools/McpAuthTool.ts` | T1 | FLATTEN | Depth simplified — verify then mark ALIGNED |
| 68 | `tools/NotebookEditTool/NotebookEditTool.ts` | `tools/NotebookEditTool.ts` | T1 | FLATTEN | Depth simplified — verify then mark ALIGNED |
| 69 | `tools/PowerShellTool/PowerShellTool.tsx` | `tools/PowerShellTool.ts` | T1 | FLATTEN | Depth simplified — verify then mark ALIGNED |
| 70 | `tools/ReadMcpResourceTool/ReadMcpResourceTool.ts` | `tools/ReadMcpResourceTool.ts` | T1 | FLATTEN | Depth simplified — verify then mark ALIGNED |
| 71 | `tools/ReadMcpResourceTool/prompt.ts` | `tools/LspTool/prompt.ts` | T1 | MERGE | Check for missing logic branches |
| 72 | `tools/ReadMcpResourceTool/prompt.ts` | `tools/McpTool/prompt.ts` | T1 | MERGE | Check for missing logic branches |
| 73 | `tools/RemoteTriggerTool/RemoteTriggerTool.ts` | `tools/RemoteTriggerTool.ts` | T1 | FLATTEN | Depth simplified — verify then mark ALIGNED |
| 74 | `tools/ScheduleCronTool/CronCreateTool.ts` | `tools/CronCreateTool.ts` | T1 | RENAME | Casing/naming — verify then mark ALIGNED |
| 75 | `tools/ScheduleCronTool/CronDeleteTool.ts` | `tools/CronDeleteTool.ts` | T1 | RENAME | Casing/naming — verify then mark ALIGNED |
| 76 | `tools/ScheduleCronTool/CronListTool.ts` | `tools/CronListTool.ts` | T1 | RENAME | Casing/naming — verify then mark ALIGNED |
| 77 | `tools/SendMessageTool/SendMessageTool.ts` | `tools/SendMessageTool.ts` | T1 | FLATTEN | Depth simplified — verify then mark ALIGNED |
| 78 | `tools/SkillTool/SkillTool.ts` | `tools/SkillTool.ts` | T1 | FLATTEN | Depth simplified — verify then mark ALIGNED |
| 79 | `tools/SyntheticOutputTool/SyntheticOutputTool.ts` | `tools/SyntheticOutputTool.ts` | T1 | FLATTEN | Depth simplified — verify then mark ALIGNED |
| 80 | `tools/TaskCreateTool/TaskCreateTool.ts` | `tools/TaskCreateTool.ts` | T1 | FLATTEN | Depth simplified — verify then mark ALIGNED |
| 81 | `tools/TaskGetTool/TaskGetTool.ts` | `tools/TaskGetTool.ts` | T1 | FLATTEN | Depth simplified — verify then mark ALIGNED |
| 82 | `tools/TaskListTool/TaskListTool.ts` | `tools/TaskListTool.ts` | T1 | FLATTEN | Depth simplified — verify then mark ALIGNED |
| 83 | `tools/TaskOutputTool/TaskOutputTool.tsx` | `tools/TaskOutputTool.ts` | T1 | FLATTEN | Depth simplified — verify then mark ALIGNED |
| 84 | `tools/TaskStopTool/TaskStopTool.ts` | `tools/TaskStopTool.ts` | T1 | FLATTEN | Depth simplified — verify then mark ALIGNED |
| 85 | `tools/TaskUpdateTool/TaskUpdateTool.ts` | `tools/TaskUpdateTool.ts` | T1 | FLATTEN | Depth simplified — verify then mark ALIGNED |
| 86 | `tools/TeamCreateTool/TeamCreateTool.ts` | `tools/TeamCreateTool.ts` | T1 | FLATTEN | Depth simplified — verify then mark ALIGNED |
| 87 | `tools/TeamDeleteTool/TeamDeleteTool.ts` | `tools/TeamDeleteTool.ts` | T1 | FLATTEN | Depth simplified — verify then mark ALIGNED |
| 88 | `tools/TodoWriteTool/TodoWriteTool.ts` | `tools/TodoWriteTool.ts` | T1 | FLATTEN | Depth simplified — verify then mark ALIGNED |
| 89 | `tools/ToolSearchTool/ToolSearchTool.ts` | `tools/ToolSearchTool.ts` | T1 | FLATTEN | Depth simplified — verify then mark ALIGNED |
| 90 | `tools/WebFetchTool/WebFetchTool.ts` | `tools/WebFetchTool.ts` | T1 | FLATTEN | Depth simplified — verify then mark ALIGNED |
| 91 | `tools/WebSearchTool/WebSearchTool.ts` | `tools/WebSearchTool.ts` | T1 | FLATTEN | Depth simplified — verify then mark ALIGNED |
| 92 | `utils/computerUse/setup.ts` | `commands/setup.ts` | EXT | FLATTEN | Depth simplified — verify then mark ALIGNED |
| 93 | `utils/memory/types.ts` | `utils/secureStorage/types.ts` | T6 | MERGE | Check for missing logic branches |
| 94 | `utils/model/bedrock.ts` | `providers/bedrock.ts` | EXT | FLATTEN | Depth simplified — verify then mark ALIGNED |
| 95 | `utils/model/model.ts` | `commands/model.ts` | EXT | FLATTEN | Depth simplified — verify then mark ALIGNED |
| 96 | `utils/nativeInstaller/index.ts` | `utils/computerUse/index.ts` | T6 | MERGE | Check for missing logic branches |
| 97 | `utils/nativeInstaller/index.ts` | `utils/sandbox/index.ts` | T6 | MERGE | Check for missing logic branches |
| 98 | `utils/notebook.ts` | `types/notebook.ts` | T7 | MERGE | Check for missing logic branches |
| 99 | `utils/permissions/PermissionUpdate.ts` | `permissions/PermissionUpdate.ts` | T6 | PROMOTE | permissions promoted — align to QL path |
| 100 | `utils/permissions/autoModeState.ts` | `permissions/autoModeState.ts` | T6 | PROMOTE | permissions promoted — align to QL path |
| 101 | `utils/permissions/dangerousPatterns.ts` | `permissions/dangerousPatterns.ts` | T6 | PROMOTE | permissions promoted — align to QL path |
| 102 | `utils/permissions/denialTracking.ts` | `permissions/denialTracking.ts` | T6 | PROMOTE | permissions promoted — align to QL path |
| 103 | `utils/permissions/pathValidation.ts` | `permissions/pathValidation.ts` | T6 | PROMOTE | permissions promoted — align to QL path |
| 104 | `utils/permissions/permissionExplainer.ts` | `permissions/permissionExplainer.ts` | T6 | PROMOTE | permissions promoted — align to QL path |
| 105 | `utils/permissions/permissionRuleParser.ts` | `permissions/permissionRuleParser.ts` | T6 | PROMOTE | permissions promoted — align to QL path |
| 106 | `utils/permissions/shadowedRuleDetection.ts` | `permissions/shadowedRuleDetection.ts` | T6 | PROMOTE | permissions promoted — align to QL path |
| 107 | `utils/permissions/shellRuleMatching.ts` | `permissions/shellRuleMatching.ts` | T6 | PROMOTE | permissions promoted — align to QL path |
| 108 | `utils/permissions/yoloClassifier.ts` | `permissions/yoloClassifier.ts` | T6 | PROMOTE | permissions promoted — align to QL path |
| 109 | `utils/stats.ts` | `services/stats.ts` | T5 | MERGE | Check for missing logic branches |

---

## Mode Distribution

- `FLATTEN`: 57
- `MERGE`: 26
- `PROMOTE`: 17
- `RENAME`: 9
