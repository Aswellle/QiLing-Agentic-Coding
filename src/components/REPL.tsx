import React, { useState, useCallback, useRef } from 'react'
import { Box, Text, useApp } from 'ink'
import { MessageBubble } from './Message'
import { ToolCallDisplay, type ToolCallRecord } from './ToolCallDisplay'
import { PermissionDialog, type PermissionRequest } from './PermissionDialog'
import { PromptInput, type SlashCommand } from './PromptInput'
import { StatusBar } from './StatusBar'
import { StartupBanner } from './StartupBanner'
import { runQuery } from '../query'
import { formatModelList, resolveModel } from '../commands/model'
import type { Message } from '../types/message'
import type { Tool } from '../types/tool'
import type { Provider } from '../types/provider'
import type { PermissionManager } from '../types/tool'
import type { TokenUsage } from '../types/message'

const SLASH_COMMANDS: SlashCommand[] = [
  { name: '/help', description: '显示帮助信息' },
  { name: '/model', description: '切换 AI 模型' },
  { name: '/config', description: '查看/修改配置' },
  { name: '/memory', description: '查看/编辑记忆文件' },
  { name: '/compact', description: '压缩对话上下文' },
  { name: '/clear', description: '清空当前对话' },
  { name: '/exit', description: '退出' },
]

interface Props {
  tools: Map<string, Tool>
  provider: Provider
  permissions: PermissionManager
  systemPrompt: string
  workingDir: string
  version: string
  onModelChange?: (provider: string, model: string) => void
}

export function REPL({ tools, provider, permissions, systemPrompt, workingDir, version, onModelChange }: Props) {
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

  const messagesRef = useRef(messages)
  messagesRef.current = messages

  const handleSubmit = useCallback(async (input: string) => {
    // Handle slash commands
    if (input.startsWith('/')) {
      handleCommand(input.trim())
      return
    }

    setError(null)
    setStreamingText('')
    setToolCalls([])
    setIsStreaming(true)

    const userMessage: Message = { role: 'user', content: input }
    const newMessages = [...messagesRef.current, userMessage]
    setMessages(newMessages)

    try {
      const result = await runQuery(
        newMessages,
        tools,
        currentProvider,
        permissions,
        { systemPrompt },
        {
          onTextDelta: (text) => {
            setStreamingText(prev => prev + text)
          },
          onToolStart: (id, name) => {
            setToolCalls(prev => [...prev, {
              id,
              name,
              input: {},
              status: 'running',
              startTime: Date.now(),
            }])
          },
          onToolComplete: (id, name, result, isError) => {
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
          onUsageUpdate: (u) => {
            setUsage(u)
          },
          onError: (err) => {
            setError(err)
          },
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

  function handleCommand(cmd: string) {
    const parts = cmd.trim().split(/\s+/)
    const name = parts[0]
    const args = parts.slice(1).join(' ')

    switch (name) {
      case '/exit':
      case '/quit':
        exit()
        break
      case '/clear':
        setMessages([])
        setToolCalls([])
        setStreamingText('')
        setError(null)
        setUsage({ inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 })
        break
      case '/help':
        setMessages(prev => [...prev, { role: 'assistant', content: HELP_TEXT }])
        break
      case '/compact':
        handleCompact()
        break
      case '/model': {
        if (!args) {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: formatModelList({ provider: currentProvider.config.name, model: currentProvider.config.model }),
          }])
        } else {
          const opt = resolveModel(args)
          if (!opt) {
            setError(`Unknown model: ${args}. Use /model to list available models.`)
          } else {
            // Dynamic import to avoid circular deps
            import('../providers/index').then(({ createProvider }) => {
              const newProvider = createProvider({
                ...{ provider: opt.provider, model: opt.model, maxTokens: 8096,
                  permissions: { allow: [], deny: [] },
                  tools: { bash: { enabled: true }, powershell: { enabled: true }, webFetch: { enabled: true }, agent: { enabled: true } },
                  ui: { theme: 'auto' as const, language: 'zh-CN' as const, streamingOutput: true, showTokenUsage: true },
                  memory: { enabled: true, files: [] },
                  _version: 1,
                  apiKey: currentProvider.config.apiKey,
                  endpoint: undefined,
                }
              })
              setCurrentProvider(newProvider)
              onModelChange?.(opt.provider, opt.model)
              setMessages(prev => [...prev, {
                role: 'assistant',
                content: `✓ 已切换到 ${opt.displayName} (${opt.provider})`,
              }])
            })
          }
        }
        break
      }
      case '/config':
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `当前配置:\n  Provider: ${currentProvider.config.name}\n  Model: ${currentProvider.config.model}\n  Context: ${Math.round(currentProvider.getContextWindow() / 1000)}K tokens\n\n配置文件: ~/.qiling/settings.json\n项目配置: .qiling/settings.json`,
        }])
        break
      default:
        setError(`Unknown command: ${name}. Type /help for available commands.`)
    }
  }

  async function handleCompact() {
    if (messages.length < 4) {
      setError('Not enough conversation history to compact.')
      return
    }
    setIsStreaming(true)
    try {
      const compactPrompt = `Please summarize our conversation so far into a concise context summary.
Preserve all important decisions, code changes made, and current state of the project.
Format as bullet points.`

      const compactResult = await runQuery(
        [...messages, { role: 'user', content: compactPrompt }],
        new Map(), // No tools needed for compaction
        provider,
        permissions,
        { systemPrompt: 'You are a helpful assistant that summarizes conversations.' },
        { onUsageUpdate: setUsage }
      )

      const summary = compactResult.messages
        .filter(m => m.role === 'assistant')
        .slice(-1)[0]

      if (summary) {
        setMessages([
          { role: 'user', content: '[Conversation compacted. Summary:]' },
          summary,
        ])
        setToolCalls([])
      }
    } catch (err) {
      setError(`Compact failed: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setIsStreaming(false)
    }
  }

  const assistantMessages = messages.filter(m => m.role === 'assistant')
  const showBanner = messages.length === 0

  return (
    <Box flexDirection="column" padding={0}>
      {/* Startup banner — only show when no messages */}
      {showBanner && (
        <StartupBanner
          version={version}
          provider={currentProvider.config}
          workingDir={workingDir}
        />
      )}

      {/* Message history */}
      {messages.map((msg, i) => (
        <MessageBubble key={i} message={msg} />
      ))}

      {/* Streaming text (in-progress assistant response) */}
      {isStreaming && streamingText && (
        <Box
          flexDirection="column"
          borderStyle="round"
          borderColor="green"
          marginBottom={1}
          paddingLeft={1}
          paddingRight={1}
        >
          <Text color="green" bold>─ assistant </Text>
          <Text>{streamingText}</Text>
          {toolCalls.map(tc => (
            <ToolCallDisplay key={tc.id} toolCall={tc} />
          ))}
        </Box>
      )}

      {/* Tool calls outside streaming (after completion) */}
      {!isStreaming && toolCalls.length > 0 && assistantMessages.length > 0 && (
        <Box flexDirection="column" marginBottom={1} marginLeft={1}>
          {toolCalls.map(tc => (
            <ToolCallDisplay key={tc.id} toolCall={tc} />
          ))}
        </Box>
      )}

      {/* Permission request dialog */}
      {pendingPermission && (
        <PermissionDialog request={pendingPermission} />
      )}

      {/* Error display */}
      {error && (
        <Box marginBottom={1}>
          <Text color="red">⚠ {error}</Text>
        </Box>
      )}

      {/* Status bar */}
      <StatusBar
        model={currentProvider.config.model}
        usage={usage}
        contextWindow={currentProvider.getContextWindow()}
        isStreaming={isStreaming}
        rounds={rounds}
      />

      {/* Input */}
      <PromptInput
        onSubmit={handleSubmit}
        isDisabled={isStreaming || pendingPermission !== null}
        commands={SLASH_COMMANDS}
      />
    </Box>
  )
}

const HELP_TEXT = `
启灵 (QiLing) — 可用命令

  /help      显示此帮助
  /model     切换 AI 模型
  /config    查看/修改配置
  /memory    查看/编辑记忆文件
  /compact   压缩对话上下文
  /clear     清空当前对话
  /exit      退出程序

工具快捷键：
  Ctrl+C     退出
  /          显示命令菜单
  ↑↓         命令菜单导航
  Tab        自动补全命令
`.trim()
