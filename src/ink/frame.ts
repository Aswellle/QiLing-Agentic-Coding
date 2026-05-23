/**
 * Ink frame types — adapted from CC's ink/frame.ts
 *
 * Defines the data shape for a rendered frame (screen buffer + viewport +
 * cursor state) and the Patch type used by the terminal diff engine.
 *
 * QiLing: Screen, StylePool, CharPool, HyperlinkPool are stub types until
 * ink/screen.ts is fully ported (Phase B-T4-13). The Frame type and Patch
 * union are complete and used by ink/optimizer.ts (already ported).
 */

import type { Size } from './layout/geometry.js'

// ─── Stub types (will be replaced by full screen.ts types in B-T4-13) ────────

export type StylePool = { transition: (fromId: number, toId: number) => string } & Map<string, number>
export type CharPool = unknown
export type HyperlinkPool = unknown

export type Cursor = {
  x: number
  y: number
  visible: boolean
}

export type ScrollHint = {
  top: number
  bottom: number
  delta: number
}

export type Screen = {
  width: number
  height: number
  [k: string]: unknown
}

// ─── Frame ────────────────────────────────────────────────────────────────────

export type Frame = {
  readonly screen: Screen
  readonly viewport: Size
  readonly cursor: Cursor
  readonly scrollHint?: ScrollHint | null
  readonly scrollDrainPending?: boolean
}

export function emptyFrame(
  rows: number,
  columns: number,
  _stylePool?: StylePool,
  _charPool?: CharPool,
  _hyperlinkPool?: HyperlinkPool,
): Frame {
  return {
    screen: { width: columns, height: rows },
    viewport: { width: columns, height: rows },
    cursor: { x: 0, y: 0, visible: true },
  }
}

// ─── Patch (terminal diff) ────────────────────────────────────────────────────

export type FlickerReason = 'resize' | 'offscreen' | 'clear'

export type FrameEvent = {
  durationMs: number
  phases?: {
    renderer: number
    diff: number
    optimize: number
    write: number
    patches: number
    yoga: number
    commit: number
    yogaVisited: number
    yogaMeasured: number
    yogaCacheHits: number
    yogaLive: number
  }
  flickers: Array<{
    desiredHeight: number
    availableHeight: number
    reason: FlickerReason
  }>
}

export type Patch =
  | { type: 'stdout'; content: string }
  | { type: 'clear'; count: number }
  | { type: 'clearTerminal'; reason: FlickerReason; debug?: { triggerY: number; prevLine: string; nextLine: string } }
  | { type: 'cursorHide' }
  | { type: 'cursorShow' }
  | { type: 'cursorMove'; x: number; y: number }
  | { type: 'cursorTo'; col: number }
  | { type: 'carriageReturn' }
  | { type: 'hyperlink'; uri: string }
  | { type: 'styleStr'; str: string }

export type Diff = Patch[]

// ─── shouldClear helper ───────────────────────────────────────────────────────

export function shouldClear(
  current: Frame,
  previous: Frame | null,
): FlickerReason | undefined {
  if (!previous) return undefined
  if (current.viewport.width !== previous.viewport.width ||
      current.viewport.height !== previous.viewport.height) {
    return 'resize'
  }
  const curH  = current.screen.height  as number
  const prevH = previous.screen.height as number
  const rows  = current.viewport.height
  if (curH < prevH && curH <= rows) return 'offscreen'
  return undefined
}
