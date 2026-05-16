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
import { filterToolsForMode, buildModeSystemPrompt, getNextMode, MODE_INFO, ACCEPT_EDITS_AUTO_TOOLS, type AppMode } from '../modes/planMode'
import { getBrief } from '../services/brief/store'
import { readMemories } from '../services/memory/store'
import { resolveMentions } from '../utils/mentions'
import { loadAllSkills, formatSkillList } from '../skills/loader'
import { getUserContext, getSystemContext, resetContextCaches } from '../context'
import { parseTokenBudget, stripTokenBudget } from '../utils/tokenBudget'
import { getRandomSpinnerVerb } from '../constants/spinnerVerbs'
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
import { ThemeProvider, useTheme } from '../utils/themeContext'
import type { ThemeSetting } from '../utils/theme'
import { CompanionSprite } from '../buddy/CompanionSprite'
import { getCompanion, isCompanionMuted } from '../buddy/companion'
import type { Companion } from '../buddy/types'

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
  { name: '/memory', description: '查看当前内存文件内容（QILING.md / CLAUDE.md）' },
  { name: '/fast', description: '切换快速模式：claude-opus-4-6（更快响应，CC /fast 模式）' },
  { name: '/cost', description: '显示当前会话的 Token 使用量和费用统计' },
  { name: '/review', description: 'AI 代码审查 — /review <PR号> 或不带参数显示 PR 列表' },
  { name: '/auto', description: '切换到自动编辑模式（文件操作自动批准，Shift+Tab 也可循环切换）' },
  { name: '/exit', description: '退出' },
  { name: '! <cmd>', description: '直接执行 Shell 命令，不经过 AI（CC bash 模式）' },
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
  initialInput?: string         // for --prefill (CC's --prefill option)
}

const TOKEN_WARN_THRESHOLD = 0.75 // 75%
const TOKEN_CRITICAL_THRESHOLD = 0.90 // 90%

function REPLInner({ tools, provider, permissions, systemPrompt, workingDir, version, settings, initialMessages, initialInput }: Props) {
  const { exit } = useApp()
  const { theme, setTheme: setThemeCtx } = useTheme()
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
  // Buddy companion state
  const [companion, setCompanion] = useState<Companion | undefined>(() => getCompanion())
  const [companionReaction, setCompanionReaction] = useState<string | null>(null)
  const [companionPetAt, setCompanionPetAt] = useState(0)
  const companionMuted = isCompanionMuted()

  // Refresh companion after hatch/release
  const refreshCompanion = () => setCompanion(getCompanion())

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
          // CC's acceptEdits mode — auto-approve file edit tools without dialog
          permissionMode: appMode,
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

  // ── CC's Shift+Tab permission mode cycle (chat:cycleMode) ─────────────────
  // Cycle: act → acceptEdits → plan → act
  // Shows a brief notification banner with the new mode name and description.
  const handleCycleMode = useCallback(() => {
    setAppMode(prev => {
      const next = getNextMode(prev)
      const info = MODE_INFO[next]
      // Show notification — borrow the existing notification slot
      const label = next === 'act' ? '默认模式' : next === 'acceptEdits' ? '自动编辑模式' : '计划模式'
      setNotification(`${info.label ? `[${info.label}] ` : ''}${label} — ${info.description}`)
      setTimeout(() => setNotification(null), 3500)
      return next
    })
  }, [])

  const handleSubmit = useCallback(async (rawInput: string) => {
    if (rawInput.startsWith('/')) {
      await handleCommand(rawInput.trim())
      return
    }

    // CC's bash mode: `! <command>` runs a shell command directly, no AI involved.
    // Output appears in the conversation as a system message.
    if (rawInput.startsWith('!') && rawInput.length > 1) {
      const shellCmd = rawInput.slice(1).trim()
      const userMsg: Message = { role: 'user', content: rawInput }
      setMessages(prev => [...prev, userMsg])
      try {
        const isWin = process.platform === 'win32'
        const proc = Bun.spawn(
          isWin ? ['powershell', '-NoProfile', '-Command', shellCmd] : ['bash', '-c', shellCmd],
          { cwd: workingDir, stdout: 'pipe', stderr: 'pipe' }
        )
        const [stdout, stderr, code] = await Promise.all([
          new Response(proc.stdout).text(),
          new Response(proc.stderr).text(),
          proc.exited,
        ])
        const output = [stdout, stderr].filter(Boolean).join('\n').trim()
        const result = output
          ? `$ ${shellCmd}\n${output}`
          : `$ ${shellCmd}\n(exit code ${code})`
        setMessages(prev => [...prev, { role: 'assistant', content: result }])
      } catch (err) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `$ ${shellCmd}\nError: ${err instanceof Error ? err.message : String(err)}`
        }])
      }
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
        setNotification('[PLAN] 计划模式 — 只读，禁止写入/执行  ·  Shift+Tab 循环切换')
        setTimeout(() => setNotification(null), 3000)
        break  // fall through to builtin command for the message

      case '/act':
        setAppMode('act')
        setNotification('默认模式 — 写入/执行前逐次确认  ·  Shift+Tab 循环切换')
        setTimeout(() => setNotification(null), 3000)
        break  // fall through to builtin command for the message

      case '/auto': {
        setAppMode('acceptEdits')
        setNotification('[AUTO] 自动编辑模式 — 文件操作自动批准，Shell 仍需确认  ·  Shift+Tab 循环切换')
        setTimeout(() => setNotification(null), 3500)
        return
      }

      case '/clear':
        setMessages([])
        setToolCalls([])
        setStreamingText('')
        setError(null)
        setNotification(null)
        setUsage({ inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 })
        // CC's postCompactCleanup pattern: reset context caches on /clear
        // so the next query re-reads CLAUDE.md and git status fresh
        resetContextCaches()
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

      case '/memory': {
        const { readMemories } = await import('../services/memory/store')
        const memContent = readMemories(workingDir)
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: memContent
            ? `当前内存文件内容:\n\n${memContent}\n\n提示: 编辑 QILING.md / CLAUDE.md 来更新记忆，或 ~/.qiling/QILING.md 来添加全局记忆。`
            : `暂无内存文件。创建 QILING.md 或 ~/.qiling/QILING.md 来添加持久化记忆。`,
        }])
        return
      }

      case '/fast': {
        // CC's /fast toggle: switches between normal model and claude-opus-4-6 (fast Opus)
        const FAST_MODEL = 'claude-opus-4-6'
        const normalModel = settings.model
        const isFastNow = normalModel === FAST_MODEL
        if (isFastNow) {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `⚡ 快速模式已关闭。当前模型: ${normalModel}\n提示: 使用 /model 切换模型`,
          }])
        } else {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `⚡ 快速模式: /fast 会切换到 ${FAST_MODEL}（更快速的 Opus 版本）。\n当前模型: ${normalModel}\n使用 /model ${FAST_MODEL} 手动切换。`,
          }])
        }
        return
      }

      case '/cost': {
        const { getTotalCostUSD, getCacheHitRate, getUsageByModel } = await import('../cost-tracker')
        const totalUSD = getTotalCostUSD()
        const cacheRate = Math.round(getCacheHitRate() * 100)
        const byModel = getUsageByModel()
        const modelLines = [...byModel.entries()].map(([m, u]) =>
          `  ${m}: in=${u.inputTokens.toLocaleString()} out=${u.outputTokens.toLocaleString()} cache=${u.cacheReadTokens.toLocaleString()}`
        ).join('\n')
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: [
            `当前会话 Token 使用统计:`,
            modelLines || `  (暂无数据)`,
            ``,
            `缓存命中率: ${cacheRate}%`,
            `估算费用: $${totalUSD.toFixed(4)} USD`,
          ].join('\n'),
        }])
        return
      }

      case '/review': {
        // AI-driven PR code review — ported from CC's review command
        // Uses GitHub CLI (gh) to fetch PR diff and asks AI to review it
        const prNum = args.trim()
        const reviewPrompt = prNum
          ? `You are an expert code reviewer. Follow these steps:

1. Run \`gh pr view ${prNum}\` to get PR details
2. Run \`gh pr diff ${prNum}\` to get the diff
3. Analyze the changes and provide a thorough code review that includes:
   - Overview of what the PR does
   - Analysis of code quality and style
   - Specific suggestions for improvements
   - Any potential issues or risks

Keep your review concise but thorough. Focus on:
- Code correctness
- Following project conventions
- Performance implications
- Test coverage
- Security considerations

Format your review with clear sections and bullet points.

PR number: ${prNum}`
          : `Please run \`gh pr list\` to show the open PRs for this repository, then help me choose one to review.`

        const userMsg: Message = { role: 'user', content: `/review${prNum ? ` ${prNum}` : ''}` }
        const newMessages = [...messagesRef.current, userMsg, { role: 'user' as const, content: reviewPrompt }]
        setMessages([...messagesRef.current, userMsg])
        await runAIQuery(newMessages)
        return
      }

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
      const cmdCtx: CommandContext = {
        workingDir,
        messages: messagesRef.current,
        onMessage: (msg) => setMessages(prev => [...prev, msg]),
        runQuery: async (msgs, sysPrompt, toolNames) => {
          await runAIQuery(msgs, sysPrompt, toolNames)
        },
        setTheme: (setting) => setThemeCtx(setting as ThemeSetting),
        petCompanion: () => { setCompanionPetAt(Date.now()); refreshCompanion() },
        setCompanionReaction: (text) => {
          setCompanionReaction(text)
          setTimeout(() => setCompanionReaction(null), 10_000)
          refreshCompanion()
        },
      }

      if (builtinCmd.execute) {
        builtinCmd.execute(args, cmdCtx)
        return
      }

      if (builtinCmd.getPrompt) {
        const prompt = await builtinCmd.getPrompt(args, cmdCtx)

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
          <Text color={theme.inactive} dimColor>↑ {hiddenAbove} 条消息在上方  [Ctrl+U/PageUp 向上滚动]</Text>
        </Box>
      )}

      {visibleMessages.map((msg, i) => (
        <MessageBubble key={visibleStart + i} message={msg} />
      ))}

      {/* Scroll indicator — currently scrolled up */}
      {isScrolled && hiddenBelow === 0 && (
        <Box marginBottom={0}>
          <Text color={theme.inactive} dimColor>↓ [Ctrl+D/PageDown 回到底部]</Text>
        </Box>
      )}

      {/* Streaming assistant response */}
      {isStreaming && (streamingText || toolCalls.length > 0) && (
        <Box flexDirection="column" borderStyle="round" borderColor={theme.success} marginBottom={1} paddingX={1}>
          <Text color={theme.success} bold>─ {getRandomSpinnerVerb()}… </Text>
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
          <Text color={theme.autoAccept}>
            ↑ 新版本 v{updateInfo.latestVersion} 可用（当前 v{updateInfo.currentVersion}）— 运行 /update 升级
          </Text>
        </Box>
      )}

      {/* Token warning */}
      {isNearLimit && !isCritical && (
        <Box marginBottom={0}>
          <Text color={theme.warning}>⚠ 上下文已用 {Math.round(usagePct * 100)}%，考虑运行 /compact</Text>
        </Box>
      )}

      {notification && (
        <Box marginBottom={0}>
          <Text color={theme.suggestion}>{notification}</Text>
        </Box>
      )}

      {error && (
        <Box marginBottom={0}>
          <Text color={theme.error}>⚠ {error}</Text>
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

      {/* Companion + PromptInput row */}
      <Box flexDirection="row" alignItems="flex-end">
        {/* PromptInput — takes remaining width */}
        <Box flexGrow={1}>
          <PromptInput
            onSubmit={handleSubmit}
            isDisabled={isStreaming || pendingPermission !== null || pendingUserQuestion !== null || pendingPlanApproval !== null}
            commands={SLASH_COMMANDS}
            vimMode={settings.vimMode}
            onVimModeChange={(mode, op) => {
              setVimDisplayMode(mode)
              setPendingVimOp(op)
            }}
            initialValue={initialInput}
            onCycleMode={handleCycleMode}
          />
        </Box>

        {/* Companion sprite — sits to the right of the input */}
        {companion && !companionMuted && (
          <Box marginLeft={1} flexShrink={0}>
            <CompanionSprite
              companion={companion}
              reaction={companionReaction}
              petAt={companionPetAt}
              muted={companionMuted}
            />
          </Box>
        )}
      </Box>
    </Box>
  )
}

// ─── Public REPL wrapper — provides ThemeContext ──────────────────────────────
export function REPL(props: Props) {
  const initialTheme = (props.settings.ui?.theme ?? 'auto') as ThemeSetting
  return (
    <ThemeProvider initialSetting={initialTheme}>
      <REPLInner {...props} />
    </ThemeProvider>
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
