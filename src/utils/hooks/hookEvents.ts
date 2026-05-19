/**
 * Hook event broadcasting system — adapted from CC's utils/hooks/hookEvents.ts
 *
 * Generic event system for hook execution lifecycle events. Handlers can
 * register to receive events and decide what to do (SDK messages, logging).
 *
 * Always-emitted events: SessionStart, Setup (backwards-compatible).
 * Other events only emitted when setAllHookEventsEnabled(true) is called
 * (e.g., when SDK includeHookEvents option is set).
 */

import { logForDebugging } from '../log.js'

const ALWAYS_EMITTED_HOOK_EVENTS = new Set(['SessionStart', 'Setup'])
const MAX_PENDING_EVENTS = 100

export type HookStartedEvent = {
  type: 'started'
  hookId: string
  hookName: string
  hookEvent: string
}

export type HookProgressEvent = {
  type: 'progress'
  hookId: string
  hookName: string
  hookEvent: string
  stdout: string
  stderr: string
  output: string
}

export type HookResponseEvent = {
  type: 'response'
  hookId: string
  hookName: string
  hookEvent: string
  output: string
  stdout: string
  stderr: string
  exitCode?: number
  outcome: 'success' | 'error' | 'cancelled'
}

export type HookExecutionEvent = HookStartedEvent | HookProgressEvent | HookResponseEvent
export type HookEventHandler = (event: HookExecutionEvent) => void

const pendingEvents: HookExecutionEvent[] = []
let eventHandler: HookEventHandler | null = null
let allHookEventsEnabled = false

function shouldEmit(hookEvent: string): boolean {
  return allHookEventsEnabled || ALWAYS_EMITTED_HOOK_EVENTS.has(hookEvent)
}

function emit(event: HookExecutionEvent): void {
  if (eventHandler) {
    eventHandler(event)
  } else {
    pendingEvents.push(event)
    if (pendingEvents.length > MAX_PENDING_EVENTS) pendingEvents.shift()
  }
}

export function registerHookEventHandler(handler: HookEventHandler | null): void {
  eventHandler = handler
  if (handler && pendingEvents.length > 0) {
    for (const event of pendingEvents.splice(0)) handler(event)
  }
}

export function emitHookStarted(data: {
  hookId: string
  hookName: string
  hookEvent: string
}): void {
  if (!shouldEmit(data.hookEvent)) return
  emit({ type: 'started', ...data })
}

export function emitHookProgress(data: {
  hookId: string
  hookName: string
  hookEvent: string
  stdout: string
  stderr: string
  output: string
}): void {
  if (!shouldEmit(data.hookEvent)) return
  emit({ type: 'progress', ...data })
}

/**
 * Start interval polling for hook output changes.
 * Returns a stop function.
 */
export function startHookProgressInterval(params: {
  hookId: string
  hookName: string
  hookEvent: string
  getOutput: () => Promise<{ stdout: string; stderr: string; output: string }>
  intervalMs?: number
}): () => void {
  if (!shouldEmit(params.hookEvent)) return () => {}

  let lastEmittedOutput = ''
  const interval = setInterval(() => {
    void params.getOutput().then(({ stdout, stderr, output }) => {
      if (output === lastEmittedOutput) return
      lastEmittedOutput = output
      emitHookProgress({
        hookId: params.hookId,
        hookName: params.hookName,
        hookEvent: params.hookEvent,
        stdout,
        stderr,
        output,
      })
    })
  }, params.intervalMs ?? 1000)
  interval.unref()

  return () => clearInterval(interval)
}

export function emitHookResponse(data: {
  hookId: string
  hookName: string
  hookEvent: string
  output: string
  stdout: string
  stderr: string
  exitCode?: number
  outcome: 'success' | 'error' | 'cancelled'
}): void {
  const outputToLog = data.stdout || data.stderr || data.output
  if (outputToLog) {
    logForDebugging(`Hook ${data.hookName} (${data.hookEvent}) ${data.outcome}:\n${outputToLog}`)
  }
  if (!shouldEmit(data.hookEvent)) return
  emit({ type: 'response', ...data })
}

/**
 * Enable emission of all hook event types (beyond SessionStart + Setup).
 * Call when SDK includeHookEvents is set or QILING_REMOTE_MODE is active.
 */
export function setAllHookEventsEnabled(enabled: boolean): void {
  allHookEventsEnabled = enabled
}

export function clearHookEventState(): void {
  eventHandler = null
  pendingEvents.length = 0
  allHookEventsEnabled = false
}
