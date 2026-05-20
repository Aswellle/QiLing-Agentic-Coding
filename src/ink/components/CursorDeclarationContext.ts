/**
 * Cursor declaration context — adapted from CC's ink/components/CursorDeclarationContext.ts
 *
 * Allows components to declare the terminal cursor position within their
 * layout subtree. The setter includes a clearIfNode guard to prevent
 * sibling components from clobbering each other's declarations.
 */

import { createContext } from 'react'

export type CursorDeclaration = {
  readonly relativeX: number
  readonly relativeY: number
  readonly node: object
}

export type CursorDeclarationSetter = (
  declaration: CursorDeclaration | null,
  clearIfNode?: object | null,
) => void

const CursorDeclarationContext = createContext<CursorDeclarationSetter>(() => {})

export default CursorDeclarationContext
