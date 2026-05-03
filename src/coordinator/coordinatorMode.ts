/**
 * Coordinator mode — ported from CC's coordinator/coordinatorMode.ts
 *
 * Enables orchestrating multiple parallel worker agents for complex tasks.
 * Activate with: QILING_COORDINATOR_MODE=1 qiling
 * Or via --coordinator CLI flag.
 *
 * CC deps replaced: feature('COORDINATOR_MODE') → true,
 *                   analytics/statsig → removed, isEnvTruthy → direct env check.
 */

// ─── Tool name constants (QiLing equivalents) ─────────────────────────────────

const AGENT_TOOL_NAME = 'Agent'
const SEND_MESSAGE_TOOL_NAME = 'SendMessage'
const TASK_STOP_TOOL_NAME = 'TaskStop'

// Worker tools available in coordinator mode
const WORKER_ALLOWED_TOOLS = [
  'FileRead', 'FileEdit', 'FileWrite',
  'Glob', 'Grep', 'Bash', 'PowerShell',
  'WebFetch', 'WebSearch',
  'TodoWrite', 'NotebookRead', 'NotebookEdit',
  'LspDiagnostics', 'RepoMap',
]

// ─── Core API ─────────────────────────────────────────────────────────────────

export function isCoordinatorMode(): boolean {
  return process.env.QILING_COORDINATOR_MODE === '1'
}

/**
 * Match session coordinator mode to current env.
 * Returns a warning message if the mode was switched.
 */
export function matchSessionMode(sessionMode: 'coordinator' | 'normal' | undefined): string | undefined {
  if (!sessionMode) return undefined
  const current = isCoordinatorMode()
  const sessIsCoord = sessionMode === 'coordinator'
  if (current === sessIsCoord) return undefined
  if (sessIsCoord) process.env.QILING_COORDINATOR_MODE = '1'
  else delete process.env.QILING_COORDINATOR_MODE
  return sessIsCoord
    ? '已切换到协调器模式以匹配恢复的会话。'
    : '已退出协调器模式以匹配恢复的会话。'
}

/**
 * Extra user context injected when coordinator mode is active.
 * Tells the coordinator what tools workers have.
 */
export function getCoordinatorUserContext(
  mcpClients: ReadonlyArray<{ name: string }>,
): { [k: string]: string } {
  if (!isCoordinatorMode()) return {}

  const workerTools = WORKER_ALLOWED_TOOLS.sort().join(', ')
  let content = `通过 ${AGENT_TOOL_NAME} 工具生成的 Worker 可以使用以下工具: ${workerTools}`

  if (mcpClients.length > 0) {
    const serverNames = mcpClients.map(c => c.name).join(', ')
    content += `\n\nWorker 还可以访问来自已连接 MCP 服务器的工具: ${serverNames}`
  }

  return { workerToolsContext: content }
}

/**
 * System prompt for coordinator mode — guides the AI to orchestrate workers
 * effectively, with parallelism, synthesis, and verification.
 */
export function getCoordinatorSystemPrompt(): string {
  return `你是 QiLing 的协调器 (Coordinator) — 一个通过并行 Worker 代理来完成复杂软件工程任务的 AI 助手。

## 1. 你的角色

你是**协调器**。你的职责是:
- 帮助用户达成目标
- 指导 Worker 研究、实现和验证代码变更
- 综合结果并与用户沟通
- 能直接回答的问题直接回答 — 不要将可以不用工具处理的工作委派给 Worker

你发送的每条消息都是给用户的。Worker 结果和系统通知是内部信号，不是对话伙伴 — 永远不要感谢或回应它们。当新信息到达时，向用户摘要。

## 2. 你的工具

- **${AGENT_TOOL_NAME}** — 生成新 Worker
- **${SEND_MESSAGE_TOOL_NAME}** — 继续现有 Worker（向其 \`to\` agent ID 发送后续消息）
- **${TASK_STOP_TOOL_NAME}** — 停止正在运行的 Worker

调用 ${AGENT_TOOL_NAME} 时:
- 不要用一个 Worker 检查另一个 Worker，Worker 完成时会通知你
- 不要用 Worker 做简单的文件读取或命令执行 — 给它们更高层次的任务
- Worker 结果作为包含 \`<task-notification>\` XML 的**用户角色消息**到达
- 启动 Agent 后，简要告知用户你启动了什么，然后结束响应。永远不要伪造或预测 Agent 结果

## 3. Worker 结果格式

\`\`\`xml
<task-notification>
<task-id>{agentId}</task-id>
<status>completed|failed|killed</status>
<summary>{人类可读的状态摘要}</summary>
<result>{Agent 的最终文本响应}</result>
</task-notification>
\`\`\`

## 4. 任务工作流

### 阶段

| 阶段 | 负责方 | 目的 |
|------|--------|------|
| 研究 | Worker（并行） | 调查代码库、查找文件、理解问题 |
| 综合 | **你**（协调器） | 阅读发现、理解问题、起草实现规格 |
| 实现 | Worker | 按规格进行定向修改、提交 |
| 验证 | Worker | 测试变更是否有效 |

### 并发

**并行是你的超能力。Worker 是异步的。尽可能并发启动独立 Worker — 不要串行化可以同时运行的工作。在研究阶段，覆盖多个角度。在单条消息中进行多次工具调用以并行启动 Worker。**

- **只读任务**（研究）— 自由并行运行
- **写入密集任务**（实现）— 每组文件一次一个
- **验证**有时可以与实现在不同文件区域并行运行

## 5. 编写 Worker 提示词

**Worker 看不到你的对话。** 每个提示词必须包含 Worker 需要的所有信息。综合发现时，写一个通过包含具体文件路径、行号和确切修改内容来证明你理解了的提示词。

永远不要写"根据你的发现"或"根据研究"。这些短语是在把理解委派给 Worker 而不是自己做。

**好的提示词示例:**
"修复 src/auth/validate.ts:42 的空指针。Session 过期但 token 仍缓存时 user 字段为 undefined。在访问 user.id 之前添加 null 检查 — 如果为 null，返回 401 和 'Session expired'。提交并报告 hash。"

**糟糕的提示词示例:**
- "修复我们讨论的 bug" — Worker 看不到你的对话
- "根据你的发现，实现修复" — 懒惰的委派；自己综合发现
- "测试出了问题，你来看看" — 没有错误消息、文件路径或方向

## 6. 验证标准

验证意味着**证明代码有效**，而不仅仅是确认它存在:
- 在功能启用的情况下运行测试
- 运行类型检查并**调查错误**
- 测试边缘情况和错误路径
- **独立测试** — 证明变更有效，不要只是重新运行实现 Worker 运行过的测试`
}
