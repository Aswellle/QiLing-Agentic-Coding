import type { Message } from '../types/message'
import { fetchGitDiff, formatDiffStats } from '../utils/gitDiff'
import { resolve as resolvePath, join as joinPath } from 'path'
import { openFileInExternalEditor, getEditorDisplayName } from '../utils/editor'
import { listBackedUpFiles, restoreFile } from '../utils/fileHistory'
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from 'fs'
import { homedir } from 'os'

// Helper: read raw project settings JSON (bypasses Zod schema for extra keys)
function readProjectSettingsRaw(workingDir: string): Record<string, unknown> {
  const path = joinPath(workingDir, '.qiling', 'settings.json')
  if (!existsSync(path)) return {}
  try { return JSON.parse(readFileSync(path, 'utf-8')) as Record<string, unknown> }
  catch { return {} }
}

// Helper: write raw project settings JSON (bypasses Zod schema for extra keys)
function writeProjectSettingsRaw(workingDir: string, data: Record<string, unknown>): void {
  const dir = joinPath(workingDir, '.qiling')
  mkdirSync(dir, { recursive: true })
  writeFileSync(joinPath(dir, 'settings.json'), JSON.stringify(data, null, 2) + '\n', 'utf-8')
}

export interface CommandContext {
  workingDir: string
  messages: Message[]
  onMessage: (msg: Message) => void
  runQuery: (messages: Message[], systemPrompt?: string, toolNames?: string[]) => Promise<void>
  /** Live theme switcher — call to switch theme without restart */
  setTheme?: (setting: string) => void
  /** Pet your companion (trigger heart burst) */
  petCompanion?: () => void
  /** Set companion reaction text (shown in speech bubble) */
  setCompanionReaction?: (text: string) => void
}

export interface Command {
  name: string
  description: string
  aliases?: string[]
  /**
   * Returns a prompt to inject as user message, kicking off an AI-driven flow.
   * If null, the command handles everything itself via `execute`.
   */
  getPrompt?: (args: string, ctx: CommandContext) => string | Promise<string>
  /** Tools allowed for this command (undefined = all tools) */
  allowedTools?: string[]
  /** Execute directly without AI (for local commands like /clear) */
  execute?: (args: string, ctx: CommandContext) => void | Promise<void>
}

export const BUILTIN_COMMANDS: Command[] = [
  {
    name: '/help',
    description: '显示帮助信息',
    execute(_args, ctx) {
      ctx.onMessage({ role: 'assistant', content: HELP_TEXT })
    },
  },
  {
    name: '/doctor',
    description: '诊断环境配置',
    getPrompt(_args, ctx) {
      return DOCTOR_PROMPT(ctx.workingDir)
    },
    allowedTools: ['Bash', 'PowerShell'],
  },
  {
    name: '/cost',
    description: '显示本次会话的 token 使用和 USD 成本统计',
    execute(_args, ctx) {
      const { formatCostSummary, getCacheHitRate, getCacheSavingsUSD, formatCostUSD } = require('../cost-tracker')
      const cacheRate = Math.round(getCacheHitRate() * 100)
      const savings = getCacheSavingsUSD()
      const cacheSection = cacheRate > 0
        ? `\n缓存命中率: ${cacheRate}%\n缓存节省: ${formatCostUSD(savings)}`
        : ''
      ctx.onMessage({ role: 'assistant', content: formatCostSummary() + cacheSection })
    },
  },
  {
    name: '/update',
    description: '检查并安装最新版本',
    async execute(_args, ctx) {
      const { checkForUpdates, downloadAndApplyUpdate } = require('../utils/updater')
      const pkgJson = require('../../package.json') as { version: string }
      const currentVersion = pkgJson.version

      ctx.onMessage({ role: 'assistant', content: '正在检查更新…' })
      const info = await checkForUpdates(currentVersion, {})

      if (!info?.hasUpdate) {
        ctx.onMessage({ role: 'assistant', content: `✓ 当前版本 v${currentVersion} 已是最新` })
        return
      }

      ctx.onMessage({
        role: 'assistant',
        content: `发现新版本 v${info.latestVersion}（当前 v${info.currentVersion}）\n正在下载…`,
      })

      const messages: string[] = []
      await downloadAndApplyUpdate(info, (msg: string) => {
        messages.push(msg)
        ctx.onMessage({ role: 'assistant', content: messages.join('\n') })
      })
    },
  },
  {
    name: '/commit',
    description: '创建 git commit',
    allowedTools: ['Bash', 'PowerShell'],
    async getPrompt(_args, ctx) {
      const diff = await fetchGitDiff(ctx.workingDir)
      const statsLine = diff
        ? `\n- 变更统计: ${formatDiffStats(diff.stats)}${diff.stats.filesCount > 0 ? `（${diff.stats.filesCount} 个文件，+${diff.stats.linesAdded} -${diff.stats.linesRemoved} 行）` : ''}`
        : ''
      return COMMIT_PROMPT.replace('## 上下文', `## 上下文${statsLine}`)
    },
  },
  {
    name: '/test',
    description: '运行测试，失败时自动修复并重试（最多 3 次）',
    getPrompt(args, ctx) {
      return TEST_PROMPT(args, ctx.workingDir)
    },
  },
  {
    name: '/plan',
    description: '进入计划模式（只读探索，不执行变更）— 输入 /act 退出',
    execute(_args, ctx) {
      ctx.onMessage({
        role: 'assistant',
        content: [
          '已进入 **计划模式 (PLAN MODE)** 📋',
          '',
          '当前只允许读取文件和搜索代码，不会进行任何修改。',
          '请描述你想要实现的功能，我会先充分探索代码库，然后给出详细执行计划。',
          '',
          '输入 `/act` 退出计划模式，进入执行模式。',
        ].join('\n'),
      })
    },
  },
  {
    name: '/act',
    description: '退出计划模式，进入执行模式（允许所有工具）',
    execute(_args, ctx) {
      ctx.onMessage({
        role: 'assistant',
        content: '已进入 **执行模式 (ACT MODE)** ⚡ — 所有工具已恢复，可以开始执行变更。',
      })
    },
  },
  {
    name: '/repomap',
    description: '显示项目文件和符号结构（token 高效的仓库索引）',
    getPrompt(_args, ctx) {
      return `请使用 RepoMap 工具分析当前项目结构:\n\n工作目录: ${ctx.workingDir}\n\n调用 RepoMap 工具，然后基于结果给出项目架构摘要。`
    },
  },
  {
    name: '/mcp',
    description: '管理 MCP 服务器 (list/add/remove/status)',
    execute: async (args, ctx) => {
      const parts = args.trim().split(/\s+/)
      const subcmd = parts[0] ?? 'list'
      const { getMcpStatus, formatMcpStatus, addMcpServer, removeMcpServer } = await import('../mcp/manager')
      const { loadSettings } = await import('../settings/loader')
      const settings = loadSettings(ctx.workingDir)
      const mcpServers = settings.mcpServers ?? {}

      switch (subcmd) {
        case 'list':
        case 'status': {
          ctx.onMessage({ role: 'assistant', content: '正在检查 MCP 服务器连接状态...' })
          const statuses = await getMcpStatus()
          ctx.onMessage({ role: 'assistant', content: formatMcpStatus(statuses) })
          break
        }
        case 'add': {
          // /mcp add <name> <command> [args...]
          const name = parts[1]
          const command = parts[2]
          const cmdArgs = parts.slice(3)
          if (!name || !command) {
            ctx.onMessage({ role: 'assistant', content: '用法: /mcp add <name> <command> [args...]\n例: /mcp add filesystem npx -y @modelcontextprotocol/server-filesystem /path' })
            break
          }
          await addMcpServer(name, command, cmdArgs, ctx.workingDir)
          ctx.onMessage({ role: 'assistant', content: `✅ 已添加 MCP 服务器 "${name}"。重新启动 qiling 或调用 /mcp status 查看连接状态。` })
          break
        }
        case 'remove':
        case 'rm': {
          const name = parts[1]
          if (!name) {
            ctx.onMessage({ role: 'assistant', content: '用法: /mcp remove <name>' })
            break
          }
          await removeMcpServer(name, ctx.workingDir)
          ctx.onMessage({ role: 'assistant', content: `✅ 已移除 MCP 服务器 "${name}"。` })
          break
        }
        default:
          ctx.onMessage({ role: 'assistant', content: '可用子命令: list | status | add <name> <command> | remove <name>' })
      }
    },
  },
  {
    name: '/review',
    description: '代码审查 (本地 diff 或 PR)',
    getPrompt(args) {
      return REVIEW_PROMPT(args)
    },
  },
  {
    name: '/init',
    description: '分析代码库，创建 QILING.md 记忆文件',
    getPrompt(_args, ctx) {
      return INIT_PROMPT(ctx.workingDir)
    },
  },
  {
    name: '/setup',
    description: '首次配置向导 — 选择 Provider、设置 API Key',
    execute(_args, ctx) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { formatSetupGuide } = require('./setup') as { formatSetupGuide: () => string }
      ctx.onMessage({ role: 'assistant', content: formatSetupGuide() })
    },
  },
  {
    name: '/plugins',
    description: '列出已加载的插件',
    async execute(_args, ctx) {
      const { loadPlugins, formatPluginList } = require('../plugins/loader')
      const plugins = await loadPlugins(ctx.workingDir)
      ctx.onMessage({ role: 'assistant', content: formatPluginList(plugins) })
    },
  },
  {
    name: '/bg',
    description: '查看后台会话列表，/bg <id> 切换到指定会话',
    execute(args, ctx) {
      const { listBackgroundSessions, removeBackgroundSession } = require('../services/background/sessions')
      const sessions = listBackgroundSessions()

      if (sessions.length === 0) {
        ctx.onMessage({ role: 'assistant', content: '当前没有后台会话。\n使用 Ctrl+B 在查询运行时将其推入后台。' })
        return
      }

      if (args.trim()) {
        const id = args.trim()
        const s = sessions.find((s: { id: string }) => s.id === id || s.id.endsWith(id))
        if (!s) {
          ctx.onMessage({ role: 'assistant', content: `找不到后台会话 ${id}` })
          return
        }
        // Foreground: inject session messages into current conversation
        const msgs = s.messages as { role: string; content: unknown }[]
        for (const m of msgs) {
          ctx.onMessage({ role: m.role as 'user' | 'assistant', content: String(m.content) })
        }
        removeBackgroundSession(s.id)
        ctx.onMessage({ role: 'assistant', content: `✓ 已切换到后台会话 ${s.description}（已从后台移除）` })
        return
      }

      const lines = sessions.map((s: { id: string; description: string; status: string; toolCallCount: number; startedAt: number; completedAt?: number }) => {
        const dur = s.completedAt
          ? `${Math.round((s.completedAt - s.startedAt) / 1000)}s`
          : `运行 ${Math.round((Date.now() - s.startedAt) / 1000)}s`
        const status = s.status === 'running' ? '⟳' : s.status === 'completed' ? '✓' : '✗'
        return `${status} ${s.id.slice(-8)}  ${s.description}  [${dur}, ${s.toolCallCount} 工具]`
      })
      ctx.onMessage({
        role: 'assistant',
        content: `后台会话 (${sessions.length} 个):\n\n${lines.join('\n')}\n\n使用 /bg <id> 切换到指定会话`,
      })
    },
  },
  {
    name: '/memory',
    description: '管理记忆：/memory list | /memory add "xxx" | /memory clear',
    execute(args, ctx) {
      const { listMemories, appendMemory, clearMemories } = require('../services/memory/store')
      const trimmed = args.trim()

      if (!trimmed || trimmed === 'list') {
        const memories: string[] = listMemories(ctx.workingDir)
        if (memories.length === 0) {
          ctx.onMessage({ role: 'assistant', content: '暂无记忆条目。使用 `/memory add "xxx"` 添加。' })
        } else {
          ctx.onMessage({
            role: 'assistant',
            content: `已存储的记忆（${memories.length} 条）：\n\n${memories.map((m: string, i: number) => `${i + 1}. ${m}`).join('\n')}`,
          })
        }
        return
      }

      if (trimmed.startsWith('add ')) {
        const text = trimmed.slice(4).replace(/^["']|["']$/g, '').trim()
        if (!text) {
          ctx.onMessage({ role: 'assistant', content: '用法：/memory add "要记住的内容"' })
          return
        }
        appendMemory(text, ctx.workingDir, 'project')
        ctx.onMessage({ role: 'assistant', content: `✓ 已添加记忆：${text}` })
        return
      }

      if (trimmed === 'clear') {
        clearMemories(ctx.workingDir, 'project')
        ctx.onMessage({ role: 'assistant', content: '✓ 项目记忆已清除。' })
        return
      }

      ctx.onMessage({
        role: 'assistant',
        content: '用法：\n  /memory list   — 查看所有记忆\n  /memory add "xxx"  — 添加记忆\n  /memory clear  — 清除记忆',
      })
    },
  },
  {
    name: '/diff',
    description: '显示当前 git 变更统计（不启动 AI）',
    async execute(_args, ctx) {
      const diff = await fetchGitDiff(ctx.workingDir)
      if (!diff) {
        ctx.onMessage({ role: 'assistant', content: '⚠ 当前目录不是 git 仓库或无法获取 diff 信息。' })
        return
      }
      if (diff.stats.filesCount === 0) {
        ctx.onMessage({ role: 'assistant', content: '✓ 工作区干净，没有未提交的变更。' })
        return
      }

      const lines: string[] = [
        `**Git 变更统计** — ${formatDiffStats(diff.stats)}`,
        '',
      ]
      if (diff.perFileStats.size > 0) {
        for (const [file, stats] of diff.perFileStats) {
          if (stats.isUntracked) {
            lines.push(`  + ${file} (未追踪)`)
          } else if (stats.isBinary) {
            lines.push(`  ~ ${file} (二进制)`)
          } else {
            const add = stats.added > 0 ? `+${stats.added}` : ''
            const rem = stats.removed > 0 ? `-${stats.removed}` : ''
            const stat = [add, rem].filter(Boolean).join(' ')
            lines.push(`  M ${file}  ${stat}`)
          }
        }
      }

      ctx.onMessage({ role: 'assistant', content: lines.join('\n') })
    },
  },
  {
    name: '/restore',
    description: '将文件恢复到本次会话开始前的状态（撤销 AI 的所有修改）',
    async execute(args, ctx) {
      const trimmed = args.trim()

      if (!trimmed) {
        // List all backed-up files
        const backups = listBackedUpFiles(ctx.workingDir)
        if (backups.length === 0) {
          ctx.onMessage({ role: 'assistant', content: '本次会话中没有文件被修改（无备份可恢复）。' })
          return
        }
        const lines = ['**本次会话修改的文件：**', '']
        for (const b of backups) {
          lines.push(`  ${b.existed ? 'M' : '+'} ${b.relPath}`)
        }
        lines.push('')
        lines.push('恢复用法：`/restore <文件路径>`')
        ctx.onMessage({ role: 'assistant', content: lines.join('\n') })
        return
      }

      const result = await restoreFile(trimmed, ctx.workingDir)
      ctx.onMessage({ role: 'assistant', content: result })
    },
  },
  {
    name: '/open',
    description: '在外部编辑器中打开文件（VSCode/Cursor/vim 等）',
    execute(args, ctx) {
      const trimmed = args.trim()
      if (!trimmed) {
        const editorName = getEditorDisplayName()
        ctx.onMessage({
          role: 'assistant',
          content: `用法：/open <文件路径> [行号]\n当前编辑器：${editorName}\n（通过 $VISUAL 或 $EDITOR 环境变量配置）`,
        })
        return
      }

      const parts = trimmed.split(/\s+/)
      const filePath = parts[0]!
      const line = parts[1] ? parseInt(parts[1], 10) : undefined
      const absPath = filePath.startsWith('/')
        || /^[A-Za-z]:/.test(filePath)
        ? filePath
        : resolvePath(ctx.workingDir, filePath)

      const ok = openFileInExternalEditor(absPath, Number.isFinite(line) ? line : undefined)
      if (ok) {
        const lineHint = line ? `:${line}` : ''
        const editorName = getEditorDisplayName()
        ctx.onMessage({ role: 'assistant', content: `✓ 已在 ${editorName} 中打开 ${filePath}${lineHint}` })
      } else {
        ctx.onMessage({
          role: 'assistant',
          content: '⚠ 未找到可用的外部编辑器。\n请设置 $VISUAL 或 $EDITOR 环境变量（如：export VISUAL=code）',
        })
      }
    },
  },
  {
    name: '/pr',
    description: '创建 Pull Request (需要 gh CLI)',
    getPrompt(args) {
      return PR_PROMPT(args)
    },
  },

  // ─── New commands ────────────────────────────────────────────────────────────

  {
    name: '/vim',
    description: '切换 Vim 编辑模式',
    execute(args, ctx) {
      const raw = readProjectSettingsRaw(ctx.workingDir)
      const current = (raw.vimMode as boolean | undefined) ?? false
      const newMode = args.trim() === 'off' ? false : args.trim() === 'on' ? true : !current
      writeProjectSettingsRaw(ctx.workingDir, { ...raw, vimMode: newMode })
      ctx.onMessage({
        role: 'assistant',
        content: newMode
          ? '已启用 Vim 模式。按 Esc 进入 NORMAL 模式，i 进入 INSERT 模式。'
          : '已关闭 Vim 模式。',
      })
    },
  },

  {
    name: '/fast',
    description: '切换快速模式（使用更快速的模型）',
    execute(args, ctx) {
      const raw = readProjectSettingsRaw(ctx.workingDir)
      const fastModels: Record<string, string> = {
        anthropic: 'claude-haiku-4-5-20251001',
        openai: 'gpt-4o-mini',
        qwen: 'qwen-turbo',
        glm: 'glm-4-flash',
        doubao: 'doubao-lite-128k',
        minimax: 'MiniMax-Text-01',
        gemini: 'gemini-2.0-flash',
        ollama: (raw.model as string | undefined) ?? 'llama3.1',
        bedrock: 'us.anthropic.claude-haiku-4-5-20251001-v1:0',
        vertex: 'claude-haiku@20241022',
      }
      const currentFast = (raw._fastMode as boolean | undefined) ?? false
      const newFast = args.trim() === 'off' ? false : args.trim() === 'on' ? true : !currentFast

      if (newFast) {
        const originalModel = (raw.model as string | undefined) ?? 'claude-sonnet-4-6'
        const provider = (raw.provider as string | undefined) ?? 'anthropic'
        const fastModel = fastModels[provider] ?? originalModel
        writeProjectSettingsRaw(ctx.workingDir, { ...raw, _fastMode: true, _originalModel: originalModel, model: fastModel })
        ctx.onMessage({ role: 'assistant', content: `已启用快速模式 — 使用 ${fastModel}（更快速、成本更低）。再次运行 /fast 恢复。` })
      } else {
        const originalModel = (raw._originalModel as string | undefined)
        const updated: Record<string, unknown> = { ...raw, _fastMode: false }
        if (originalModel) updated.model = originalModel
        delete updated._originalModel
        writeProjectSettingsRaw(ctx.workingDir, updated)
        ctx.onMessage({ role: 'assistant', content: `已关闭快速模式，恢复正常模型${originalModel ? `（${originalModel}）` : ''}。` })
      }
    },
  },

  // ─── CC-aligned: /usage ──────────────────────────────────────────────────────
  {
    name: '/usage',
    description: '显示会话 token 用量和费用统计（与 /cost 相同）',
    execute(_args, ctx) {
      const { formatCostSummary, getCacheHitRate, getCacheSavingsUSD, formatCostUSD } = require('../cost-tracker')
      const cacheRate = Math.round(getCacheHitRate() * 100)
      const savings = getCacheSavingsUSD()
      const cacheSection = cacheRate > 0
        ? `\n缓存命中率: ${cacheRate}%\n缓存节省: ${formatCostUSD(savings)}`
        : ''
      ctx.onMessage({ role: 'assistant', content: formatCostSummary() + cacheSection })
    },
  },

  // ─── CC-aligned: /skills ─────────────────────────────────────────────────────
  {
    name: '/skills',
    description: '列出已加载的 Skills（等同于 /plugins）',
    async execute(_args, ctx) {
      const { loadAllSkills, formatSkillList } = await import('../skills/loader')
      const skills = loadAllSkills(ctx.workingDir)
      if (skills.length === 0) {
        ctx.onMessage({ role: 'assistant', content: '当前没有加载任何 Skill。\n在 .qiling/skills/ 或 ~/.qiling/skills/ 创建 .md 文件来添加 Skill。' })
        return
      }
      const lines = ['**已加载的 Skills**', '']
      for (const s of skills) {
        lines.push(`  **/${s.name}** — ${s.description || '（无描述）'}`)
      }
      ctx.onMessage({ role: 'assistant', content: lines.join('\n') })
    },
  },

  // ─── CC-aligned: /login ──────────────────────────────────────────────────────
  {
    name: '/login',
    description: '通过 OAuth PKCE 登录（支持自定义 OAuth 提供商）',
    async execute(args, ctx) {
      const trimmed = args.trim()

      // Show help if no args
      if (!trimmed || trimmed === 'help') {
        ctx.onMessage({
          role: 'assistant',
          content: [
            '**OAuth 登录**',
            '',
            '用法:',
            '  /login                        — 显示当前认证状态',
            '  /login github                  — GitHub OAuth (需要配置)',
            '  /login <provider>             — 自定义 OAuth 提供商',
            '',
            '快速 API Key 设置（推荐）:',
            '  export ANTHROPIC_API_KEY=sk-ant-...',
            '',
            '或在 ~/.qiling/settings.json 中配置:',
            '  { "apiKey": "sk-ant-..." }',
          ].join('\n'),
        })
        return
      }

      // Check current auth status
      if (trimmed === 'status') {
        const apiKey = process.env.ANTHROPIC_API_KEY
        if (apiKey) {
          ctx.onMessage({ role: 'assistant', content: `✅ 已通过 API Key 认证 (${apiKey.slice(0, 12)}...)` })
        } else {
          ctx.onMessage({ role: 'assistant', content: '❌ 未配置认证信息。设置 ANTHROPIC_API_KEY 或运行 /setup 配置。' })
        }
        return
      }

      // Generic OAuth PKCE flow
      ctx.onMessage({ role: 'assistant', content: `正在启动 OAuth 流程... (provider: ${trimmed})` })

      try {
        const { OAuthService } = await import('../services/oauth/index')
        const { loadSettings } = await import('../settings/loader')
        const settings = loadSettings(ctx.workingDir)

        // Get OAuth config from settings or env
        const oauthConfig = (settings as Record<string, unknown>)[`${trimmed}OAuth`] as Record<string, unknown> | undefined
        if (!oauthConfig) {
          ctx.onMessage({
            role: 'assistant',
            content: `未找到 ${trimmed} 的 OAuth 配置。\n在 settings.json 中配置:\n{\n  "${trimmed}OAuth": {\n    "authorizationUrl": "...",\n    "tokenUrl": "...",\n    "clientId": "...",\n    "scopes": ["..."]\n  }\n}`,
          })
          return
        }

        const service = new OAuthService({
          authorizationUrl: String(oauthConfig.authorizationUrl ?? ''),
          tokenUrl: String(oauthConfig.tokenUrl ?? ''),
          clientId: String(oauthConfig.clientId ?? ''),
          scopes: Array.isArray(oauthConfig.scopes) ? oauthConfig.scopes.map(String) : [],
        })

        const tokens = await service.startFlow(async (authUrl) => {
          ctx.onMessage({
            role: 'assistant',
            content: `请在浏览器中打开以下链接完成授权:\n\n${authUrl}\n\n授权完成后将自动继续...`,
          })
          // Try to open browser automatically
          try {
            const openCmd = process.platform === 'darwin' ? 'open'
              : process.platform === 'win32' ? 'start' : 'xdg-open'
            Bun.spawn([openCmd, authUrl], { stdout: 'pipe', stderr: 'pipe' })
          } catch { /* ignore if browser open fails */ }
        })

        ctx.onMessage({
          role: 'assistant',
          content: `✅ OAuth 认证成功！\nAccess Token: ${tokens.accessToken.slice(0, 20)}...\n${tokens.expiresIn ? `有效期: ${tokens.expiresIn}s` : ''}`,
        })
      } catch (e) {
        ctx.onMessage({
          role: 'assistant',
          content: `✗ OAuth 认证失败: ${e instanceof Error ? e.message : String(e)}`,
        })
      }
    },
  },

  // ─── CC-aligned: /logout ─────────────────────────────────────────────────────
  {
    name: '/logout',
    description: '清除认证令牌',
    execute(_args, ctx) {
      // In QiLing, credentials are stored in env vars or settings.json
      // We guide the user to clear them manually
      ctx.onMessage({
        role: 'assistant',
        content: [
          '**退出登录**',
          '',
          '请手动清除您的认证信息:',
          '',
          '1. **环境变量** (临时清除):',
          '   unset ANTHROPIC_API_KEY',
          '',
          '2. **持久化设置** (编辑 ~/.qiling/settings.json):',
          '   删除 "apiKey" 字段',
          '',
          '3. **OAuth Tokens**:',
          '   手动从 ~/.qiling/tokens/ 删除对应文件',
        ].join('\n'),
      })
    },
  },

  {
    name: '/version',
    description: '显示版本信息',
    execute(_args, ctx) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pkg = require('../../package.json') as { version: string; name: string }
      const buildTime = process.env.QILING_BUILD_TIME ?? ''
      const versionStr = buildTime ? `${pkg.version} (built ${buildTime})` : pkg.version
      ctx.onMessage({
        role: 'assistant',
        content: `${pkg.name} v${versionStr}\nRuntime: Bun ${(process.versions as Record<string, string | undefined>).bun ?? 'unknown'}\nPlatform: ${process.platform}`,
      })
    },
  },

  {
    name: '/export',
    description: '将当前对话导出为文本文件',
    async execute(args, ctx) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)

      // Get first user message for filename slug
      const firstUserMsg = ctx.messages.find(m => m.role === 'user')
      let baseName = timestamp
      if (firstUserMsg) {
        const text = typeof firstUserMsg.content === 'string'
          ? firstUserMsg.content
          : Array.isArray(firstUserMsg.content)
            ? (firstUserMsg.content as Array<{ type: string; text?: string }>)
                .filter(b => b.type === 'text')
                .map(b => b.text ?? '')
                .join(' ')
            : ''
        const slug = text.trim().slice(0, 50).replace(/[^a-zA-Z0-9一-鿿]+/g, '-').replace(/^-+|-+$/g, '')
        if (slug) baseName = `${timestamp}-${slug}`
      }

      const filename = args.trim() || `${baseName}.txt`
      const filepath = filename.startsWith('/') || /^[A-Za-z]:/.test(filename)
        ? filename
        : joinPath(ctx.workingDir, filename)

      // Format messages
      const lines: string[] = [`# QiLing 对话导出`, `导出时间: ${new Date().toLocaleString()}`, '']
      for (const msg of ctx.messages) {
        if ((msg as Message & { isMeta?: boolean }).isMeta) continue
        const role = msg.role === 'user' ? '用户' : '助手'
        const content = typeof msg.content === 'string'
          ? msg.content
          : Array.isArray(msg.content)
            ? (msg.content as Array<{ type: string; text?: string }>)
                .filter(b => b.type === 'text')
                .map(b => b.text ?? '')
                .join('\n')
            : ''
        if (content.trim()) {
          lines.push(`## ${role}`, '', content.trim(), '')
        }
      }

      try {
        writeFileSync(filepath, lines.join('\n'), 'utf-8')
        ctx.onMessage({ role: 'assistant', content: `✓ 已导出对话至: ${filepath}（${ctx.messages.length} 条消息）` })
      } catch (e) {
        ctx.onMessage({ role: 'assistant', content: `✗ 导出失败: ${String(e)}` })
      }
    },
  },

  {
    name: '/summary',
    description: '总结当前对话的关键点',
    getPrompt(args, ctx) {
      const msgCount = ctx.messages.filter(m => !((m as Message & { isMeta?: boolean }).isMeta)).length
      return `请用简洁的中文总结我们迄今为止对话的关键点：

- 用户的主要目标是什么
- 我们完成了什么工作
- 当前的状态如何
- 还有什么待办事项

格式：简洁的要点列表（不超过 10 条）。当前对话共 ${msgCount} 条消息。${args ? `\n额外要求: ${args}` : ''}`
    },
  },

  {
    name: '/rewind',
    description: '回溯到对话中的某个时间点（提供历史信息）',
    execute(_args, ctx) {
      const userMessages = ctx.messages.filter(
        m => m.role === 'user' && !((m as Message & { isMeta?: boolean }).isMeta)
      )
      ctx.onMessage({
        role: 'assistant',
        content: [
          `**回溯功能**: 当前对话共有 ${userMessages.length} 条用户消息。`,
          '',
          '要回溯到某个时间点，可以：',
          '1. 使用 `/clear` 清空对话重新开始',
          '2. 使用 `/restore <文件>` 恢复被修改的文件',
          '3. 完整回溯功能（消息选择器 UI）正在开发中',
        ].join('\n'),
      })
    },
  },

  {
    name: '/permissions',
    description: '查看和管理权限规则',
    execute(args, ctx) {
      const { loadSettings } = require('../settings/loader') as typeof import('../settings/loader')
      const settings = loadSettings(ctx.workingDir)
      const rules = settings.permissions ?? { allow: [], deny: [] }
      const allow = rules.allow ?? []
      const deny = rules.deny ?? []

      const trimmed = args.trim()

      if (trimmed.startsWith('allow ')) {
        const pattern = trimmed.slice(6).trim()
        if (pattern) {
          const raw = readProjectSettingsRaw(ctx.workingDir)
          const existingPermissions = (raw.permissions as { allow?: string[]; deny?: string[] } | undefined) ?? {}
          const existingAllow = existingPermissions.allow ?? []
          writeProjectSettingsRaw(ctx.workingDir, {
            ...raw,
            permissions: { ...existingPermissions, allow: [...existingAllow, pattern] },
          })
          ctx.onMessage({ role: 'assistant', content: `✓ 已添加允许规则: ${pattern}` })
          return
        }
      }

      if (trimmed.startsWith('deny ')) {
        const pattern = trimmed.slice(5).trim()
        if (pattern) {
          const raw = readProjectSettingsRaw(ctx.workingDir)
          const existingPermissions = (raw.permissions as { allow?: string[]; deny?: string[] } | undefined) ?? {}
          const existingDeny = existingPermissions.deny ?? []
          writeProjectSettingsRaw(ctx.workingDir, {
            ...raw,
            permissions: { ...existingPermissions, deny: [...existingDeny, pattern] },
          })
          ctx.onMessage({ role: 'assistant', content: `✓ 已添加拒绝规则: ${pattern}` })
          return
        }
      }

      const lines: string[] = ['**当前权限规则**', '']
      if (allow.length > 0) {
        lines.push('**允许 (allow):**')
        allow.forEach(r => lines.push(`  + ${r}`))
        lines.push('')
      }
      if (deny.length > 0) {
        lines.push('**拒绝 (deny):**')
        deny.forEach(r => lines.push(`  - ${r}`))
        lines.push('')
      }
      if (allow.length === 0 && deny.length === 0) {
        lines.push('暂无自定义规则（所有工具均受交互确认管控）')
        lines.push('')
      }
      lines.push('用法:')
      lines.push('  /permissions allow <pattern>  — 添加允许规则（如: Bash(git *), FileRead)')
      lines.push('  /permissions deny <pattern>   — 添加拒绝规则')
      ctx.onMessage({ role: 'assistant', content: lines.join('\n') })
    },
  },

  {
    name: '/output-style',
    description: '查看或设置输出样式（从 .qiling/output-styles/ 加载）',
    execute(args, ctx) {
      const { loadOutputStyles } = require('../services/outputStyles/loader') as typeof import('../services/outputStyles/loader')
      const styles = loadOutputStyles(ctx.workingDir)

      const styleName = args.trim()
      if (styleName) {
        const style = styles.find(s => s.name.toLowerCase() === styleName.toLowerCase())
        if (!style) {
          ctx.onMessage({
            role: 'assistant',
            content: `找不到输出样式 "${styleName}"。\n可用样式: ${styles.map(s => s.name).join(', ') || '（无）'}`,
          })
          return
        }
        ctx.onMessage({
          role: 'assistant',
          content: `已应用输出样式: **${style.name}**\n\n${style.description || style.prompt.slice(0, 100)}`,
        })
        return
      }

      if (styles.length === 0) {
        ctx.onMessage({
          role: 'assistant',
          content: [
            '暂无输出样式。',
            '',
            '要添加样式，在以下目录创建 .md 文件：',
            `  项目级: ${ctx.workingDir}/.qiling/output-styles/`,
            `  全局级: ${joinPath(homedir(), '.qiling', 'output-styles')}/`,
            '',
            '文件格式：',
            '```',
            '---',
            'name: 样式名称',
            'description: 样式描述',
            '---',
            '',
            '样式提示词内容...',
            '```',
          ].join('\n'),
        })
        return
      }

      const lines = ['**可用输出样式**', '']
      for (const s of styles) {
        lines.push(`  **${s.name}** (${s.source}) — ${s.description || '（无描述）'}`)
      }
      lines.push('', '用法: /output-style <样式名>')
      ctx.onMessage({ role: 'assistant', content: lines.join('\n') })
    },
  },

  {
    name: '/hooks',
    description: '查看当前钩子配置',
    execute(_args, ctx) {
      const { loadSettings } = require('../settings/loader') as typeof import('../settings/loader')
      const settings = loadSettings(ctx.workingDir)
      const hooks = settings.hooks ?? {}

      const events = Object.keys(hooks)
      if (events.length === 0) {
        ctx.onMessage({
          role: 'assistant',
          content: [
            '暂无配置的钩子。',
            '',
            '在 .qiling/settings.json 中配置钩子：',
            '```json',
            '{',
            '  "hooks": {',
            '    "PostToolUse": [{',
            '      "matcher": "FileEdit|FileWrite",',
            '      "hooks": [{ "type": "command", "command": "npx prettier --write \\"$QILING_FILE_PATH\\"" }]',
            '    }],',
            '    "Stop": [{',
            '      "hooks": [{ "type": "command", "command": "echo \'任务完成\'" }]',
            '    }]',
            '  }',
            '}',
            '```',
            '',
            '支持的事件: PreToolUse, PostToolUse, Stop, UserPromptSubmit, SessionStart/End, PreCompact/PostCompact',
            '支持的钩子类型: command (shell), http (HTTP POST), prompt (LLM条件判断)',
          ].join('\n'),
        })
        return
      }

      const lines = ['**已配置的钩子**', '']
      for (const event of events) {
        const entries = (hooks as Record<string, Array<{ matcher?: string; hooks: Array<{ type: string; command?: string; url?: string }> }>>)[event] ?? []
        lines.push(`**${event}** (${entries.length} 条规则):`)
        for (const entry of entries) {
          const matcher = entry.matcher ? ` [${entry.matcher}]` : ' [所有工具]'
          for (const h of entry.hooks) {
            const detail = h.type === 'command' ? h.command : h.url ?? h.type
            lines.push(`  ${h.type}${matcher}: ${detail}`)
          }
        }
        lines.push('')
      }
      ctx.onMessage({ role: 'assistant', content: lines.join('\n') })
    },
  },

  // ─── CC-aligned: /files ──────────────────────────────────────────────────────
  {
    name: '/files',
    description: '显示当前会话中读取或编辑过的文件列表',
    execute(_args, ctx) {
      const { resolve: resolveFull } = require('path') as typeof import('path')
      const workingDir = ctx.workingDir

      // Collect files mentioned in messages (FileRead/FileEdit/FileWrite calls)
      const files = new Set<string>()
      for (const msg of ctx.messages) {
        if (msg.role !== 'assistant') continue
        if (!Array.isArray(msg.content)) continue
        for (const block of msg.content as Array<{ type: string; name?: string; input?: { file_path?: string } }>) {
          if (block.type === 'tool_use' && block.input?.file_path) {
            const p = block.input.file_path
            const abs = p.startsWith('/') || /^[A-Za-z]:/.test(p) ? p : resolveFull(workingDir, p)
            files.add(abs)
          }
        }
      }

      if (files.size === 0) {
        ctx.onMessage({ role: 'assistant', content: '当前会话中没有读取或编辑过任何文件。' })
        return
      }

      const { relative } = require('path') as typeof import('path')
      const { existsSync } = require('fs') as typeof import('fs')
      const lines = ['**当前会话涉及的文件**', '']
      for (const f of [...files].sort()) {
        const rel = relative(workingDir, f)
        const exists = existsSync(f)
        lines.push(`  ${exists ? '✓' : '✗'} ${rel}`)
      }
      ctx.onMessage({ role: 'assistant', content: lines.join('\n') })
    },
  },

  // ─── CC-aligned: /rename ─────────────────────────────────────────────────────
  {
    name: '/rename',
    description: '重命名当前会话（不带参数则自动生成名称）',
    async execute(args, ctx) {
      const trimmed = args.trim()
      let newName: string

      if (!trimmed) {
        // Auto-generate from first user message
        const firstUser = ctx.messages.find(m => m.role === 'user' && !(m as Message & { isMeta?: boolean }).isMeta)
        if (!firstUser) {
          ctx.onMessage({ role: 'assistant', content: '暂无对话内容，无法自动生成名称。\n用法: /rename <名称>' })
          return
        }
        const content = typeof firstUser.content === 'string'
          ? firstUser.content
          : Array.isArray(firstUser.content)
            ? (firstUser.content as Array<{ type: string; text?: string }>)
                .filter(b => b.type === 'text').map(b => b.text ?? '').join(' ')
            : ''
        newName = content.trim().slice(0, 60).replace(/\n.*/s, '') || `对话 ${new Date().toLocaleDateString()}`
      } else {
        newName = trimmed
      }

      // Save to session file
      try {
        const sessionDir = joinPath(homedir(), '.qiling', 'sessions')
        mkdirSync(sessionDir, { recursive: true })
        const metaPath = joinPath(sessionDir, `${process.pid}-meta.json`)
        const existing = existsSync(metaPath)
          ? JSON.parse(readFileSync(metaPath, 'utf-8')) as Record<string, unknown>
          : {}
        writeFileSync(metaPath, JSON.stringify({ ...existing, name: newName, renamedAt: new Date().toISOString() }, null, 2), 'utf-8')
      } catch { /* best-effort */ }

      ctx.onMessage({ role: 'assistant', content: `✓ 会话已重命名为: **${newName}**` })
    },
  },

  // ─── CC-aligned: /tag ────────────────────────────────────────────────────────
  {
    name: '/tag',
    description: '为当前会话添加标签（/tag list 查看所有已标记会话）',
    execute(args, ctx) {
      const trimmed = args.trim()
      const sessionDir = joinPath(homedir(), '.qiling', 'sessions')
      const metaPath = joinPath(sessionDir, `${process.pid}-meta.json`)

      if (!trimmed || trimmed === 'list') {
        // List all tagged sessions
        try {
          mkdirSync(sessionDir, { recursive: true })
          const files = readdirSync(sessionDir).filter(f => f.endsWith('-meta.json'))
          const tagged: string[] = []
          for (const f of files) {
            try {
              const meta = JSON.parse(readFileSync(joinPath(sessionDir, f), 'utf-8')) as Record<string, unknown>
              if (meta.tags && Array.isArray(meta.tags) && meta.tags.length > 0) {
                tagged.push(`  ${meta.name ?? f.replace('-meta.json', '')} — ${(meta.tags as string[]).join(', ')}`)
              }
            } catch { /* skip */ }
          }
          if (tagged.length === 0) {
            ctx.onMessage({ role: 'assistant', content: '暂无已标记的会话。\n用法: /tag <标签名>' })
          } else {
            ctx.onMessage({ role: 'assistant', content: `已标记的会话:\n\n${tagged.join('\n')}` })
          }
        } catch (e) {
          ctx.onMessage({ role: 'assistant', content: `获取标签失败: ${String(e)}` })
        }
        return
      }

      // Add tag to current session
      try {
        mkdirSync(sessionDir, { recursive: true })
        const existing = existsSync(metaPath)
          ? JSON.parse(readFileSync(metaPath, 'utf-8')) as Record<string, unknown>
          : {}
        const tags: string[] = Array.isArray(existing.tags) ? existing.tags as string[] : []
        if (!tags.includes(trimmed)) tags.push(trimmed)
        writeFileSync(metaPath, JSON.stringify({ ...existing, tags }, null, 2), 'utf-8')
        ctx.onMessage({ role: 'assistant', content: `✓ 已添加标签: **${trimmed}**\n当前标签: ${tags.join(', ')}` })
      } catch (e) {
        ctx.onMessage({ role: 'assistant', content: `标签失败: ${String(e)}` })
      }
    },
  },

  // ─── CC-aligned: /env ────────────────────────────────────────────────────────
  {
    name: '/env',
    description: '显示当前环境变量（过滤掉敏感信息）',
    execute(args, ctx) {
      const filter = args.trim().toLowerCase()
      const SENSITIVE_KEYS = new Set(['api_key', 'apikey', 'secret', 'password', 'token', 'passwd', 'auth'])

      const isSensitive = (key: string) => {
        const lower = key.toLowerCase()
        return SENSITIVE_KEYS.has(lower) || Array.from(SENSITIVE_KEYS).some(k => lower.includes(k))
      }

      const entries = Object.entries(process.env)
        .filter(([k]) => !filter || k.toLowerCase().includes(filter))
        .filter(([k]) => filter || k.startsWith('QILING_') || k.startsWith('ANTHROPIC_') || k.startsWith('CLAUDE_') || k.startsWith('NODE_') || k.startsWith('BUN_') || k === 'PATH' || k === 'HOME' || k === 'USER')
        .sort(([a], [b]) => a.localeCompare(b))

      if (entries.length === 0) {
        ctx.onMessage({ role: 'assistant', content: '没有匹配的环境变量。' })
        return
      }

      const lines = ['**环境变量**', '']
      for (const [k, v] of entries) {
        const display = isSensitive(k) ? '***' : (v ?? '(未设置)')
        lines.push(`  **${k}** = ${display}`)
      }

      if (!filter) {
        lines.push('', '使用 /env <关键字> 筛选，如: /env QILING')
      }

      ctx.onMessage({ role: 'assistant', content: lines.join('\n') })
    },
  },

  // ─── CC-aligned: /status ─────────────────────────────────────────────────────
  {
    name: '/status',
    description: '显示当前会话状态（模型、Token 用量、模式、钩子）',
    execute(_args, ctx) {
      const { loadSettings } = require('../settings/loader') as typeof import('../settings/loader')
      const settings = loadSettings(ctx.workingDir)

      const msgCount = ctx.messages.filter(m => !(m as Message & { isMeta?: boolean }).isMeta).length
      const userMsgCount = ctx.messages.filter(m => m.role === 'user' && !(m as Message & { isMeta?: boolean }).isMeta).length

      const lines = [
        '**会话状态**',
        '',
        `**模型**: ${settings.model ?? '未设置'}`,
        `**Provider**: ${settings.provider ?? 'anthropic'}`,
        `**工作目录**: ${ctx.workingDir}`,
        `**消息数**: ${msgCount} 条（用户 ${userMsgCount} 条）`,
        '',
        `**Vim 模式**: ${settings.vimMode ? '✅ 已启用' : '❌ 未启用'}`,
        `**Markdown 渲染**: ${settings.markdownRendering !== false ? '✅ 启用' : '❌ 关闭'}`,
        `**流式输出**: ${settings.ui?.streamingOutput !== false ? '✅ 启用' : '❌ 关闭'}`,
      ]

      const hookEvents = Object.keys(settings.hooks ?? {})
      if (hookEvents.length > 0) {
        lines.push(`**钩子**: ${hookEvents.join(', ')}`)
      }

      const mcpServers = Object.keys(settings.mcpServers ?? {})
      if (mcpServers.length > 0) {
        lines.push(`**MCP 服务器**: ${mcpServers.join(', ')}`)
      }

      ctx.onMessage({ role: 'assistant', content: lines.join('\n') })
    },
  },

  // ─── CC-aligned: /context ────────────────────────────────────────────────────
  {
    name: '/context',
    description: '显示上下文窗口使用情况（token 用量、剩余空间、消息统计）',
    execute(_args, ctx) {
      const { loadSettings } = require('../settings/loader') as typeof import('../settings/loader')
      const { analyzeContext, formatContextAnalysis } = require('../utils/analyzeContext') as typeof import('../utils/analyzeContext')

      const settings = loadSettings(ctx.workingDir)
      const model = settings.model ?? 'claude-sonnet-4-6'

      // Get context window size for model
      const MODEL_WINDOWS: Record<string, number> = {
        'claude-opus-4-7': 200_000,
        'claude-sonnet-4-6': 200_000,
        'claude-haiku-4-5-20251001': 200_000,
      }
      const contextWindowSize = MODEL_WINDOWS[model] ?? 200_000

      // Estimate usage from messages (we don't have live usage in command context)
      const visibleMsgs = ctx.messages.filter(m => !(m as Message & { isMeta?: boolean }).isMeta)
      const totalText = visibleMsgs.map(m => {
        if (typeof m.content === 'string') return m.content
        if (Array.isArray(m.content)) {
          return (m.content as Array<{ type: string; text?: string }>)
            .filter(b => b.type === 'text').map(b => b.text ?? '').join('')
        }
        return ''
      }).join('')
      const estimatedTokens = Math.ceil(totalText.length / 4)

      const usage = {
        inputTokens: estimatedTokens,
        outputTokens: 0,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
      }

      const analysis = analyzeContext(ctx.messages, usage, contextWindowSize, model)
      const { generateContextSuggestions, formatContextSuggestions } = require('../utils/contextSuggestions') as typeof import('../utils/contextSuggestions')
      const suggestions = generateContextSuggestions(analysis)
      const suggestionText = formatContextSuggestions(suggestions)
      ctx.onMessage({ role: 'assistant', content: formatContextAnalysis(analysis, model) + suggestionText })
    },
  },

  // ─── CC-aligned: /effort ─────────────────────────────────────────────────────
  {
    name: '/effort',
    description: '设置推理深度 [low|medium|high|max|auto]',
    execute(args, ctx) {
      const { parseEffortLevel, getEffortDisplayName, resolveEffortLevel, modelSupportsEffort } = require('../utils/effort') as typeof import('../utils/effort')
      const { loadSettings } = require('../settings/loader') as typeof import('../settings/loader')
      const settings = loadSettings(ctx.workingDir)
      const normalized = args.trim().toLowerCase()

      if (!normalized || normalized === 'status' || normalized === 'current') {
        const current = resolveEffortLevel(settings as Parameters<typeof resolveEffortLevel>[0], settings.model)
        const supported = modelSupportsEffort(settings.model ?? '')
        const lines = [
          `**当前推理深度**: ${getEffortDisplayName(current)} (${current})`,
          supported ? '' : '⚠️  当前模型不支持扩展思考，effort 设置将被忽略。',
          '',
          '可用级别:',
          '  low   — 标准速度，适合简单任务',
          '  medium — 中等推理，适合大多数任务',
          '  high  — 深度推理，适合复杂问题',
          '  max   — 最大推理能力（仅 Opus/Sonnet 4.6+）',
          '  auto  — 恢复默认',
        ].filter(l => l !== '')
        ctx.onMessage({ role: 'assistant', content: lines.join('\n') })
        return
      }

      if (normalized === 'auto' || normalized === 'unset') {
        const raw = readProjectSettingsRaw(ctx.workingDir)
        const { effortLevel: _drop, ...rest } = raw as { effortLevel?: unknown } & Record<string, unknown>
        writeProjectSettingsRaw(ctx.workingDir, rest)
        ctx.onMessage({ role: 'assistant', content: '已重置推理深度为自动（auto）。' })
        return
      }

      const level = parseEffortLevel(normalized)
      if (!level) {
        ctx.onMessage({ role: 'assistant', content: `无效的推理级别: "${args}"\n有效值: low, medium, high, max, auto` })
        return
      }

      const raw = readProjectSettingsRaw(ctx.workingDir)
      writeProjectSettingsRaw(ctx.workingDir, { ...raw, effortLevel: level })
      ctx.onMessage({
        role: 'assistant',
        content: `✓ 推理深度已设置为: **${getEffortDisplayName(level)}** (${level})`,
      })
    },
  },

  // ─── CC-aligned: /clear ──────────────────────────────────────────────────────
  {
    name: '/clear',
    description: '清空当前对话历史（保留设置和记忆）',
    execute(_args, ctx) {
      // Signal REPL to clear messages — actual implementation in REPL.tsx
      ctx.onMessage({
        role: 'assistant',
        content: `\x00CLEAR_CONVERSATION\x00`,
      })
    },
  },

  // ─── CC-aligned: /compact ────────────────────────────────────────────────────
  {
    name: '/compact',
    description: '手动触发上下文压缩（summary 模式）',
    execute(args, ctx) {
      const instruction = args.trim() || '请总结迄今为止的对话要点，保留关键信息。'
      ctx.onMessage({
        role: 'assistant',
        content: `\x00COMPACT_REQUEST\x00${instruction}`,
      })
    },
  },

  // ─── CC-aligned: /copy ───────────────────────────────────────────────────────
  {
    name: '/copy',
    description: '复制最后一条助手回复到剪贴板',
    async execute(_args, ctx) {
      const lastAssistant = [...ctx.messages].reverse().find(m => m.role === 'assistant' && !(m as Message & { isMeta?: boolean }).isMeta)
      if (!lastAssistant) {
        ctx.onMessage({ role: 'assistant', content: '没有可复制的助手回复。' })
        return
      }

      const text = typeof lastAssistant.content === 'string'
        ? lastAssistant.content
        : Array.isArray(lastAssistant.content)
          ? (lastAssistant.content as Array<{ type: string; text?: string }>)
              .filter(b => b.type === 'text').map(b => b.text ?? '').join('\n')
          : ''

      // Try platform-specific clipboard
      try {
        if (process.platform === 'darwin') {
          const proc = Bun.spawn(['pbcopy'], { stdin: 'pipe' })
          proc.stdin.write(text)
          await proc.stdin.end()
          await proc.exited
        } else if (process.platform === 'win32') {
          const proc = Bun.spawn(['clip'], { stdin: 'pipe' })
          proc.stdin.write(text)
          await proc.stdin.end()
          await proc.exited
        } else {
          const proc = Bun.spawn(['xclip', '-selection', 'clipboard'], { stdin: 'pipe' })
          proc.stdin.write(text)
          await proc.stdin.end()
          await proc.exited
        }
        ctx.onMessage({ role: 'assistant', content: `✓ 已复制 ${text.length} 字符到剪贴板。` })
      } catch (e) {
        ctx.onMessage({ role: 'assistant', content: `✗ 复制失败: ${String(e)}\n请手动复制以下内容:\n\n${text.slice(0, 200)}${text.length > 200 ? '...' : ''}` })
      }
    },
  },

  // ─── CC-aligned: /model ──────────────────────────────────────────────────────
  {
    name: '/model',
    description: '查看或切换当前模型',
    execute(args, ctx) {
      const { loadSettings } = require('../settings/loader') as typeof import('../settings/loader')
      const settings = loadSettings(ctx.workingDir)
      const trimmed = args.trim()

      if (!trimmed) {
        const MODEL_INFO: Record<string, string> = {
          'claude-opus-4-7':            'Claude Opus 4.7 — 最强能力',
          'claude-sonnet-4-6':          'Claude Sonnet 4.6 — 速度与能力均衡',
          'claude-haiku-4-5-20251001':  'Claude Haiku 4.5 — 最快速度',
        }
        const current = settings.model ?? 'claude-sonnet-4-6'
        const info = MODEL_INFO[current] ?? current
        const lines = [
          `**当前模型**: ${info}`,
          `**Provider**: ${settings.provider ?? 'anthropic'}`,
          '',
          '常用模型:',
          ...Object.entries(MODEL_INFO).map(([id, desc]) => `  ${id} — ${desc}`),
          '',
          '切换模型: /model <model-id>',
        ]
        ctx.onMessage({ role: 'assistant', content: lines.join('\n') })
        return
      }

      const raw = readProjectSettingsRaw(ctx.workingDir)
      writeProjectSettingsRaw(ctx.workingDir, { ...raw, model: trimmed })
      ctx.onMessage({ role: 'assistant', content: `✓ 模型已切换为: **${trimmed}**\n（重启 qiling 后生效，或下次对话时生效）` })
    },
  },

  // ─── CC-aligned: /config ─────────────────────────────────────────────────────
  {
    name: '/config',
    description: '查看/设置配置项 (/config set <key> <value> | /config get <key>)',
    execute(args, ctx) {
      const { loadSettings } = require('../settings/loader') as typeof import('../settings/loader')
      const settings = loadSettings(ctx.workingDir)
      const parts = args.trim().split(/\s+/)
      const subcmd = parts[0] ?? ''

      if (!subcmd || subcmd === 'list' || subcmd === 'show') {
        const raw = readProjectSettingsRaw(ctx.workingDir)
        const lines = ['**当前项目配置** (.qiling/settings.json)', '']
        if (Object.keys(raw).length === 0) {
          lines.push('（使用全局默认配置）')
        } else {
          for (const [k, v] of Object.entries(raw)) {
            const display = k.toLowerCase().includes('key') || k.toLowerCase().includes('secret')
              ? '***'
              : JSON.stringify(v)
            lines.push(`  **${k}**: ${display}`)
          }
        }
        lines.push('', '全局配置: ~/.qiling/settings.json', '项目配置: .qiling/settings.json')
        ctx.onMessage({ role: 'assistant', content: lines.join('\n') })
        return
      }

      if (subcmd === 'get') {
        const key = parts[1]
        if (!key) {
          ctx.onMessage({ role: 'assistant', content: '用法: /config get <key>' })
          return
        }
        const value = (settings as Record<string, unknown>)[key]
        ctx.onMessage({ role: 'assistant', content: `**${key}** = ${JSON.stringify(value ?? null)}` })
        return
      }

      if (subcmd === 'set') {
        const key = parts[1]
        const valueStr = parts.slice(2).join(' ')
        if (!key || !valueStr) {
          ctx.onMessage({ role: 'assistant', content: '用法: /config set <key> <value>' })
          return
        }
        let value: unknown = valueStr
        try { value = JSON.parse(valueStr) } catch { /* keep as string */ }

        const raw = readProjectSettingsRaw(ctx.workingDir)
        writeProjectSettingsRaw(ctx.workingDir, { ...raw, [key]: value })
        ctx.onMessage({ role: 'assistant', content: `✓ 已设置 **${key}** = ${JSON.stringify(value)}` })
        return
      }

      ctx.onMessage({ role: 'assistant', content: '用法:\n  /config list — 查看所有配置\n  /config get <key> — 查看某项配置\n  /config set <key> <value> — 设置配置' })
    },
  },

  // ─── CC-aligned: /agents ────────────────────────────────────────────────────
  {
    name: '/agents',
    description: '列出所有可用的内置和自定义 Agent 定义',
    execute(_args, ctx) {
      const { BUILT_IN_AGENTS } = require('../tools/AgentTool/builtInAgents') as typeof import('../tools/AgentTool/builtInAgents')
      const { loadCustomAgents } = require('../tools/AgentTool/loadAgentsDir') as typeof import('../tools/AgentTool/loadAgentsDir')

      const custom = loadCustomAgents(ctx.workingDir)
      const customTypes = new Set(custom.map((a: { agentType: string }) => a.agentType.toLowerCase()))
      const builtInFiltered = BUILT_IN_AGENTS.filter((a: { agentType: string }) => !customTypes.has(a.agentType.toLowerCase()))

      const lines = ['**可用 Agent 列表**', '']

      if (custom.length > 0) {
        lines.push('**自定义 Agent** (.qiling/agents/ or ~/.qiling/agents/):')
        for (const a of custom) {
          const src = (a as { source?: string }).source === 'project' ? '项目' : '全局'
          lines.push(`  **${a.agentType}** (${src}) — ${a.whenToUse.slice(0, 80)}${a.whenToUse.length > 80 ? '…' : ''}`)
        }
        lines.push('')
      }

      lines.push('**内置 Agent**:')
      for (const a of builtInFiltered) {
        const model = (a as { model?: string }).model ? ` [${(a as { model: string }).model}]` : ''
        lines.push(`  **${a.agentType}**${model} — ${a.whenToUse.slice(0, 80)}${a.whenToUse.length > 80 ? '…' : ''}`)
      }

      lines.push('')
      lines.push('创建自定义 Agent: 在 .qiling/agents/<name>.md 或 .qiling/agents/<name>.json 中添加定义')
      lines.push('使用: Agent 工具的 subagent_type 参数')

      ctx.onMessage({ role: 'assistant', content: lines.join('\n') })
    },
  },

  // ─── CC-aligned: /tasks ─────────────────────────────────────────────────────
  {
    name: '/tasks',
    description: '查看当前活跃的后台任务（TaskCreate/TaskUpdate 创建的）',
    execute(_args, ctx) {
      try {
        const { listTasks } = require('../services/tasks/store') as typeof import('../services/tasks/store')
        const tasks = listTasks()

        if (tasks.length === 0) {
          ctx.onMessage({ role: 'assistant', content: '当前没有活跃任务。\n使用 TaskCreate 工具创建任务。' })
          return
        }

        const STATUS_ICONS: Record<string, string> = {
          pending: '⏳',
          in_progress: '⟳',
          completed: '✅',
          cancelled: '❌',
          failed: '✗',
        }

        const lines = [`**活跃任务** (${tasks.length} 条)`, '']
        for (const task of tasks) {
          const icon = STATUS_ICONS[task.status] ?? '?'
          const age = Math.round((Date.now() - (task.createdAt ?? 0)) / 1000)
          lines.push(`${icon} **${task.id?.slice(-8) ?? '?'}** [${task.status}] ${age}s ago`)
          if (task.subject) lines.push(`   ${task.subject}`)
          if (task.description) lines.push(`   ${task.description.slice(0, 80)}`)
        }

        ctx.onMessage({ role: 'assistant', content: lines.join('\n') })
      } catch {
        ctx.onMessage({ role: 'assistant', content: '任务系统不可用。' })
      }
    },
  },

  // ─── CC-aligned: /branch ─────────────────────────────────────────────────────
  {
    name: '/branch',
    description: '创建 git 分支并切换（/branch <名称>）',
    async execute(args, ctx) {
      const { getBranch } = require('../utils/git') as typeof import('../utils/git')
      const trimmed = args.trim()

      if (!trimmed) {
        const current = await getBranch(ctx.workingDir).catch(() => 'unknown')
        ctx.onMessage({
          role: 'assistant',
          content: `当前分支: **${current}**\n\n用法: /branch <分支名>  — 创建并切换到新分支`,
        })
        return
      }

      try {
        const { Bun } = globalThis as { Bun?: { spawn: (args: string[], opts: Record<string, unknown>) => { exited: Promise<number>; exitCode: number | null } } }
        if (!Bun) { ctx.onMessage({ role: 'assistant', content: '需要 Bun 运行时' }); return }

        const proc = Bun.spawn(['git', 'checkout', '-b', trimmed], {
          cwd: ctx.workingDir, stdout: 'pipe', stderr: 'pipe',
        })
        await proc.exited
        if (proc.exitCode === 0) {
          ctx.onMessage({ role: 'assistant', content: `✓ 已创建并切换到分支 **${trimmed}**` })
        } else {
          // Try switching to existing branch
          const proc2 = Bun.spawn(['git', 'checkout', trimmed], {
            cwd: ctx.workingDir, stdout: 'pipe', stderr: 'pipe',
          })
          await proc2.exited
          if (proc2.exitCode === 0) {
            ctx.onMessage({ role: 'assistant', content: `✓ 已切换到分支 **${trimmed}**` })
          } else {
            ctx.onMessage({ role: 'assistant', content: `✗ 分支操作失败。请检查分支名是否合法。` })
          }
        }
      } catch (e) {
        ctx.onMessage({ role: 'assistant', content: `✗ 错误: ${e instanceof Error ? e.message : String(e)}` })
      }
    },
  },

  // ─── CC-aligned: /share ──────────────────────────────────────────────────────
  {
    name: '/share',
    description: '以 Markdown 格式分享当前对话（复制到剪贴板或导出到文件）',
    async execute(args, ctx) {
      const trimmed = args.trim()
      const visibleMsgs = ctx.messages.filter(m => !(m as Message & { isMeta?: boolean }).isMeta)

      // Build markdown
      const lines = [
        '# QiLing 对话分享',
        `> 导出时间: ${new Date().toLocaleString()}`,
        '',
      ]

      for (const msg of visibleMsgs) {
        const role = msg.role === 'user' ? '**用户**' : '**助手**'
        const content = typeof msg.content === 'string'
          ? msg.content
          : Array.isArray(msg.content)
            ? (msg.content as Array<{ type: string; text?: string }>)
                .filter(b => b.type === 'text').map(b => b.text ?? '').join('\n')
            : ''
        if (content.trim()) {
          lines.push(`## ${role}`, '', content.trim(), '')
        }
      }

      const markdown = lines.join('\n')

      if (trimmed) {
        // Export to file
        const filepath = trimmed.endsWith('.md') ? trimmed : trimmed + '.md'
        const abs = filepath.startsWith('/') || /^[A-Za-z]:/.test(filepath)
          ? filepath
          : joinPath(ctx.workingDir, filepath)
        try {
          writeFileSync(abs, markdown, 'utf-8')
          ctx.onMessage({ role: 'assistant', content: `✓ 对话已导出到: ${abs}` })
        } catch (e) {
          ctx.onMessage({ role: 'assistant', content: `✗ 导出失败: ${e instanceof Error ? e.message : String(e)}` })
        }
        return
      }

      // Copy to clipboard
      try {
        const clipCmd = process.platform === 'darwin' ? 'pbcopy'
          : process.platform === 'win32' ? 'clip'
          : 'xclip -selection clipboard'

        const proc = Bun.spawn(clipCmd.split(' '), {
          stdin: 'pipe', stdout: 'pipe', stderr: 'pipe',
        })
        proc.stdin.write(markdown)
        await proc.stdin.end()
        await proc.exited
        ctx.onMessage({ role: 'assistant', content: `✓ 对话 Markdown 已复制到剪贴板（${visibleMsgs.length} 条消息）` })
      } catch {
        // Fallback: show a snippet
        ctx.onMessage({
          role: 'assistant',
          content: `对话 Markdown 预览（${visibleMsgs.length} 条消息）：\n\n\`\`\`markdown\n${markdown.slice(0, 500)}${markdown.length > 500 ? '\n...' : ''}\n\`\`\`\n\n使用 /share <文件名.md> 导出完整内容。`,
        })
      }
    },
  },

  // ─── 宠物伙伴系统: /buddy ────────────────────────────────────────────────────
  {
    name: '/buddy',
    description: '宠物伙伴系统 — /buddy hatch|pet|info|mute|release',
    async execute(args, ctx) {
      const {
        getCompanion, saveCompanion, releaseCompanion, companionUserId, roll,
        isCompanionMuted, setCompanionMuted, buildHatchPrompt,
      } = require('../buddy/companion') as typeof import('../buddy/companion')
      const { RARITY_STARS } = require('../buddy/types') as typeof import('../buddy/types')
      const { renderFace } = require('../buddy/sprites') as typeof import('../buddy/sprites')
      const { buildHatchSuccessMessage } = require('../buddy/prompt') as typeof import('../buddy/prompt')

      const sub = args.trim().toLowerCase()

      // ── /buddy (no args) — 显示当前宠物概览 ──────────────────────────────
      if (!sub || sub === 'status') {
        const companion = getCompanion()
        if (!companion) {
          ctx.onMessage({
            role: 'assistant',
            content: [
              '**你还没有宠物伙伴！**',
              '',
              '运行 `/buddy hatch` 孵化你的专属宠物。',
              '每个用户的宠物由账号唯一确定，不同稀有度（common → legendary）随机抽取。',
              '',
              '植物系宠物（向日葵/菊花/牡丹/幼苗/蕨草/仙人掌/蘑菇）有专属颜色和性格！',
            ].join('\n'),
          })
          return
        }
        const muted = isCompanionMuted()
        const face = renderFace(companion)
        const shinyMark = companion.shiny ? ' ✨闪光' : ''
        const lines = [
          `${RARITY_STARS[companion.rarity]} **${companion.name}**${shinyMark}`,
          `物种: ${companion.species}  | 稀有度: ${companion.rarity}  | 脸: ${face}`,
          `性格: ${companion.personality}`,
          `气泡: ${muted ? '🔇 已静音' : '🔊 开启'}`,
          '',
          '命令: `/buddy pet` 抚摸  `/buddy info` 查属性  `/buddy mute` 切换静音  `/buddy release` 放走',
        ]
        ctx.onMessage({ role: 'assistant', content: lines.join('\n') })
        return
      }

      // ── /buddy hatch — 孵化宠物 ──────────────────────────────────────────
      if (sub === 'hatch') {
        const existing = getCompanion()
        if (existing) {
          ctx.onMessage({
            role: 'assistant',
            content: `你已经有宠物 **${existing.name}**（${existing.species}）了！\n若想更换，先用 \`/buddy release\` 放走它。`,
          })
          return
        }
        const userId = companionUserId()
        const { bones, inspirationSeed: _ } = roll(userId)
        ctx.onMessage({ role: 'assistant', content: `🥚 正在孵化中… 物种: **${bones.species}** 稀有度: **${bones.rarity}**${bones.shiny ? ' ✨' : ''}\n\nAI 正在为它起名和赋予性格…` })

        // 使用 runQuery 让 AI 生成名字和性格
        const hatchPrompt = buildHatchPrompt(bones)
        let aiResponse = ''
        const origOnMsg = ctx.onMessage
        await ctx.runQuery(
          [{ role: 'user', content: hatchPrompt }],
          '你是 QiLing 宠物孵化系统。只输出 JSON，不要任何其他内容。',
        )

        // 从最后一条 AI 消息提取 JSON
        const lastAI = ctx.messages.filter(m => m.role === 'assistant').at(-1)
        if (lastAI) {
          const text = typeof lastAI.content === 'string'
            ? lastAI.content
            : (lastAI.content as Array<{ type: string; text?: string }>)
                .filter(b => b.type === 'text').map(b => b.text ?? '').join('')
          const match = text.match(/\{[^}]+\}/)
          if (match) {
            try {
              const soul = JSON.parse(match[0]) as { name: string; personality: string }
              if (soul.name && soul.personality) {
                saveCompanion(soul)
                const companion = getCompanion()!
                ctx.setCompanionReaction?.(`你好！我是${soul.name}～`)
                ctx.onMessage({ role: 'assistant', content: buildHatchSuccessMessage(companion) })
                return
              }
            } catch { /* fallback */ }
          }
        }

        // AI 响应解析失败时的降级
        const fallbackSouls: Record<string, { name: string; personality: string }> = {
          sprout:        { name: '豆芽',   personality: '刚刚破土而出，对世界充满好奇，遇到代码问题会努力"生长"寻找答案。' },
          fern:          { name: '绿茵',   personality: '古老的智慧储存在每一片蕨叶里，沉默地观察着一切，偶尔低语。' },
          cactus:        { name: '刺刺',   personality: '外表刚硬内心柔软，在沙漠般的 debug 中顽强存活，靠代码为生。' },
          mushroom:      { name: '蘑蘑',   personality: '靠着腐烂的 bug 茁壮成长，对错误的嗅觉极其灵敏。' },
          sunflower:     { name: '向阳',   personality: '永远追着光源转动，CHAOS 值爆表，热情得让旁边的代码都加速运行。' },
          chrysanthemum: { name: '霜菊',   personality: '霜中独开，在别人 bug 满天飞时依然淡定，PATIENCE 的具象化。' },
          peony:         { name: '国色',   personality: '花中之王，天生自带王者气场，对烂代码略带不屑，但依然优雅地帮你修好。' },
        }
        const fallback = fallbackSouls[bones.species] ?? { name: '小伙伴', personality: '默默陪伴着你的编程之旅。' }
        saveCompanion(fallback)
        const companion = getCompanion()!
        ctx.setCompanionReaction?.(`你好！我是${fallback.name}～`)
        ctx.onMessage({ role: 'assistant', content: buildHatchSuccessMessage(companion) })
        return
      }

      // ── /buddy pet — 抚摸宠物 ────────────────────────────────────────────
      if (sub === 'pet') {
        const companion = getCompanion()
        if (!companion) {
          ctx.onMessage({ role: 'assistant', content: '你还没有宠物。用 `/buddy hatch` 孵化一只吧！' })
          return
        }
        ctx.petCompanion?.()
        const reactions = [
          `谢谢！${companion.name}开心地蹦了起来～`,
          `${companion.name}的眼睛弯成了月牙形～`,
          `${companion.name}发出了满足的声音！`,
          `${companion.name}向你蹭了蹭～`,
        ]
        const reactionText = reactions[Math.floor(Math.random() * reactions.length)]!
        ctx.setCompanionReaction?.(reactionText.replace(companion.name + '', ''))
        ctx.onMessage({ role: 'assistant', content: `♥ ${reactionText}` })
        return
      }

      // ── /buddy info — 详细属性 ───────────────────────────────────────────
      if (sub === 'info') {
        const companion = getCompanion()
        if (!companion) {
          ctx.onMessage({ role: 'assistant', content: '你还没有宠物。用 `/buddy hatch` 孵化一只吧！' })
          return
        }
        const { STAT_NAMES } = require('../buddy/types') as typeof import('../buddy/types')
        const statBar = (v: number) => '█'.repeat(Math.round(v / 10)) + '░'.repeat(10 - Math.round(v / 10))
        const statLines = STAT_NAMES.map((n: string) => {
          const v = companion.stats[n as keyof typeof companion.stats]
          return `  ${n.padEnd(10)} ${statBar(v)} ${v}`
        })
        const shinyNote = companion.shiny ? '\n✨ **闪光型** — 极其罕见的特殊个体！' : ''
        const hatchDate = new Date(companion.hatchedAt).toLocaleDateString()
        const lines = [
          `${RARITY_STARS[companion.rarity]} **${companion.name}** (${companion.species})${shinyNote}`,
          `孵化日期: ${hatchDate}`,
          `性格: ${companion.personality}`,
          '',
          '**属性值:**',
          ...statLines,
        ]
        ctx.onMessage({ role: 'assistant', content: lines.join('\n') })
        return
      }

      // ── /buddy mute — 切换气泡静音 ──────────────────────────────────────
      if (sub === 'mute' || sub === 'unmute') {
        const companion = getCompanion()
        if (!companion) {
          ctx.onMessage({ role: 'assistant', content: '你还没有宠物。' })
          return
        }
        const current = isCompanionMuted()
        const newMuted = !current
        setCompanionMuted(newMuted)
        ctx.onMessage({
          role: 'assistant',
          content: newMuted
            ? `🔇 ${companion.name} 的气泡已静音。`
            : `🔊 ${companion.name} 的气泡已恢复。`,
        })
        return
      }

      // ── /buddy release — 放走宠物 ────────────────────────────────────────
      if (sub === 'release') {
        const companion = getCompanion()
        if (!companion) {
          ctx.onMessage({ role: 'assistant', content: '你还没有宠物。' })
          return
        }
        releaseCompanion()
        ctx.onMessage({
          role: 'assistant',
          content: `再见，**${companion.name}**！它挥了挥手，消失在代码的星海中… 💫\n\n你可以随时用 \`/buddy hatch\` 孵化新的伙伴。`,
        })
        return
      }

      // ── 帮助 ─────────────────────────────────────────────────────────────
      ctx.onMessage({
        role: 'assistant',
        content: [
          '**宠物伙伴命令:**',
          '  `/buddy`         — 查看当前宠物',
          '  `/buddy hatch`   — 孵化专属宠物（AI 生成名字和性格）',
          '  `/buddy pet`     — 抚摸宠物（触发爱心动画）',
          '  `/buddy info`    — 查看详细属性值',
          '  `/buddy mute`    — 切换气泡静音',
          '  `/buddy release` — 放走当前宠物',
          '',
          '**物种稀有度:** common ★ → uncommon ★★ → rare ★★★ → epic ★★★★ → legendary ★★★★★',
          '**QiLing 原创植物系:**',
          '  🌱 sprout 幼苗（绿）  🌿 fern 蕨草（绿）  🌵 cactus 仙人掌（绿）  🍄 mushroom 蘑菇（绿）',
          '  🌻 sunflower 向日葵（黄）  🌸 chrysanthemum 菊花（紫）  🌹 peony 牡丹（红）',
        ].join('\n'),
      })
    },
  },

  // ─── CC-aligned: /theme ──────────────────────────────────────────────────────
  {
    name: '/theme',
    description: '切换 TUI 主题（dark/light/dark-ansi/light-ansi/dark-daltonized/light-daltonized/auto）',
    execute(args, ctx) {
      const { THEME_SETTINGS, THEME_DESCRIPTIONS, resolveTheme, isWindowsTerminal } = require('../utils/theme') as typeof import('../utils/theme')
      const raw = args.trim().toLowerCase()

      // List themes
      if (!raw || raw === 'list') {
        const { loadSettings } = require('../settings/loader') as typeof import('../settings/loader')
        const settings = loadSettings(ctx.workingDir)
        const current = (settings.ui?.theme ?? 'auto') as string
        const resolved = resolveTheme(current as typeof THEME_SETTINGS[number])
        const wtNote = isWindowsTerminal() ? ' [当前终端: Windows Terminal]' : ''
        const lines = [
          `**当前主题**: ${current}${current === 'auto' ? ` → ${resolved}` : ''}${wtNote}`,
          '',
          '**可用主题**:',
          ...THEME_SETTINGS.map(name => {
            const active = name === current ? ' ◀ 当前' : ''
            return `  **${name}**${active} — ${THEME_DESCRIPTIONS[name]}`
          }),
          '',
          '用法: /theme <主题名>',
          '示例: /theme dark  |  /theme dark-ansi  |  /theme auto',
        ]
        ctx.onMessage({ role: 'assistant', content: lines.join('\n') })
        return
      }

      if (!THEME_SETTINGS.includes(raw as typeof THEME_SETTINGS[number])) {
        const valid = THEME_SETTINGS.join(', ')
        ctx.onMessage({ role: 'assistant', content: `无效的主题名: "${raw}"\n有效主题: ${valid}` })
        return
      }

      const setting = raw as typeof THEME_SETTINGS[number]

      // Persist to global user settings (~/.qiling/settings.json)
      const globalSettingsPath = joinPath(homedir(), '.qiling', 'settings.json')
      try {
        const existingRaw = existsSync(globalSettingsPath)
          ? JSON.parse(readFileSync(globalSettingsPath, 'utf-8')) as Record<string, unknown>
          : {}
        const ui = (existingRaw.ui as Record<string, unknown>) ?? {}
        writeFileSync(
          globalSettingsPath,
          JSON.stringify({ ...existingRaw, ui: { ...ui, theme: setting } }, null, 2) + '\n',
          'utf-8'
        )
      } catch { /* best-effort */ }

      // Live update (if REPL provided setTheme callback)
      ctx.setTheme?.(setting)

      const resolved = resolveTheme(setting)
      const resolvedNote = setting === 'auto' ? ` → 解析为: ${resolved}` : ''
      ctx.onMessage({
        role: 'assistant',
        content: `✓ 主题已切换为: **${setting}**${resolvedNote}\n\n${THEME_DESCRIPTIONS[setting]}`,
      })
    },
  },
]

// ─── Prompt Templates ────────────────────────────────────────────────────────

const COMMIT_PROMPT = `## 上下文

- 当前 git 状态: $(git status)
- 当前 diff (已暂存和未暂存): $(git diff HEAD)
- 当前分支: $(git branch --show-current)
- 最近提交: $(git log --oneline -10)

## Git 安全规则

- 永远不要修改 git config
- 永远不要跳过 hooks (--no-verify, --no-gpg-sign 等)，除非用户明确要求
- 关键: 始终创建新提交，永远不要使用 git commit --amend，除非用户明确要求
- 不要提交可能含有密钥的文件 (.env, credentials.json 等)
- 如果没有变更，不要创建空提交
- 不要使用 -i 标志的 git 命令 (如 git rebase -i)

## 你的任务

基于上述变更，创建一个 git commit：

1. 分析变更内容，起草提交信息：
   - 参照最近提交的风格
   - 总结变更的性质 (新功能/增强/修复/重构/测试/文档等)
   - 提交信息聚焦于"为什么"而不是"什么"
   - 用 1-2 句话，简洁明了

2. 暂存相关文件并使用 HEREDOC 语法创建提交：
\`\`\`
git commit -m "$(cat <<'EOF'
提交信息在这里
EOF
)"
\`\`\`

只执行 git 操作，不发送其他文字。`.trim()

const REVIEW_PROMPT = (args: string) => `你是专业的代码审查者。按以下步骤操作：

${args
  ? `审查 PR #${args}：
1. 运行 \`gh pr view ${args}\` 获取 PR 详情
2. 运行 \`gh pr diff ${args}\` 获取 diff`
  : `1. 运行 \`gh pr list\` 查看开放的 PR
2. 如果用户指定了 PR 号，运行 \`gh pr view <number>\` 和 \`gh pr diff <number>\``
}

3. 分析变更内容，提供全面的代码审查，包括：
   - **概述**: PR 做了什么
   - **代码质量**: 结构、可读性、最佳实践
   - **具体建议**: 可改进之处
   - **潜在问题**: 风险、边界情况
   - **安全考虑**: 潜在的安全隐患
   - **测试覆盖**: 测试是否充分

以清晰的章节和列表形式格式化审查。`.trim()

// CC's NEW_INIT_PROMPT (upgraded from the old simple version)
// Mirrors CC's commands/init.ts NEW_INIT_PROMPT for creating CLAUDE.md/QILING.md
const INIT_PROMPT = (_workingDir: string) => `Set up a minimal CLAUDE.md (and optionally .qiling/skills/ and .qiling/settings.json hooks) for this repo. CLAUDE.md is loaded into every QiLing session, so it must be concise — only include what QiLing would get wrong without it.

## Phase 1: Explore the codebase

Survey the codebase by reading key files:
- Manifest files: package.json, Cargo.toml, pyproject.toml, go.mod, pom.xml, etc.
- README.md, Makefile/build configs, CI config (.github/workflows/)
- Existing CLAUDE.md, QILING.md, .claude/rules/, .cursor/rules or .cursorrules
- .github/copilot-instructions.md, AGENTS.md, .mcp.json

Detect:
- Build, test, and lint commands (especially non-standard ones)
- Languages, frameworks, and package manager
- Project structure (monorepo, multi-module, or single project)
- Code style rules that differ from language defaults
- Non-obvious gotchas, required env vars, or workflow quirks
- Formatter configuration (prettier, biome, ruff, black, gofmt, rustfmt)

## Phase 2: Create CLAUDE.md

Create \`CLAUDE.md\` in the project root with only what's non-obvious:

\`\`\`
# CLAUDE.md

This file provides guidance to QiLing (and Claude Code) when working with code in this repository.

## Commands
[build/test/lint commands]

## Architecture
[high-level structure requiring multiple files to understand]
\`\`\`

Rules:
- DO NOT include obvious things like "write tests" or "use meaningful names"
- DO NOT list every file or component (they can be discovered)
- DO include: non-standard commands, architecture decisions, gotchas, env setup
- If CLAUDE.md already exists, suggest improvements only
- Prefix with the exact header above

## Phase 3: Suggest skills (optional)

If the project has repeatable workflows (testing, deploy, code review), suggest creating \`.qiling/skills/<name>.md\` files. Offer but don't force.`.trim()

const DOCTOR_PROMPT = (workingDir: string) => `诊断当前环境配置，检查以下各项并给出状态报告：

## 检查项

1. **Git 状态**: 检查是否在 git 仓库中，当前分支名
   - 命令: \`git status\` 和 \`git branch --show-current\`

2. **Node.js / Bun**: 检查运行时版本
   - 命令: \`bun --version\` 或 \`node --version\`

3. **ripgrep**: 检查 Grep 工具是否可用（影响搜索性能）
   - 命令: \`rg --version\` 或 \`where rg\`

4. **GitHub CLI**: 检查 /review 和 /pr 命令是否可用
   - 命令: \`gh --version\`

5. **记忆文件**: 检查 QILING.md / CLAUDE.md 是否存在
   - 检查: ~/.qiling/QILING.md 和 ${workingDir}/QILING.md

6. **项目配置**: 检查 .qiling/settings.json 是否存在
   - 检查: ${workingDir}/.qiling/settings.json

格式化输出为表格：
| 检查项 | 状态 | 详情 |
|---|---|---|
| Git | ✅/❌ | ... |
...

最后给出改进建议。`.trim()

const MEMORY_PROMPT = (args: string, workingDir: string) => {
  if (args === 'edit') {
    return `查找并展示以下记忆文件的内容，然后询问用户想要修改什么：

1. 全局记忆: ~/.qiling/QILING.md
2. 项目记忆: ${workingDir}/QILING.md 或 ${workingDir}/CLAUDE.md

显示文件内容，然后帮助用户编辑这些文件。`
  }

  return `列出并显示当前可用的记忆文件内容：

1. 全局记忆: ~/.qiling/QILING.md (如果存在)
2. 项目记忆: ${workingDir}/QILING.md 或 ${workingDir}/CLAUDE.md (如果存在)

对每个文件：显示完整路径、最后修改时间和内容摘要。
如果没有记忆文件，建议用户运行 /init 创建一个。`
}

const PR_PROMPT = (args: string) => `创建一个 Pull Request：

1. 检查当前分支状态：\`git status\`, \`git branch --show-current\`, \`git log --oneline -5\`
2. 获取与主分支的 diff：\`git diff main...HEAD\` 或 \`git diff master...HEAD\`
3. 起草 PR 标题和描述：
   - 标题：简洁 (70 字符以内)
   - 描述：包含变更摘要、测试计划

4. 推送分支并创建 PR：
\`\`\`
git push origin $(git branch --show-current)
gh pr create --title "PR 标题" --body "$(cat <<'EOF'
## Summary
...

## Test plan
...
EOF
)"
\`\`\`

${args ? `额外要求: ${args}` : ''}`

const TEST_PROMPT = (args: string, workingDir: string) => `运行项目测试，如果失败则自动修复并重试（最多 3 次）。

## 工作目录
${workingDir}

## 执行流程

1. **检测测试命令**（如果用户没有指定）：
   - 检查 package.json 中的 "test" 脚本
   - 检查 Makefile 中的 test 目标
   - 检查 Cargo.toml（cargo test）
   - 检查 pytest.ini 或 setup.py（pytest）
   - 如果都没有，告知用户并停止

2. **运行测试**：
   \`\`\`bash
   ${args || '使用检测到的测试命令'}
   \`\`\`

3. **如果测试失败**：
   - 分析错误输出，找出根本原因
   - 修复代码（使用 FileEdit）
   - 重新运行测试
   - 最多循环 3 次

4. **如果所有 3 次都失败**：
   - 报告无法自动修复的原因
   - 列出需要人工干预的问题

5. **如果测试全部通过**（或修复后通过）：
   - 显示通过的测试数量
   - 询问是否创建 commit（可选）

## 安全规则
- 只修改测试失败直接相关的代码
- 不要修改测试文件本身（除非测试文件有明显 bug）
- 每次修复后必须重新运行完整测试套件`.trim()

const HELP_TEXT = `QiLing (启灵) — 编程代理工具

## 内置命令

  /help              显示此帮助
  /plan              进入计划模式（只读探索，安全分析）
  /act               退出计划模式，进入执行模式
  /commit            创建 git commit (AI 辅助，含安全协议)
  /diff              显示当前 git 变更统计（文件级，不启动 AI）
  /restore [file]    恢复文件到会话前状态（不带参数列出所有已修改文件）
  /open <file>       在外部编辑器中打开文件（VSCode/Cursor/vim 等）
  /test [cmd]        运行测试并自动修复（最多 3 次循环）
  /review [PR#]      代码审查 (本地 diff 或 PR)
  /init              分析代码库，创建 QILING.md（CC 三阶段格式）
  /repomap           显示仓库文件和符号索引
  /memory            查看记忆文件
  /memory edit       编辑记忆文件
  /pr                创建 Pull Request
  /doctor            诊断环境配置
  /model             切换 AI 模型
  /config            查看当前配置
  /cost              显示 token 成本统计
  /compact           压缩对话上下文（保留 9 节结构化摘要）
  /clear             清空当前对话（自动重置上下文缓存）
  /exit              退出
  /vim               切换 Vim 编辑模式（on/off 或直接切换）
  /fast              切换快速模式（使用更快速的模型，再次运行恢复）
  /version           显示版本信息
  /export [file]     导出对话到文本文件
  /summary           总结当前对话关键点
  /rewind            回溯到对话历史（查看选项）
  /permissions       查看和管理权限规则
  /output-style      查看或设置输出样式（从 .qiling/output-styles/ 加载）
  /hooks             查看当前钩子配置

## 高级功能

  ultrathink    在提示中加入 "ultrathink" 自动启用扩展思考 (16k tokens)
  +500k         内联 token 预算: "+500k 分析整个代码库"
  @file         注入文件内容, @url 抓取网页, @git 注入 git 状态
  $ARGUMENTS    技能文件中的参数占位符 (use /skill-name <args>)

## 工具能力

  FileRead      读取文件 (支持图片、Jupyter)
  FileEdit      精确字符串替换编辑 (含 diff 展示)
  FileWrite     写入新文件 (自动建父目录)
  Glob          文件模式匹配 (尊重 .gitignore)
  Grep          内容搜索 (ripgrep 优先)
  Bash          执行 shell 命令 (含风险分类)
  PowerShell    执行 PS 命令 (Windows)
  Agent         启动子代理完成复杂任务
  WebFetch      获取 URL 内容 (自动剥离 HTML)
  TodoWrite     任务列表追踪
  NotebookRead  读取 Jupyter .ipynb

## 快捷键

  /             显示命令菜单
  ↑↓            命令菜单导航
  Tab           命令补全
  Ctrl+C        中止流式输出 (或退出)

## 记忆文件 (自动加载)

  ~/.qiling/QILING.md    全局记忆
  ./QILING.md            项目记忆
  ./CLAUDE.md            兼容 Claude Code 的项目记忆

## Provider 支持

  MiniMax       MiniMax-Text-01 (默认)
  通义千问       qwen-max / qwen-plus / qwen2.5-coder-32b
  豆包           doubao-pro-128k / doubao-1.5-pro-256k
  智谱 GLM       glm-4-plus / glm-4-flash (免费) / codegeex-4
  Anthropic      claude-sonnet-4-6 / claude-opus-4-7
  OpenAI         gpt-4o / gpt-4o-mini
  Ollama         本地模型 (llama3.1 / qwen2.5-coder / deepseek-r1)`.trim()
