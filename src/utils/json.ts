/**
 * JSON utilities — ported from CC's utils/json.ts (core subset)
 *
 * Key functions:
 * - safeParseJSON(): parse without throwing
 * - parseJSONL(): parse newline-delimited JSON
 */

/**
 * Safely parse a JSON string. Returns null if parsing fails.
 */
export function safeParseJSON(json: string | null | undefined): unknown {
  if (!json) return null
  try { return JSON.parse(json) } catch { return null }
}

/**
 * Parse newline-delimited JSON (JSONL/NDJSON).
 * Returns an array of parsed values, skipping blank lines and parse errors.
 * Mirrors CC's parseJSONL() from utils/json.ts.
 */
export function parseJSONL<T>(data: string | Buffer): T[] {
  const text = typeof data === 'string' ? data : data.toString('utf-8')
  const results: T[] = []
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    try { results.push(JSON.parse(trimmed) as T) } catch { /* skip invalid lines */ }
  }
  return results
}

/**
 * Serialize to JSON with a replacer that handles BigInt.
 * Returns undefined on error (unlike JSON.stringify which throws on BigInt).
 */
export function safeStringifyJSON(value: unknown, indent?: number): string | undefined {
  try {
    return JSON.stringify(value, (_key, val) =>
      typeof val === 'bigint' ? val.toString() : val
    , indent)
  } catch { return undefined }
}

/**
 * Safely parse JSONC (JSON with comments).
 * Strips line and block comments before parsing as JSON.
 * Ported from CC's utils/json.ts (simplified without jsonc-parser dep).
 */
export function safeParseJSONC(json: string | null | undefined): unknown {
  if (!json) return null
  try {
    const stripped = json.charCodeAt(0) === 0xFEFF ? json.slice(1) : json
    const noComments = stripped
      .replace(/\/\/[^\n]*/g, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
    return JSON.parse(noComments)
  } catch { return null }
}

/**
 * Read and parse a JSONL file. Returns [] on any error.
 * Ported from CC's utils/json.ts.
 */
export async function readJSONLFile<T>(filePath: string): Promise<T[]> {
  try {
    const { readFile } = await import('fs/promises')
    const content = await readFile(filePath, 'utf-8')
    return parseJSONL<T>(content)
  } catch { return [] }
}
