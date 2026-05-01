import React, { useState, useCallback, useRef, useEffect } from 'react'
import { Box, Text, useApp, useInput } from 'ink'
import { MessageBubble } from './Message'
import { ToolCallDisplay, type ToolCallRecord } from './ToolCallDisplay'
import { PermissionDialog, type PermissionRequest } from './PermissionDialog'
import { PromptInput, type SlashCommand } from './PromptInput'
import { StatusBar } from './StatusBar'
import { StartupBanner } from './StartupBanner'
import { runQuery } from '../query'
import { compactConversation } from '../compact/engine'
import { BUILTIN_COMMANDS } from '../commands/index'
import { formatModelList, resolveModel } from '../commands/model'
import { createProvider } from '../providers/index'
import { formatUsageLine } from '../utils/tokens'
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
  const [retryStatus, setRetryStatus] = useState<string | null>(null)

  // AbortController for Ctrl+C during streaming
  const abortControllerRef = useRef<AbortController | null>(null)

  // Ctrl+C handler: abort if streaming, else exit
  useInput((_input, key) => {
    if (key.ctrl && _input === 'c') {
      if (isStreaming && abortControllerRef.current) {
        abortControllerRef.current.abort()
        setNotification('⚠ 已中止当前请求')
        setTimeout(() => setNotification(null), 3000)
      } else if (!pendingPermission) {
        exit()
      }
    }
  })

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
    setRetryStatus(null)
    setStreamingText('')
    setToolCalls([])
    setIsStreaming(true)

    // Fresh AbortController for this query
    const ac = new AbortController()
    abortControllerRef.current = ac

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
        { systemPrompt: querySystemPrompt ?? systemPrompt, signal: ac.signal },
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
          onRetry: (attempt, total, errMsg, delayMs) => {
            setRetryStatus(`重试 (${attempt}/${total})，等待 ${Math.round(delayMs / 1000)}s... ${errMsg.slice(0, 40)}`)
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
      const msg = err instanceof Error ? err.message : String(err)
      if (!msg.includes('Aborted') && !msg.includes('AbortError')) {
        setError(msg)
      }
    } finally {
      setIsStreaming(false)
      setStreamingText('')
      setRetryStatus(null)
      abortControllerRef.current = null
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
    if (msgs.length < 4) {
      setNotification('对话历史太短，无需压缩')
      setTimeout(() => setNotification(null), 3000)
      return
    }

    const ac = new AbortController()
    abortControllerRef.current = ac
    setIsStreaming(true)
    setNotification('压缩中...')

    try {
      const result = await compactConversation(msgs, currentProvider, permissions, {
        customInstructions,
        signal: ac.signal,
        onProgress: (msg) => setNotification(msg),
      })

      setMessages(result.messages)
      setToolCalls([])
      setNotification(
        `✓ 压缩完成：${result.originalCount} → ${result.compactedCount} 条消息`
      )
      setTimeout(() => setNotification(null), 5000)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (!msg.includes('Aborted')) {
        setError(`压缩失败：${msg}`)
      }
      setNotification(null)
    } finally {
      setIsStreaming(false)
      abortControllerRef.current = null
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
