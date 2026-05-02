import { describe, test, expect, beforeEach } from 'bun:test'
import {
  createTask, getTask, listTasks, updateTask, stopTask, openBlockers, clearAllTasks,
} from '../../../src/services/tasks/store'

beforeEach(() => clearAllTasks())

describe('Task store — create', () => {
  test('creates task with pending status', () => {
    const t = createTask('Fix bug', 'Fix the login bug')
    expect(t.status).toBe('pending')
    expect(t.subject).toBe('Fix bug')
    expect(t.id).toMatch(/^t[a-z0-9]{8}$/)
    expect(getTask(t.id)).toBe(t)
  })

  test('multiple tasks get unique IDs', () => {
    const a = createTask('A', 'A desc')
    const b = createTask('B', 'B desc')
    expect(a.id).not.toBe(b.id)
    expect(listTasks()).toHaveLength(2)
  })
})

describe('Task store — update', () => {
  test('marks in_progress', () => {
    const t = createTask('Task', 'desc')
    const res = updateTask(t.id, { status: 'in_progress', owner: 'agent-1' })
    expect(res.success).toBe(true)
    expect(res.statusChange).toEqual({ from: 'pending', to: 'in_progress' })
    expect(getTask(t.id)!.owner).toBe('agent-1')
  })

  test('marks completed', () => {
    const t = createTask('Task', 'desc')
    updateTask(t.id, { status: 'in_progress' })
    const res = updateTask(t.id, { status: 'completed' })
    expect(res.success).toBe(true)
    expect(getTask(t.id)!.status).toBe('completed')
  })

  test('deleted removes task', () => {
    const t = createTask('Task', 'desc')
    updateTask(t.id, { status: 'deleted' })
    expect(getTask(t.id)).toBeUndefined()
    expect(listTasks()).toHaveLength(0)
  })

  test('returns error for unknown id', () => {
    const res = updateTask('t99999999', { status: 'completed' })
    expect(res.success).toBe(false)
    expect(res.error).toContain('not found')
  })

  test('appends to output log', () => {
    const t = createTask('Task', 'desc')
    updateTask(t.id, { appendOutput: 'step 1 done' })
    updateTask(t.id, { appendOutput: 'step 2 done' })
    expect(getTask(t.id)!.output).toEqual(['step 1 done', 'step 2 done'])
  })
})

describe('Task store — dependencies', () => {
  test('bidirectional blocks link', () => {
    const a = createTask('A', 'A desc')
    const b = createTask('B', 'B desc')
    updateTask(b.id, { addBlockedBy: [a.id] })
    expect(getTask(b.id)!.blockedBy).toContain(a.id)
    expect(getTask(a.id)!.blocks).toContain(b.id)
  })

  test('openBlockers excludes completed tasks', () => {
    const a = createTask('A', 'A')
    const b = createTask('B', 'B')
    updateTask(b.id, { addBlockedBy: [a.id] })
    // Before completing A, B is blocked
    expect(openBlockers(getTask(b.id)!)).toContain(a.id)
    // After completing A, no open blockers
    updateTask(a.id, { status: 'completed' })
    expect(openBlockers(getTask(b.id)!)).toHaveLength(0)
  })
})

describe('Task store — stop', () => {
  test('stops a running task', () => {
    const t = createTask('Task', 'desc')
    updateTask(t.id, { status: 'in_progress' })
    const res = stopTask(t.id)
    expect(res.success).toBe(true)
    expect(getTask(t.id)!.status).toBe('stopped')
  })

  test('cannot stop a completed task', () => {
    const t = createTask('Task', 'desc')
    updateTask(t.id, { status: 'completed' })
    const res = stopTask(t.id)
    expect(res.success).toBe(false)
  })

  test('returns error for unknown id', () => {
    const res = stopTask('t00000000')
    expect(res.success).toBe(false)
    expect(res.error).toContain('not found')
  })
})
