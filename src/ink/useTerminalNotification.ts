/**
 * Terminal notification system — adapted from CC's ink/useTerminalNotification.ts
 *
 * Provides writeRaw context + hooks for desktop notifications, progress bars,
 * and bell signals via OSC sequences. TerminalWriteContext is the raw stdout
 * writer that bypasses React rendering.
 */

import { createContext, useCallback, useContext, useMemo } from 'react'
import { BEL } from './termio/ansi.js'
import { ITERM2, OSC, osc, PROGRESS, wrapForMultiplexer } from './termio/osc.js'

export type Progress = {
  state: 'running' | 'completed' | 'error' | 'indeterminate'
  percentage?: number
}

export function isProgressReportingAvailable(): boolean {
  if (!process.stdout.isTTY) return false
  if (process.env.WT_SESSION) return false
  if (process.env.ConEmuANSI || process.env.ConEmuPID) return true
  const tp = process.env.TERM_PROGRAM
  const ver = process.env.TERM_PROGRAM_VERSION
  if (!ver) return false
  const [major = 0, minor = 0, patch = 0] = ver.split('.').map(Number)
  if (tp === 'ghostty') return major > 1 || (major === 1 && minor >= 2)
  if (tp === 'iTerm.app') return major > 3 || (major === 3 && (minor > 6 || (minor === 6 && patch >= 6)))
  return false
}

type WriteRaw = (data: string) => void

export const TerminalWriteContext = createContext<WriteRaw | null>(null)
export const TerminalWriteProvider = TerminalWriteContext.Provider

export type TerminalNotification = {
  notifyITerm2: (opts: { message: string; title?: string }) => void
  notifyKitty: (opts: { message: string; title: string; id: number }) => void
  notifyGhostty: (opts: { message: string; title: string }) => void
  notifyBell: () => void
  progress: (state: Progress['state'] | null, percentage?: number) => void
}

export function useTerminalNotification(): TerminalNotification {
  const writeRaw = useContext(TerminalWriteContext)
  if (!writeRaw) throw new Error('useTerminalNotification must be used within TerminalWriteProvider')

  const notifyITerm2 = useCallback(
    ({ message, title }: { message: string; title?: string }) => {
      const displayString = title ? `${title}:\n${message}` : message
      writeRaw(wrapForMultiplexer(osc(OSC.ITERM2, `\n\n${displayString}`)))
    },
    [writeRaw],
  )

  const notifyKitty = useCallback(
    ({ message, title, id }: { message: string; title: string; id: number }) => {
      writeRaw(wrapForMultiplexer(osc(OSC.KITTY, `i=${id}:d=0:p=title`, title)))
      writeRaw(wrapForMultiplexer(osc(OSC.KITTY, `i=${id}:p=body`, message)))
      writeRaw(wrapForMultiplexer(osc(OSC.KITTY, `i=${id}:d=1:a=focus`, '')))
    },
    [writeRaw],
  )

  const notifyGhostty = useCallback(
    ({ message, title }: { message: string; title: string }) => {
      writeRaw(wrapForMultiplexer(osc(OSC.GHOSTTY, 'notify', title, message)))
    },
    [writeRaw],
  )

  const notifyBell = useCallback(() => { writeRaw(BEL) }, [writeRaw])

  const progress = useCallback(
    (state: Progress['state'] | null, percentage?: number) => {
      if (!isProgressReportingAvailable()) return
      if (!state) {
        writeRaw(wrapForMultiplexer(osc(OSC.ITERM2, ITERM2.PROGRESS, PROGRESS.CLEAR, '')))
        return
      }
      const pct = Math.max(0, Math.min(100, Math.round(percentage ?? 0)))
      switch (state) {
        case 'completed':
        case null:
          writeRaw(wrapForMultiplexer(osc(OSC.ITERM2, ITERM2.PROGRESS, PROGRESS.CLEAR, '')))
          break
        case 'error':
          writeRaw(wrapForMultiplexer(osc(OSC.ITERM2, ITERM2.PROGRESS, PROGRESS.ERROR, pct)))
          break
        case 'indeterminate':
          writeRaw(wrapForMultiplexer(osc(OSC.ITERM2, ITERM2.PROGRESS, PROGRESS.INDETERMINATE, '')))
          break
        case 'running':
          writeRaw(wrapForMultiplexer(osc(OSC.ITERM2, ITERM2.PROGRESS, PROGRESS.SET, pct)))
          break
      }
    },
    [writeRaw],
  )

  return useMemo(
    () => ({ notifyITerm2, notifyKitty, notifyGhostty, notifyBell, progress }),
    [notifyITerm2, notifyKitty, notifyGhostty, notifyBell, progress],
  )
}
