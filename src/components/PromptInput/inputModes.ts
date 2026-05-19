/**
 * PromptInput mode utilities — adapted from CC's components/PromptInput/inputModes.ts
 *
 * Handles the ! prefix for bash mode in the prompt input.
 * When the user types ! at the start of a prompt, it enters bash mode.
 */

export type PromptMode = 'prompt' | 'bash'

/** Prepend the mode character (!) to input when in bash mode. */
export function prependModeCharacterToInput(
  input: string,
  mode: PromptMode,
): string {
  switch (mode) {
    case 'bash': return `!${input}`
    default:     return input
  }
}

/** Detect the input mode from the leading character. */
export function getModeFromInput(input: string): PromptMode {
  if (input.startsWith('!')) return 'bash'
  return 'prompt'
}

/** Get the actual content without the mode prefix character. */
export function getValueFromInput(input: string): string {
  const mode = getModeFromInput(input)
  if (mode === 'prompt') return input
  return input.slice(1)
}

/** True when input is just the mode character (! only). */
export function isInputModeCharacter(input: string): boolean {
  return input === '!'
}
