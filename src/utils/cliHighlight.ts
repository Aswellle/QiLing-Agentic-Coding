/**
 * CLI syntax highlighting — adapted from CC's utils/cliHighlight.ts
 *
 * Lazy-loads cli-highlight and highlight.js to avoid startup cost.
 * The shared promise ensures a single load across all callers.
 */

import { extname } from 'path'

export type CliHighlight = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  highlight: (code: string, options?: any) => string
  supportsLanguage: (language: string) => boolean
}

let cliHighlightPromise: Promise<CliHighlight | null> | undefined
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let loadedGetLanguage: ((ext: string) => any) | undefined

async function loadCliHighlight(): Promise<CliHighlight | null> {
  try {
    // biome-ignore lint: dynamic import for optional dep
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cliHighlight = await (eval("import('cli-highlight')") as Promise<any>)
    // biome-ignore lint: dynamic import for optional dep
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const highlightJs = await (eval("import('highlight.js')") as Promise<any>)
    loadedGetLanguage = highlightJs.getLanguage?.bind(highlightJs)
    return {
      highlight: cliHighlight.highlight,
      supportsLanguage: cliHighlight.supportsLanguage,
    }
  } catch {
    return null
  }
}

export function getCliHighlightPromise(): Promise<CliHighlight | null> {
  cliHighlightPromise ??= loadCliHighlight()
  return cliHighlightPromise
}

export async function getLanguageName(file_path: string): Promise<string> {
  await getCliHighlightPromise()
  const ext = extname(file_path).slice(1)
  if (!ext) return 'unknown'
  return loadedGetLanguage?.(ext)?.name ?? 'unknown'
}
