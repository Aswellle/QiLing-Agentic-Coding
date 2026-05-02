/**
 * In-memory task store for QiLing session.
 * Mirrors CC's TaskStateBase schema — status machine: pending → in_progress → completed | stopped
 */

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'stopped'

export interface Task {
  id: string
  subject: string
  description: string
  status: TaskStatus
  owner?: string
  activeForm?: string
  blocks: string[]      // task IDs this task blocks
  blockedBy: string[]   // task IDs that must complete before this can start
  metadata: Record<string, unknown>
  output: string[]      // freeform log lines (appended by TaskUpdate/agents)
  createdAt: number
  updatedAt: number
}

// ─── ID generation ────────────────────────────────────────────────────────────

const CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789'

function randomId(prefix = 't'): string {
  let s = prefix
  for (let i = 0; i < 8; i++) s += CHARS[Math.floor(Math.random() * CHARS.length)]
  return s
}

// ─── Singleton store ──────────────────────────────────────────────────────────

const tasks = new Map<string, Task>()

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export function createTask(
  subject: string,
  description: string,
  activeForm?: string,
  metadata: Record<string, unknown> = {}
): Task {
  const id = randomId('t')
  const now = Date.now()
  const task: Task = {
    id,
    subject,
    description,
    status: 'pending',
    activeForm,
    blocks: [],
    blockedBy: [],
    metadata,
    output: [],
    createdAt: now,
    updatedAt: now,
  }
  tasks.set(id, task)
  return task
}

export function getTask(id: string): Task | undefined {
  return tasks.get(id)
}

export function listTasks(): Task[] {
  return Array.from(tasks.values())
}

export interface UpdateTaskParams {
  subject?: string
  description?: string
  activeForm?: string
  status?: TaskStatus | 'deleted'
  owner?: string
  addBlocks?: string[]
  addBlockedBy?: string[]
  metadata?: Record<string, unknown>
  appendOutput?: string
}

export interface UpdateResult {
  success: boolean
  updatedFields: string[]
  error?: string
  statusChange?: { from: TaskStatus; to: TaskStatus }
}

export function updateTask(id: string, params: UpdateTaskParams): UpdateResult {
  const task = tasks.get(id)
  if (!task) return { success: false, updatedFields: [], error: `Task '${id}' not found` }

  const updatedFields: string[] = []
  const prevStatus = task.status

  if (params.status === 'deleted') {
    tasks.delete(id)
    return { success: true, updatedFields: ['status'], statusChange: { from: prevStatus, to: 'stopped' } }
  }

  if (params.subject !== undefined && params.subject !== task.subject) {
    task.subject = params.subject
    updatedFields.push('subject')
  }
  if (params.description !== undefined && params.description !== task.description) {
    task.description = params.description
    updatedFields.push('description')
  }
  if (params.activeForm !== undefined && params.activeForm !== task.activeForm) {
    task.activeForm = params.activeForm
    updatedFields.push('activeForm')
  }
  if (params.owner !== undefined && params.owner !== task.owner) {
    task.owner = params.owner
    updatedFields.push('owner')
  }
  if (params.status !== undefined && params.status !== task.status) {
    task.status = params.status as TaskStatus
    updatedFields.push('status')
  }
  if (params.addBlocks) {
    for (const blockId of params.addBlocks) {
      if (!task.blocks.includes(blockId)) {
        task.blocks.push(blockId)
        // bidirectional: mark the target as blocked by this task
        const target = tasks.get(blockId)
        if (target && !target.blockedBy.includes(id)) target.blockedBy.push(id)
      }
    }
    updatedFields.push('blocks')
  }
  if (params.addBlockedBy) {
    for (const blockerId of params.addBlockedBy) {
      if (!task.blockedBy.includes(blockerId)) {
        task.blockedBy.push(blockerId)
        const blocker = tasks.get(blockerId)
        if (blocker && !blocker.blocks.includes(id)) blocker.blocks.push(id)
      }
    }
    updatedFields.push('blockedBy')
  }
  if (params.metadata) {
    for (const [k, v] of Object.entries(params.metadata)) {
      if (v === null) delete task.metadata[k]
      else task.metadata[k] = v
    }
    updatedFields.push('metadata')
  }
  if (params.appendOutput) {
    task.output.push(params.appendOutput)
    updatedFields.push('output')
  }

  task.updatedAt = Date.now()

  return {
    success: true,
    updatedFields,
    ...(prevStatus !== task.status ? { statusChange: { from: prevStatus, to: task.status } } : {}),
  }
}

export function stopTask(id: string): { success: boolean; error?: string } {
  const task = tasks.get(id)
  if (!task) return { success: false, error: `Task '${id}' not found` }
  if (task.status === 'stopped' || task.status === 'completed') {
    return { success: false, error: `Task '${id}' is already ${task.status}` }
  }
  task.status = 'stopped'
  task.updatedAt = Date.now()
  return { success: true }
}

/** Resolve open blockers — returns only IDs of tasks still not completed/stopped */
export function openBlockers(task: Task): string[] {
  return task.blockedBy.filter(id => {
    const t = tasks.get(id)
    return t && t.status !== 'completed' && t.status !== 'stopped'
  })
}

export function clearAllTasks(): void {
  tasks.clear()
}
