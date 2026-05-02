/**
 * Plan/Act mode — inspired by Cline's approach.
 *
 * PLAN mode: read-only exploration. Tools restricted to:
 *   FileRead, Glob, Grep, WebFetch, TodoWrite, Agent(read-only)
 *
 * ACT mode: full tool access. Default mode.
 *
 * Entering Plan mode (/plan):
 *   - Restricts tools to read-only set
 *   - Injects "PLAN MODE" into system prompt — instruct AI to only explore, not modify
 *   - StatusBar shows [PLAN]
 *
 * Exiting Plan mode (/act or /plan again):
 *   - Restores full tool set
 */

export type AppMode = 'act' | 'plan'

export const PLAN_MODE_TOOLS = new Set([
  'FileRead',
  'Glob',
  'Grep',
  'WebFetch',
  'WebSearch',
  'TodoWrite',
  'NotebookRead',
  'AskUserQuestion',
  // AI can exit plan mode from within plan mode
  'ExitPlanMode',
  // Task tracking available in plan mode (create task list during planning)
  'TaskCreate',
  'TaskGet',
  'TaskList',
  'TaskUpdate',
  'TaskOutput',
])

export const PLAN_MODE_SYSTEM_SUFFIX = `

## 当前模式: 计划模式 (PLAN MODE)

你现在处于计划模式。在这个模式下：
- 只能读取文件、搜索代码、分析架构
- 不允许修改任何文件、执行任何 shell 命令
- 你的任务是：充分探索和分析，制定详细的执行计划
- 计划完成后，调用 ExitPlanMode 工具提交计划并请求用户审批

在计划模式下，请：
1. 全面探索相关代码文件（FileRead、Glob、Grep）
2. 理解现有架构和约定
3. 识别可能的影响范围和风险
4. 输出清晰的执行计划：
   - 需要修改的文件列表
   - 每个文件的具体变更说明
   - 潜在风险和注意事项
   - 预计工作量

不要直接执行变更。`

export function filterToolsForMode(
  tools: Map<string, unknown>,
  mode: AppMode
): Map<string, unknown> {
  if (mode === 'act') return tools

  return new Map(
    Array.from(tools.entries()).filter(([name]) => PLAN_MODE_TOOLS.has(name))
  )
}

export function buildModeSystemPrompt(basePrompt: string, mode: AppMode): string {
  if (mode === 'act') return basePrompt
  return basePrompt + PLAN_MODE_SYSTEM_SUFFIX
}
