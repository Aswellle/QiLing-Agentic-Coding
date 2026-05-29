// FROM CC: utils/bash/parser.ts (stub — tree-sitter WASM not ported yet)
// Full CC file depends on @nicolo-ribaudo/chokidar-2 / tree-sitter WASM runtime.
// Stubs return null (parse-unavailable), causing bashPermissions to use legacy path.

export type Node = unknown

export const PARSE_ABORTED: unique symbol = Symbol('PARSE_ABORTED')

export async function parseCommandRaw(
  _command: string,
): Promise<Node | null | typeof PARSE_ABORTED> {
  // tree-sitter unavailable in QiLing — legacy path used
  return null
}
