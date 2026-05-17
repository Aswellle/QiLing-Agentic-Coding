#!/usr/bin/env bun
import React from 'react'
import { render } from 'ink'
import { Command } from 'commander'
import { REPL } from './components/REPL'
import { loadSettings } from './settings'
import { createProvider } from './providers'
import { buildToolRegistry } from './tools'
import { PermissionsManager } from './permissions'
import { buildSystemPromptAsync } from './utils/systemPrompt'
import { configureAgentTool } from './tools/AgentTool'
import { loadAllMcpTools } from './tools/McpTool'
import { checkForUpdates } from './utils/updater'
import { loadLastSession } from './session/resume'
import { initFileHistory } from './utils/fileHistory'
import { isCoordinatorMode, getCoordinatorSystemPrompt } from './coordinator/coordinatorMode'
import { eagerParseCliFlag } from './utils/cliArgs'
import { registerProcessOutputErrorHandlers, peekForStdinData } from './utils/process'
import { loadMemoryPrompt } from './services/memdir'
import { loadOutputStyles } from './services/outputStyles/loader'

// ─── Register EPIPE handlers early (CC's registerProcessOutputErrorHandlers) ──
// Prevents memory leaks when stdout/stderr pipes are broken (e.g., | head -1)
registerProcessOutputErrorHandlers()

// ─── Terminal cursor restoration on exit (CC's resetCursor pattern) ───────────
// If the process exits while the cursor is hidden (Ink does this), the terminal
// is left broken. Always restore on exit — idempotent and fast.
const SHOW_CURSOR = '\x1b[?25h'
function resetCursor(): void {
  const term = process.stderr.isTTY ? process.stderr : process.stdout.isTTY ? process.stdout : undefined
  term?.write(SHOW_CURSOR)
}
process.on('exit', resetCursor)

// ─── SIGINT handler (CC's print-mode-aware SIGINT pattern) ───────────────────
// In print mode (-p), the query loop installs its own abort handler; skip here
// to avoid preempting it with a synchronous process.exit().
// In interactive mode, let REPL.tsx handle Ctrl+C for abort-vs-exit logic.
process.on('SIGINT', () => {
  if (process.argv.includes('-p') || process.argv.includes('--print')) {
    // Print mode: the running query handles its own abort — don't exit here
    return
  }
  process.exit(0)
})

// ─── Windows: prevent current-dir PATH injection (CC's security fix) ─────────
// See: https://docs.microsoft.com/en-us/windows/win32/api/processenv/nf-processenv-searchpathw
if (process.platform === 'win32') {
  process.env.NoDefaultCurrentDirectoryInExePath = '1'
}

// ─── Unhandled promise rejection → stderr (non-fatal, surface for debugging) ──
process.on('unhandledRejection', (reason) => {
  if (process.env.QILING_DEBUG === '1') {
    process.stderr.write(`[unhandledRejection] ${reason instanceof Error ? reason.stack : String(reason)}\n`)
  }
})

// ─── Suppress common false-positive Node.js warnings (CC's warningHandler.ts) ─
// MaxListenersExceededWarning fires when many AbortSignal listeners are added
// (e.g., concurrent tool executions). We set max with setMaxListeners() but
// Node may still warn in some paths. Suppress known false positives in non-debug mode.
process.on('warning', (warning: Error & { code?: string }) => {
  if (process.env.QILING_DEBUG === '1') {
    process.stderr.write(`[warning] ${warning.name}: ${warning.message}\n`)
    return
  }
  const msg = warning.message ?? ''
  const SUPPRESS = [
    /MaxListenersExceededWarning.*AbortSignal/,
    /MaxListenersExceededWarning.*EventTarget/,
    /ExperimentalWarning.*VM Modules/,
  ]
  if (!SUPPRESS.some(re => re.test(msg))) {
    process.stderr.write(`[warning] ${warning.name}: ${warning.message}\n`)
  }
})

// ─── Deprecated model registry (CC's getModelDeprecationWarning pattern) ─────
const DEPRECATED_MODELS: Record<string, string> = {
  'claude-2': 'claude-3-5-sonnet-20241022',
  'claude-2.0': 'claude-3-5-sonnet-20241022',
  'claude-2.1': 'claude-3-5-sonnet-20241022',
  'claude-instant-1': 'claude-haiku-4-5-20251001',
  'claude-instant-1.2': 'claude-haiku-4-5-20251001',
  'claude-3-opus-20240229': 'claude-opus-4-7',
  'claude-3-haiku-20240307': 'claude-haiku-4-5-20251001',
}
function getModelDeprecationWarning(model: string): string | null {
  const normalized = model.toLowerCase()
  for (const [deprecated, replacement] of Object.entries(DEPRECATED_MODELS)) {
    if (normalized.includes(deprecated)) {
      return `模型 "${model}" 已弃用，建议迁移至 ${replacement}`
    }
  }
  return null
}

const VERSION = '0.4.1'

const program = new Command()

program
  .name('qiling')
  .description('启灵 (QiLing) — 终端 AI 编程代理，默认启动交互式会话，使用 -p/--print 运行非交互式')
  .argument('[prompt]', 'Your prompt (use with -p for non-interactive mode)', String)
  .version(VERSION, '-v, --version')
  .option('-m, --model <model>', 'AI model to use (e.g. claude-opus-4-7, claude-sonnet-4-6, or aliases: opus, sonnet, haiku)')
  .option('--provider <provider>', 'AI provider (anthropic, minimax, qwen, doubao, glm, openai, gemini, ollama)')
  .option('--api-key <key>', 'API key (or set ANTHROPIC_API_KEY / provider-specific env var)')
  .option('--endpoint <url>', 'Custom API endpoint URL')
  .option('--max-tokens <n>', 'Maximum tokens per response', parseInt)
  .option('--cwd <dir>', 'Set working directory (default: current directory)')
  .option('--debug', 'Enable debug logging (verbose internal state)')
  .option('--no-banner', 'Skip startup banner')
  .option('--yolo', 'Skip all permission confirmations — recommended only for trusted environments')
  .option('--dangerously-skip-permissions', 'Alias for --yolo: bypass all permission checks')
  .option('--readonly', 'Read-only mode: disables all write/execute tools')
  .option('--no-update-check', 'Skip startup update check')
  .option('--no-repo-map', 'Skip automatic repository map injection into system prompt')
  .option('--resume [session-id]', 'Resume last session (or specific session by ID)')
  .option('-c, --continue', 'Continue the most recent conversation in current directory')
  .option('--thinking <tokens>', 'Enable extended thinking with token budget (e.g. 16384)', parseInt)
  .option('--coordinator', 'Enable coordinator mode: orchestrate parallel worker agents')
  .option('--session-id <uuid>', 'Use a specific session ID (useful for resuming or tracking from scripts)')
  .option('-n, --name <name>', 'Set a display name for this session (shown in /resume picker)')
  .option('-p, --print', 'Print response and exit (non-interactive, useful for pipes and scripts)')
  .option('--output-format <format>', 'Output format with -p: "text" (default), "json", or "stream-json"', 'text')
  .option('--max-turns <n>', 'Maximum number of agent turns (non-interactive mode)', parseInt)
  .option('--system-prompt <prompt>', 'Override system prompt')
  .option('--allowed-tools <tools...>', 'Comma or space-separated list of tools to allow (e.g. "Bash FileRead Glob")')
  .option('--disallowed-tools <tools...>', 'Comma or space-separated list of tools to deny (e.g. "Bash FileWrite")')
  .option('--prefill <text>', 'Pre-fill the prompt input with text (does not auto-submit)')
  .option('--settings <file-or-json>', 'Path to a settings JSON file, or a JSON string to load additional settings from')
  .option('--max-budget-usd <amount>', 'Maximum USD cost before stopping (print mode); formats: 0.50, 1.00', parseFloat)
  .option('--add-dir <directories...>', 'Additional directories to include CLAUDE.md/QILING.md from (useful for monorepos)')
  .option('--append-system-prompt <prompt>', 'Append text to the default system prompt without replacing it')
  .option('--verbose', 'Show verbose output (tool names, durations) in non-interactive mode', false)
  .option('--effort <level>', 'Thinking effort level (low / medium / high / max) — maps to extended thinking budget', (v: string) => {
    const allowed = ['low', 'medium', 'high', 'max'] as const
    if (!allowed.includes(v.toLowerCase() as typeof allowed[number])) {
      process.stderr.write(`⚠ --effort: 无效级别 "${v}"，有效值: ${allowed.join(', ')}\n`)
      process.exit(1)
    }
    return v.toLowerCase() as typeof allowed[number]
  })
  .option('--proactive', '主动模式: AI 不等待指令，自主探索和执行任务，适合后台监控场景')
  .option('--no-session-persistence', '禁用会话持久化（不写入磁盘，不可恢复）— 仅在 -p 模式有效')
  .action(async (prompt: string | undefined, options) => {
    const workingDir = options.cwd
      ? (await import('path')).resolve(options.cwd)
      : process.cwd()

    process.chdir(workingDir)

    // ─── Process title (CC's process.title pattern) ───────────────────────
    // Sets the process name shown in `ps`, terminal tabs, and process managers.
    // CC sets this after init(); we set it here since we don't have a blocking init step.
    if (!process.env.QILING_DISABLE_TERMINAL_TITLE) {
      process.title = 'qiling'
    }

    // ─── Effort → thinking budget mapping (CC's --effort flag) ───────────
    // Maps --effort levels to extended thinking token budgets:
    //   low → 1,024  | medium → 4,096  | high → 16,384  | max → 32,768
    if (options.effort) {
      const EFFORT_BUDGETS: Record<string, number> = {
        low: 1_024, medium: 4_096, high: 16_384, max: 32_768,
      }
      const budget = EFFORT_BUDGETS[options.effort]
      if (budget && !options.thinking) {
        options.thinking = budget
      }
    }

    // ─── Update check (non-blocking, runs in background) ──────────────────
    if (options.updateCheck !== false) {
      checkForUpdates(VERSION, { noUpdateCheck: false }).then(update => {
        if (update) {
          console.error(
            `\n⬆  新版本可用: ${update.latestVersion} (当前: v${update.currentVersion})\n` +
            `   下载: ${update.releaseUrl}\n` +
            `   或运行: curl -fsSL https://raw.githubusercontent.com/YOUR_USER/qiling/main/scripts/install.sh | bash\n`
          )
        }
      }).catch(() => {/* ignore */})
    }

    // ─── Settings ─────────────────────────────────────────────────────────
    // --settings: load additional settings from JSON file or JSON string
    let settingsOverrides: Record<string, unknown> = {}
    if (options.settings) {
      try {
        const s = options.settings.trim()
        if (s.startsWith('{')) {
          settingsOverrides = JSON.parse(s)
        } else {
          const content = require('fs').readFileSync(s, 'utf-8')
          settingsOverrides = JSON.parse(content)
        }
      } catch (e) {
        process.stderr.write(`⚠ --settings 解析失败: ${e instanceof Error ? e.message : e}\n`)
      }
    }

    const settings = loadSettings(workingDir, {
      ...(options.model    && { model: options.model }),
      ...(options.provider && { provider: options.provider }),
      ...(options.apiKey   && { apiKey: options.apiKey }),
      ...(options.endpoint && { endpoint: options.endpoint }),
      ...(options.maxTokens && { maxTokens: options.maxTokens }),
      ...settingsOverrides,
    })

    if (options.debug)    process.env.QILING_DEBUG = '1'
    // --yolo and --dangerously-skip-permissions are aliases (CC pattern)
    if (options.yolo || (options as { dangerouslySkipPermissions?: boolean }).dangerouslySkipPermissions) {
      process.env.QILING_YOLO = '1'
      // Activate auto-mode state for yoloClassifier integration
      const { setAutoModeActive, setAutoModeFlagCli } = await import('./permissions/autoModeState')
      setAutoModeActive(true)
      setAutoModeFlagCli(true)
    }
    if (options.readonly) process.env.QILING_READONLY = '1'
    if (options.thinking) settings.thinkingBudget = options.thinking
    // Wire --effort level into settings so it flows to the provider (in addition to thinkingBudget)
    if (options.effort) {
      settings.effortLevel = options.effort as 'low' | 'medium' | 'high' | 'max'
    }

    // ─── API key validation ────────────────────────────────────────────────
    const needsKey = !['ollama'].includes(settings.provider)
    const hasKey = settings.apiKey
      || process.env.ANTHROPIC_API_KEY
      || process.env.MINIMAX_API_KEY
      || process.env.DASHSCOPE_API_KEY
      || process.env.QWEN_API_KEY
      || process.env.ARK_API_KEY
      || process.env.DOUBAO_API_KEY
      || process.env.ZHIPUAI_API_KEY
      || process.env.GLM_API_KEY
      || process.env.OPENAI_API_KEY
      || process.env.GEMINI_API_KEY

    if (needsKey && !hasKey) {
      const envVarMap: Record<string, string> = {
        anthropic: 'ANTHROPIC_API_KEY',
        minimax:   'MINIMAX_API_KEY',
        qwen:      'DASHSCOPE_API_KEY',
        doubao:    'ARK_API_KEY',
        glm:       'ZHIPUAI_API_KEY',
        openai:    'OPENAI_API_KEY',
        gemini:    'GEMINI_API_KEY',
      }
      const envVar = envVarMap[settings.provider] ?? 'API_KEY'
      console.error(`\n⚠  未找到 ${settings.provider} 的 API Key。`)
      console.error(`   选项一: 设置环境变量: export ${envVar}=your-key`)
      console.error(`   选项二: 使用参数:   qiling --api-key your-key`)
      console.error(`   选项三: 运行向导:   qiling（启动后运行 /setup 命令）`)
      console.error(`\n   Homebrew: brew tap Aswellle/qiling && brew install qiling`)
      console.error(`   快速安装: curl -fsSL https://raw.githubusercontent.com/Aswellle/QiLing-Agentic-Coding/main/scripts/install.sh | bash\n`)
      process.exit(1)
    }

    // ─── Build core components (fast path) ────────────────────────────────
    const provider    = createProvider(settings)
    const rawTools    = buildToolRegistry(settings)

    // ─── Tool filtering (--allowed-tools / --disallowed-tools) ───────────
    // Mirrors CC's tool filtering for scripted/headless use.
    const tools = (() => {
      const allowed = options.allowedTools?.flatMap((s: string) => s.split(',').map((t: string) => t.trim())).filter(Boolean)
      const disallowed = options.disallowedTools?.flatMap((s: string) => s.split(',').map((t: string) => t.trim())).filter(Boolean)
      if (!allowed && !disallowed) return rawTools
      const filtered = new Map(rawTools)
      if (allowed && allowed.length > 0) {
        for (const [name] of filtered) {
          if (!allowed.some((a: string) => name === a || name.startsWith(a + '('))) filtered.delete(name)
        }
      }
      if (disallowed && disallowed.length > 0) {
        for (const name of disallowed) filtered.delete(name)
      }
      if (options.debug) {
        process.stderr.write(`✓ 工具: ${[...filtered.keys()].join(', ')}\n`)
      }
      return filtered
    })()

    const permissions = new PermissionsManager(settings)

    // ─── Init file history (session-scoped backup system) ─────────────────
    const sessionId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
    initFileHistory(sessionId)

    // ─── Load plugins (non-blocking, merge tools & commands) ──────────────
    const { loadPlugins } = await import('./plugins/loader')
    const plugins = await loadPlugins(workingDir).catch(() => [])
    for (const plugin of plugins) {
      for (const tool of plugin.tools) tools.set(tool.name, tool)
      // Commands from plugins are merged into BUILTIN_COMMANDS in-place
      const { BUILTIN_COMMANDS } = await import('./commands/index')
      for (const cmd of plugin.commands) {
        if (!BUILTIN_COMMANDS.find(c => c.name === cmd.name)) {
          BUILTIN_COMMANDS.push(cmd)
        }
      }
    }
    if (plugins.length > 0) {
      const loaded = plugins.filter(p => !p.error)
      const failed = plugins.filter(p => p.error)
      if (loaded.length > 0) process.stderr.write(`✓ 插件: ${loaded.map(p => p.name).join(', ')}\n`)
      if (failed.length > 0) process.stderr.write(`⚠ 插件加载失败: ${failed.map(p => p.id).join(', ')}\n`)
    }

    // ─── Coordinator mode override ────────────────────────────────────────
    // CC's --add-dir: store additional CLAUDE.md search directories
    if (options.addDir && options.addDir.length > 0) {
      const { resolve: resolvePath2 } = await import('path')
      const additionalDirs = options.addDir.map((d: string) => resolvePath2(workingDir, d))
      process.env.QILING_ADDITIONAL_DIRS = additionalDirs.join(':')
    }

    if (options.coordinator) process.env.QILING_COORDINATOR_MODE = '1'
    const coordinatorActive = isCoordinatorMode()
    if (coordinatorActive) process.stderr.write('⚡ 协调器模式已启用 (Coordinator Mode)\n')

    // Sync prompt first (no RepoMap) so TUI appears fast
    const { buildSystemPrompt } = await import('./utils/systemPrompt')
    // CC's --system-prompt: replace; --append-system-prompt: append to default
    const builtPrompt = options.systemPrompt ?? buildSystemPrompt(workingDir, settings)
    let appendPrompt = options.appendSystemPrompt ?? ''

    // ─── Output style injection (sync — styles are loaded from disk synchronously) ─
    // If an output style is configured in settings, append its prompt to the system prompt.
    const activeStyleName = settings.outputStyle
    if (activeStyleName) {
      const outputStyles = loadOutputStyles(workingDir)
      const style = outputStyles.find(s => s.name.toLowerCase() === activeStyleName.toLowerCase())
      if (style) {
        appendPrompt = appendPrompt ? `${appendPrompt}\n\n${style.prompt}` : style.prompt
      }
    }

    // ─── Proactive mode system prompt addendum (CC's proactive mode pattern) ─
    // --proactive: AI takes initiative without waiting for instructions.
    // Adds a system prompt section instructing the agent to explore, act, and
    // respond to periodic <tick> check-ins. Ported from CC's proactive mode.
    if ((options as { proactive?: boolean }).proactive || process.env.QILING_PROACTIVE === '1') {
      const proactiveAddendum = `
# 主动模式 (Proactive Mode)

你正在主动模式下运行。主动采取行动 — 探索、执行，持续推进任务，无需等待指令。

首先简短问候用户，然后开始工作。

你会收到周期性的 <tick> 提示。这是例行检查。做任何你认为最有价值的事情，或者如果没有任务可做，调用 Sleep 工具等待。

用户可以在你工作时随时发送消息来调整方向。`
      appendPrompt = appendPrompt ? `${appendPrompt}\n\n${proactiveAddendum}` : proactiveAddendum
    }

    const baseSystemPrompt = appendPrompt
      ? `${builtPrompt}\n\n${appendPrompt}`
      : builtPrompt
    const systemPromptSync = coordinatorActive
      ? getCoordinatorSystemPrompt() + '\n\n---\n\n' + baseSystemPrompt
      : baseSystemPrompt

    // Async enrich: RepoMap + full memory scan + auto-memory prompt (fires after TUI is visible)
    let systemPrompt = systemPromptSync
    const enrichPromptAsync = options.repoMap !== false
      ? buildSystemPromptAsync(workingDir, settings).then(async p => {
          // Append auto-memory prompt if enabled
          const memoryPrompt = await loadMemoryPrompt(workingDir, settings)
          const enriched = memoryPrompt ? `${p}\n\n${memoryPrompt}` : p
          // Re-apply output style to enriched prompt if active
          let final = enriched
          if (activeStyleName) {
            const outputStyles = loadOutputStyles(workingDir)
            const style = outputStyles.find(s => s.name.toLowerCase() === activeStyleName.toLowerCase())
            if (style) final = `${enriched}\n\n${style.prompt}`
          }
          systemPrompt = coordinatorActive
            ? getCoordinatorSystemPrompt() + '\n\n---\n\n' + final
            : final
        }).catch(() => {})
      : loadMemoryPrompt(workingDir, settings).then(memoryPrompt => {
          if (memoryPrompt) {
            systemPrompt = coordinatorActive
              ? getCoordinatorSystemPrompt() + '\n\n---\n\n' + systemPromptSync + '\n\n' + memoryPrompt
              : systemPromptSync + '\n\n' + memoryPrompt
          }
        }).catch(() => {})

    // ─── Session resume (-c / --continue / --resume) ─────────────────────
    let initialMessages = undefined
    const shouldResume = options.resume !== undefined || options.continue
    if (shouldResume) {
      options.resume = options.resume ?? true  // treat -c as --resume
    }
    if (options.resume !== undefined) {
      const sessionId = typeof options.resume === 'string' ? options.resume : undefined
      if (sessionId) {
        const { loadSession } = await import('./session/resume')
        const loaded = loadSession(sessionId)
        if (loaded) {
          initialMessages = loaded
          process.stderr.write(`✓ 已恢复会话 ${sessionId.slice(-8)} (${loaded.length} 条消息)\n`)
        } else {
          process.stderr.write(`⚠ 找不到会话: ${sessionId}\n`)
        }
      } else {
        const sessionData = loadLastSession(workingDir)
        if (sessionData) {
          initialMessages = sessionData.messages
          const date = new Date(sessionData.summary.startTime).toLocaleString('zh-CN')
          process.stderr.write(`✓ 已恢复最近会话 (${date}, ${sessionData.messages.length} 条消息)\n`)
        }
      }
    }

    // ─── Load MCP tools ───────────────────────────────────────────────────
    if (settings.mcpServers && Object.keys(settings.mcpServers).length > 0) {
      try {
        const mcpTools = await loadAllMcpTools({ mcpServers: settings.mcpServers })
        for (const tool of mcpTools) tools.set(tool.name, tool)
        if (options.debug) {
          console.log(`✓ Loaded ${mcpTools.length} MCP tools from ${Object.keys(settings.mcpServers).length} server(s)`)
        }
      } catch (err) {
        process.stderr.write(`⚠ MCP init warning: ${err instanceof Error ? err.message : err}\n`)
      }
    }

    // ─── Configure AgentTool ─────────────────────────────────────────────
    configureAgentTool(provider, permissions, () => tools, systemPromptSync)
    void enrichPromptAsync.then(() => {
      configureAgentTool(provider, permissions, () => tools, systemPrompt)
    })

    // ─── Print mode (-p / --print): headless non-interactive ──────────────
    //     Mirrors CC's headless path: run query, stream to stdout, exit.
    //     Usage: qiling -p "your prompt"
    //            echo "prompt" | qiling -p
    const isPrint = options.print || (prompt && !process.stdout.isTTY)
    const finalPrompt = prompt
      || (isPrint && !process.stdin.isTTY ? await readStdinWithTimeout() : undefined)
      || (options.systemPrompt ? '' : undefined)

    // ─── Model deprecation warning (CC's getModelDeprecationWarning pattern) ─
    const deprecationWarning = getModelDeprecationWarning(settings.model)
    if (deprecationWarning) {
      process.stderr.write(`⚠  ${deprecationWarning}\n`)
    }

    if (isPrint && finalPrompt !== undefined) {
      await enrichPromptAsync  // ensure RepoMap is ready
      const { runQuery } = await import('./query')
      const { getUserContext, getSystemContext } = await import('./context')

      const [userCtx, sysCtx] = await Promise.all([
        getUserContext(workingDir).catch(() => ({} as Record<string, string>)),
        getSystemContext(workingDir).catch(() => ({} as Record<string, string>)),
      ])

      const startMessages = initialMessages ?? []
      if (finalPrompt) startMessages.push({ role: 'user', content: finalPrompt })

      const outputFormat = options.outputFormat ?? 'text'
      const textChunks: string[] = []

      try {
        const result = await runQuery(
          startMessages,
          tools,
          provider,
          permissions,
          {
            systemPrompt: systemPrompt,
            maxRounds: options.maxTurns ?? 20,
            thinkingBudget: settings.thinkingBudget,
            userContext: userCtx,
            systemContext: sysCtx,
          },
          {
            onTextDelta: (text) => {
              if (outputFormat === 'text') {
                process.stdout.write(text)
              } else if (outputFormat === 'stream-json') {
                process.stdout.write(JSON.stringify({
                  type: 'content_block_delta',
                  delta: { type: 'text_delta', text },
                }) + '\n')
              } else {
                textChunks.push(text)
              }
            },
            onToolStart: (id, name) => {
              if (outputFormat === 'text') process.stderr.write(`\n⚡ ${name}…\n`)
              else if (outputFormat === 'stream-json') {
                process.stdout.write(JSON.stringify({
                  type: 'tool_use_start', id, name,
                }) + '\n')
              }
            },
            onToolComplete: (id, name, result, isError) => {
              if (outputFormat === 'text' && isError) process.stderr.write(`✗ ${name} failed\n`)
              else if (outputFormat === 'stream-json') {
                process.stdout.write(JSON.stringify({
                  type: 'tool_result', id, name,
                  content: result.slice(0, 500),  // truncate for stream-json
                  is_error: isError,
                }) + '\n')
              }
            },
            onError: (err) => { process.stderr.write(`\n⚠ Error: ${err}\n`) },
            onRetry: (attempt, total, _err, delay) => {
              process.stderr.write(`⟳ Retry ${attempt}/${total} (${delay}ms)…\n`)
            },
            onUsageUpdate: (usage) => {
              // --max-budget-usd: warn when cost limit exceeded (print mode)
              if (options.maxBudgetUsd && options.maxBudgetUsd > 0) {
                const { calculateCost } = require('./utils/tokens') as typeof import('./utils/tokens')
                const cost = calculateCost(usage, settings.model)
                if (cost.totalUSD >= options.maxBudgetUsd) {
                  process.stderr.write(`\n⚠ 已达到预算上限 $${options.maxBudgetUsd.toFixed(2)} (实际: $${cost.totalUSD.toFixed(4)})\n`)
                }
              }
            },
          }
        )

        if (outputFormat === 'text') {
          process.stdout.write('\n')
        } else if (outputFormat === 'stream-json') {
          // Emit final result event (CC compatibility)
          const lastAssistant = [...result.messages].reverse().find(m => m.role === 'assistant' && !m.isMeta)
          const text = lastAssistant
            ? typeof lastAssistant.content === 'string'
              ? lastAssistant.content
              : (lastAssistant.content as Array<{type: string; text?: string}>)
                  .filter(b => b.type === 'text').map(b => b.text ?? '').join('')
            : ''
          process.stdout.write(JSON.stringify({
            type: 'result',
            subtype: 'success',
            result: text,
            stop_reason: result.stopReason,
            num_turns: result.rounds,
            usage: result.usage,
            session_id: `qiling-${Date.now()}`,
          }) + '\n')
        } else if (outputFormat === 'json') {
          const lastAssistant = [...result.messages].reverse().find(m => m.role === 'assistant' && !m.isMeta)
          const text = lastAssistant
            ? typeof lastAssistant.content === 'string'
              ? lastAssistant.content
              : (lastAssistant.content as Array<{type: string; text?: string}>)
                  .filter(b => b.type === 'text').map(b => b.text ?? '').join('')
            : ''
          process.stdout.write(JSON.stringify({
            type: 'result',
            result: text,
            stop_reason: result.stopReason,
            num_turns: result.rounds,
            usage: result.usage,
          }) + '\n')
        }

        process.exit(0)
      } catch (err) {
        process.stderr.write(`\n✗ Fatal: ${err instanceof Error ? err.message : String(err)}\n`)
        process.exit(1)
      }
    }

    // ─── Set terminal title (CC's session title pattern) ─────────────────
    // Two approaches: OSC 8 escape for tab title + process.title for ps list.
    if (process.stdout.isTTY) {
      const titleModel = settings.model.split('-').slice(0, 2).join('-')
      process.stdout.write(`\x1b]0;QiLing (${titleModel})\x07`)
      process.title = `qiling (${titleModel})`
    }

    // ─── Deferred background prefetches (CC's startDeferredPrefetches pattern) ─
    // Fire cache-warming work after the REPL renders so the user sees the UI
    // immediately. These run while the user types their first message.
    // We use setImmediate() so the Ink render loop gets its first tick first.
    setImmediate(() => {
      // Warm context caches: CLAUDE.md + git status needed for first API call
      const { getUserContext, getSystemContext } = require('./context') as typeof import('./context')
      void getUserContext(workingDir).catch(() => {})
      void getSystemContext(workingDir).catch(() => {})
    })

    // ─── Launch TUI ───────────────────────────────────────────────────────
    const { waitUntilExit } = render(
      <REPL
        tools={tools}
        provider={provider}
        permissions={permissions}
        systemPrompt={systemPromptSync}
        workingDir={workingDir}
        version={VERSION}
        settings={settings}
        initialMessages={initialMessages}
        initialInput={options.prefill}
      />,
      {
        exitOnCtrlC: false,  // REPL handles Ctrl+C (abort stream vs exit)
        patchConsole: !options.debug,
      }
    )

    // ─── Graceful shutdown (CC's process.once('SIGTERM') pattern) ────────────
    // SIGTERM: sent by process managers (Docker, systemd, etc.) for clean exit
    // SIGINT:  sent by Ctrl+C — REPL handles it for abort-vs-exit, but if
    //          the REPL is not up yet, fall back to normal exit here.
    const shutdown = () => {
      process.stderr.write('\n⚡ 收到退出信号，正在保存会话…\n')
      process.exit(0)
    }
    process.once('SIGTERM', shutdown)

    await waitUntilExit()
    process.off('SIGTERM', shutdown)  // clean up if exited normally
    process.exit(0)
  })

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Read stdin with a 3s timeout — ported from CC's getInputPrompt pattern.
 * If no data arrives within 3 seconds, warns and proceeds without stdin data.
 * Prevents silent hangs when stdin is an inherited-but-idle pipe from a parent.
 */
async function readStdinWithTimeout(): Promise<string> {
  if (process.stdin.isTTY) return ''

  process.stdin.setEncoding('utf8')
  const chunks: string[] = []
  const onData = (chunk: string) => { chunks.push(chunk) }
  process.stdin.on('data', onData)

  // Peek for data with a 3s timeout (CC's peekForStdinData pattern)
  const timedOut = await peekForStdinData(process.stdin, 3000)
  process.stdin.off('data', onData)

  if (timedOut) {
    process.stderr.write(
      'Warning: 3 秒内未收到 stdin 数据，将忽略 stdin。' +
      '若正在通过管道传入数据，请使用较长的超时或直接提供 prompt 参数。\n'
    )
    return ''
  }

  // Collect remaining data until stream closes
  return new Promise((resolve) => {
    const remaining: string[] = [...chunks]
    process.stdin.on('data', (chunk: string) => remaining.push(chunk))
    process.stdin.on('end', () => resolve(remaining.join('').trim()))
    process.stdin.on('error', () => resolve(remaining.join('').trim()))
    process.stdin.resume()
  })
}

// ─── Subcommands ─────────────────────────────────────────────────────────────
program
  .command('version')
  .description('Show detailed version information')
  .action(() => {
    console.log(`QiLing (启灵) v${VERSION}`)
    console.log(`Runtime: ${typeof Bun !== 'undefined' ? `Bun ${Bun.version}` : `Node ${process.version}`}`)
    console.log(`Platform: ${process.platform} ${process.arch}`)
    console.log(`Config:   ${import.meta.dir}`)
  })

// ─── MCP subcommand group (CC's 'claude mcp' pattern) ────────────────────────
// Provides MCP server management without starting the TUI.
const mcp = program
  .command('mcp')
  .description('Configure and manage MCP servers')

mcp
  .command('list')
  .description('List configured MCP servers from settings.json')
  .action(() => {
    const { loadSettings } = require('./settings') as typeof import('./settings')
    const settings = loadSettings(process.cwd())
    const servers = settings.mcpServers ?? {}
    const names = Object.keys(servers)
    if (names.length === 0) {
      console.log('未配置 MCP 服务器。')
      console.log('在 ~/.qiling/settings.json 的 mcpServers 字段中添加服务器。')
    } else {
      console.log(`已配置 ${names.length} 个 MCP 服务器:`)
      for (const name of names) {
        const server = servers[name]!
        const cmd = 'command' in server ? server.command : 'url' in server ? (server as { url: string }).url : '?'
        console.log(`  ${name}: ${cmd}`)
      }
    }
  })

mcp
  .command('add <name> <command>')
  .description('Add an MCP server (stdio) to ~/.qiling/settings.json')
  .option('-s, --scope <scope>', 'Configuration scope (global or project)', 'global')
  .option('--args <args...>', 'Additional arguments for the command')
  .action((name: string, command: string, options: { scope: string; args?: string[] }) => {
    const { join } = require('path') as typeof import('path')
    const { homedir } = require('os') as typeof import('os')
    const { existsSync, readFileSync, writeFileSync, mkdirSync } = require('fs') as typeof import('fs')

    const isGlobal = options.scope === 'global'
    const settingsPath = isGlobal
      ? join(homedir(), '.qiling', 'settings.json')
      : join(process.cwd(), '.qiling', 'settings.json')

    mkdirSync(join(settingsPath, '..'), { recursive: true })
    let config: Record<string, unknown> = {}
    if (existsSync(settingsPath)) {
      try { config = JSON.parse(readFileSync(settingsPath, 'utf-8')) } catch {}
    }
    const servers = (config.mcpServers ?? {}) as Record<string, unknown>
    servers[name] = {
      command,
      ...(options.args && options.args.length > 0 ? { args: options.args } : {}),
    }
    config.mcpServers = servers
    writeFileSync(settingsPath, JSON.stringify(config, null, 2) + '\n', 'utf-8')
    console.log(`✓ 已添加 MCP 服务器 "${name}" 到 ${settingsPath}`)
  })

mcp
  .command('remove <name>')
  .description('Remove an MCP server from settings.json')
  .option('-s, --scope <scope>', 'Configuration scope (global or project)', 'global')
  .action((name: string, options: { scope: string }) => {
    const { join } = require('path') as typeof import('path')
    const { homedir } = require('os') as typeof import('os')
    const { existsSync, readFileSync, writeFileSync } = require('fs') as typeof import('fs')

    const isGlobal = options.scope === 'global'
    const settingsPath = isGlobal
      ? join(homedir(), '.qiling', 'settings.json')
      : join(process.cwd(), '.qiling', 'settings.json')

    if (!existsSync(settingsPath)) {
      console.error(`✗ 设置文件不存在: ${settingsPath}`)
      process.exit(1)
    }
    let config: Record<string, unknown> = {}
    try { config = JSON.parse(readFileSync(settingsPath, 'utf-8')) } catch {}
    const servers = (config.mcpServers ?? {}) as Record<string, unknown>
    if (!(name in servers)) {
      console.error(`✗ MCP 服务器 "${name}" 不存在`)
      process.exit(1)
    }
    delete servers[name]
    config.mcpServers = servers
    writeFileSync(settingsPath, JSON.stringify(config, null, 2) + '\n', 'utf-8')
    console.log(`✓ 已删除 MCP 服务器 "${name}"`)
  })

// ─── Auth subcommand (CC's 'claude auth' pattern) ────────────────────────────
const auth = program
  .command('auth')
  .description('管理 API 认证配置')

auth
  .command('status')
  .description('显示当前 API Key 配置状态')
  .action(() => {
    const providers = [
      { name: 'Anthropic', envVar: 'ANTHROPIC_API_KEY' },
      { name: 'OpenAI',    envVar: 'OPENAI_API_KEY' },
      { name: 'Gemini',    envVar: 'GEMINI_API_KEY' },
      { name: 'QWen',      envVar: 'DASHSCOPE_API_KEY' },
      { name: 'Doubao',    envVar: 'ARK_API_KEY' },
      { name: 'GLM',       envVar: 'ZHIPUAI_API_KEY' },
      { name: 'MiniMax',   envVar: 'MINIMAX_API_KEY' },
    ]
    console.log('API Key 状态:')
    for (const { name, envVar } of providers) {
      const value = process.env[envVar]
      if (value) {
        const masked = value.slice(0, 8) + '...' + value.slice(-4)
        console.log(`  ✓ ${name.padEnd(12)} ${envVar}=${masked}`)
      } else {
        console.log(`  ✗ ${name.padEnd(12)} ${envVar}=(未设置)`)
      }
    }
    console.log('')
    console.log('使用 qiling --api-key <key> 或设置环境变量来配置 API Key。')
  })

auth
  .command('set-key <provider> <key>')
  .description('将 API Key 写入 ~/.qiling/settings.json (provider: anthropic/openai/qwen/etc.)')
  .action((provider: string, key: string) => {
    const { join } = require('path') as typeof import('path')
    const { homedir } = require('os') as typeof import('os')
    const { existsSync, readFileSync, writeFileSync, mkdirSync } = require('fs') as typeof import('fs')

    const settingsPath = join(homedir(), '.qiling', 'settings.json')
    mkdirSync(join(settingsPath, '..'), { recursive: true })
    let config: Record<string, unknown> = {}
    if (existsSync(settingsPath)) {
      try { config = JSON.parse(readFileSync(settingsPath, 'utf-8')) } catch {}
    }
    config.provider = provider
    config.apiKey = key
    writeFileSync(settingsPath, JSON.stringify(config, null, 2) + '\n', 'utf-8')
    const masked = key.slice(0, 8) + '...' + key.slice(-4)
    console.log(`✓ 已保存 ${provider} API Key (${masked}) 到 ${settingsPath}`)
  })

// ─── Doctor subcommand (CC's 'claude doctor' diagnostic pattern) ──────────────
program
  .command('doctor')
  .description('诊断 QiLing 安装、配置和运行环境')
  .action(async () => {
    const { join } = require('path') as typeof import('path')
    const { homedir } = require('os') as typeof import('os')
    const { existsSync } = require('fs') as typeof import('fs')

    console.log('=== QiLing Doctor ===\n')

    // Runtime check
    const runtime = typeof Bun !== 'undefined' ? `Bun ${Bun.version}` : `Node ${process.version}`
    console.log(`✓ Runtime: ${runtime}`)
    console.log(`✓ Platform: ${process.platform} ${process.arch}`)
    console.log(`✓ Version: QiLing v${VERSION}`)

    // Config files check
    console.log('\n--- 配置文件 ---')
    const configPaths = [
      join(homedir(), '.qiling', 'settings.json'),
      join(process.cwd(), '.qiling', 'settings.json'),
      join(process.cwd(), 'QILING.md'),
      join(process.cwd(), 'CLAUDE.md'),
    ]
    for (const p of configPaths) {
      const exists = existsSync(p)
      console.log(`${exists ? '✓' : '·'} ${p.replace(homedir(), '~')}`)
    }

    // API keys check
    console.log('\n--- API Key ---')
    const keys = {
      ANTHROPIC_API_KEY: 'Anthropic',
      OPENAI_API_KEY: 'OpenAI',
      DASHSCOPE_API_KEY: 'QWen',
      ARK_API_KEY: 'Doubao',
      GEMINI_API_KEY: 'Gemini',
    }
    let hasAnyKey = false
    for (const [env, name] of Object.entries(keys)) {
      if (process.env[env]) {
        hasAnyKey = true
        const val = process.env[env]!
        console.log(`✓ ${name}: ${val.slice(0, 8)}...${val.slice(-4)}`)
      }
    }
    if (!hasAnyKey) {
      console.log('✗ 未找到任何 API Key。使用 qiling auth set-key <provider> <key> 配置。')
    }

    // External tools check
    console.log('\n--- 外部工具 ---')
    const tools = ['git', 'rg', 'node', 'bun']
    for (const tool of tools) {
      try {
        const proc = Bun.spawnSync([tool, '--version'], { stdout: 'pipe', stderr: 'pipe' })
        if (proc.exitCode === 0) {
          const version = proc.stdout.toString().split('\n')[0]!.trim()
          console.log(`✓ ${tool.padEnd(6)} ${version}`)
        } else {
          console.log(`✗ ${tool.padEnd(6)} (未安装或无法运行)`)
        }
      } catch {
        console.log(`✗ ${tool.padEnd(6)} (未找到)`)
      }
    }

    console.log('\n✓ 诊断完成')
  })

program.parse(process.argv)
