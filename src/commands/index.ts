import type { Message } from '../types/message'

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
    description: '显示 token 使用成本统计',
    execute(_args, ctx) {
      ctx.onMessage({ role: 'assistant', content: '/cost 命令：请查看底部状态栏的实时成本显示。' })
    },
  },
  {
    name: '/commit',
    description: '创建 git commit',
    allowedTools: ['Bash', 'PowerShell'],
    getPrompt(args, ctx) {
      return COMMIT_PROMPT
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
    name: '/memory',
    description: '查看/编辑记忆文件 (QILING.md)',
    getPrompt(args, ctx) {
      return MEMORY_PROMPT(args, ctx.workingDir)
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

const HELP_TEXT = `QiLing (启灵) — 编程代理工具

## 内置命令

  /help         显示此帮助
  /commit       创建 git commit (AI 辅助)
  /review [PR#] 代码审查 (本地 diff 或 PR)
  /init         分析代码库，创建 QILING.md
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
