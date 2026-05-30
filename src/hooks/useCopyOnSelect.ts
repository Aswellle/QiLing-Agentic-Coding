import { useEffect, useRef } from 'react'
import { useTheme } from '../components/design-system/ThemeProvider.js'
import type { useSelection } from '../ink/hooks/use-selection.js'
import { getGlobalConfig } from '../utils/config.js'
import { getTheme } from '../utils/theme.js'

type Selection = ReturnType<typeof useSelection>

/**
 * Auto-copy the selection to the clipboard when the user finishes dragging
 * (mouse-up with a non-empty selection) or multi-clicks to select a word/line.
 * Mirrors iTerm2's "Copy to pasteboard on selection".
 */
export function useCopyOnSelect(
  selection: Selection,
  isActive: boolean,
  onCopied?: (text: string) => void,
): void {
  const copiedRef = useRef(false)
  const onCopiedRef = useRef(onCopied)
  onCopiedRef.current = onCopied

  useEffect(() => {
    if (!isActive) return

    const unsubscribe = selection.subscribe(() => {
      const sel = selection.getState()
      const has = selection.hasSelection()
      if (sel?.isDragging) {
        copiedRef.current = false
        return
      }
      if (!has) {
        copiedRef.current = false
        return
      }
      if (copiedRef.current) return

      const enabled = getGlobalConfig().copyOnSelect ?? true
      if (!enabled) return

      const text = selection.copySelectionNoClear()
      if (!text || !text.trim()) {
        copiedRef.current = true
        return
      }
      copiedRef.current = true
      onCopiedRef.current?.(text)
    })
    return unsubscribe
  }, [isActive, selection])
}

/**
 * Pipe the theme's selection background color into the Ink StylePool.
 */
export function useSelectionBgColor(selection: Selection): void {
  const [themeName] = useTheme()
  useEffect(() => {
    const theme = getTheme(themeName) as ReturnType<typeof getTheme> & { selectionBg?: string }
    const color = theme.selectionBg ?? '#2563eb'
    selection.setSelectionBgColor(color)
  }, [selection, themeName])
}
