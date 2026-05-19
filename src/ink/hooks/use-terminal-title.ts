/**
 * Terminal title hook — adapted from CC's ink/hooks/use-terminal-title.ts
 *
 * Declaratively sets the terminal tab/window title via OSC 0.
 * Strips ANSI codes. On Windows uses process.title (conhost fallback).
 * Pass null to opt out (no-op, no title change).
 */

import { useContext, useEffect } from 'react'
import { OSC, osc } from '../termio/osc.js'
import { TerminalWriteContext } from '../useTerminalNotification.js'

function stripAnsi(str: string): string {
  // biome-ignore lint/suspicious/noControlCharactersInRegex: intentional ANSI strip
  return str.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '').replace(/\x1b\][^\x07]*\x07/g, '')
}

export function useTerminalTitle(title: string | null): void {
  const writeRaw = useContext(TerminalWriteContext)

  useEffect(() => {
    if (title === null || !writeRaw) return
    const clean = stripAnsi(title)
    if (process.platform === 'win32') {
      process.title = clean
    } else {
      writeRaw(osc(OSC.SET_TITLE_AND_ICON, clean))
    }
  }, [title, writeRaw])
}
