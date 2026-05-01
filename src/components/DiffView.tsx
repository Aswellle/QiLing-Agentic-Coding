import React from 'react'
import { Box, Text } from 'ink'

interface Props {
  filePath: string
  oldStr: string
  newStr: string
  maxLines?: number
}

interface DiffLine {
  type: 'context' | 'removed' | 'added'
  text: string
}

function computeLineDiff(oldStr: string, newStr: string): DiffLine[] {
  const oldLines = oldStr.split('\n')
  const newLines = newStr.split('\n')
  const result: DiffLine[] = []

  // Simple LCS-based diff for short strings; fall back to full replace for longer
  const MAX_LINES_FOR_LCS = 50
  if (oldLines.length > MAX_LINES_FOR_LCS || newLines.length > MAX_LINES_FOR_LCS) {
    for (const l of oldLines) result.push({ type: 'removed', text: l })
    for (const l of newLines) result.push({ type: 'added', text: l })
    return result
  }

  // LCS using dynamic programming
  const m = oldLines.length
  const n = newLines.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = oldLines[i - 1] === newLines[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1])
    }
  }

  // Backtrack
  let i = m, j = n
  const ops: DiffLine[] = []
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      ops.push({ type: 'context', text: oldLines[i - 1] })
      i--; j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      ops.push({ type: 'added', text: newLines[j - 1] })
      j--
    } else {
      ops.push({ type: 'removed', text: oldLines[i - 1] })
      i--
    }
  }
  return ops.reverse()
}

export function DiffView({ filePath, oldStr, newStr, maxLines = 30 }: Props) {
  const diff = computeLineDiff(oldStr, newStr)

  // Collapse unchanged context lines to save space
  const visible: Array<DiffLine | { type: 'ellipsis'; count: number }> = []
  let contextRun = 0
  const CONTEXT_LINES = 2

  for (let i = 0; i < diff.length; i++) {
    const line = diff[i]
    if (line.type === 'context') {
      contextRun++
      // Keep first and last CONTEXT_LINES of each context block
      const nextIsChange = diff[i + 1] && diff[i + 1].type !== 'context'
      const prevWasChange = diff[i - 1] && diff[i - 1].type !== 'context'
      if (contextRun <= CONTEXT_LINES || nextIsChange) {
        visible.push(line)
      } else if (contextRun === CONTEXT_LINES + 1) {
        visible.push({ type: 'ellipsis', count: 0 })
      } else {
        const last = visible[visible.length - 1]
        if (last && last.type === 'ellipsis') last.count++
      }
    } else {
      contextRun = 0
      visible.push(line)
    }
  }

  // Trim to maxLines
  const trimmed = visible.slice(0, maxLines)
  const truncated = visible.length > maxLines

  return (
    <Box flexDirection="column" marginTop={0} marginBottom={1}>
      <Text color="cyan" bold>── diff: {filePath} ──────────────────</Text>
      {trimmed.map((line, i) => {
        if (line.type === 'ellipsis') {
          return (
            <Text key={i} color="gray" dimColor>
              {'  '}… {(line as { type: 'ellipsis'; count: number }).count + CONTEXT_LINES} lines unchanged …
            </Text>
          )
        }
        const dl = line as DiffLine
        if (dl.type === 'removed') {
          return <Text key={i} color="red">- {dl.text}</Text>
        }
        if (dl.type === 'added') {
          return <Text key={i} color="green">+ {dl.text}</Text>
        }
        return <Text key={i} color="gray" dimColor>{'  '}{dl.text}</Text>
      })}
      {truncated && (
        <Text color="gray">… [diff truncated, {visible.length - maxLines} more lines]</Text>
      )}
    </Box>
  )
}
