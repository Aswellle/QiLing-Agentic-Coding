/**
 * Rotating tips/hints system — inspired by CC's services/tips/tipRegistry.ts
 *
 * Shows keyboard shortcut hints and feature discovery tips at startup and
 * periodically during sessions. Tips rotate every N seconds in StatusBar.
 */

export interface Tip {
  id: string
  content: string
}

// ─── QiLing-specific tips ─────────────────────────────────────────────────────

export const TIPS: Tip[] = [
  { id: 'slash-commands', content: '输入 / 查看全部命令，Tab 自动补全' },
  { id: 'vim-mode', content: 'Esc 进入 Vim Normal 模式，支持 . 重复操作、d/c/y 操作符' },
  { id: 'vim-dot-repeat', content: 'Vim 模式：. 重复上次修改，; 重复查找，u 调用撤销' },
  { id: 'at-mention', content: '@文件名 注入文件内容，@git 注入 git 状态，@url 抓取网页' },
  { id: 'ctrl-c', content: 'Ctrl+C 中断当前流式输出（不退出程序）；再次 Ctrl+C 退出' },
  { id: 'restore', content: '/restore 将文件恢复到会话开始前的状态' },
  { id: 'diff', content: '/diff 显示当前工作区的 git 变更统计（不启动 AI）' },
  { id: 'open-editor', content: '/open <文件> 在 VSCode/Cursor/vim 中打开文件' },
  { id: 'plan-mode', content: '/plan 进入只读探索模式，/act 退出（防止意外修改文件）' },
  { id: 'commit-diff', content: '/commit 会自动附加 git diff 统计，帮助 AI 写准确的提交信息' },
  { id: 'agent-types', content: 'Agent 工具支持 subagent_type: "Explore"（只读搜索）/ "Plan"（架构规划）' },
  { id: 'yolo-mode', content: '--yolo 跳过所有权限确认（危险！仅在受信任的仓库使用）' },
  { id: 'readonly', content: '--readonly 只读模式：禁用所有写入/执行工具' },
  { id: 'thinking', content: '--thinking <tokens> 启用扩展思考模式（Claude Opus/Sonnet-4）' },
  { id: 'mcp-servers', content: '在 settings.json 的 mcpServers 中配置 MCP 工具服务' },
  { id: 'memory', content: 'QILING.md / CLAUDE.md 文件会自动注入为上下文记忆' },
  { id: 'history-search', content: '方向键 ↑↓ 浏览输入历史（最多 100 条）' },
  { id: 'session-resume', content: '--resume 恢复上次会话，--resume <id> 恢复指定会话' },
  { id: 'bg-agents', content: 'Ctrl+B 将当前 Agent 推入后台，/bg 管理后台任务' },
  { id: 'repo-map', content: '启动时自动生成仓库索引注入 system prompt，--no-repo-map 禁用' },
]

// ─── Tip rotation state ───────────────────────────────────────────────────────

let currentTipIndex = Math.floor(Math.random() * TIPS.length)
let lastShownAt = 0
const TIP_INTERVAL_MS = 30_000  // rotate every 30 seconds

export function getCurrentTip(): Tip {
  return TIPS[currentTipIndex]!
}

export function maybeAdvanceTip(): void {
  const now = Date.now()
  if (now - lastShownAt >= TIP_INTERVAL_MS) {
    currentTipIndex = (currentTipIndex + 1) % TIPS.length
    lastShownAt = now
  }
}

export function resetTips(): void {
  currentTipIndex = Math.floor(Math.random() * TIPS.length)
  lastShownAt = 0
}
