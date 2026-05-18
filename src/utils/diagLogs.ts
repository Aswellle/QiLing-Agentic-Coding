/**
 * Diagnostic logging — adapted from CC's utils/diagLogs.ts
 *
 * Writes diagnostic events (NO PII) to a log file specified by
 * QILING_DIAGNOSTICS_FILE (CC: CLAUDE_CODE_DIAGNOSTICS_FILE) for
 * container/managed environment monitoring.
 *
 * IMPORTANT: NEVER log PII — no file paths, project names, repo names,
 * prompts, user inputs, or any personally identifiable information.
 *
 * withDiagnosticsTiming(): convenience wrapper that logs start/complete/fail
 * with timing for async operations.
 */

import { appendFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { jsonStringify } from './slowOperations.js'

type DiagnosticLogLevel = 'debug' | 'info' | 'warn' | 'error'

type DiagnosticLogEntry = {
  timestamp: string
  level: DiagnosticLogLevel
  event: string
  data: Record<string, unknown>
}

function getDiagnosticLogFile(): string | undefined {
  return process.env.QILING_DIAGNOSTICS_FILE
    ?? process.env.CLAUDE_CODE_DIAGNOSTICS_FILE
}

/**
 * Write a diagnostic event to the log file.
 * MUST NOT be called with any PII.
 *
 * @param level  Log level (info/warn/error) — used for filtering only
 * @param event  Specific event name: "started", "mcp_connected", etc.
 * @param data   Optional additional non-PII data to log
 */
export function logForDiagnosticsNoPII(
  level: DiagnosticLogLevel,
  event: string,
  data?: Record<string, unknown>,
): void {
  const logFile = getDiagnosticLogFile()
  if (!logFile) return

  const entry: DiagnosticLogEntry = {
    timestamp: new Date().toISOString(),
    level,
    event,
    data: data ?? {},
  }

  const line = jsonStringify(entry) + '\n'
  try {
    appendFileSync(logFile, line)
  } catch {
    // If append fails, try creating the directory first
    try {
      mkdirSync(dirname(logFile), { recursive: true })
      appendFileSync(logFile, line)
    } catch {
      // Silently fail — diagnostic logging must not crash the process
    }
  }
}

/**
 * Wrap an async function with diagnostic timing logs.
 * Logs `{event}_started` before and `{event}_completed` after with duration_ms.
 * Logs `{event}_failed` on error (re-throws).
 */
export async function withDiagnosticsTiming<T>(
  event: string,
  fn: () => Promise<T>,
  getData?: (result: T) => Record<string, unknown>,
): Promise<T> {
  const startTime = Date.now()
  logForDiagnosticsNoPII('info', `${event}_started`)

  try {
    const result = await fn()
    const additionalData = getData ? getData(result) : {}
    logForDiagnosticsNoPII('info', `${event}_completed`, {
      duration_ms: Date.now() - startTime,
      ...additionalData,
    })
    return result
  } catch (error) {
    logForDiagnosticsNoPII('error', `${event}_failed`, {
      duration_ms: Date.now() - startTime,
    })
    throw error
  }
}
