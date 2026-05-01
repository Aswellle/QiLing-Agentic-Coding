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

const VERSION = '0.1.0'

const program = new Command()

program
  .name('qiling')
  .description('启灵 (QiLing) — AI Programming Agent for the terminal')
  .version(VERSION, '-v, --version')
  .option('-m, --model <model>', 'AI model to use')
  .option('--provider <provider>', 'AI provider (anthropic, openai, gemini, ollama)')
  .option('--api-key <key>', 'API key (or set ANTHROPIC_API_KEY env var)')
  .option('--endpoint <url>', 'Custom API endpoint URL')
  .option('--max-tokens <n>', 'Maximum tokens per response', parseInt)
  .option('--cwd <dir>', 'Set working directory')
  .option('--debug', 'Enable debug logging')
  .action(async (options) => {
    const workingDir = options.cwd
      ? (await import('path')).resolve(options.cwd)
      : process.cwd()

    // Load and merge settings
    const settings = loadSettings(workingDir, {
      ...(options.model && { model: options.model }),
      ...(options.provider && { provider: options.provider }),
      ...(options.apiKey && { apiKey: options.apiKey }),
      ...(options.endpoint && { endpoint: options.endpoint }),
      ...(options.maxTokens && { maxTokens: options.maxTokens }),
    })

    if (options.debug) {
      process.env.QILING_DEBUG = '1'
    }

    // Validate API key
    const needsKey = settings.provider === 'anthropic' || settings.provider === 'openai' || settings.provider === 'gemini'
    const hasKey = settings.apiKey || process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY
    if (needsKey && !hasKey) {
      console.error(`\n⚠  No API key found for provider "${settings.provider}".`)
      console.error(`   Set ANTHROPIC_API_KEY environment variable, or use --api-key.\n`)
      process.exit(1)
    }

    // Build system components
    const provider = createProvider(settings)
    const tools = buildToolRegistry(settings)
    const permissions = new PermissionsManager(settings)
    const systemPrompt = buildSystemPrompt(workingDir, settings)

    // Launch TUI
    const { waitUntilExit } = render(
      <REPL
        tools={tools}
        provider={provider}
        permissions={permissions}
        systemPrompt={systemPrompt}
        workingDir={workingDir}
        version={VERSION}
      />,
      {
        exitOnCtrlC: true,
        patchConsole: !options.debug,
      }
    )

    await waitUntilExit()
    process.exit(0)
  })

// Subcommand: version info
program
  .command('version')
  .description('Show detailed version information')
  .action(() => {
    console.log(`QiLing (启灵) v${VERSION}`)
    console.log(`Runtime: Bun ${Bun.version}`)
    console.log(`Platform: ${process.platform} ${process.arch}`)
  })

program.parse(process.argv)
