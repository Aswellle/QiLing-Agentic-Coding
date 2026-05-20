/**
 * Declared cursor hook — adapted from CC's ink/hooks/use-declared-cursor.ts
 *
 * Parks the terminal cursor at the text input's caret position after each frame.
 * Makes CJK IME preedit appear inline and lets screen readers track the cursor.
 * The (line, column) is relative to the attached Box's layout rect.
 */

import { useCallback, useContext, useLayoutEffect, useRef } from 'react'
import CursorDeclarationContext from '../components/CursorDeclarationContext.js'

export function useDeclaredCursor({
  line,
  column,
  active,
}: {
  line: number
  column: number
  active: boolean
}): (element: unknown) => void {
  const setCursorDeclaration = useContext(CursorDeclarationContext)
  const nodeRef = useRef<unknown>(null)

  const setNode = useCallback((node: unknown) => {
    nodeRef.current = node
  }, [])

  // Re-declare on every commit (no dep array) so the active instance
  // reclaims the declaration after sibling handoff or unmount cleanup.
  // Node-identity check prevents inactive siblings from clobbering active ones.
  useLayoutEffect(() => {
    const node = nodeRef.current
    if (active && node) {
      setCursorDeclaration({ relativeX: column, relativeY: line, node })
    } else {
      setCursorDeclaration(null, node as object | null)
    }
  })

  // Clear on unmount — only if we still own the declaration.
  useLayoutEffect(() => {
    return () => { setCursorDeclaration(null, nodeRef.current as object | null) }
  }, [setCursorDeclaration])

  return setNode
}
