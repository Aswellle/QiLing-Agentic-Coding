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

export interface HookResult {
  blocked: boolean
  reason?: string
  modifiedInput?: Record<string, unknown>  // CC supports modifying tool input
}

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

/**
 * Prompt hook — queries a small/fast model with the tool context.
 * Mirrors CC's execPromptHook.ts pattern.
 * The model must return JSON: {"ok": true} or {"ok": false, "reason": "..."}
 * If ok=false, the hook blocks the action with the provided reason.
 * Use $ARGUMENTS in the prompt to inject tool context as JSON.
 */
export interface HookPrompt {
  type: 'prompt'
  prompt: string                  // Prompt template; $ARGUMENTS → tool context JSON
  model?: string                  // Model to use (default: haiku or fastest available)
  timeout?: number                // Timeout in seconds (default: 30)
}

export type Hook = HookCommand | HookHttp | HookPrompt

export interface HookEntry {
  matcher?: string          // 正则匹配工具名，不填则匹配所有
  hooks: Hook[]
}

/**
 * All supported hook events — mirrors CC's HOOK_EVENTS from entrypoints/sdk/coreTypes.ts
 * Portable events: PreToolUse, PostToolUse, Stop, UserPromptSubmit, SessionStart,
 * SessionEnd, PreCompact, PostCompact, StopFailure, PermissionRequest, Setup
 * CC-specific events (no-op in QiLing): SubagentStart/Stop, TeammateIdle, TaskCreated, etc.
 */
export type HookEvent =
  | 'PreToolUse'
  | 'PostToolUse'
  | 'PostToolUseFailure'
  | 'Stop'
  | 'StopFailure'
  | 'UserPromptSubmit'
  | 'SessionStart'
  | 'SessionEnd'
  | 'PreCompact'
  | 'PostCompact'
  | 'PermissionRequest'
  | 'PermissionDenied'
  | 'Setup'
  | 'SubagentStart'
  | 'SubagentStop'
  | 'FileChanged'
  | 'CwdChanged'
  | 'InstructionsLoaded'

export interface HooksConfig {
  PreToolUse?: HookEntry[]
  PostToolUse?: HookEntry[]
  PostToolUseFailure?: HookEntry[]
  Stop?: HookEntry[]
  StopFailure?: HookEntry[]
  UserPromptSubmit?: HookEntry[]
  SessionStart?: HookEntry[]
  SessionEnd?: HookEntry[]
  PreCompact?: HookEntry[]
  PostCompact?: HookEntry[]
  PermissionRequest?: HookEntry[]
  PermissionDenied?: HookEntry[]
  Setup?: HookEntry[]
  SubagentStart?: HookEntry[]
  SubagentStop?: HookEntry[]
  FileChanged?: HookEntry[]
  CwdChanged?: HookEntry[]
  InstructionsLoaded?: HookEntry[]
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

/**
 * Blocking version of runHookCommand for PreToolUse.
 * Non-zero exit code blocks the tool call; stdout is used as the reason.
 */
async function runHookCommandBlocking(
  cmd: HookCommand,
  env: Record<string, string>,
  workingDir: string
): Promise<HookResult> {
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
    const exitCode = await proc.exited
    clearTimeout(timer)

    if (exitCode !== 0) {
      // Non-zero exit = block, use stdout as reason
      const reason = await new Response(proc.stdout).text()
      return { blocked: true, reason: reason.trim() || `Hook exited with code ${exitCode}` }
    }
    return { blocked: false }
  } catch {
    return { blocked: false }
  }
}

/**
 * Blocking PreToolUse hook runner.
 * Command hooks: non-zero exit code blocks the tool call.
 * Prompt hooks: {"ok": false} blocks the tool call.
 * HTTP hooks: always non-blocking (fire-and-forget).
 */
export async function runPreToolUseHooks(
  config: HooksConfig | undefined,
  ctx: HookContext
): Promise<HookResult> {
  if (!config?.PreToolUse) return { blocked: false }
  const entries = config.PreToolUse

  const env = buildHookEnv(ctx)

  for (const entry of entries) {
    if (!matchesTool(entry.matcher, ctx.toolName)) continue
    for (const hook of entry.hooks) {
      if (hook.type === 'command') {
        // Command hooks for PreToolUse: if exit code != 0, block
        const result = await runHookCommandBlocking(hook, env, ctx.workingDir)
        if (result.blocked) return result
      } else if (hook.type === 'http') {
        await runHookHttp(hook, ctx)
      } else if (hook.type === 'prompt') {
        const result = await runHookPrompt(hook, ctx)
        if (result.blocked) return { blocked: true, reason: result.reason }
      }
    }
  }
  return { blocked: false }
}

export async function runHooks(
  event: HookEvent,
  config: HooksConfig | undefined,
  ctx: HookContext
): Promise<HookResult> {
  if (!config) return { blocked: false }
  const entries = config[event]
  if (!entries || entries.length === 0) return { blocked: false }

  const env = buildHookEnv(ctx)

  for (const entry of entries) {
    if (!matchesTool(entry.matcher, ctx.toolName)) continue
    for (const hook of entry.hooks) {
      if (hook.type === 'command') {
        await runHookCommand(hook, env, ctx.workingDir)
      } else if (hook.type === 'http') {
        await runHookHttp(hook, ctx)
      } else if (hook.type === 'prompt') {
        const result = await runHookPrompt(hook, ctx)
        if (result.blocked) {
          // Blocking hook: surface reason to user via stderr
          process.stderr.write(`[hook:prompt] 阻止操作: ${result.reason}\n`)
        }
      }
    }
  }
  return { blocked: false }
}

/**
 * Prompt hook execution — mirrors CC's execPromptHook.ts (simplified).
 * Sends the prompt to a fast model with tool context injected at $ARGUMENTS.
 * Returns { blocked: true, reason } if the model returns {"ok": false}.
 */
async function runHookPrompt(
  hook: HookPrompt,
  ctx: HookContext,
): Promise<{ blocked: boolean; reason?: string }> {
  try {
    const timeout = (hook.timeout ?? 30) * 1000
    const jsonInput = JSON.stringify({
      tool_name: ctx.toolName,
      tool_input: ctx.input,
      working_dir: ctx.workingDir,
      session_id: ctx.sessionId,
      ...(ctx.result && { result: ctx.result }),
    })
    const prompt = hook.prompt.replace(/\$ARGUMENTS/g, jsonInput)

    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY ?? '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: hook.model ?? 'claude-haiku-4-5-20251001',
        max_tokens: 256,
        messages: [{ role: 'user', content: prompt }],
        system: 'You are evaluating a hook condition. Return JSON only: {"ok": true} or {"ok": false, "reason": "..."}',
      }),
      signal: AbortSignal.timeout(timeout),
    })

    if (!resp.ok) return { blocked: false }
    const data = await resp.json() as { content?: Array<{ type: string; text?: string }> }
    const text = data.content?.find(b => b.type === 'text')?.text ?? '{}'
    const parsed = JSON.parse(text.trim()) as { ok?: boolean; reason?: string }
    if (parsed.ok === false) return { blocked: true, reason: parsed.reason }
    return { blocked: false }
  } catch {
    // Prompt hooks are non-fatal
    return { blocked: false }
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
