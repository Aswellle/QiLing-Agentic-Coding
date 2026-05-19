/**
 * Static React rendering to strings — adapted from CC's utils/staticRender.tsx
 *
 * Renders a React node to an ANSI string or plain text string using Ink's
 * non-TTY rendering mode. Useful for generating diff previews, test snapshots,
 * and file-dumped transcripts at a given terminal width.
 */

import React, { useLayoutEffect } from 'react'
import { PassThrough } from 'stream'
import { render, useApp } from 'ink'

const SYNC_START = '\x1B[?2026h'
const SYNC_END = '\x1B[?2026l'

function RenderOnceAndExit({ children }: { children: React.ReactNode }): React.ReactNode {
  const { exit } = useApp()

  useLayoutEffect(() => {
    const timer = setTimeout(exit, 0)
    return () => clearTimeout(timer)
  }, [exit])

  return <>{children}</>
}

function extractFirstFrame(output: string): string {
  const startIndex = output.indexOf(SYNC_START)
  if (startIndex === -1) return output

  const contentStart = startIndex + SYNC_START.length
  const endIndex = output.indexOf(SYNC_END, contentStart)
  if (endIndex === -1) return output

  return output.slice(contentStart, endIndex)
}

export function renderToAnsiString(node: React.ReactNode, columns?: number): Promise<string> {
  return new Promise(async resolve => {
    let output = ''

    const stream = new PassThrough()
    if (columns !== undefined) {
      ;(stream as unknown as { columns: number }).columns = columns
    }
    stream.on('data', chunk => { output += chunk.toString() })

    const instance = await render(
      <RenderOnceAndExit>{node}</RenderOnceAndExit>,
      {
        stdout: stream as unknown as NodeJS.WriteStream,
        patchConsole: false,
      },
    )

    await instance.waitUntilExit()
    resolve(extractFirstFrame(output))
  })
}

export async function renderToString(node: React.ReactNode, columns?: number): Promise<string> {
  const output = await renderToAnsiString(node, columns)
  // Strip ANSI inline without importing strip-ansi to keep deps light
  // biome-ignore lint/suspicious/noControlCharactersInRegex: intentional ANSI strip
  return output.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '').replace(/\x1b\][^\x07]*\x07/g, '')
}
