/**
 * Hooks System — 工具执行前后的 shell 钩子
 *
 * 配置格式（~/.qiling/settings.json 或 .qiling/settings.json）：
 * {
 *   "hooks": {
 *     "PreToolUse": [{ "matcher": "Bash|FileEdit", "hooks": [{ "type": "command", "command": "echo $QILING_TOOL_NAME" }] }],
 *     "PostToolUse": [{ "matcher": "FileEdit|FileWrite", "hooks": [{ "type": "command", "command": "npx prettier --write \"$QILING_FILE_PATH\"" }] }],
 *     "Stop": [{ "hooks": [{ "type": "command", "command": "notify-send 'QiLing 任务完成'" }] }]
 *   }
 * }
 *
 * 环境变量注入：
 *   QILING_TOOL_NAME     — 工具名称
 *   QILING_FILE_PATH     — 文件路径（FileRead/FileEdit/FileWrite）
 *   QILING_BASH_COMMAND  — shell 命令（Bash/PowerShell）
 *   QILING_WORKING_DIR   — 工作目录
 *   QILING_SESSION_ID    — 会话 ID
 */

export interface HookCommand {
  type: 'command'
  command: string
  timeout?: number  // ms, default 10000
}

/** HTTP hook — calls a URL with tool/result context as JSON body */
export interface HookHttp {
  type: 'http'
  url: string
  method?: 'GET' | 'POST' | 'PUT'  // default POST
  headers?: Record<string, string>
  timeout?: number  // ms, default 10000
}

export type Hook = HookCommand | HookHttp

export interface HookEntry {
  matcher?: string          // 正则匹配工具名，不填则匹配所有
  hooks: Hook[]
}

export interface HooksConfig {
  PreToolUse?: HookEntry[]
  PostToolUse?: HookEntry[]
  Stop?: HookEntry[]
}

export interface HookContext {
  toolName: string
  input: Record<string, unknown>
  workingDir: string
  sessionId: string
  result?: { content: string; isError?: boolean }
}

function buildHookEnv(ctx: HookContext): Record<string, string> {
  const env: Record<string, string> = {
    QILING_TOOL_NAME: ctx.toolName,
    QILING_WORKING_DIR: ctx.workingDir,
    QILING_SESSION_ID: ctx.sessionId,
  }

  // File-related tools
  const filePath = ctx.input.file_path ?? ctx.input.path ?? ctx.input.notebook_path
  if (typeof filePath === 'string') {
    env.QILING_FILE_PATH = filePath
  }

  // Shell tools
  const cmd = ctx.input.command
  if (typeof cmd === 'string') {
    env.QILING_BASH_COMMAND = cmd
  }

  // Result
  if (ctx.result) {
    env.QILING_TOOL_RESULT = ctx.result.content.slice(0, 1000)
    env.QILING_TOOL_IS_ERROR = ctx.result.isError ? '1' : '0'
  }

  return env
}

function matchesTool(matcher: string | undefined, toolName: string): boolean {
  if (!matcher) return true
  try {
    return new RegExp(matcher).test(toolName)
  } catch {
    return matcher === toolName
  }
}

async function runHookCommand(
  cmd: HookCommand,
  env: Record<string, string>,
  workingDir: string
): Promise<void> {
  const timeout = cmd.timeout ?? 10_000
  const isWin = process.platform === 'win32'
  const shellArgs = isWin
    ? ['powershell.exe', '-NonInteractive', '-NoProfile', '-Command', cmd.command]
    : ['bash', '-c', cmd.command]

  try {
    const proc = Bun.spawn(shellArgs, {
      cwd: workingDir,
      env: { ...process.env, ...env },
      stdout: 'pipe',
      stderr: 'pipe',
    })

    const timer = setTimeout(() => proc.kill(), timeout)
    await proc.exited
    clearTimeout(timer)

    // Hook output goes to stderr (so it doesn't pollute AI context)
    const output = await new Response(proc.stderr).text()
    if (output.trim()) {
      process.stderr.write(`[hook] ${output.trimEnd()}\n`)
    }
  } catch {
    // Hooks are non-fatal
  }
}

export async function runHooks(
  event: 'PreToolUse' | 'PostToolUse' | 'Stop',
  config: HooksConfig | undefined,
  ctx: HookContext
): Promise<void> {
  if (!config) return
  const entries = config[event]
  if (!entries || entries.length === 0) return

  const env = buildHookEnv(ctx)

  for (const entry of entries) {
    if (!matchesTool(entry.matcher, ctx.toolName)) continue
    for (const hook of entry.hooks) {
      if (hook.type === 'command') {
        await runHookCommand(hook, env, ctx.workingDir)
      } else if (hook.type === 'http') {
        await runHookHttp(hook, ctx)
      }
    }
  }
}

/** HTTP hook execution — mirrors CC's execHttpHook.ts (simplified, no SSRF guard) */
async function runHookHttp(hook: HookHttp, ctx: HookContext): Promise<void> {
  try {
    const body = {
      event: ctx.toolName ? 'tool' : 'stop',
      tool_name: ctx.toolName,
      tool_input: ctx.input,
      working_dir: ctx.workingDir,
      session_id: ctx.sessionId,
      ...(ctx.result && { result: ctx.result }),
    }

    const response = await fetch(hook.url, {
      method: hook.method ?? 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'qiling-hook/1.0',
        ...hook.headers,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(hook.timeout ?? 10_000),
    })

    if (!response.ok && process.env.QILING_DEBUG === '1') {
      process.stderr.write(`[hook:http] ${hook.url} returned ${response.status}\n`)
    }
  } catch {
    // HTTP hooks are non-fatal
  }
}
