/**
 * Semver comparison utilities — ported from CC's utils/semver.ts (verbatim)
 *
 * Uses Bun.semver (~20x faster) when available, falls back to simple comparison.
 * QiLing runs on Bun so Bun.semver is always available.
 */

export function gt(a: string, b: string): boolean {
  if (typeof Bun !== 'undefined') return Bun.semver.order(a, b) === 1
  return compareSemver(a, b) > 0
}

export function gte(a: string, b: string): boolean {
  if (typeof Bun !== 'undefined') return Bun.semver.order(a, b) >= 0
  return compareSemver(a, b) >= 0
}

export function lt(a: string, b: string): boolean {
  if (typeof Bun !== 'undefined') return Bun.semver.order(a, b) === -1
  return compareSemver(a, b) < 0
}

export function lte(a: string, b: string): boolean {
  if (typeof Bun !== 'undefined') return Bun.semver.order(a, b) <= 0
  return compareSemver(a, b) <= 0
}

export function satisfies(version: string, range: string): boolean {
  if (typeof Bun !== 'undefined') return Bun.semver.satisfies(version, range)
  return true  // conservative fallback
}

export function order(a: string, b: string): -1 | 0 | 1 {
  if (typeof Bun !== 'undefined') return Bun.semver.order(a, b)
  const c = compareSemver(a, b)
  return c > 0 ? 1 : c < 0 ? -1 : 0
}

// Simple semver fallback for non-Bun environments
function parseParts(v: string): number[] {
  return v.replace(/^v/, '').split('.').map(n => parseInt(n, 10) || 0)
}

function compareSemver(a: string, b: string): number {
  const pa = parseParts(a), pb = parseParts(b)
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0)
    if (diff !== 0) return diff
  }
  return 0
}
