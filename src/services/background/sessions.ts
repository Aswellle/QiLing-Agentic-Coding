/**
 * Background session registry — adapted from CC's LocalMainSessionTask.ts
 *
 * When the user presses Ctrl+B during a streaming query, the active query is
 * "backgrounded": it keeps running independently while the REPL returns to a
 * clean state for new input. Results are stored here and can be foregrounded
 * later.
 */

export type BackgroundSessionStatus = 'running' | 'completed' | 'failed'

export interface BackgroundSession {
  id: string
  description: string          // first ~60 chars of the original prompt
  status: BackgroundSessionStatus
  messages: unknown[]          // accumulated Message[] (typed as unknown to avoid circular import)
  toolCallCount: number
  startedAt: number
  completedAt?: number
  abortController: AbortController
  onComplete?: (session: BackgroundSession) => void
}

const sessions = new Map<string, BackgroundSession>()
let _idCounter = 0

function generateId(): string {
  _idCounter++
  return `bg-${Date.now().toString(36)}-${_idCounter}`
}

export function createBackgroundSession(
  description: string,
  abortController: AbortController
): BackgroundSession {
  const session: BackgroundSession = {
    id: generateId(),
    description: description.slice(0, 60),
    status: 'running',
    messages: [],
    toolCallCount: 0,
    startedAt: Date.now(),
    abortController,
  }
  sessions.set(session.id, session)
  return session
}

export function getBackgroundSession(id: string): BackgroundSession | undefined {
  return sessions.get(id)
}

export function listBackgroundSessions(): BackgroundSession[] {
  return Array.from(sessions.values())
}

export function appendBackgroundMessage(id: string, message: unknown): void {
  const s = sessions.get(id)
  if (!s) return
  s.messages.push(message)
  if (
    message &&
    typeof message === 'object' &&
    (message as { role?: string }).role === 'assistant'
  ) {
    const content = (message as { content?: unknown }).content
    if (Array.isArray(content)) {
      s.toolCallCount += content.filter(
        (b: unknown) => typeof b === 'object' && b !== null && (b as { type?: string }).type === 'tool_use'
      ).length
    }
  }
}

export function completeBackgroundSession(
  id: string,
  status: 'completed' | 'failed'
): void {
  const s = sessions.get(id)
  if (!s) return
  s.status = status
  s.completedAt = Date.now()
  s.onComplete?.(s)
}

export function removeBackgroundSession(id: string): void {
  sessions.delete(id)
}

export function runningSessionCount(): number {
  let n = 0
  for (const s of sessions.values()) if (s.status === 'running') n++
  return n
}

export function totalSessionCount(): number {
  return sessions.size
}
