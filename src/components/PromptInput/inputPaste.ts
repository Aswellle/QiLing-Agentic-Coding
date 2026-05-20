/**
 * Input paste handling — adapted from CC's components/PromptInput/inputPaste.ts
 *
 * maybeTruncateInput: truncates large paste content (>10KB) to avoid
 * sending massive inputs to the model accidentally.
 */

import type { PastedContent } from '../../hooks/useInputBuffer.js'

export function maybeTruncateInput(
  input: string,
  pastedContents: Record<number, PastedContent>,
): { newInput: string; newPastedContents: Record<number, PastedContent> } {
  const MAX_INPUT_CHARS = 10_000
  if (input.length <= MAX_INPUT_CHARS) return { newInput: input, newPastedContents: pastedContents }
  return { newInput: input.slice(0, MAX_INPUT_CHARS) + '…', newPastedContents: pastedContents }
}
