/**
 * @mention 上下文注入系统（借鉴 Cursor 的 @mention）
 *
 * 支持的 mention 类型：
 *   @file src/auth.ts          → 注入文件内容（含行号）
 *   @folder src/               → 注入目录结构
 *   @url https://example.com   → 获取并注入网页内容
 *   @code validateToken        → 搜索并注入函数/类定义
 *   @git                       → 注入 git status + diff
 *   @repomap [path]            → 注入仓库文件索引
 *
 * 使用方式：在用户输入的任意位置写 @mention
 * 例：
 *   "请帮我重构 @file src/auth.ts 中的 validateToken 函数"
 *   "参考 @url https://pkg.go.dev/net/http 实现 HTTP 服务"
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'fs'
import { resolve, relative, extname } from 'path'

export interface MentionContext {
  mention: string       // 原始 mention 文本
  resolved: string      // 解析后的内容
  error?: string        // 解析失败原因
}

// Regex: @keyword followed by optional argument, OR bare @https?://...
const MENTION_RE = /@(file|folder|url|code|git|repomap)(?:\s+(\S+))?|@(https?:\/\/\S+)/g

export async function resolveMentions(
  input: string,
  workingDir: string
): Promise<{ text: string; contexts: MentionContext[] }> {
  const contexts: MentionContext[] = []
  const mentionBlocks: string[] = []

  let match: RegExpExecArray | null
  const seen = new Set<string>()

  while ((match = MENTION_RE.exec(input)) !== null) {
    // Handle bare @https?://... syntax
    const bareUrl = match[3]
    const type = bareUrl ? 'url' : match[1]
    const arg = bareUrl ? bareUrl.replace(/^@/, '') : match[2]

    const key = `${type}:${arg ?? ''}`
    if (seen.has(key)) continue
    seen.add(key)

    const ctx = await resolveMention(type, arg, workingDir)
    contexts.push({ mention: match[0], resolved: ctx.content, error: ctx.error })
    mentionBlocks.push(
      ctx.error
        ? `[${match[0]}]: 解析失败 — ${ctx.error}`
        : `<context mention="${match[0]}">\n${ctx.content}\n</context>`
    )
  }

  if (mentionBlocks.length === 0) {
    return { text: input, contexts }
  }

  // Append resolved context blocks before the main message
  const enrichedText = mentionBlocks.join('\n\n') + '\n\n' + input
  return { text: enrichedText, contexts }
}

async function resolveMention(
  type: string,
  arg: string | undefined,
  workingDir: string
): Promise<{ content: string; error?: string }> {
  switch (type) {
    case 'file':
      return resolveFile(arg, workingDir)
    case 'folder':
      return resolveFolder(arg, workingDir)
    case 'url':
      return resolveUrl(arg)
    case 'code':
      return resolveCode(arg, workingDir)
    case 'git':
      return resolveGit(workingDir)
    case 'repomap':
      return resolveRepoMap(arg, workingDir)
    default:
      return { content: '', error: `Unknown mention type: ${type}` }
  }
}

// ─── Resolvers ──────────────────────────────────────────────────────────────

function resolveFile(arg: string | undefined, workingDir: string): { content: string; error?: string } {
  if (!arg) return { content: '', error: '@file requires a path argument' }
  const filePath = resolve(workingDir, arg)
  if (!existsSync(filePath)) return { content: '', error: `File not found: ${arg}` }

  try {
    const content = readFileSync(filePath, 'utf-8')
    const lines = content.split('\n')
    const MAX_LINES = 300

    const numbered = lines
      .slice(0, MAX_LINES)
      .map((l, i) => `${String(i + 1).padStart(4)}\t${l}`)
      .join('\n')

    const footer = lines.length > MAX_LINES
      ? `\n[File truncated: showing lines 1-${MAX_LINES} of ${lines.length}]`
      : ''

    return { content: `File: ${arg}\n\`\`\`\n${numbered}${footer}\n\`\`\`` }
  } catch (e) {
    return { content: '', error: `Cannot read file: ${e instanceof Error ? e.message : String(e)}` }
  }
}

function resolveFolder(arg: string | undefined, workingDir: string): { content: string; error?: string } {
  const dirPath = resolve(workingDir, arg ?? '.')
  if (!existsSync(dirPath)) return { content: '', error: `Directory not found: ${arg}` }

  try {
    const lines: string[] = [`Directory: ${arg ?? '.'}`]
    const IGNORE = new Set(['node_modules', '.git', 'dist', '__pycache__', '.next'])

    function walk(dir: string, prefix: string, depth: number) {
      if (depth > 4) return
      try {
        const entries = readdirSync(dir).filter(e => !IGNORE.has(e)).sort()
        for (const entry of entries) {
          const fullPath = resolve(dir, entry)
          const stat = statSync(fullPath)
          if (stat.isDirectory()) {
            lines.push(`${prefix}${entry}/`)
            walk(fullPath, prefix + '  ', depth + 1)
          } else {
            lines.push(`${prefix}${entry}`)
          }
        }
      } catch { /* skip */ }
    }

    walk(dirPath, '  ', 0)

    if (lines.length > 200) {
      lines.splice(200)
      lines.push('  ... [truncated]')
    }

    return { content: lines.join('\n') }
  } catch (e) {
    return { content: '', error: String(e) }
  }
}

async function resolveUrl(arg: string | undefined): Promise<{ content: string; error?: string }> {
  if (!arg) return { content: '', error: '@url requires a URL argument' }
  try {
    const response = await fetch(arg, {
      headers: { 'User-Agent': 'QiLing/0.1.0' },
      signal: AbortSignal.timeout(10_000),
    })
    if (!response.ok) return { content: '', error: `HTTP ${response.status}: ${arg}` }
    const text = await response.text()
    const stripped = text
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .slice(0, 8000)
    return { content: `URL: ${arg}\n${stripped}` }
  } catch (e) {
    return { content: '', error: `Failed to fetch ${arg}: ${e instanceof Error ? e.message : String(e)}` }
  }
}

async function resolveCode(arg: string | undefined, workingDir: string): Promise<{ content: string; error?: string }> {
  if (!arg) return { content: '', error: '@code requires a symbol name' }
  try {
    const isWin = process.platform === 'win32'
    const grepCmd = `rg --no-heading -n "${arg}" --type-add "src:*.{ts,tsx,js,jsx,py,go,rs,java,kt}" --type src`
    const proc = Bun.spawn(
      isWin ? ['powershell', '-Command', grepCmd] : ['bash', '-c', grepCmd],
      { cwd: workingDir, stdout: 'pipe', stderr: 'pipe' }
    )
    const output = await new Response(proc.stdout).text()
    await proc.exited

    const lines = output.split('\n').filter(Boolean).slice(0, 30)
    if (lines.length === 0) {
      return { content: '', error: `Symbol not found: ${arg}` }
    }
    return { content: `Code search: ${arg}\n\`\`\`\n${lines.join('\n')}\n\`\`\`` }
  } catch (e) {
    return { content: '', error: `Code search failed: ${e instanceof Error ? e.message : String(e)}` }
  }
}

async function resolveGit(workingDir: string): Promise<{ content: string; error?: string }> {
  try {
    const run = async (cmd: string) => {
      const proc = Bun.spawn(['git', ...cmd.split(' ')], {
        cwd: workingDir, stdout: 'pipe', stderr: 'pipe',
      })
      const out = await new Response(proc.stdout).text()
      await proc.exited
      return out.trim()
    }

    const [status, branch, diff] = await Promise.all([
      run('status --short'),
      run('branch --show-current'),
      run('diff HEAD --stat'),
    ])

    return {
      content: `Git context:\n  Branch: ${branch}\n\nStatus:\n${status || '(clean)'}\n\nDiff summary:\n${diff || '(no changes)'}`,
    }
  } catch (e) {
    return { content: '', error: `Git failed: ${e instanceof Error ? e.message : String(e)}` }
  }
}

async function resolveRepoMap(arg: string | undefined, workingDir: string): Promise<{ content: string; error?: string }> {
  try {
    const { RepoMapTool } = await import('../tools/RepoMapTool')
    const ctx = { workingDir, sessionId: 'mention' }
    const result = await RepoMapTool.call(
      { max_tokens: 1500, focus_path: arg },
      ctx
    )
    return { content: result.content[0].text }
  } catch (e) {
    return { content: '', error: String(e) }
  }
}
