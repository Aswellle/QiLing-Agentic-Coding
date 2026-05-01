import { appendFileSync, readFileSync, existsSync, mkdirSync, readdirSync } from 'fs'
import { join } from 'path'
import { getGlobalConfigDir } from '../settings/loader'
import type { Message } from '../types/message'

const HISTORY_DIR = () => join(getGlobalConfigDir(), 'history')
const MAX_SESSIONS = 50

export interface SessionRecord {
  sessionId: string
  startTime: number
  workingDir: string
  messages: Message[]
}

export class HistoryManager {
  private sessionId: string
  private workingDir: string
  private sessionFile: string

  constructor(sessionId: string, workingDir: string) {
    this.sessionId = sessionId
    this.workingDir = workingDir
    this.sessionFile = join(HISTORY_DIR(), `${sessionId}.jsonl`)
    mkdirSync(HISTORY_DIR(), { recursive: true })

    // Write session header
    this.appendLine({
      type: 'session_start',
      sessionId,
      workingDir,
      timestamp: Date.now(),
    })

    this.pruneOldSessions()
  }

  saveMessage(message: Message): void {
    this.appendLine({
      type: 'message',
      timestamp: Date.now(),
      ...message,
    })
  }

  saveMessages(messages: Message[]): void {
    for (const msg of messages) {
      this.saveMessage(msg)
    }
  }

  loadLastSession(workingDir?: string): SessionRecord | null {
    const histDir = HISTORY_DIR()
    if (!existsSync(histDir)) return null

    const files = readdirSync(histDir)
      .filter(f => f.endsWith('.jsonl'))
      .sort()
      .reverse()

    for (const file of files) {
      const filePath = join(histDir, file)
      const record = this.parseSessionFile(filePath)
      if (!record) continue
      if (workingDir && record.workingDir !== workingDir) continue
      if (record.sessionId === this.sessionId) continue
      return record
    }
    return null
  }

  private parseSessionFile(filePath: string): SessionRecord | null {
    try {
      const lines = readFileSync(filePath, 'utf-8')
        .split('\n')
        .filter(Boolean)
        .map(l => JSON.parse(l) as Record<string, unknown>)

      if (lines.length === 0) return null
      const header = lines[0]
      if (header.type !== 'session_start') return null

      const messages = lines
        .filter(l => l.type === 'message')
        .map(l => ({ role: l.role, content: l.content }) as Message)

      return {
        sessionId: header.sessionId as string,
        startTime: header.timestamp as number,
        workingDir: header.workingDir as string,
        messages,
      }
    } catch {
      return null
    }
  }

  private appendLine(data: Record<string, unknown>): void {
    try {
      appendFileSync(this.sessionFile, JSON.stringify(data) + '\n', 'utf-8')
    } catch {
      // Non-fatal: history is optional
    }
  }

  private pruneOldSessions(): void {
    try {
      const histDir = HISTORY_DIR()
      const files = readdirSync(histDir)
        .filter(f => f.endsWith('.jsonl'))
        .sort()

      while (files.length > MAX_SESSIONS) {
        const oldest = files.shift()!
        import('fs').then(fs => {
          try { fs.unlinkSync(join(histDir, oldest)) } catch { /* ignore */ }
        })
      }
    } catch { /* ignore */ }
  }
}
