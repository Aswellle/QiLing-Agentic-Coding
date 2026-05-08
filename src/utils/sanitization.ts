/**
 * Unicode sanitization for hidden character attack mitigation
 * — ported from CC's utils/sanitization.ts (verbatim)
 *
 * Protects against ASCII Smuggling and Hidden Prompt Injection via:
 * - Tag characters (U+E0000-U+E007F)
 * - Format controls (U+200B-U+200F, directional marks, BOM)
 * - Private use areas
 *
 * Reference: https://embracethered.com/blog/posts/2024/hiding-and-finding-text-with-unicode-tags/
 * HackerOne report #3086545 targeting MCP implementations
 */

export function partiallySanitizeUnicode(prompt: string): string {
  let current = prompt
  let previous = ''
  let iterations = 0
  const MAX_ITERATIONS = 10

  while (current !== previous && iterations < MAX_ITERATIONS) {
    previous = current
    current = current.normalize('NFKC')
    // Method 1: Strip dangerous Unicode property classes
    current = current.replace(/[\p{Cf}\p{Co}\p{Cn}]/gu, '')
    // Method 2: Explicit dangerous character ranges (fallback)
    current = current
      .replace(/[​-‏]/g, '')  // Zero-width spaces, LTR/RTL marks
      .replace(/[‪-‮]/g, '')  // Directional formatting characters
      .replace(/[⁦-⁩]/g, '')  // Directional isolates
      .replace(/[﻿]/g, '')         // Byte order mark
      .replace(/[-]/g, '')  // BMP private use
    iterations++
  }

  if (iterations >= MAX_ITERATIONS) {
    throw new Error(
      `Unicode sanitization reached maximum iterations (${MAX_ITERATIONS}) for input: ${prompt.slice(0, 100)}`
    )
  }

  return current
}

export function recursivelySanitizeUnicode(value: string): string
export function recursivelySanitizeUnicode<T>(value: T[]): T[]
export function recursivelySanitizeUnicode<T extends object>(value: T): T
export function recursivelySanitizeUnicode<T>(value: T): T
export function recursivelySanitizeUnicode(value: unknown): unknown {
  if (typeof value === 'string') return partiallySanitizeUnicode(value)
  if (Array.isArray(value)) return value.map(recursivelySanitizeUnicode)
  if (value !== null && typeof value === 'object') {
    const sanitized: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(value)) {
      sanitized[recursivelySanitizeUnicode(key)] = recursivelySanitizeUnicode(val)
    }
    return sanitized
  }
  return value
}
