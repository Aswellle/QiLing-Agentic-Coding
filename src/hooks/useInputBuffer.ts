/**
 * Input undo buffer hook — adapted from CC's hooks/useInputBuffer.ts
 *
 * Maintains a debounced history of text input states for undo (ctrl+z).
 * Max buffer size and debounce interval are configurable.
 * Calls to pushToBuffer within debounceMs are coalesced into one entry.
 */

import { useCallback, useRef, useState } from 'react'

export type PastedContent = {
  type: 'image' | 'text'
  content: string
  mimeType?: string
}

export type BufferEntry = {
  text: string
  cursorOffset: number
  pastedContents: Record<number, PastedContent>
  timestamp: number
}

export type UseInputBufferProps = {
  maxBufferSize: number
  debounceMs: number
}

export type UseInputBufferResult = {
  pushToBuffer: (text: string, cursorOffset: number, pastedContents?: Record<number, PastedContent>) => void
  undo: () => BufferEntry | undefined
  canUndo: boolean
  clearBuffer: () => void
}

export function useInputBuffer({ maxBufferSize, debounceMs }: UseInputBufferProps): UseInputBufferResult {
  const [buffer, setBuffer] = useState<BufferEntry[]>([])
  const [currentIndex, setCurrentIndex] = useState(-1)
  const lastPushTime = useRef<number>(0)
  const pendingPush = useRef<ReturnType<typeof setTimeout> | null>(null)

  const pushToBuffer = useCallback(
    (text: string, cursorOffset: number, pastedContents: Record<number, PastedContent> = {}) => {
      const now = Date.now()

      if (pendingPush.current) { clearTimeout(pendingPush.current); pendingPush.current = null }

      if (now - lastPushTime.current < debounceMs) {
        pendingPush.current = setTimeout(pushToBuffer, debounceMs, text, cursorOffset, pastedContents)
        return
      }

      lastPushTime.current = now

      setBuffer(prevBuffer => {
        const newBuffer = currentIndex >= 0 ? prevBuffer.slice(0, currentIndex + 1) : prevBuffer
        const lastEntry = newBuffer[newBuffer.length - 1]
        if (lastEntry && lastEntry.text === text) return newBuffer
        const updated = [...newBuffer, { text, cursorOffset, pastedContents, timestamp: now }]
        return updated.length > maxBufferSize ? updated.slice(-maxBufferSize) : updated
      })

      setCurrentIndex(prev => Math.min(prev >= 0 ? prev + 1 : buffer.length, maxBufferSize - 1))
    },
    [debounceMs, maxBufferSize, currentIndex, buffer.length],
  )

  const undo = useCallback((): BufferEntry | undefined => {
    if (currentIndex < 0 || buffer.length === 0) return undefined
    const targetIndex = Math.max(0, currentIndex - 1)
    const entry = buffer[targetIndex]
    if (entry) { setCurrentIndex(targetIndex); return entry }
    return undefined
  }, [buffer, currentIndex])

  const clearBuffer = useCallback(() => {
    setBuffer([]); setCurrentIndex(-1); lastPushTime.current = 0
    if (pendingPush.current) { clearTimeout(pendingPush.current); pendingPush.current = null }
  }, [])

  return {
    pushToBuffer,
    undo,
    canUndo: currentIndex > 0 && buffer.length > 1,
    clearBuffer,
  }
}
