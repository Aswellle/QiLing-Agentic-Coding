import type { Message } from '../types/message'
import { fetchGitDiff, formatDiffStats } from '../utils/gitDiff'
import { resolve as resolvePath } from 'path'
import { openFileInExternalEditor, getEditorDisplayName } from '../utils/editor'

export interface CommandContext {
  workingDir: string
  messages: Message[]
  onMessage: (msg: Message) => void
  runQuery: (messages: Message[], systemPrompt?: string, toolNames?: string[]) => Promise<void>
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
          const statuses = await getMcpStatus(mcpServers)
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

const INIT_PROMPT = (workingDir: string) => `分析当前代码库 (${workingDir})，创建一个 QILING.md 文件作为项目记忆。

## 步骤

1. **探索代码库**：
   - 读取 README.md, package.json/Cargo.toml/go.mod 等清单文件
   - 读取已有的 CLAUDE.md, QILING.md, .cursorrules, .github/copilot-instructions.md
   - 检查构建/测试/lint 命令
   - 了解项目结构和技术栈

2. **创建 QILING.md**：
   - 放在项目根目录
   - 包含：构建/测试命令、代码架构概述、重要约定、已知注意事项
   - 不包含：可轻易发现的文件列表、通用开发实践、明显的指令

3. **格式**：
\`\`\`
# QILING.md

This file provides guidance to QiLing AI agent when working in this repository.

## Build & Test
[命令]

## Architecture
[架构概述]

## Conventions
[约定]
\`\`\`

如果已有 QILING.md，提出改进建议而不是直接覆盖。`.trim()

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

  /help         显示此帮助
  /plan         进入计划模式（只读探索，安全分析）
  /act          退出计划模式，进入执行模式
  /commit       创建 git commit (AI 辅助，含安全协议)
  /diff         显示当前 git 变更统计（文件级，不启动 AI）
  /open <file>  在外部编辑器中打开文件（VSCode/Cursor/vim 等）
  /test [cmd]   运行测试并自动修复（最多 3 次循环）
  /review [PR#] 代码审查 (本地 diff 或 PR)
  /init         分析代码库，创建 QILING.md
  /repomap      显示仓库文件和符号索引
  /memory       查看记忆文件
  /memory edit  编辑记忆文件
  /pr           创建 Pull Request
  /doctor       诊断环境配置
  /model        切换 AI 模型
  /config       查看当前配置
  /cost         显示 token 成本统计
  /compact      压缩对话上下文
  /clear        清空当前对话
  /exit         退出

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
