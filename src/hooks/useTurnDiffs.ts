/**
 * Turn-based diff accumulator — adapted from CC's hooks/useTurnDiffs.ts
 *
 * Processes messages to extract per-turn file edit diffs. Each turn is a user
 * prompt + assistant responses. Incremental: only processes new messages since
 * last render. Resets if messages shrink (rewind).
 */

import type { StructuredPatchHunk } from 'diff'
import { useMemo, useRef } from 'react'
import type { Message } from '../types/message.js'

export type TurnFileDiff = {
  filePath: string
  hunks: StructuredPatchHunk[]
  isNewFile: boolean
  linesAdded: number
  linesRemoved: number
}

export type TurnDiff = {
  turnIndex: number
  userPromptPreview: string
  timestamp: string
  files: Map<string, TurnFileDiff>
  stats: { filesChanged: number; linesAdded: number; linesRemoved: number }
}

type TurnDiffCache = {
  completedTurns: TurnDiff[]
  currentTurn: TurnDiff | null
  lastProcessedIndex: number
  lastTurnIndex: number
}

type FileEditResult = {
  filePath: string
  structuredPatch: StructuredPatchHunk[] | readonly StructuredPatchHunk[]
  type?: 'create' | 'update'
  content?: string
}

function isFileEditResult(result: unknown): result is FileEditResult {
  if (!result || typeof result !== 'object') return false
  const r = result as Record<string, unknown>
  return typeof r.filePath === 'string' && (Array.isArray(r.structuredPatch) || r.type === 'create')
}

function countHunkLines(hunks: StructuredPatchHunk[]): { added: number; removed: number } {
  let added = 0, removed = 0
  for (const hunk of hunks) {
    for (const line of hunk.lines) {
      if (line.startsWith('+')) added++
      else if (line.startsWith('-')) removed++
    }
  }
  return { added, removed }
}

function getUserPromptPreview(message: Message): string {
  if (message.role !== 'user') return ''
  const content = typeof message.content === 'string' ? message.content : ''
  return content.length <= 30 ? content : content.slice(0, 29) + '…'
}

function computeTurnStats(turn: TurnDiff): void {
  let totalAdded = 0, totalRemoved = 0
  for (const file of turn.files.values()) { totalAdded += file.linesAdded; totalRemoved += file.linesRemoved }
  turn.stats = { filesChanged: turn.files.size, linesAdded: totalAdded, linesRemoved: totalRemoved }
}

export function useTurnDiffs(messages: Message[]): TurnDiff[] {
  const cache = useRef<TurnDiffCache>({ completedTurns: [], currentTurn: null, lastProcessedIndex: 0, lastTurnIndex: 0 })

  return useMemo(() => {
    const c = cache.current
    if (messages.length < c.lastProcessedIndex) {
      c.completedTurns = []; c.currentTurn = null; c.lastProcessedIndex = 0; c.lastTurnIndex = 0
    }

    for (let i = c.lastProcessedIndex; i < messages.length; i++) {
      const message = messages[i]
      if (!message || message.role !== 'user') continue

      const msgContent = message.content
      const isToolResult = Array.isArray(msgContent) && msgContent[0]?.type === 'tool_result'

      if (!isToolResult) {
        if (c.currentTurn && c.currentTurn.files.size > 0) {
          computeTurnStats(c.currentTurn)
          c.completedTurns.push(c.currentTurn)
        }
        c.lastTurnIndex++
        c.currentTurn = {
          turnIndex: c.lastTurnIndex,
          userPromptPreview: getUserPromptPreview(message),
          timestamp: new Date().toISOString(),
          files: new Map(),
          stats: { filesChanged: 0, linesAdded: 0, linesRemoved: 0 },
        }
      } else if (c.currentTurn && Array.isArray(msgContent)) {
        for (const block of msgContent) {
          if (block.type !== 'tool_result') continue
          const content = block.content
          const result = typeof content === 'string' ? null : Array.isArray(content) ? null : content
          if (!isFileEditResult(result)) continue
          const { filePath, structuredPatch, type } = result
          const fileContent = (result as FileEditResult & { content?: string }).content
          let fileEntry = c.currentTurn.files.get(filePath)
          if (!fileEntry) {
            fileEntry = { filePath, hunks: [], isNewFile: type === 'create', linesAdded: 0, linesRemoved: 0 }
            c.currentTurn.files.set(filePath, fileEntry)
          }
          const patchArr = Array.from(structuredPatch)
          if (type === 'create' && patchArr.length === 0 && typeof fileContent === 'string') {
            const lines = fileContent.split('\n')
            fileEntry.hunks.push({ oldStart: 0, oldLines: 0, newStart: 1, newLines: lines.length, lines: lines.map((l: string) => '+' + l) })
            fileEntry.linesAdded += lines.length
          } else {
            fileEntry.hunks.push(...patchArr as StructuredPatchHunk[])
            const { added, removed } = countHunkLines(patchArr as StructuredPatchHunk[])
            fileEntry.linesAdded += added; fileEntry.linesRemoved += removed
          }
          if (type === 'create') fileEntry.isNewFile = true
        }
      }
    }

    c.lastProcessedIndex = messages.length
    const result = [...c.completedTurns]
    if (c.currentTurn && c.currentTurn.files.size > 0) {
      computeTurnStats(c.currentTurn)
      result.push(c.currentTurn)
    }
    return result.reverse()
  }, [messages])
}
