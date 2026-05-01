/**
 * 会话恢复 — 从历史文件重新加载上次对话
 *
 * 用法：
 *   qiling --resume          → 恢复同目录最近的会话
 *   qiling --resume <id>     → 恢复指定 session ID
 *   /resume                  → 在 REPL 中恢复上次会话
 */
import { existsSync, readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { getGlobalConfigDir } from '../settings/loader'
import type { Message } from '../types/message'

export interface SessionSummary {
  sessionId: string
  startTime: number
  workingDir: string
  messageCount: number
  lastMessage: string     // 最后一条用户消息的摘要
  filePath: string
}

const HISTORY_DIR = () => join(getGlobalConfigDir(), 'history')

export function listSessions(workingDir?: string): SessionSummary[] {
  const histDir = HISTORY_DIR()
  if (!existsSync(histDir)) return []

  try {
    const files = readdirSync(histDir)
      .filter(f => f.endsWith('.jsonl'))
      .sort()
      .reverse()
      .slice(0, 20)

    const summaries: SessionSummary[] = []

    for (const file of files) {
      const filePath = join(histDir, file)
      const summary = parseSessionSummary(filePath)
      if (!summary) continue
      if (workingDir && summary.workingDir !== workingDir) continue
      summaries.push(summary)
    }

    return summaries
  } catch {
    return []
  }
}

export function loadSession(sessionId: string): Message[] | null {
  const histDir = HISTORY_DIR()
  if (!existsSync(histDir)) return null

  // Find the file containing this session
  try {
    const files = readdirSync(histDir).filter(f => f.endsWith('.jsonl'))
    for (const file of files) {
      if (!file.includes(sessionId)) continue
      return parseSessionMessages(join(histDir, file))
    }
    return null
  } catch {
    return null
  }
}

export function loadLastSession(workingDir: string): { messages: Message[]; summary: SessionSummary } | null {
  const sessions = listSessions(workingDir)
  if (sessions.length === 0) return null

  const latest = sessions[0]
  const messages = parseSessionMessages(latest.filePath)
  if (!messages || messages.length === 0) return null

  return { messages, summary: latest }
}

function parseSessionSummary(filePath: string): SessionSummary | null {
  try {
    const lines = readFileSync(filePath, 'utf-8')
      .split('\n')
      .filter(Boolean)
      .map(l => {
        try { return JSON.parse(l) as Record<string, unknown> }
        catch { return null }
      })
      .filter(Boolean) as Record<string, unknown>[]

    if (lines.length === 0) return null

    const header = lines[0]
    if (header.type !== 'session_start') return null

    const userMessages = lines.filter(l => l.type === 'message' && l.role === 'user')
    const lastUser = userMessages[userMessages.length - 1]
    const lastText = typeof lastUser?.content === 'string'
      ? lastUser.content.slice(0, 80)
      : '(complex message)'

    return {
      sessionId: header.sessionId as string,
      startTime: header.timestamp as number,
      workingDir: header.workingDir as string,
      messageCount: lines.filter(l => l.type === 'message').length,
      lastMessage: lastText,
      filePath,
    }
  } catch {
    return null
  }
}

function parseSessionMessages(filePath: string): Message[] | null {
  try {
    const lines = readFileSync(filePath, 'utf-8')
      .split('\n')
      .filter(Boolean)

    const messages: Message[] = []

    for (const line of lines) {
      try {
        const record = JSON.parse(line) as Record<string, unknown>
        if (record.type !== 'message') continue
        messages.push({
          role: record.role as 'user' | 'assistant',
          content: record.content as string | never[],
        })
      } catch { /* skip */ }
    }

    return messages
  } catch {
    return null
  }
}

export function formatSessionList(sessions: SessionSummary[]): string {
  if (sessions.length === 0) {
    return '暂无历史会话记录。'
  }

  const lines = ['最近会话历史：\n']
  for (const s of sessions.slice(0, 10)) {
    const date = new Date(s.startTime).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
    lines.push(`  ${s.sessionId.slice(-8)}  ${date}  [${s.messageCount}条]  ${s.lastMessage.slice(0, 50)}`)
  }
  lines.push('\n使用 /resume <id> 恢复指定会话，或 /resume 恢复最近会话')
  return lines.join('\n')
}
