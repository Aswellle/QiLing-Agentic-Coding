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

// ─── Terminal cursor restoration on exit (CC's resetCursor pattern) ───────────
// If the process exits while the cursor is hidden (Ink does this), the terminal
// is left broken. Always restore on exit — idempotent and fast.
const SHOW_CURSOR = '\x1b[?25h'
function resetCursor(): void {
  const term = process.stderr.isTTY ? process.stderr : process.stdout.isTTY ? process.stdout : undefined
  term?.write(SHOW_CURSOR)
}
process.on('exit', resetCursor)

// ─── Windows: prevent current-dir PATH injection (CC's security fix) ─────────
if (process.platform === 'win32') {
  process.env.NoDefaultCurrentDirectoryInExePath = '1'
}

// ─── Unhandled promise rejection → stderr (non-fatal, surface for debugging) ──
process.on('unhandledRejection', (reason) => {
  if (process.env.QILING_DEBUG === '1') {
    process.stderr.write(`[unhandledRejection] ${reason instanceof Error ? reason.stack : String(reason)}\n`)
  }
})

const VERSION = '0.3.0'

const program = new Command()

program
  .name('qiling')
  .description('启灵 (QiLing) — AI Programming Agent for the terminal')
  .argument('[prompt]', 'Prompt for non-interactive mode (use with -p)', String)
  .version(VERSION, '-v, --version')
  .option('-m, --model <model>', 'AI model to use')
  .option('--provider <provider>', 'AI provider (anthropic, minimax, qwen, doubao, glm, openai, gemini, ollama)')
  .option('--api-key <key>', 'API key (or set ANTHROPIC_API_KEY / MINIMAX_API_KEY / DASHSCOPE_API_KEY etc.)')
  .option('--endpoint <url>', 'Custom API endpoint URL')
  .option('--max-tokens <n>', 'Maximum tokens per response', parseInt)
  .option('--cwd <dir>', 'Set working directory')
  .option('--debug', 'Enable debug logging')
  .option('--no-banner', 'Skip startup banner')
  .option('--yolo', 'Skip all permission confirmations (dangerous!)')
  .option('--readonly', 'Read-only mode: disable all write/execute tools')
  .option('--no-update-check', 'Skip startup update check')
  .option('--no-repo-map', 'Skip automatic repository map injection into system prompt')
  .option('--resume [session-id]', 'Resume last session (or specific session by ID)')
  .option('--thinking <tokens>', 'Enable extended thinking with token budget', parseInt)
  .option('--coordinator', 'Enable coordinator mode: orchestrate parallel worker agents')
  .option('-p, --print', 'Print response and exit (non-interactive, useful for pipes and scripts)')
  .option('--output-format <format>', 'Output format with -p: "text" (default) or "json"', 'text')
  .option('--max-turns <n>', 'Maximum number of agent turns (non-interactive mode)', parseInt)
  .option('--system-prompt <prompt>', 'Override system prompt')
  .action(async (prompt: string | undefined, options) => {
    const workingDir = options.cwd
      ? (await import('path')).resolve(options.cwd)
      : process.cwd()

    process.chdir(workingDir)

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
    const settings = loadSettings(workingDir, {
      ...(options.model    && { model: options.model }),
      ...(options.provider && { provider: options.provider }),
      ...(options.apiKey   && { apiKey: options.apiKey }),
      ...(options.endpoint && { endpoint: options.endpoint }),
      ...(options.maxTokens && { maxTokens: options.maxTokens }),
    })

    if (options.debug)    process.env.QILING_DEBUG = '1'
    if (options.yolo)     process.env.QILING_YOLO = '1'
    if (options.readonly) process.env.QILING_READONLY = '1'
    if (options.thinking) settings.thinkingBudget = options.thinking

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
    const tools       = buildToolRegistry(settings)
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
    if (options.coordinator) process.env.QILING_COORDINATOR_MODE = '1'
    const coordinatorActive = isCoordinatorMode()
    if (coordinatorActive) process.stderr.write('⚡ 协调器模式已启用 (Coordinator Mode)\n')

    // Sync prompt first (no RepoMap) so TUI appears fast
    const { buildSystemPrompt } = await import('./utils/systemPrompt')
    const baseSystemPrompt = buildSystemPrompt(workingDir, settings)
    const systemPromptSync = coordinatorActive
      ? getCoordinatorSystemPrompt() + '\n\n---\n\n' + baseSystemPrompt
      : baseSystemPrompt

    // Async enrich: RepoMap + full memory scan (fires after TUI is visible)
    let systemPrompt = systemPromptSync
    const enrichPromptAsync = options.repoMap !== false
      ? buildSystemPromptAsync(workingDir, settings).then(p => {
          systemPrompt = coordinatorActive
            ? getCoordinatorSystemPrompt() + '\n\n---\n\n' + p
            : p
        }).catch(() => {})
      : Promise.resolve()

    // ─── Session resume ────────────────────────────────────────────────────
    let initialMessages = undefined
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
      || (isPrint && !process.stdin.isTTY ? await readStdin() : undefined)
      || (options.systemPrompt ? '' : undefined)

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
              if (outputFormat === 'text') process.stdout.write(text)
              else textChunks.push(text)
            },
            onToolStart: (_id, name) => {
              if (outputFormat === 'text') process.stderr.write(`\n⚡ ${name}…\n`)
            },
            onToolComplete: (_id, name, _result, isError) => {
              if (outputFormat === 'text' && isError) process.stderr.write(`✗ ${name} failed\n`)
            },
            onError: (err) => { process.stderr.write(`\n⚠ Error: ${err}\n`) },
            onRetry: (attempt, total, _err, delay) => {
              process.stderr.write(`⟳ Retry ${attempt}/${total} (${delay}ms)…\n`)
            },
          }
        )

        if (outputFormat === 'text') {
          // Text already streamed; add newline if needed
          if (!textChunks.join('').endsWith('\n') && textChunks.length === 0) {
            // streaming already done
          }
          process.stdout.write('\n')
        } else if (outputFormat === 'json') {
          const lastAssistant = [...result.messages].reverse().find(m => m.role === 'assistant')
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

async function readStdin(): Promise<string> {
  // If stdin is a TTY (interactive terminal), don't try to read it
  if (process.stdin.isTTY) return ''
  return new Promise((resolve) => {
    const chunks: Buffer[] = []
    let resolved = false
    const done = () => {
      if (!resolved) {
        resolved = true
        resolve(Buffer.concat(chunks).toString('utf-8').trim())
      }
    }
    process.stdin.on('data', (c: Buffer) => chunks.push(c))
    process.stdin.on('end', done)
    process.stdin.on('error', done)
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

program.parse(process.argv)
