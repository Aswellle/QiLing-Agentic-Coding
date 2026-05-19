/**
 * Keybinding config validator — adapted from CC's keybindings/validate.ts
 *
 * Validates user keybinding configuration (keybindings.json) for:
 * - Parse errors (bad JSON, wrong types, empty keys)
 * - Invalid context names
 * - Duplicate bindings within same context
 * - Reserved shortcuts (Ctrl+C, Ctrl+D, OS shortcuts)
 * - Command binding format and context constraints
 */

import { chordToDisplayString, parseChord, parseKeystroke } from './parser.js'
import { getReservedShortcuts, normalizeKeyForComparison } from './reservedShortcuts.js'
import type { KeybindingBlock, KeybindingContextName, ParsedBinding } from './types.js'

export type KeybindingWarningType = 'parse_error' | 'duplicate' | 'reserved' | 'invalid_context' | 'invalid_action'

export type KeybindingWarning = {
  type: KeybindingWarningType
  severity: 'error' | 'warning'
  message: string
  key?: string
  context?: string
  action?: string
  suggestion?: string
}

function isKeybindingBlock(obj: unknown): obj is KeybindingBlock {
  if (typeof obj !== 'object' || obj === null) return false
  const b = obj as Record<string, unknown>
  return typeof b.context === 'string' && typeof b.bindings === 'object' && b.bindings !== null
}

function isKeybindingBlockArray(arr: unknown): arr is KeybindingBlock[] {
  return Array.isArray(arr) && arr.every(isKeybindingBlock)
}

const VALID_CONTEXTS: KeybindingContextName[] = [
  'Global', 'Chat', 'Autocomplete', 'Confirmation', 'Help', 'Transcript',
  'HistorySearch', 'Task', 'ThemePicker', 'Settings', 'Tabs',
  'Attachments', 'Footer', 'MessageSelector', 'DiffDialog', 'ModelPicker', 'Select', 'Plugin',
]

function isValidContext(value: string): value is KeybindingContextName {
  return (VALID_CONTEXTS as readonly string[]).includes(value)
}

function validateKeystroke(keystroke: string): KeybindingWarning | null {
  for (const part of keystroke.toLowerCase().split('+')) {
    if (!part.trim()) {
      return { type: 'parse_error', severity: 'error', message: `Empty key part in "${keystroke}"`, key: keystroke, suggestion: 'Remove extra "+" characters' }
    }
  }
  const parsed = parseKeystroke(keystroke)
  if (!parsed.key && !parsed.ctrl && !parsed.alt && !parsed.shift && !parsed.meta) {
    return { type: 'parse_error', severity: 'error', message: `Could not parse keystroke "${keystroke}"`, key: keystroke }
  }
  return null
}

function validateBlock(block: unknown, blockIndex: number): KeybindingWarning[] {
  const warnings: KeybindingWarning[] = []
  if (typeof block !== 'object' || block === null) {
    warnings.push({ type: 'parse_error', severity: 'error', message: `Keybinding block ${blockIndex + 1} is not an object` })
    return warnings
  }
  const b = block as Record<string, unknown>

  let contextName: string | undefined
  const rawContext = b.context
  if (typeof rawContext !== 'string') {
    warnings.push({ type: 'parse_error', severity: 'error', message: `Keybinding block ${blockIndex + 1} missing "context" field` })
  } else if (!isValidContext(rawContext)) {
    warnings.push({ type: 'invalid_context', severity: 'error', message: `Unknown context "${rawContext}"`, context: rawContext, suggestion: `Valid contexts: ${VALID_CONTEXTS.join(', ')}` })
  } else {
    contextName = rawContext
  }

  if (typeof b.bindings !== 'object' || b.bindings === null) {
    warnings.push({ type: 'parse_error', severity: 'error', message: `Keybinding block ${blockIndex + 1} missing "bindings" field` })
    return warnings
  }

  for (const [key, action] of Object.entries(b.bindings as Record<string, unknown>)) {
    const keyError = validateKeystroke(key)
    if (keyError) { keyError.context = contextName; warnings.push(keyError) }

    if (action !== null && typeof action !== 'string') {
      warnings.push({ type: 'invalid_action', severity: 'error', message: `Invalid action for "${key}": must be a string or null`, key, context: contextName })
    } else if (typeof action === 'string' && action.startsWith('command:')) {
      if (!/^command:[a-zA-Z0-9:\-_]+$/.test(action)) {
        warnings.push({ type: 'invalid_action', severity: 'warning', message: `Invalid command binding "${action}" for "${key}"`, key, context: contextName, action })
      }
      if (contextName && contextName !== 'Chat') {
        warnings.push({ type: 'invalid_action', severity: 'warning', message: `Command binding "${action}" must be in "Chat" context`, key, context: contextName, action, suggestion: 'Move this binding to a block with "context": "Chat"' })
      }
    }
  }
  return warnings
}

export function checkDuplicateKeysInJson(jsonString: string): KeybindingWarning[] {
  const warnings: KeybindingWarning[] = []
  const bindingsBlockPattern = /"bindings"\s*:\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g
  let blockMatch
  while ((blockMatch = bindingsBlockPattern.exec(jsonString)) !== null) {
    const blockContent = blockMatch[1]
    if (!blockContent) continue
    const textBeforeBlock = jsonString.slice(0, blockMatch.index)
    const contextMatch = textBeforeBlock.match(/"context"\s*:\s*"([^"]+)"[^{]*$/)
    const context = contextMatch?.[1] ?? 'unknown'
    const keyPattern = /"([^"]+)"\s*:/g
    const keysByName = new Map<string, number>()
    let keyMatch
    while ((keyMatch = keyPattern.exec(blockContent)) !== null) {
      const key = keyMatch[1]
      if (!key) continue
      const count = (keysByName.get(key) ?? 0) + 1
      keysByName.set(key, count)
      if (count === 2) {
        warnings.push({ type: 'duplicate', severity: 'warning', message: `Duplicate key "${key}" in ${context} bindings`, key, context, suggestion: 'JSON uses the last value, earlier values are ignored.' })
      }
    }
  }
  return warnings
}

export function validateUserConfig(userBlocks: unknown): KeybindingWarning[] {
  const warnings: KeybindingWarning[] = []
  if (!Array.isArray(userBlocks)) {
    warnings.push({ type: 'parse_error', severity: 'error', message: 'keybindings.json must contain an array', suggestion: 'Wrap your bindings in [ ]' })
    return warnings
  }
  for (let i = 0; i < userBlocks.length; i++) warnings.push(...validateBlock(userBlocks[i], i))
  return warnings
}

export function checkDuplicates(blocks: KeybindingBlock[]): KeybindingWarning[] {
  const warnings: KeybindingWarning[] = []
  const seenByContext = new Map<string, Map<string, string>>()
  for (const block of blocks) {
    const contextMap = seenByContext.get(block.context) ?? new Map<string, string>()
    seenByContext.set(block.context, contextMap)
    for (const [key, action] of Object.entries(block.bindings)) {
      const normalizedKey = normalizeKeyForComparison(key)
      const existingAction = contextMap.get(normalizedKey)
      if (existingAction && existingAction !== action) {
        warnings.push({ type: 'duplicate', severity: 'warning', message: `Duplicate binding "${key}" in ${block.context} context`, key, context: block.context, action: action ?? 'null (unbind)', suggestion: `Previously bound to "${existingAction}". Only the last binding will be used.` })
      }
      contextMap.set(normalizedKey, action ?? 'null')
    }
  }
  return warnings
}

export function checkReservedShortcuts(bindings: ParsedBinding[]): KeybindingWarning[] {
  const warnings: KeybindingWarning[] = []
  const reserved = getReservedShortcuts()
  for (const binding of bindings) {
    const keyDisplay = chordToDisplayString(binding.chord)
    const normalizedKey = normalizeKeyForComparison(keyDisplay)
    for (const res of reserved) {
      if (normalizeKeyForComparison(res.key) === normalizedKey) {
        warnings.push({ type: 'reserved', severity: res.severity, message: `"${keyDisplay}" may not work: ${res.reason}`, key: keyDisplay, context: binding.context, action: binding.action ?? undefined })
      }
    }
  }
  return warnings
}

function getUserBindingsForValidation(userBlocks: KeybindingBlock[]): ParsedBinding[] {
  const bindings: ParsedBinding[] = []
  for (const block of userBlocks) {
    for (const [key, action] of Object.entries(block.bindings)) {
      const chord = key.split(' ').map(k => parseKeystroke(k))
      bindings.push({ chord, action, context: block.context })
    }
  }
  return bindings
}

export function validateBindings(userBlocks: unknown, _parsedBindings: ParsedBinding[]): KeybindingWarning[] {
  const warnings: KeybindingWarning[] = []
  warnings.push(...validateUserConfig(userBlocks))
  if (isKeybindingBlockArray(userBlocks)) {
    warnings.push(...checkDuplicates(userBlocks))
    warnings.push(...checkReservedShortcuts(getUserBindingsForValidation(userBlocks)))
  }
  const seen = new Set<string>()
  return warnings.filter(w => {
    const key = `${w.type}:${w.key}:${w.context}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function formatWarning(warning: KeybindingWarning): string {
  const icon = warning.severity === 'error' ? '✗' : '⚠'
  let msg = `${icon} Keybinding ${warning.severity}: ${warning.message}`
  if (warning.suggestion) msg += `\n  ${warning.suggestion}`
  return msg
}

export function formatWarnings(warnings: KeybindingWarning[]): string {
  if (warnings.length === 0) return ''
  const errors = warnings.filter(w => w.severity === 'error')
  const warns = warnings.filter(w => w.severity === 'warning')
  const lines: string[] = []
  if (errors.length > 0) {
    lines.push(`Found ${errors.length} keybinding ${errors.length === 1 ? 'error' : 'errors'}:`)
    for (const e of errors) lines.push(formatWarning(e))
  }
  if (warns.length > 0) {
    if (lines.length > 0) lines.push('')
    lines.push(`Found ${warns.length} keybinding ${warns.length === 1 ? 'warning' : 'warnings'}:`)
    for (const w of warns) lines.push(formatWarning(w))
  }
  return lines.join('\n')
}
