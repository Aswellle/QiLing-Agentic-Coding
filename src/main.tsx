#!/usr/bin/env bun
import React from 'react'
import { render } from 'ink'
import { Command } from 'commander'
import { REPL } from './components/REPL'
import { loadSettings } from './settings'
import { createProvider } from './providers'
import { buildToolRegistry } from './tools'
import { PermissionsManager } from './permissions'
import { buildSystemPrompt } from './utils/systemPrompt'
import { configureAgentTool } from './tools/AgentTool'
import { loadAllMcpTools } from './tools/McpTool'

const VERSION = '0.1.0'

const program = new Command()

program
  .name('qiling')
  .description('启灵 (QiLing) — AI Programming Agent for the terminal')
  .version(VERSION, '-v, --version')
  .option('-m, --model <model>', 'AI model to use')
  .option('--provider <provider>', 'AI provider (anthropic, openai, gemini, minimax, ollama)')
  .option('--api-key <key>', 'API key (or set ANTHROPIC_API_KEY/MINIMAX_API_KEY env var)')
  .option('--endpoint <url>', 'Custom API endpoint URL')
  .option('--max-tokens <n>', 'Maximum tokens per response', parseInt)
  .option('--cwd <dir>', 'Set working directory')
  .option('--debug', 'Enable debug logging')
  .option('--no-banner', 'Skip startup banner')
  .action(async (options) => {
    const workingDir = options.cwd
      ? (await import('path')).resolve(options.cwd)
      : process.cwd()

    process.chdir(workingDir)

    const settings = loadSettings(workingDir, {
      ...(options.model && { model: options.model }),
      ...(options.provider && { provider: options.provider }),
      ...(options.apiKey && { apiKey: options.apiKey }),
      ...(options.endpoint && { endpoint: options.endpoint }),
      ...(options.maxTokens && { maxTokens: options.maxTokens }),
    })

    if (options.debug) process.env.QILING_DEBUG = '1'

    // Validate API key
    const needsKey = ['anthropic', 'openai', 'gemini', 'minimax'].includes(settings.provider)
    const hasKey = settings.apiKey
      || process.env.ANTHROPIC_API_KEY
      || process.env.OPENAI_API_KEY
      || process.env.MINIMAX_API_KEY
      || process.env.GEMINI_API_KEY

    if (needsKey && !hasKey) {
      console.error(`\n⚠  No API key found for provider "${settings.provider}".`)
      console.error(`   Set ANTHROPIC_API_KEY / MINIMAX_API_KEY environment variable, or use --api-key.\n`)
      process.exit(1)
    }

    const provider = createProvider(settings)
    const tools = buildToolRegistry(settings)
    const permissions = new PermissionsManager(settings)
    const systemPrompt = buildSystemPrompt(workingDir, settings)

    // Load MCP tools if configured
    if (settings.mcpServers && Object.keys(settings.mcpServers).length > 0) {
      try {
        const mcpTools = await loadAllMcpTools({ mcpServers: settings.mcpServers })
        for (const tool of mcpTools) tools.set(tool.name, tool)
        if (options.debug) {
          console.log(`Loaded ${mcpTools.length} MCP tools from ${Object.keys(settings.mcpServers).length} server(s)`)
        }
      } catch (err) {
        console.error(`MCP initialization warning: ${err instanceof Error ? err.message : err}`)
      }
    }

    // Wire up AgentTool with the current provider/permissions
    configureAgentTool(provider, permissions, () => tools, systemPrompt)

    const { waitUntilExit } = render(
      <REPL
        tools={tools}
        provider={provider}
        permissions={permissions}
        systemPrompt={systemPrompt}
        workingDir={workingDir}
        version={VERSION}
        settings={settings}
      />,
      {
        exitOnCtrlC: true,
        patchConsole: !options.debug,
      }
    )

    await waitUntilExit()
    process.exit(0)
  })

program
  .command('version')
  .description('Show detailed version information')
  .action(() => {
    console.log(`QiLing (启灵) v${VERSION}`)
    console.log(`Runtime: Bun ${typeof Bun !== 'undefined' ? Bun.version : 'N/A'}`)
    console.log(`Platform: ${process.platform} ${process.arch}`)
  })

program.parse(process.argv)
