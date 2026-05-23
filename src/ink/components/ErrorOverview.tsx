/**
 * ErrorOverview — adapted from CC's ink/components/ErrorOverview.tsx
 *
 * Renders a React error boundary fallback showing:
 *   - Error message + type
 *   - Source file + line (via stack-utils)
 *   - Code excerpt (via code-excerpt, if available)
 *   - Stack trace
 *
 * QiLing adaptation:
 * - Uses `import { Box, Text } from 'ink'` instead of CC's internal Box/Text
 * - Gracefully skips stack-utils / code-excerpt if not installed
 */

import React from 'react'
import { Box, Text } from 'ink'

type Props = {
  readonly error: Error
}

function cleanupPath(path: string | undefined): string | undefined {
  return path?.replace(`file://${process.cwd()}/`, '')
}

function tryParseOrigin(stack: string[] | undefined): { file?: string; line?: number; column?: number } | null {
  if (!stack || stack.length === 0) return null
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const StackUtils = require('stack-utils') as { new(opts?: unknown): { parseLine(line: string): { file?: string; line?: number; column?: number } | null } }
    const su = new StackUtils({ cwd: process.cwd() })
    return su.parseLine(stack[0]!) ?? null
  } catch {
    // stack-utils not available
    return null
  }
}

function tryGetExcerpt(filePath: string, line: number): Array<{ line: number; value: string }> | undefined {
  try {
    const { readFileSync } = require('fs') as typeof import('fs')
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const codeExcerpt = require('code-excerpt') as (src: string, line: number) => Array<{ line: number; value: string }>
    const source = readFileSync(filePath, 'utf8')
    return codeExcerpt(source, line)
  } catch {
    return undefined
  }
}

export default function ErrorOverview({ error }: Props): React.ReactNode {
  const stack = error.stack?.split('\n').slice(1)
  const origin = tryParseOrigin(stack)
  const filePath = cleanupPath(origin?.file)
  const excerpt = filePath && origin?.line ? tryGetExcerpt(filePath, origin.line) : undefined

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box>
        <Text bold color="red">{error.name}: </Text>
        <Text>{error.message}</Text>
      </Box>

      {filePath && origin?.line && (
        <Box marginTop={1}>
          <Text dimColor>{filePath}:{origin.line}</Text>
          {origin.column != null && <Text dimColor>:{origin.column}</Text>}
        </Box>
      )}

      {excerpt && (
        <Box flexDirection="column" marginTop={1}>
          {excerpt.map(({ line, value }) => (
            <Box key={line}>
              <Box width={6} flexShrink={0}>
                <Text dimColor={line !== origin?.line} bold={line === origin?.line}>
                  {String(line).padStart(4)}{' '}
                </Text>
              </Box>
              <Text dimColor={line !== origin?.line} bold={line === origin?.line}>
                {value}
              </Text>
            </Box>
          ))}
        </Box>
      )}

      {stack && (
        <Box flexDirection="column" marginTop={1}>
          {stack.slice(0, 6).map((frame, i) => (
            <Text key={i} dimColor>{frame.trim()}</Text>
          ))}
        </Box>
      )}
    </Box>
  )
}
