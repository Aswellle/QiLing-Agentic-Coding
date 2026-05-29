// FROM CC: constants/prompts.ts (partial — full file 914 lines, deep deps)
// Only prependBullets ported at this stage; remaining exports pending T6 layer.

export function prependBullets(items: Array<string | string[]>): string[] {
  return items.flatMap(item =>
    Array.isArray(item)
      ? item.map(subitem => `  - ${subitem}`)
      : [` - ${item}`],
  )
}
