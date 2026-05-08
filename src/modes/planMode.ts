/**
 * Permission Mode System — CC's Shift+Tab cycle pattern
 *
 * Three modes, cycled with Shift+Tab:
 *
 *   act  →  acceptEdits  →  plan  →  act  →  …
 *
 *   act:          默认模式。写入/执行工具需逐次确认。
 *   acceptEdits:  自动接受文件编辑（FileEdit/FileWrite），Shell 命令仍需确认。
 *                 对应 CC 的 acceptEdits 模式。
 *   plan:         只读探索模式。禁止一切写入/执行。
 *                 AI 只能读取、搜索、制定计划。
 */

export type AppMode = 'act' | 'acceptEdits' | 'plan'

// ── Plan mode: read-only tool allowlist ─────────────────────────────────────
export const PLAN_MODE_TOOLS = new Set([
  'FileRead',
  'Glob',
  'Grep',
  'WebFetch',
  'WebSearch',
  'TodoWrite',
  'NotebookRead',
  'AskUserQuestion',
  'RepoMap',
  'LspDiagnostics',
  // AI can exit plan mode from within plan mode
  'ExitPlanMode',
  // Task tracking available in plan mode (create task list during planning)
  'TaskCreate',
  'TaskGet',
  'TaskList',
  'TaskUpdate',
  'TaskOutput',
  'TaskStop',
  'ToolSearch',
])

// ── Mode system prompts ──────────────────────────────────────────────────────
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

export const ACCEPT_EDITS_SYSTEM_SUFFIX = `

## 当前模式: 自动编辑模式 (ACCEPT EDITS)

你现在处于自动编辑模式。在这个模式下：
- 文件读取和写入操作将被自动批准（FileRead、FileEdit、FileWrite）
- Shell 命令（Bash、PowerShell）仍需用户确认
- 请谨慎操作，确保每次文件修改都是有意为之`

// ── Tool filtering ───────────────────────────────────────────────────────────
export function filterToolsForMode(
  tools: Map<string, unknown>,
  mode: AppMode
): Map<string, unknown> {
  if (mode === 'act' || mode === 'acceptEdits') return tools

  // plan mode: restrict to read-only tools
  return new Map(
    Array.from(tools.entries()).filter(([name]) => PLAN_MODE_TOOLS.has(name))
  )
}

// ── System prompt injection ──────────────────────────────────────────────────
export function buildModeSystemPrompt(basePrompt: string, mode: AppMode): string {
  if (mode === 'act') return basePrompt
  if (mode === 'acceptEdits') return basePrompt + ACCEPT_EDITS_SYSTEM_SUFFIX
  return basePrompt + PLAN_MODE_SYSTEM_SUFFIX
}

// ── Mode cycle (CC's getNextPermissionMode pattern) ──────────────────────────
// Shift+Tab rotates: act → acceptEdits → plan → act
export function getNextMode(current: AppMode): AppMode {
  switch (current) {
    case 'act':         return 'acceptEdits'
    case 'acceptEdits': return 'plan'
    case 'plan':        return 'act'
  }
}

// ── Mode display metadata ────────────────────────────────────────────────────
export type ModeInfo = {
  label: string       // Status bar label
  color: string       // Ink color
  description: string // Tooltip / notification
}

export const MODE_INFO: Record<AppMode, ModeInfo> = {
  act: {
    label: '',
    color: 'green',
    description: '默认模式 — 写入/执行前逐次确认',
  },
  acceptEdits: {
    label: 'AUTO',
    color: 'yellow',
    description: '自动编辑模式 — 文件操作自动批准，Shell 仍需确认',
  },
  plan: {
    label: 'PLAN',
    color: 'cyan',
    description: '计划模式 — 只读，禁止写入/执行',
  },
}

// ── acceptEdits: tools that are auto-approved ────────────────────────────────
export const ACCEPT_EDITS_AUTO_TOOLS = new Set([
  'FileRead',
  'FileEdit',
  'FileWrite',
  'NotebookEdit',
  'NotebookRead',
  'Glob',
  'Grep',
  'RepoMap',
  'TodoWrite',
])
