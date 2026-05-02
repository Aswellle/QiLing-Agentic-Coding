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

const VERSION = '0.3.0'

const program = new Command()

program
  .name('qiling')
  .description('启灵 (QiLing) — AI Programming Agent for the terminal')
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
  .action(async (options) => {
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

    // Sync prompt first (no RepoMap) so TUI appears fast
    const { buildSystemPrompt } = await import('./utils/systemPrompt')
    const systemPromptSync = buildSystemPrompt(workingDir, settings)

    // Async enrich: RepoMap + full memory scan (fires after TUI is visible)
    let systemPrompt = systemPromptSync
    const enrichPromptAsync = options.repoMap !== false
      ? buildSystemPromptAsync(workingDir, settings).then(p => { systemPrompt = p }).catch(() => {})
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

    await waitUntilExit()
    process.exit(0)
  })

// ─── Subcommands ────────────────────────────────────────────────────────────
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
