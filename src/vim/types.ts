// Vim state machine types — ported from CC's vim/types.ts

export type VimMode = 'INSERT' | 'NORMAL'

// ─── Command state (Normal-mode parsing) ─────────────────────────────────────

export type Operator = 'delete' | 'change' | 'yank'

export type FindType = 'f' | 'F' | 't' | 'T'

export type TextObjScope = 'inner' | 'around'

export type SimpleMotion =
  | 'h' | 'l' | 'w' | 'b' | 'e' | 'W' | 'B' | 'E'
  | '0' | '^' | '$'

export const OPERATORS: Record<string, Operator> = {
  d: 'delete', c: 'change', y: 'yank',
}

export const SIMPLE_MOTIONS = new Set<string>(['h','l','w','b','e','W','B','E','0','^','$'])
export const FIND_KEYS = new Set<string>(['f','F','t','T'])
export const TEXT_OBJ_TYPES = new Set<string>(['w','W','"',"'",'`','(',')','{','}','[',']','<','>','B'])
export const TEXT_OBJ_SCOPES: Record<string, TextObjScope> = { i: 'inner', a: 'around' }

export type CommandState =
  | { type: 'idle' }
  | { type: 'count'; count: number }
  | { type: 'operator'; op: Operator }
  | { type: 'operatorCount'; op: Operator; count: number }
  | { type: 'find'; findType: FindType }
  | { type: 'operatorFind'; op: Operator; findType: FindType }
  | { type: 'operatorTextObj'; op: Operator; scope: TextObjScope }
  | { type: 'replace' }
  | { type: 'g' }
  | { type: 'operatorG'; op: Operator }

export interface VimState {
  mode: VimMode
  command: CommandState
  insertedText: string  // for . repeat
}

export interface PersistentState {
  lastChange: RecordedChange | null
  lastFind: { type: FindType; char: string } | null
  register: string
  registerIsLinewise: boolean
}

export type RecordedChange =
  | { type: 'insert'; text: string }
  | { type: 'x'; count: number }
  | { type: 'replace'; char: string }
  | { type: 'operatorMotion'; op: Operator; motion: string; count: number }
  | { type: 'operatorTextObj'; op: Operator; objType: string; scope: TextObjScope; count: number }
  | { type: 'operatorFind'; op: Operator; find: FindType; char: string; count: number }

export function createInitialVimState(): VimState {
  return { mode: 'INSERT', command: { type: 'idle' }, insertedText: '' }
}

export function createInitialPersistentState(): PersistentState {
  return { lastChange: null, lastFind: null, register: '', registerIsLinewise: false }
}
