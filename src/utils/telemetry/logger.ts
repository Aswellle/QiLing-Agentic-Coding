/**
 * OpenTelemetry diagnostic logger — adapted from CC's utils/telemetry/logger.ts
 *
 * Used as the OTEL DiagLogger for 3rd-party telemetry.
 * Errors and warnings log to QiLing's error/debug channels.
 * Info/debug/verbose are no-ops to avoid noise.
 */

import { logForDebugging } from '../log.js'

// Minimal DiagLogger interface (mirrors @opentelemetry/api)
export interface DiagLogger {
  error(message: string, ...args: unknown[]): void
  warn(message: string, ...args: unknown[]): void
  info(message: string, ...args: unknown[]): void
  debug(message: string, ...args: unknown[]): void
  verbose(message: string, ...args: unknown[]): void
}

export class ClaudeCodeDiagLogger implements DiagLogger {
  error(message: string): void {
    logForDebugging(`[3P telemetry] OTEL diag error: ${message}`)
  }
  warn(message: string): void {
    logForDebugging(`[3P telemetry] OTEL diag warn: ${message}`)
  }
  info(_message: string): void { return }
  debug(_message: string): void { return }
  verbose(_message: string): void { return }
}
