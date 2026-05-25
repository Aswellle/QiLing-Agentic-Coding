/**
 * Input paste handling — adapted from CC's components/PromptInput/inputPaste.ts
 */

import type { PastedContent } from '../../hooks/useInputBuffer.js'

const TRUNCATION_THRESHOLD = 10000
const PREVIEW_LENGTH = 1000

type TruncatedMessage = {
  truncatedText: string
  placeholderContent: string
}

// FROM CC: getPastedTextRefNumLines — counts newlines (not lines); "line1\nline2" = 1, not 2
function getPastedTextRefNumLines(text: string): number {
  return (text.match(/\r\n|\r|\n/g) || []).length
}

function formatTruncatedTextRef(id: number, numLines: number): string {
  return `[...Truncated text #${id} +${numLines} lines...]`
}

// FROM CC: maybeTruncateMessageForInput — keeps start+end PREVIEW_LENGTH/2 chars, inserts placeholder
export function maybeTruncateMessageForInput(
  text: string,
  nextPasteId: number,
): TruncatedMessage {
  if (text.length <= TRUNCATION_THRESHOLD) {
    return { truncatedText: text, placeholderContent: '' }
  }

  const startLength = Math.floor(PREVIEW_LENGTH / 2)
  const endLength = Math.floor(PREVIEW_LENGTH / 2)

  const startText = text.slice(0, startLength)
  const endText = text.slice(-endLength)

  const placeholderContent = text.slice(startLength, -endLength)
  const truncatedLines = getPastedTextRefNumLines(placeholderContent)
  const placeholderRef = formatTruncatedTextRef(nextPasteId, truncatedLines)

  return {
    truncatedText: startText + placeholderRef + endText,
    placeholderContent,
  }
}

export function maybeTruncateInput(
  input: string,
  pastedContents: Record<number, PastedContent>,
): { newInput: string; newPastedContents: Record<number, PastedContent> } {
  const existingIds = Object.keys(pastedContents).map(Number)
  const nextPasteId = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1

  const { truncatedText, placeholderContent } = maybeTruncateMessageForInput(
    input,
    nextPasteId,
  )

  if (!placeholderContent) {
    return { newInput: input, newPastedContents: pastedContents }
  }

  return {
    newInput: truncatedText,
    newPastedContents: {
      ...pastedContents,
      [nextPasteId]: {
        type: 'text',
        content: placeholderContent,
      },
    },
  }
}
