/**
 * Vim engine for QiLing's single-line PromptInput.
 * Ported from CC's vim/transitions.ts + operators.ts, adapted for single-line terminal use.
 */

import {
  type VimState, type PersistentState, type CommandState,
  type Operator, type FindType, type TextObjScope,
  OPERATORS, SIMPLE_MOTIONS, FIND_KEYS, TEXT_OBJ_SCOPES, TEXT_OBJ_TYPES,
  createInitialVimState, createInitialPersistentState,
} from './types'
import { applyMotion, applyFind, isInclusiveMotion } from './motions'
import { findTextObject } from './textObjects'

export type { VimState, PersistentState }
export { createInitialVimState, createInitialPersistentState }

// ─── Operator context (dependency injection, avoids React coupling) ───────────

export interface VimEditContext {
  text: string
  cursor: number
  setText(t: string): void
  setCursor(n: number): void
  enterInsert(cursor?: number): void
  getRegister(): string
  setRegister(s: string): void
}

// ─── Delete / change / yank ───────────────────────────────────────────────────

function applyOperator(
  op: Operator,
  start: number,
  end: number,
  ctx: VimEditContext
): void {
  const { text } = ctx
  const s = Math.min(start, end)
  const e = Math.max(start, end)

  if (op === 'yank') {
    ctx.setRegister(text.slice(s, e))
    ctx.setCursor(s)
    return
  }

  ctx.setRegister(text.slice(s, e))
  const newText = text.slice(0, s) + text.slice(e)
  ctx.setText(newText)

  if (op === 'change') {
    ctx.enterInsert(s)
  } else {
    ctx.setCursor(Math.min(s, Math.max(0, newText.length - 1)))
  }
}

// ─── State machine: transition ────────────────────────────────────────────────

export interface TransitionResult {
  nextCommand: CommandState
  sideEffect?: (ctx: VimEditContext, persistent: PersistentState) => void
  enterInsert?: number | true  // offset or true = current
  switchToNormal?: boolean
}

export function transition(
  state: VimState,
  persistent: PersistentState,
  input: string,
  key: {
    escape?: boolean
    return?: boolean
    backspace?: boolean
    leftArrow?: boolean
    rightArrow?: boolean
    ctrl?: boolean
  }
): TransitionResult | null {
  if (state.mode === 'INSERT') return null  // handled outside

  const cmd = state.command
  const count = getCount(cmd)
  const op = getOp(cmd)

  // Escape: reset to idle (in normal mode)
  if (key.escape) {
    return { nextCommand: { type: 'idle' } }
  }

  // Arrow keys in normal mode
  if (key.leftArrow) input = 'h'
  if (key.rightArrow) input = 'l'

  // ── idle ─────────────────────────────────────────────────────────────────
  if (cmd.type === 'idle' || cmd.type === 'count') {
    // Count accumulation
    if (/^[1-9]$/.test(input) && cmd.type === 'idle') {
      return { nextCommand: { type: 'count', count: parseInt(input, 10) } }
    }
    if (/^[0-9]$/.test(input) && cmd.type === 'count' && input !== '0') {
      return { nextCommand: { type: 'count', count: cmd.count * 10 + parseInt(input, 10) } }
    }

    // Operators
    if (OPERATORS[input]) {
      const op = OPERATORS[input]!
      return { nextCommand: { type: 'operator', op } }
    }

    // Simple motions → execute immediately
    if (SIMPLE_MOTIONS.has(input)) {
      return {
        nextCommand: { type: 'idle' },
        sideEffect: (ctx) => {
          const newPos = applyMotion(input, ctx.text, ctx.cursor, count)
          ctx.setCursor(Math.max(0, Math.min(newPos, Math.max(0, ctx.text.length - 1))))
        },
      }
    }

    // Find keys
    if (FIND_KEYS.has(input)) {
      return { nextCommand: { type: 'find', findType: input as FindType } }
    }

    // Enter insert mode
    if (input === 'i') return { nextCommand: { type: 'idle' }, enterInsert: true }
    if (input === 'a') return { nextCommand: { type: 'idle' }, enterInsert: 1 }  // cursor+1
    if (input === 'A') return { nextCommand: { type: 'idle' }, enterInsert: 9999 }  // end
    if (input === 'I') return { nextCommand: { type: 'idle' }, enterInsert: -1 }  // start
    if (input === 'o') {
      return {
        nextCommand: { type: 'idle' },
        sideEffect: (ctx) => {
          ctx.setText(ctx.text)
          ctx.setCursor(ctx.text.length)
        },
        enterInsert: 9999,
      }
    }

    // x — delete char under cursor
    if (input === 'x') {
      return {
        nextCommand: { type: 'idle' },
        sideEffect: (ctx) => {
          const n = count
          const s = ctx.cursor
          const e = Math.min(s + n, ctx.text.length)
          ctx.setRegister(ctx.text.slice(s, e))
          const newText = ctx.text.slice(0, s) + ctx.text.slice(e)
          ctx.setText(newText)
          ctx.setCursor(Math.min(s, Math.max(0, newText.length - 1)))
        },
      }
    }

    // p — paste after cursor
    if (input === 'p') {
      return {
        nextCommand: { type: 'idle' },
        sideEffect: (ctx) => {
          const reg = ctx.getRegister()
          if (!reg) return
          const pos = Math.min(ctx.cursor + 1, ctx.text.length)
          const newText = ctx.text.slice(0, pos) + reg + ctx.text.slice(pos)
          ctx.setText(newText)
          ctx.setCursor(pos + reg.length - 1)
        },
      }
    }

    // P — paste before cursor
    if (input === 'P') {
      return {
        nextCommand: { type: 'idle' },
        sideEffect: (ctx) => {
          const reg = ctx.getRegister()
          if (!reg) return
          const pos = ctx.cursor
          const newText = ctx.text.slice(0, pos) + reg + ctx.text.slice(pos)
          ctx.setText(newText)
          ctx.setCursor(pos + reg.length - 1)
        },
      }
    }

    // r — replace char
    if (input === 'r') {
      return { nextCommand: { type: 'replace' } }
    }

    // ~ — toggle case
    if (input === '~') {
      return {
        nextCommand: { type: 'idle' },
        sideEffect: (ctx) => {
          const ch = ctx.text[ctx.cursor]
          if (!ch) return
          const toggled = ch === ch.toUpperCase() ? ch.toLowerCase() : ch.toUpperCase()
          ctx.setText(ctx.text.slice(0, ctx.cursor) + toggled + ctx.text.slice(ctx.cursor + 1))
          ctx.setCursor(Math.min(ctx.cursor + 1, Math.max(0, ctx.text.length - 1)))
        },
      }
    }

    // D — delete to end of line
    if (input === 'D') {
      return {
        nextCommand: { type: 'idle' },
        sideEffect: (ctx) => {
          ctx.setRegister(ctx.text.slice(ctx.cursor))
          ctx.setText(ctx.text.slice(0, ctx.cursor))
          ctx.setCursor(Math.max(0, ctx.cursor - 1))
        },
      }
    }

    // C — change to end of line
    if (input === 'C') {
      return {
        nextCommand: { type: 'idle' },
        sideEffect: (ctx) => {
          ctx.setRegister(ctx.text.slice(ctx.cursor))
          ctx.setText(ctx.text.slice(0, ctx.cursor))
        },
        enterInsert: true,
      }
    }

    // u — undo (no-op: history handled by REPL, just notify)
    // . — repeat last change (simplified: skip complex replay)
  }

  // ── find char ────────────────────────────────────────────────────────────
  if (cmd.type === 'find') {
    return {
      nextCommand: { type: 'idle' },
      sideEffect: (ctx, pers) => {
        const newPos = applyFind(cmd.findType, input, ctx.text, ctx.cursor, count)
        ctx.setCursor(Math.max(0, Math.min(newPos, Math.max(0, ctx.text.length - 1))))
        pers.lastFind = { type: cmd.findType, char: input }
      },
    }
  }

  // ── replace char ─────────────────────────────────────────────────────────
  if (cmd.type === 'replace') {
    return {
      nextCommand: { type: 'idle' },
      sideEffect: (ctx) => {
        if (!input || input.length !== 1) return
        ctx.setText(ctx.text.slice(0, ctx.cursor) + input + ctx.text.slice(ctx.cursor + 1))
      },
    }
  }

  // ── operator ─────────────────────────────────────────────────────────────
  if ((cmd.type === 'operator' || cmd.type === 'operatorCount') && op) {
    // dd/cc/yy — line operations (select all for single-line)
    if (input === op[0]) {
      return {
        nextCommand: { type: 'idle' },
        sideEffect: (ctx) => {
          applyOperator(op, 0, ctx.text.length, ctx)
        },
      }
    }

    // Simple motion after operator
    if (SIMPLE_MOTIONS.has(input)) {
      return {
        nextCommand: { type: 'idle' },
        sideEffect: (ctx) => {
          const c = count
          const endRaw = applyMotion(input, ctx.text, ctx.cursor, c)
          const end = isInclusiveMotion(input) ? Math.min(endRaw + 1, ctx.text.length) : endRaw
          const start = ctx.cursor
          applyOperator(op, Math.min(start, end), Math.max(start, end), ctx)
        },
      }
    }

    // Find after operator
    if (FIND_KEYS.has(input)) {
      return { nextCommand: { type: 'operatorFind', op, findType: input as FindType } }
    }

    // Text object scope (i/a)
    if (TEXT_OBJ_SCOPES[input]) {
      return { nextCommand: { type: 'operatorTextObj', op, scope: TEXT_OBJ_SCOPES[input]! } }
    }

    // Count digit after operator
    if (/^[1-9]$/.test(input) && cmd.type === 'operator') {
      return { nextCommand: { type: 'operatorCount', op, count: parseInt(input, 10) } }
    }
  }

  // ── operatorFind ─────────────────────────────────────────────────────────
  if (cmd.type === 'operatorFind' && op) {
    return {
      nextCommand: { type: 'idle' },
      sideEffect: (ctx) => {
        const endRaw = applyFind(cmd.findType, input, ctx.text, ctx.cursor, count)
        const end = (cmd.findType === 'f' || cmd.findType === 't') ? endRaw + 1 : endRaw
        const start = ctx.cursor
        applyOperator(op, Math.min(start, end), Math.max(start, end), ctx)
      },
    }
  }

  // ── operatorTextObj ───────────────────────────────────────────────────────
  if (cmd.type === 'operatorTextObj' && op) {
    if (TEXT_OBJ_TYPES.has(input)) {
      return {
        nextCommand: { type: 'idle' },
        sideEffect: (ctx) => {
          const range = findTextObject(input, cmd.scope, ctx.text, ctx.cursor)
          if (!range) return
          applyOperator(op, range.start, range.end, ctx)
        },
      }
    }
  }

  return null  // unrecognised input — stay in current state
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCount(cmd: CommandState): number {
  if (cmd.type === 'count') return cmd.count
  if (cmd.type === 'operatorCount') return cmd.count
  return 1
}

function getOp(cmd: CommandState): Operator | null {
  if (cmd.type === 'operator') return cmd.op
  if (cmd.type === 'operatorCount') return cmd.op
  if (cmd.type === 'operatorFind') return cmd.op
  if (cmd.type === 'operatorTextObj') return cmd.op
  if (cmd.type === 'operatorG') return cmd.op
  return null
}
