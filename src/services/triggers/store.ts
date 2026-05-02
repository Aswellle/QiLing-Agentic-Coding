// In-memory remote trigger registry for QiLing sessions.

export interface RemoteTrigger {
  id: string
  name: string
  url: string
  method: 'GET' | 'POST' | 'PUT' | 'PATCH'
  headers?: Record<string, string>
  defaultPayload?: Record<string, unknown>
  description?: string
  createdAt: number
  lastRunAt?: number
  lastStatus?: number
}

const triggers = new Map<string, RemoteTrigger>()

function triggerId(): string {
  return `trig-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

export function createTrigger(
  name: string,
  url: string,
  method: RemoteTrigger['method'] = 'POST',
  headers?: Record<string, string>,
  defaultPayload?: Record<string, unknown>,
  description?: string
): RemoteTrigger {
  const id = triggerId()
  const t: RemoteTrigger = { id, name, url, method, headers, defaultPayload, description, createdAt: Date.now() }
  triggers.set(id, t)
  return t
}

export function getTrigger(id: string): RemoteTrigger | undefined {
  // Support lookup by id or name
  return triggers.get(id) ?? Array.from(triggers.values()).find(t => t.name === id)
}

export function listTriggers(): RemoteTrigger[] {
  return Array.from(triggers.values())
}

export function updateTrigger(id: string, patch: Partial<Omit<RemoteTrigger, 'id' | 'createdAt'>>): boolean {
  const t = getTrigger(id)
  if (!t) return false
  Object.assign(t, patch)
  return true
}

export function deleteTrigger(id: string): boolean {
  const t = getTrigger(id)
  if (!t) return false
  triggers.delete(t.id)
  return true
}

export function clearTriggers(): void {
  triggers.clear()
}
