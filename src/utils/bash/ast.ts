// FROM CC: utils/bash/ast.ts (stub — CC uses tree-sitter WASM, QiLing has no AST)
// Types updated to match CC's interface for bashPermissions.ts port.
// All functions are no-ops / stubs; AST path never taken (parser.ts returns null).

export type TreeSitterAnalysis = {
  valid: boolean
  ast?: unknown
  compoundStructure?: {
    hasSubshell: boolean
    hasCommandGroup: boolean
  }
}

export type Redirect = {
  type: 'input' | 'output' | 'append'
  target: string
}

export type SimpleCommand = {
  name: string
  args: string[]
  redirects: Redirect[]
  text: string  // CC-compat: source text span for each subcommand
  envVars?: Array<{ name: string; value: string }>
}

// CC-compat discriminated union
export type ParseForSecurityResult =
  | { kind: 'simple'; commands: SimpleCommand[] }
  | { kind: 'too-complex'; reason: string; nodeType?: string }
  | { kind: 'parse-unavailable' }

export function parseForSecurityFromAst(
  _command: string,
  _astRoot: unknown,
): ParseForSecurityResult {
  // Stub: tree-sitter unavailable — callers check kind !== 'parse-unavailable'
  return { kind: 'parse-unavailable' }
}

// CC-compat: takes SimpleCommand[], returns { ok, reason }
export function checkSemantics(
  _commands: SimpleCommand[],
): { ok: boolean; reason: string } {
  return { ok: true, reason: '' }
}

export function nodeTypeId(_node: unknown): string {
  return ''
}
