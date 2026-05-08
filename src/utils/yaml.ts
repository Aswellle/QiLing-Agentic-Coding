/**
 * YAML parsing — ported from CC's utils/yaml.ts (verbatim)
 *
 * Uses Bun.YAML (built-in, zero-cost) when available, else falls back to
 * the `yaml` npm package (lazy-loaded to avoid bundling in Bun builds).
 */

export function parseYaml(input: string): unknown {
  if (typeof Bun !== 'undefined') return Bun.YAML.parse(input)
  // Fallback: simple YAML parsing for non-Bun environments
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  try { return (require('yaml') as { parse: (s: string) => unknown }).parse(input) }
  catch { return null }
}
