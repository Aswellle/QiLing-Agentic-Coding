import React, { useState, useCallback, useRef, useEffect } from 'react'
import { Box, Text, useApp, useInput } from 'ink'
import { MessageBubble } from './Message'
import { ToolCallDisplay, type ToolCallRecord } from './ToolCallDisplay'
import { PermissionDialog, type PermissionRequest } from './PermissionDialog'
import { AskUserQuestionDialog, type UserQuestionRequest } from './AskUserQuestionDialog'
import { PlanApprovalDialog, type PlanApprovalRequest } from './PlanApprovalDialog'
import { PromptInput, type SlashCommand } from './PromptInput'
import { StatusBar } from './StatusBar'
import { StartupBanner } from './StartupBanner'
import { runQuery } from '../query'
import { compactConversation } from '../compact/engine'
import { BUILTIN_COMMANDS, type CommandContext } from '../commands/index'
import { formatModelList, resolveModel } from '../commands/model'
import { createProvider } from '../providers/index'
import { filterToolsForMode, buildModeSystemPrompt, type AppMode } from '../modes/planMode'
import { getBrief } from '../services/brief/store'
import { readMemories } from '../services/memory/store'
import { resolveMentions } from '../utils/mentions'
import { loadAllSkills, formatSkillList } from '../skills/loader'
import { getUserContext, getSystemContext } from '../context'
import { parseTokenBudget, stripTokenBudget } from '../utils/tokenBudget'
import { substituteArguments } from '../utils/argumentSubstitution'
import { loadLastSession, listSessions, formatSessionList } from '../session/resume'
import { HistoryManager } from '../history/manager'
import { formatErrorMessage } from '../utils/errorMessages'
import { addUsage, getTotalCostUSD, formatCostSummary, resetSession } from '../cost-tracker'
import { getAndFireDueJobs } from '../services/cron/scheduler'
import {
  createBackgroundSession, appendBackgroundMessage, completeBackgroundSession,
  removeBackgroundSession, listBackgroundSessions, runningSessionCount, totalSessionCount,
} from '../services/background/sessions'
import { checkForUpdates, type UpdateInfo } from '../utils/updater'
import { runHooks } from '../hooks/index'
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
  { name: '/skills', description: '列出已加载的 Skills' },
  { name: '/resume', description: '恢复上次会话' },
  { name: '/history', description: '查看历史会话列表' },
  { name: '/bg', description: '查看后台会话列表，/bg <id> 切换' },
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
  initialMessages?: Message[]   // for --resume
}

const TOKEN_WARN_THRESHOLD = 0.75 // 75%
const TOKEN_CRITICAL_THRESHOLD = 0.90 // 90%

export function REPL({ tools, provider, permissions, systemPrompt, workingDir, version, settings, initialMessages }: Props) {
  const { exit } = useApp()
  const [messages, setMessages] = useState<Message[]>(initialMessages ?? [])
  const [toolCalls, setToolCalls] = useState<ToolCallRecord[]>([])
  const [streamingText, setStreamingText] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [pendingPermission, setPendingPermission] = useState<PermissionRequest | null>(null)
  const [pendingUserQuestion, setPendingUserQuestion] = useState<UserQuestionRequest | null>(null)
  const [pendingPlanApproval, setPendingPlanApproval] = useState<PlanApprovalRequest | null>(null)
  const [usage, setUsage] = useState<TokenUsage>({ inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 })
  const [rounds, setRounds] = useState(0)
  const [totalCostUSD, setTotalCostUSD] = useState(0)
  const [currentProvider, setCurrentProvider] = useState(provider)
  const [error, setError] = useState<string | null>(null)
  const [notification, setNotification] = useState<string | null>(null)
  const [retryStatus, setRetryStatus] = useState<string | null>(null)
  const [appMode, setAppMode] = useState<AppMode>('act')
  const [skills, setSkills] = useState<ReturnType<typeof loadAllSkills>>([])
  // Scroll viewport — how many messages to show from the bottom
  const VIEWPORT_SIZE = 50
  const [scrollOffset, setScrollOffset] = useState(0)  // 0 = bottom, N = N messages up
  // Background session tracker (re-render on changes)
  const [bgSessionCount, setBgSessionCount] = useState(0)
  // Vim mode state for StatusBar display
  const [vimDisplayMode, setVimDisplayMode] = useState<'INSERT' | 'NORMAL'>('INSERT')
  const [pendingVimOp, setPendingVimOp] = useState<string | undefined>(undefined)
  // Update availability notification
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)

  // History manager — created once per REPL session
  const historyRef = useRef<HistoryManager | null>(null)
  useEffect(() => {
    const sessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    historyRef.current = new HistoryManager(sessionId, workingDir)

    // CC's SessionStart hook — fires once when REPL session begins
    if (settings.hooks?.SessionStart) {
      void runHooks('SessionStart', settings.hooks, {
        toolName: '', input: {}, workingDir, sessionId,
      })
    }
  }, [workingDir])

  // Load skills on mount and when workingDir changes
  useEffect(() => {
    setSkills(loadAllSkills(workingDir))
  }, [workingDir])

  // Background update check on mount (non-blocking, cached 24h)
  useEffect(() => {
    checkForUpdates(version).then(info => {
      if (info?.hasUpdate) setUpdateInfo(info)
    }).catch(() => { /* silently ignore */ })
  }, [])

  // Cron scheduler — poll every 30s, fire due jobs as user messages
  useEffect(() => {
    const interval = setInterval(() => {
      if (isStreaming) return  // don't interrupt active query
      const due = getAndFireDueJobs()
      for (const { id, prompt } of due) {
        setNotification(`⏰ Cron job fired: ${prompt.slice(0, 60)}`)
        setTimeout(() => setNotification(null), 4000)
        handleSubmit(`[cron:${id}] ${prompt}`)
      }
    }, 30_000)
    return () => clearInterval(interval)
  }, [isStreaming])

  // AbortController for Ctrl+C during streaming
  const abortControllerRef = useRef<AbortController | null>(null)
  // Track last reported usage to compute delta for cost tracking
  const lastUsageRef = useRef({ inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 })

  // Ctrl+C + scroll handler
  useInput((_input, key) => {
    if (key.ctrl && _input === 'c') {
      if (isStreaming && abortControllerRef.current) {
        abortControllerRef.current.abort()
        setNotification('⚠ 已中止当前请求')
        setTimeout(() => setNotification(null), 3000)
      } else if (!pendingPermission) {
        exit()
      }
      return
    }

    // Scroll only when not typing (no pending dialogs, not streaming)
    if (isStreaming || pendingPermission || pendingUserQuestion || pendingPlanApproval) return

    const totalMsgs = messagesRef.current.length
    const maxOffset = Math.max(0, totalMsgs - VIEWPORT_SIZE)

    // Ctrl+B: background the current streaming query
    if (key.ctrl && _input === 'b' && isStreaming && abortControllerRef.current) {
      const lastUserMsg = messagesRef.current.filter(m => m.role === 'user').at(-1)
      const desc = typeof lastUserMsg?.content === 'string'
        ? lastUserMsg.content.slice(0, 60)
        : '后台任务'
      // Detach current query: create background session, clear UI
      const bgAc = abortControllerRef.current
      const bgSession = createBackgroundSession(desc, bgAc)

      // Don't abort — let it keep running; just clear the foreground
      abortControllerRef.current = null
      setIsStreaming(false)
      setStreamingText('')
      setToolCalls([])
      setMessages([])
      setScrollOffset(0)
      setBgSessionCount(totalSessionCount())
      setNotification(`⬤ 后台运行中：${bgSession.description}`)
      setTimeout(() => setNotification(null), 4000)

      // Attach a completion callback to notify when done
      bgSession.onComplete = (s) => {
        setBgSessionCount(totalSessionCount())
        setNotification(`✓ 后台完成：${s.description} (${s.toolCallCount} 个工具调用)`)
        setTimeout(() => setNotification(null), 8000)
      }
      return
    }

    if (key.pageUp || (key.ctrl && _input === 'u')) {
      setScrollOffset(o => Math.min(o + Math.floor(VIEWPORT_SIZE / 2), maxOffset))
    } else if (key.pageDown || (key.ctrl && _input === 'd')) {
      setScrollOffset(o => Math.max(0, o - Math.floor(VIEWPORT_SIZE / 2)))
    } else if (key.ctrl && _input === 'b') {
      setScrollOffset(o => Math.min(o + VIEWPORT_SIZE, maxOffset))
    } else if (key.ctrl && _input === 'f') {
      setScrollOffset(o => Math.max(0, o - VIEWPORT_SIZE))
    } else if (_input === 'g' && !isStreaming) {
      // 'g' = go to top (only when not in text input)
      setScrollOffset(maxOffset)
    } else if (_input === 'G' && !isStreaming) {
      setScrollOffset(0)
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
    // Reset usage delta tracker for this query run
    lastUsageRef.current = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 }

    // Fresh AbortController for this query
    const ac = new AbortController()
    abortControllerRef.current = ac

    // Apply mode filter first, then command-specific restrictions
    let queryTools = filterToolsForMode(tools, appMode) as Map<string, Tool>
    if (restrictedToolNames) {
      queryTools = new Map(
        Array.from(queryTools.entries()).filter(([name]) =>
          restrictedToolNames.some(allowed =>
            name === allowed || allowed.startsWith(`${name}(`)
          )
        )
      )
    }

    try {
      // Fetch per-session context (git status, date, CLAUDE.md) — memoized
      const [userCtx, sysCtx] = await Promise.all([
        getUserContext(workingDir).catch(() => ({} as Record<string, string>)),
        getSystemContext(workingDir).catch(() => ({} as Record<string, string>)),
      ])

      const result = await runQuery(
        queryMessages,
        queryTools,
        currentProvider,
        permissions,
        {
          systemPrompt: (() => {
            const base = buildModeSystemPrompt(querySystemPrompt ?? systemPrompt, appMode)
            const brief = getBrief()
            const memories = readMemories(workingDir)
            const briefSection = brief ? `## Current Task Brief\n\n${brief}\n\n` : ''
            const memSection = memories ? `## Persistent Memories (QILING.md)\n\n${memories}\n\n` : ''
            return briefSection || memSection ? `${briefSection}${memSection}---\n\n${base}` : base
          })(),
          signal: ac.signal,
          hooks: settings.hooks,
          thinkingBudget: settings.thinkingBudget,
          userContext: userCtx,
          systemContext: sysCtx,
          // CC's refreshTools() pattern: reload tools between agent turns
          // Allows newly-connected MCP tools to become available mid-session
          refreshTools: () => filterToolsForMode(tools, appMode) as Map<string, Tool>,
        },
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
            const secs = Math.round(delayMs / 1000)
            setRetryStatus(`重试 (${attempt}/${total}) 等待 ${secs}s — ${errMsg.slice(0, 60)}`)
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
          onAskUserQuestion: (questions, resolve) => {
            setPendingUserQuestion({
              questions,
              resolve: (answers) => {
                setPendingUserQuestion(null)
                resolve(answers)
              },
            })
          },
          onEnterPlanMode: () => {
            setAppMode('plan')
          },
          onExitPlanMode: (plan, resolve) => {
            setPendingPlanApproval({
              plan,
              resolve: (approved) => {
                setPendingPlanApproval(null)
                if (approved) setAppMode('act')
                resolve(approved)
              },
            })
          },
          onUsageUpdate: (u) => {
            // Compute delta vs last-reported (onUsageUpdate gives cumulative per-query total)
            const prev = lastUsageRef.current
            const di = u.inputTokens - prev.inputTokens
            const dout = u.outputTokens - prev.outputTokens
            const dcr = u.cacheReadTokens - prev.cacheReadTokens
            const dcw = u.cacheWriteTokens - prev.cacheWriteTokens
            if (di > 0 || dout > 0) {
              addUsage(currentProvider.config.model, di, dout, dcr, dcw)
              setTotalCostUSD(getTotalCostUSD())
            }
            lastUsageRef.current = u
            setUsage(u)
          },
          onError: (err) => setError(formatErrorMessage(err, currentProvider.config.name)),
        }
      )

      setMessages(result.messages)
      setRounds(result.rounds)
      setScrollOffset(0)  // auto-scroll to bottom after each query

      // Save new messages to history
      if (historyRef.current) {
        const newMessages = result.messages.slice(queryMessages.length)
        historyRef.current.saveMessages(newMessages)
      }
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
  }, [tools, currentProvider, permissions, systemPrompt, appMode, settings])

  const handleSubmit = useCallback(async (rawInput: string) => {
    if (rawInput.startsWith('/')) {
      await handleCommand(rawInput.trim())
      return
    }

    // Check if it's a skill invocation (dynamic, loaded from files)
    const skillMatch = rawInput.match(/^\/(\S+)(.*)$/)
    if (skillMatch) {
      const skillName = skillMatch[1]
      const skill = skills.find(s => s.name === skillName)
      if (skill) {
        const userMsg: Message = { role: 'user', content: `/${skillName}${skillMatch[2]}` }
        // CC's substituteArguments: replace $ARGUMENTS, $ARGUMENTS[0], $0 etc. in skill prompts
        const skillArgs = skillMatch[2].trim()
        const skillPrompt = substituteArguments(skill.instructions, skillArgs || undefined)
        const newMessages = [...messagesRef.current, userMsg]
        setMessages(newMessages)
        await runAIQuery([...newMessages, { role: 'user', content: skillPrompt }])
        return
      }
    }

    // CC's UserPromptSubmit hook — fires before each user prompt is sent to AI
    if (settings.hooks?.UserPromptSubmit) {
      await runHooks('UserPromptSubmit', settings.hooks, {
        toolName: '', input: { prompt: rawInput }, workingDir,
        sessionId: historyRef.current?.sessionId ?? '',
      })
    }

    // Resolve @mentions before sending to AI
    let resolvedInput = rawInput
    if (rawInput.includes('@')) {
      const { text } = await resolveMentions(rawInput, workingDir)
      resolvedInput = text
    }

    // CC's parseTokenBudget: detect inline token budget expressions
    // Example: "+500k verify this codebase" → strips budget, sets 500k token budget
    const inlineBudget = parseTokenBudget(resolvedInput)
    if (inlineBudget && inlineBudget > 0) {
      setNotification(`💰 Token 预算已设置：${inlineBudget >= 1_000_000 ? `${(inlineBudget / 1_000_000).toFixed(1)}M` : `${Math.round(inlineBudget / 1000)}k`} tokens`)
      setTimeout(() => setNotification(null), 3000)
      resolvedInput = stripTokenBudget(resolvedInput) || resolvedInput
    }

    // CC's ultrathink keyword: when user types "ultrathink" in prompt,
    // automatically enable extended thinking with a generous budget.
    // Mirrors CC's hasUltrathinkKeyword() + modelSupportsThinking() behavior.
    const hasUltrathink = /\bultrathink\b/i.test(resolvedInput)
    if (hasUltrathink) {
      // Temporarily boost thinking budget for this query
      const ultrathinkBudget = 16_000  // CC's typical ultrathink budget
      const supportsThinking = /claude-(opus|sonnet)-4/i.test(settings.model)
      if (supportsThinking && settings.thinkingBudget === 0) {
        setNotification('🧠 Ultrathink 模式已激活 — 扩展思考预算：16,000 tokens')
        setTimeout(() => setNotification(null), 4000)
        // Temporarily increase thinking budget for this query only
        ;(settings as { thinkingBudget: number }).thinkingBudget = ultrathinkBudget
      }
    }

    const userMessage: Message = { role: 'user', content: resolvedInput }
    const newMessages = [...messagesRef.current, { role: 'user' as const, content: rawInput }]
    setMessages(newMessages)
    await runAIQuery([...messagesRef.current, userMessage])

    // Reset ultrathink budget after query
    if (hasUltrathink && settings.thinkingBudget === 16_000) {
      ;(settings as { thinkingBudget: number }).thinkingBudget = 0
    }
  }, [runAIQuery, workingDir, skills])

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

      case '/plan':
        setAppMode('plan')
        break  // fall through to builtin command for the message

      case '/act':
        setAppMode('act')
        break  // fall through to builtin command for the message

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
            `  Hooks:     ${settings.hooks ? '已配置' : '未配置'}`,
            `  Thinking:  ${settings.thinkingBudget > 0 ? `${settings.thinkingBudget} tokens` : '未启用'}`,
            ``,
            `配置文件: ~/.qiling/settings.json`,
            `项目配置: .qiling/settings.json`,
          ].join('\n'),
        }])
        return

      case '/skills':
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `已加载的 Skills（${skills.length} 个）:\n\n${formatSkillList(skills)}`,
        }])
        return

      case '/resume': {
        if (args) {
          // Resume specific session
          const { loadSession } = await import('../session/resume')
          const loaded = loadSession(args)
          if (!loaded || loaded.length === 0) {
            setError(`找不到会话: ${args}`)
          } else {
            setMessages(loaded)
            setNotification(`✓ 已恢复会话 ${args.slice(-8)} (${loaded.length} 条消息)`)
            setTimeout(() => setNotification(null), 4000)
          }
        } else {
          const sessionData = loadLastSession(workingDir)
          if (!sessionData) {
            setMessages(prev => [...prev, {
              role: 'assistant',
              content: formatSessionList(listSessions()),
            }])
          } else {
            const { messages: loaded, summary } = sessionData
            setMessages(loaded)
            const date = new Date(summary.startTime).toLocaleString('zh-CN')
            setNotification(`✓ 已恢复最近会话 (${date}, ${loaded.length} 条消息)`)
            setTimeout(() => setNotification(null), 5000)
          }
        }
        return
      }

      case '/history':
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: formatSessionList(listSessions(workingDir)),
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
      // Show static list immediately
      const staticList = formatModelList({ provider: currentProvider.config.name, model: currentProvider.config.model })
      setMessages(prev => [...prev, { role: 'assistant', content: staticList }])

      // Then try to fetch dynamic models from current provider in background
      if (currentProvider.getModels) {
        const dynamicModels = await currentProvider.getModels().catch(() => null)
        if (dynamicModels && dynamicModels.length > 0) {
          const providerName = currentProvider.config.name
          const newModels = dynamicModels.filter(m =>
            !staticList.includes(m)  // only show ones not already in static list
          )
          if (newModels.length > 0) {
            setMessages(prev => [...prev, {
              role: 'assistant',
              content: `API 动态发现 (${providerName}) — 额外可用模型:\n${newModels.slice(0, 20).map(m => `  ${m}`).join('\n')}`,
            }])
          }
        }
      }
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

  // Viewport: render at most VIEWPORT_SIZE messages, scrollable by scrollOffset
  const totalMsgs = messages.length
  const visibleEnd = Math.max(0, totalMsgs - scrollOffset)
  const visibleStart = Math.max(0, visibleEnd - VIEWPORT_SIZE)
  const visibleMessages = messages.slice(visibleStart, visibleEnd)
  const hiddenAbove = visibleStart
  const hiddenBelow = totalMsgs - visibleEnd
  const isScrolled = scrollOffset > 0

  return (
    <Box flexDirection="column" paddingX={0}>
      {showBanner && (
        <StartupBanner version={version} provider={currentProvider.config} workingDir={workingDir} />
      )}

      {/* Scroll indicator — messages above viewport */}
      {hiddenAbove > 0 && (
        <Box marginBottom={0}>
          <Text color="gray" dimColor>↑ {hiddenAbove} 条消息在上方  [Ctrl+U/PageUp 向上滚动]</Text>
        </Box>
      )}

      {visibleMessages.map((msg, i) => (
        <MessageBubble key={visibleStart + i} message={msg} />
      ))}

      {/* Scroll indicator — currently scrolled up */}
      {isScrolled && hiddenBelow === 0 && (
        <Box marginBottom={0}>
          <Text color="gray" dimColor>↓ [Ctrl+D/PageDown 回到底部]</Text>
        </Box>
      )}

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
      {pendingUserQuestion && <AskUserQuestionDialog request={pendingUserQuestion} />}
      {pendingPlanApproval && <PlanApprovalDialog request={pendingPlanApproval} />}

      {/* Update available banner */}
      {updateInfo?.hasUpdate && (
        <Box marginBottom={0}>
          <Text color="magenta">
            ↑ 新版本 v{updateInfo.latestVersion} 可用（当前 v{updateInfo.currentVersion}）— 运行 /update 升级
          </Text>
        </Box>
      )}

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
        retryStatus={retryStatus}
        mode={appMode}
        totalCostUSD={totalCostUSD}
        bgSessionCount={bgSessionCount}
        vimMode={settings.vimMode}
        vimDisplayMode={vimDisplayMode}
        pendingVimOp={pendingVimOp}
      />

      <PromptInput
        onSubmit={handleSubmit}
        isDisabled={isStreaming || pendingPermission !== null || pendingUserQuestion !== null || pendingPlanApproval !== null}
        commands={SLASH_COMMANDS}
        vimMode={settings.vimMode}
        onVimModeChange={(mode, op) => {
          setVimDisplayMode(mode)
          setPendingVimOp(op)
        }}
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
