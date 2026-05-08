/**
 * Unicode figure constants — ported from CC's constants/figures.ts
 * Platform-aware (BLACK_CIRCLE uses ⏺ on macOS, ● elsewhere).
 */

const isMac = process.platform === 'darwin'

export const BLACK_CIRCLE = isMac ? '⏺' : '●'
export const BULLET_OPERATOR = '∙'
export const TEARDROP_ASTERISK = '✻'
export const UP_ARROW = '↑'     // ↑
export const DOWN_ARROW = '↓'   // ↓
export const LIGHTNING_BOLT = '↯'   // ↯ - fast mode indicator

export const EFFORT_LOW = '○'       // ○
export const EFFORT_MEDIUM = '◐'    // ◐
export const EFFORT_HIGH = '●'      // ●
export const EFFORT_MAX = '◉'       // ◉

export const PLAY_ICON = '▶'   // ▶
export const PAUSE_ICON = '⏸'  // ⏸

export const REFRESH_ARROW = '↻'   // ↻
export const CHANNEL_ARROW = '←'   // ←
export const INJECTED_ARROW = '→'  // →
export const FORK_GLYPH = '⑂'      // ⑂

export const DIAMOND_OPEN = '◇'    // ◇
export const DIAMOND_FILLED = '◆'  // ◆
export const REFERENCE_MARK = '※'  // ※
export const FLAG_ICON = '⚑'       // ⚑

export const BLOCKQUOTE_BAR = '▎'   // ▎
export const HEAVY_HORIZONTAL = '━' // ━
