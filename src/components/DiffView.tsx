import React from 'react'
import { Box, Text } from 'ink'

interface Props {
  oldString: string
  newString: string
  filePath: string
  contextLines?: number
}

interface DiffLine {
  type: 'context' | 'removed' | 'added' | 'ellipsis'
  oldNum?: number
  newNum?: number
  content: string
}

function computeDiff(oldStr: string, newStr: string): DiffLine[] {
  const oldLines = oldStr.split('\n')
  const newLines = newStr.split('\n')
  const m = oldLines.length
  const n = newLines.length

  // LCS DP table
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i]![j] = oldLines[i] === newLines[j]
        ? (dp[i + 1]?.[j + 1] ?? 0) + 1
        : Math.max(dp[i + 1]?.[j] ?? 0, dp[i]?.[j + 1] ?? 0)
    }
  }

  const result: DiffLine[] = []
  let i = 0, j = 0, oldNum = 1, newNum = 1

  while (i < m || j < n) {
    if (i < m && j < n && oldLines[i] === newLines[j]) {
      result.push({ type: 'context', oldNum: oldNum++, newNum: newNum++, content: oldLines[i]! })
      i++; j++
    } else if (j < n && (i >= m || (dp[i]?.[j + 1] ?? 0) >= (dp[i + 1]?.[j] ?? 0))) {
      result.push({ type: 'added', newNum: newNum++, content: newLines[j]! })
      j++
    } else {
      result.push({ type: 'removed', oldNum: oldNum++, content: oldLines[i]! })
      i++
    }
  }
  return result
}

function filterContext(lines: DiffLine[], ctx: number): DiffLine[] {
  const changedIdx = new Set(
    lines.map((l, i) => l.type !== 'context' ? i : -1).filter(i => i >= 0)
  )
  if (changedIdx.size === 0) return []

  const keep = new Set<number>()
  for (const idx of changedIdx) {
    for (let k = Math.max(0, idx - ctx); k <= Math.min(lines.length - 1, idx + ctx); k++) {
      keep.add(k)
    }
  }

  const result: DiffLine[] = []
  let lastKept = -1
  for (let i = 0; i < lines.length; i++) {
    if (!keep.has(i)) continue
    if (lastKept >= 0 && i > lastKept + 1) {
      result.push({ type: 'ellipsis', content: '...' })
    }
    result.push(lines[i]!)
    lastKept = i
  }
  return result
}

export function DiffView({ oldString, newString, filePath, contextLines = 3 }: Props) {
  const all = computeDiff(oldString, newString)
  const lines = filterContext(all, contextLines)
  const added = all.filter(l => l.type === 'added').length
  const removed = all.filter(l => l.type === 'removed').length

  const numStr = (n: number | undefined) => n !== undefined ? String(n).padStart(4) : '    '

  return (
    <Box flexDirection="column" marginTop={1}>
      <Box flexDirection="row" gap={1}>
        <Text color="cyan">📄 {filePath}</Text>
        <Text color="green">+{added}</Text>
        <Text color="red">-{removed}</Text>
      </Box>
      <Box flexDirection="column" borderStyle="single" borderColor="gray" paddingX={1}>
        {lines.map((line, i) => {
          if (line.type === 'ellipsis') return <Text key={i} color="gray">  ⋮</Text>
          if (line.type === 'removed') {
            return (
              <Box key={i} flexDirection="row">
                <Text color="gray" dimColor>{numStr(line.oldNum)}    </Text>
                <Text color="red">{'−'} {line.content}</Text>
              </Box>
            )
          }
          if (line.type === 'added') {
            return (
              <Box key={i} flexDirection="row">
                <Text color="gray" dimColor>{'    '}{numStr(line.newNum)}</Text>
                <Text color="green">{'+'} {line.content}</Text>
              </Box>
            )
          }
          return (
            <Box key={i} flexDirection="row">
              <Text color="gray" dimColor>{numStr(line.oldNum)} {numStr(line.newNum)}  </Text>
              <Text color="gray" dimColor>{line.content}</Text>
            </Box>
          )
        })}
      </Box>
    </Box>
  )
}

export function parseDiffMeta(resultText: string): {
  filePath: string; oldString: string; newString: string
} | null {
  const match = resultText.match(/<!--DIFF:(.+?)-->/)
  if (!match) return null
  try {
    const meta = JSON.parse(match[1]!) as {
      __diff?: boolean; file_path: string; old_string: string; new_string: string
    }
    if (!meta.__diff) return null
    return { filePath: meta.file_path, oldString: meta.old_string, newString: meta.new_string }
  } catch { return null }
}
