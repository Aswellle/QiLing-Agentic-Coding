import React, { useState, useCallback, useRef, useEffect } from 'react'
import { Box, Text, useApp } from 'ink'
import { MessageBubble } from './Message'
import { ToolCallDisplay, type ToolCallRecord } from './ToolCallDisplay'
import { PermissionDialog, type PermissionRequest } from './PermissionDialog'
import { PromptInput, type SlashCommand } from './PromptInput'
import { StatusBar } from './StatusBar'
import { StartupBanner } from './StartupBanner'
import { runQuery } from '../query'
import { BUILTIN_COMMANDS } from '../commands/index'
import { formatModelList, resolveModel } from '../commands/model'
import { createProvider } from '../providers/index'
import type { Message } from '../types/message'
import type { Tool } from '../types/tool'
import type { Provider } from '../types/provider'
import type { PermissionManager } from '../types/tool'
import type { TokenUsage } from '../types/message'
import type { Settings } from '../settings/schema'

const SLASH_COMMANDS: SlashCommand[] = BUILTIN_COMMANDS.map(c => ({
  name: c.name,
  description: c.description,
})).concat([
  { name: '/model', description: '切换 AI 模型' },
  { name: '/config', description: '查看当前配置' },
  { name: '/clear', description: '清空当前对话' },
  { name: '/compact', description: '压缩对话上下文' },
  { name: '/exit', description: '退出' },
])

interface Props {
  tools: Map<string, Tool>
  provider: Provider
  permissions: PermissionManager
  systemPrompt: string
  workingDir: string
  version: string
  settings: Settings
}

const TOKEN_WARN_THRESHOLD = 0.75 // 75%
const TOKEN_CRITICAL_THRESHOLD = 0.90 // 90%

export function REPL({ tools, provider, permissions, systemPrompt, workingDir, version, settings }: Props) {
  const { exit } = useApp()
  const [messages, setMessages] = useState<Message[]>([])
  const [toolCalls, setToolCalls] = useState<ToolCallRecord[]>([])
  const [streamingText, setStreamingText] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [pendingPermission, setPendingPermission] = useState<PermissionRequest | null>(null)
  const [usage, setUsage] = useState<TokenUsage>({ inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 })
  const [rounds, setRounds] = useState(0)
  const [currentProvider, setCurrentProvider] = useState(provider)
  const [error, setError] = useState<string | null>(null)
  const [notification, setNotification] = useState<string | null>(null)

  const messagesRef = useRef(messages)
  messagesRef.current = messages

  const contextWindow = currentProvider.getContextWindow()
  const totalTokens = usage.inputTokens + usage.outputTokens
  const usagePct = contextWindow > 0 ? totalTokens / contextWindow : 0
  const isNearLimit = usagePct >= TOKEN_WARN_THRESHOLD
  const isCritical = usagePct >= TOKEN_CRITICAL_THRESHOLD

  // Auto-compact when critical
  useEffect(() => {
    if (isCritical && !isStreaming && messagesRef.current.length > 4) {
      setNotification('⚠ Context approaching limit — auto-compacting...')
      handleCompact()
    }
  }, [isCritical])

  const runAIQuery = useCallback(async (
    queryMessages: Message[],
    querySystemPrompt?: string,
    restrictedToolNames?: string[]
  ) => {
    setError(null)
    setStreamingText('')
    setToolCalls([])
    setIsStreaming(true)

    let queryTools = tools
    if (restrictedToolNames) {
      queryTools = new Map(
        Array.from(tools.entries()).filter(([name]) =>
          restrictedToolNames.some(allowed =>
            name === allowed || allowed.startsWith(`${name}(`)
          )
        )
      )
    }

    try {
      const result = await runQuery(
        queryMessages,
        queryTools,
        currentProvider,
        permissions,
        { systemPrompt: querySystemPrompt ?? systemPrompt },
        {
          onTextDelta: (text) => setStreamingText(prev => prev + text),
          onToolStart: (id, name) => {
            setToolCalls(prev => [...prev, {
              id, name, input: {}, status: 'running', startTime: Date.now(),
            }])
          },
          onToolComplete: (id, _name, result, isError) => {
            setToolCalls(prev => prev.map(tc =>
              tc.id === id
                ? { ...tc, status: isError ? 'error' : 'done', result, endTime: Date.now() }
                : tc
            ))
          },
          onPermissionRequest: (toolName, description, resolve) => {
            setPendingPermission({
              toolName,
              description,
              resolve: (decision, remember) => {
                setPendingPermission(null)
                resolve(decision, remember)
              },
            })
          },
          onUsageUpdate: setUsage,
          onError: setError,
        }
      )

      setMessages(result.messages)
      setRounds(result.rounds)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsStreaming(false)
      setStreamingText('')
    }
  }, [tools, currentProvider, permissions, systemPrompt])

  const handleSubmit = useCallback(async (input: string) => {
    if (input.startsWith('/')) {
      await handleCommand(input.trim())
      return
    }

    const userMessage: Message = { role: 'user', content: input }
    const newMessages = [...messagesRef.current, userMessage]
    setMessages(newMessages)
    await runAIQuery(newMessages)
  }, [runAIQuery])

  async function handleCommand(cmd: string) {
    const spaceIdx = cmd.indexOf(' ')
    const name = spaceIdx === -1 ? cmd : cmd.slice(0, spaceIdx)
    const args = spaceIdx === -1 ? '' : cmd.slice(spaceIdx + 1).trim()

    // Local UI commands
    switch (name) {
      case '/exit':
      case '/quit':
        exit()
        return

      case '/clear':
        setMessages([])
        setToolCalls([])
        setStreamingText('')
        setError(null)
        setNotification(null)
        setUsage({ inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 })
        return

      case '/compact':
        await handleCompact(args)
        return

      case '/model':
        await handleModel(args)
        return

      case '/config':
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: [
            `当前配置:`,
            `  Provider:  ${currentProvider.config.name} (${currentProvider.config.displayName})`,
            `  Model:     ${currentProvider.config.model}`,
            `  Context:   ${Math.round(contextWindow / 1000)}K tokens`,
            `  Working:   ${workingDir}`,
            ``,
            `配置文件: ~/.qiling/settings.json`,
            `项目配置: .qiling/settings.json`,
          ].join('\n'),
        }])
        return
    }

    // AI-driven built-in commands
    const builtinCmd = BUILTIN_COMMANDS.find(
      c => c.name === name || c.aliases?.includes(name)
    )

    if (builtinCmd) {
      if (builtinCmd.execute) {
        builtinCmd.execute(args, {
          workingDir,
          messages: messagesRef.current,
          onMessage: (msg) => setMessages(prev => [...prev, msg]),
          runQuery: async (msgs, sysPrompt, toolNames) => {
            await runAIQuery(msgs, sysPrompt, toolNames)
          },
        })
        return
      }

      if (builtinCmd.getPrompt) {
        const prompt = await builtinCmd.getPrompt(args, {
          workingDir,
          messages: messagesRef.current,
          onMessage: (msg) => setMessages(prev => [...prev, msg]),
          runQuery: async (msgs, sysPrompt, toolNames) => {
            await runAIQuery(msgs, sysPrompt, toolNames)
          },
        })

        // Execute shell command substitutions in the prompt
        const resolvedPrompt = await resolveShellCommands(prompt, workingDir)

        const userMessage: Message = { role: 'user', content: resolvedPrompt }
        const newMessages = [...messagesRef.current, userMessage]
        setMessages(newMessages)
        await runAIQuery(newMessages, undefined, builtinCmd.allowedTools)
        return
      }
    }

    setError(`Unknown command: ${name}. Type /help for available commands.`)
  }

  async function handleCompact(customInstructions?: string) {
    const msgs = messagesRef.current
    if (msgs.length < 2) {
      setError('Not enough conversation history to compact.')
      return
    }

    setIsStreaming(true)
    setNotification(null)
    try {
      const contextSummary = customInstructions
        ? `Summarize the conversation so far. Custom focus: ${customInstructions}`
        : `Summarize the conversation so far. Preserve: key decisions, code changes made, current task state, and any important context needed to continue. Be concise — use bullet points.`

      const result = await runQuery(
        [...msgs, { role: 'user', content: contextSummary }],
        new Map(), // No tools for compaction
        currentProvider,
        permissions,
        { systemPrompt: 'You are a helpful assistant. Summarize conversations concisely.' },
        { onUsageUpdate: setUsage }
      )

      const summary = result.messages.filter(m => m.role === 'assistant').slice(-1)[0]
      if (summary) {
        const originalCount = msgs.length
        const compressedMessages: Message[] = [
          { role: 'user', content: '[Context compacted — summary of previous conversation:]' },
          summary,
        ]
        setMessages(compressedMessages)
        setToolCalls([])
        setNotification(`✓ Compacted ${originalCount} messages → 2 (summary preserved)`)
        setTimeout(() => setNotification(null), 5000)
      }
    } catch (err) {
      setError(`Compact failed: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setIsStreaming(false)
    }
  }

  async function handleModel(args: string) {
    if (!args) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: formatModelList({ provider: currentProvider.config.name, model: currentProvider.config.model }),
      }])
      return
    }

    const opt = resolveModel(args)
    if (!opt) {
      setError(`Unknown model: ${args}. Use /model to list available models.`)
      return
    }

    const newProvider = createProvider({
      ...settings,
      provider: opt.provider,
      model: opt.model,
    })
    setCurrentProvider(newProvider)
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: `✓ 已切换到 **${opt.displayName}** (${opt.provider})\n  Context window: ${opt.contextWindow}`,
    }])
  }

  const showBanner = messages.length === 0

  return (
    <Box flexDirection="column" paddingX={0}>
      {showBanner && (
        <StartupBanner version={version} provider={currentProvider.config} workingDir={workingDir} />
      )}

      {messages.map((msg, i) => (
        <MessageBubble key={i} message={msg} />
      ))}

      {/* Streaming assistant response */}
      {isStreaming && (streamingText || toolCalls.length > 0) && (
        <Box flexDirection="column" borderStyle="round" borderColor="green" marginBottom={1} paddingX={1}>
          <Text color="green" bold>─ assistant </Text>
          {streamingText && <Text>{streamingText}</Text>}
          {toolCalls.map(tc => (
            <ToolCallDisplay key={tc.id} toolCall={tc} />
          ))}
        </Box>
      )}

      {/* Tool calls after completion */}
      {!isStreaming && toolCalls.length > 0 && messages.some(m => m.role === 'assistant') && (
        <Box flexDirection="column" marginBottom={1} paddingLeft={1}>
          {toolCalls.map(tc => <ToolCallDisplay key={tc.id} toolCall={tc} />)}
        </Box>
      )}

      {pendingPermission && <PermissionDialog request={pendingPermission} />}

      {/* Token warning */}
      {isNearLimit && !isCritical && (
        <Box marginBottom={0}>
          <Text color="yellow">⚠ 上下文已用 {Math.round(usagePct * 100)}%，考虑运行 /compact</Text>
        </Box>
      )}

      {notification && (
        <Box marginBottom={0}>
          <Text color="cyan">{notification}</Text>
        </Box>
      )}

      {error && (
        <Box marginBottom={0}>
          <Text color="red">⚠ {error}</Text>
        </Box>
      )}

      <StatusBar
        model={currentProvider.config.model}
        usage={usage}
        contextWindow={contextWindow}
        isStreaming={isStreaming}
        rounds={rounds}
      />

      <PromptInput
        onSubmit={handleSubmit}
        isDisabled={isStreaming || pendingPermission !== null}
        commands={SLASH_COMMANDS}
      />
    </Box>
  )
}

/** Resolve $(shell command) substitutions in prompt strings */
async function resolveShellCommands(prompt: string, cwd: string): Promise<string> {
  const pattern = /\$\(([^)]+)\)/g
  const matches = [...prompt.matchAll(pattern)]

  let result = prompt
  // On Windows use PowerShell, otherwise bash
  const isWin = process.platform === 'win32'

  for (const match of matches) {
    const cmd = match[1]
    try {
      const shellArgs = isWin
        ? ['powershell.exe', '-NonInteractive', '-NoProfile', '-Command', cmd]
        : ['bash', '-c', cmd]

      const proc = Bun.spawn(shellArgs, {
        cwd,
        stdout: 'pipe',
        stderr: 'pipe',
      })
      const output = await new Response(proc.stdout).text()
      await proc.exited
      result = result.replace(match[0], output.trim())
    } catch {
      result = result.replace(match[0], `(failed: ${cmd})`)
    }
  }

  return result
}
