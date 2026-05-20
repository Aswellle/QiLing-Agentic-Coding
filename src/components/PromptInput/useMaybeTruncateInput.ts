/**
 * Input truncation hook — adapted from CC's components/PromptInput/useMaybeTruncateInput.ts
 *
 * Truncates inputs longer than 10KB to prevent accidentally sending huge pastes.
 * Applies once per input value and resets when input is cleared.
 */

import { useEffect, useState } from 'react'
import type { PastedContent } from '../../hooks/useInputBuffer.js'
import { maybeTruncateInput } from './inputPaste.js'

type Props = {
  input: string
  pastedContents: Record<number, PastedContent>
  onInputChange: (input: string) => void
  setCursorOffset: (offset: number) => void
  setPastedContents: (contents: Record<number, PastedContent>) => void
}

export function useMaybeTruncateInput({ input, pastedContents, onInputChange, setCursorOffset, setPastedContents }: Props) {
  const [hasAppliedTruncation, setHasAppliedTruncation] = useState(false)

  useEffect(() => {
    if (hasAppliedTruncation || input.length <= 10_000) return
    const { newInput, newPastedContents } = maybeTruncateInput(input, pastedContents)
    onInputChange(newInput); setCursorOffset(newInput.length); setPastedContents(newPastedContents)
    setHasAppliedTruncation(true)
  }, [input, hasAppliedTruncation, pastedContents, onInputChange, setPastedContents, setCursorOffset])

  useEffect(() => {
    if (input === '') setHasAppliedTruncation(false)
  }, [input])
}
