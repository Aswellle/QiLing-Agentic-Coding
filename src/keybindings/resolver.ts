import type { Key } from 'ink'
import { getKeyName, matchesKeystroke } from './match'
import { chordToDisplayString, parseKeystroke } from './parser'
import type { KeybindingContextName, ParsedBinding, ParsedKeystroke } from './types'

/**
 * Chord state tracks an in-progress multi-keystroke sequence.
 * When null, no chord is in progress.
 */
export interface ChordState {
  /** Keystrokes pressed so far in the current chord sequence */
  pressed: ParsedKeystroke[]
  /** All bindings that are still possible completions of the current chord */
  candidates: ParsedBinding[]
}

/**
 * Result of resolving a keypress.
 */
export interface ResolveResult {
  /** The matched action name, or null if explicitly unbound, or undefined if no match */
  action: string | null | undefined
  /** Updated chord state — null means chord was consumed or never started */
  chordState: ChordState | null
  /** True when we consumed the keypress to advance a chord but haven't resolved yet */
  chordAdvanced: boolean
}

/**
 * Check if two parsed keystrokes are equal.
 */
export function keystrokesEqual(a: ParsedKeystroke, b: ParsedKeystroke): boolean {
  return (
    a.key === b.key &&
    a.ctrl === b.ctrl &&
    a.alt === b.alt &&
    a.shift === b.shift &&
    a.meta === b.meta &&
    a.super === b.super
  )
}

/**
 * Resolve a keypress to an action given a list of contexts (in priority order)
 * and a flat list of all parsed bindings.
 *
 * Contexts are checked in order: the first context that has a binding for the
 * key wins. 'Global' bindings act as a fallback for all contexts.
 *
 * User-defined bindings (appended after defaults) take priority via last-wins
 * within the same context — we scan in reverse order.
 *
 * Returns the matched action (string), null (explicitly unbound), or undefined
 * (no match found).
 */
export function resolveKey(
  input: string,
  key: Key,
  contexts: KeybindingContextName[],
  allBindings: ParsedBinding[],
): string | null | undefined {
  const { action } = resolveKeyWithChordState(input, key, contexts, allBindings, null)
  return action
}

/**
 * Resolve a keypress with support for multi-keystroke chord sequences.
 *
 * Pass the current `chordState` (or null if none active). Returns a
 * `ResolveResult` with the resolved action and updated chord state.
 *
 * Usage:
 * ```
 * const [chordState, setChordState] = useState<ChordState | null>(null)
 *
 * useInput((input, key) => {
 *   const result = resolveKeyWithChordState(input, key, ['Chat', 'Global'], bindings, chordState)
 *   setChordState(result.chordState)
 *   if (result.action !== undefined) {
 *     dispatch(result.action)
 *   }
 * })
 * ```
 */
export function resolveKeyWithChordState(
  input: string,
  key: Key,
  contexts: KeybindingContextName[],
  allBindings: ParsedBinding[],
  currentChordState: ChordState | null,
): ResolveResult {
  const keyName = getKeyName(input, key)

  // If we can't identify the key at all, clear any chord and return no match
  if (!keyName) {
    return { action: undefined, chordState: null, chordAdvanced: false }
  }

  // Build the current keystroke
  let currentKeystroke: ParsedKeystroke
  try {
    // Reconstruct from ink key — build canonical form
    const parts: string[] = []
    if (key.ctrl) parts.push('ctrl')
    if (key.shift) parts.push('shift')
    if (key.meta) parts.push('alt')  // Ink uses meta for alt
    parts.push(keyName)
    currentKeystroke = parseKeystroke(parts.join('+'))
  } catch {
    return { action: undefined, chordState: null, chordAdvanced: false }
  }

  // Determine which contexts to search (always include Global as fallback)
  const searchContexts = new Set<KeybindingContextName>([...contexts, 'Global'])

  // Filter bindings to relevant contexts only
  const relevantBindings = allBindings.filter(b => searchContexts.has(b.context))

  if (currentChordState !== null) {
    // We are in the middle of a chord sequence
    const newPressed = [...currentChordState.pressed, currentKeystroke]

    // Filter candidates that match the new pressed sequence so far
    const newCandidates = currentChordState.candidates.filter(binding => {
      if (binding.chord.length < newPressed.length) return false
      return newPressed.every((ks, i) => keystrokesEqual(ks, binding.chord[i]!))
    })

    if (newCandidates.length === 0) {
      // No matches — chord sequence broken, clear state
      return { action: undefined, chordState: null, chordAdvanced: false }
    }

    // Check for exact full matches
    const fullMatches = newCandidates.filter(b => b.chord.length === newPressed.length)

    if (fullMatches.length > 0) {
      // Resolve among full matches using last-wins within context priority
      const action = resolveAmongMatches(fullMatches, contexts)
      return { action, chordState: null, chordAdvanced: false }
    }

    // Partial match — chord is still in progress
    return {
      action: undefined,
      chordState: { pressed: newPressed, candidates: newCandidates },
      chordAdvanced: true,
    }
  }

  // No active chord — find all single-keystroke matches and chord starters
  const singleMatches: ParsedBinding[] = []
  const chordStarters: ParsedBinding[] = []

  for (const binding of relevantBindings) {
    if (binding.chord.length === 0) continue

    const firstKs = binding.chord[0]!
    if (!matchesKeystroke(input, key, firstKs)) continue

    if (binding.chord.length === 1) {
      singleMatches.push(binding)
    } else {
      chordStarters.push(binding)
    }
  }

  // If there are chord starters, prefer starting a chord over single matches
  // (chord bindings take priority when the first key is ambiguous)
  if (chordStarters.length > 0) {
    return {
      action: undefined,
      chordState: {
        pressed: [currentKeystroke],
        candidates: [...singleMatches, ...chordStarters],
      },
      chordAdvanced: true,
    }
  }

  if (singleMatches.length === 0) {
    return { action: undefined, chordState: null, chordAdvanced: false }
  }

  const action = resolveAmongMatches(singleMatches, contexts)
  return { action, chordState: null, chordAdvanced: false }
}

/**
 * Among a set of full-match bindings, pick the winner using context priority
 * (first context in the array wins) and last-wins within the same context.
 */
function resolveAmongMatches(
  matches: ParsedBinding[],
  contextPriority: KeybindingContextName[],
): string | null | undefined {
  // Build priority map: lower index = higher priority
  const priorityMap = new Map<KeybindingContextName, number>()
  contextPriority.forEach((ctx, i) => priorityMap.set(ctx, i))
  // Global is always lowest priority (falls after all named contexts)
  if (!priorityMap.has('Global')) {
    priorityMap.set('Global', contextPriority.length)
  }

  // Sort by context priority ascending, then by index descending (last-wins within context)
  // We need original indices to implement last-wins, so we track them
  const indexed = matches.map((b, i) => ({ b, i }))
  indexed.sort((a, b) => {
    const aPriority = priorityMap.get(a.b.context) ?? 999
    const bPriority = priorityMap.get(b.b.context) ?? 999
    if (aPriority !== bPriority) return aPriority - bPriority
    // Same context: higher original index wins (last definition wins)
    return b.i - a.i
  })

  const winner = indexed[0]
  if (!winner) return undefined
  return winner.b.action  // string | null (null = explicitly unbound)
}

/**
 * Get a human-readable display text for a binding's chord.
 * Returns the first binding in the given contexts that matches the action.
 */
export function getBindingDisplayText(
  action: string,
  contexts: KeybindingContextName[],
  allBindings: ParsedBinding[],
  platform?: string,
): string | undefined {
  const searchContexts = new Set<KeybindingContextName>([...contexts, 'Global'])

  // Find the first binding for this action in the given contexts
  for (const ctx of [...contexts, 'Global' as KeybindingContextName]) {
    if (!searchContexts.has(ctx)) continue
    // Scan in reverse for last-wins
    for (let i = allBindings.length - 1; i >= 0; i--) {
      const b = allBindings[i]!
      if (b.context === ctx && b.action === action) {
        return chordToDisplayString(b.chord, platform)
      }
    }
  }
  return undefined
}
