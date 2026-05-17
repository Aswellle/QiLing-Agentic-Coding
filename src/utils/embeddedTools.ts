/**
 * Embedded search tools detection — direct port of CC's utils/embeddedTools.ts
 *
 * In CC's ant-native builds, find/grep are shadowed by embedded bfs/ugrep
 * compiled into the bun binary. QiLing never has embedded tools, but this
 * shim ensures code that checks hasEmbeddedSearchTools() works correctly.
 */

/**
 * Whether this build has bfs/ugrep embedded in the binary.
 * Always false in QiLing (we use system ripgrep/find).
 */
export function hasEmbeddedSearchTools(): boolean {
  return false
}

/**
 * Path to the binary containing embedded search tools.
 * Only meaningful when hasEmbeddedSearchTools() returns true.
 */
export function embeddedSearchToolsBinaryPath(): string {
  return process.execPath
}
