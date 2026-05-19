/**
 * Ink rendering warnings — adapted from CC's ink/warn.ts
 *
 * Warns about invalid prop values in debug mode.
 */

import { logForDebugging } from '../utils/log.js'

export function ifNotInteger(value: number | undefined, name: string): void {
  if (value === undefined) return
  if (Number.isInteger(value)) return
  logForDebugging(`${name} should be an integer, got ${value}`, { level: 'warn' })
}
