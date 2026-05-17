/**
 * Bash AST type stubs — compatibility layer for CC's bashSecurity.ts
 *
 * CC uses tree-sitter for full AST analysis. QiLing provides stub types
 * so bashSecurity.ts compiles cleanly; AST-based checks fall back to
 * regex/text-based analysis when no tree-sitter data is available.
 */

export type TreeSitterAnalysis = {
  valid: boolean
  ast?: unknown
}

export type Redirect = {
  type: 'input' | 'output' | 'append'
  target: string
}

export type SimpleCommand = {
  name: string
  args: string[]
  redirects: Redirect[]
}

export type ParseForSecurityResult = {
  commands: SimpleCommand[]
  redirects: Redirect[]
}

/**
 * No-op AST analysis — always returns empty results.
 * Callers fall back to regex-based validation.
 */
export function parseForSecurityFromAst(
  _analysis: TreeSitterAnalysis | null | undefined,
): ParseForSecurityResult {
  return { commands: [], redirects: [] }
}

/**
 * No-op semantics check — always passes.
 */
export function checkSemantics(
  _analysis: TreeSitterAnalysis | null | undefined,
): string | null {
  return null
}

/** Type guard helper */
export function nodeTypeId(_node: unknown): string {
  return ''
}
