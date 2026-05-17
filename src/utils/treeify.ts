/**
 * Tree-structure text renderer — ported from CC's utils/treeify.ts
 *
 * Renders nested objects as tree text with box-drawing characters.
 * Used by /agents, /mcp, /tasks, and other commands to display hierarchical data.
 */

export type TreeNode = {
  [key: string]: TreeNode | string | number | boolean | null | undefined
}

export type TreeifyOptions = {
  /** Show values alongside keys */
  showValues?: boolean
  /** Indent size (default: 2) */
  indent?: number
  /** Use Unicode box-drawing chars (default: true) */
  unicode?: boolean
}

type TreeChars = {
  branch: string   // ├─
  last: string     // └─
  pipe: string     // │
  space: string    // ' '
}

const UNICODE_CHARS: TreeChars = {
  branch: '├─ ',
  last:   '└─ ',
  pipe:   '│  ',
  space:  '   ',
}

const ASCII_CHARS: TreeChars = {
  branch: '+- ',
  last:   '`- ',
  pipe:   '|  ',
  space:  '   ',
}

/**
 * Render a nested object as a tree string.
 *
 * @example
 * treeify({ 'Tools': { 'Bash': 'enabled', 'FileRead': 'enabled' } })
 * // ├─ Tools
 * // │  ├─ Bash: enabled
 * // │  └─ FileRead: enabled
 */
export function treeify(
  obj: TreeNode,
  options: TreeifyOptions = {},
): string {
  const chars = options.unicode !== false ? UNICODE_CHARS : ASCII_CHARS
  const lines: string[] = []
  renderNode(obj, '', true, chars, lines, options)
  return lines.join('\n')
}

function renderNode(
  node: TreeNode | string | number | boolean | null | undefined,
  prefix: string,
  isRoot: boolean,
  chars: TreeChars,
  lines: string[],
  options: TreeifyOptions,
): void {
  if (typeof node !== 'object' || node === null) return

  const entries = Object.entries(node)
  entries.forEach(([key, value], idx) => {
    const isLast = idx === entries.length - 1
    const connector = isLast ? chars.last : chars.branch
    const childPrefix = prefix + (isLast ? chars.space : chars.pipe)

    if (typeof value === 'object' && value !== null) {
      lines.push(`${prefix}${connector}${key}`)
      renderNode(value as TreeNode, childPrefix, false, chars, lines, options)
    } else {
      const valueStr = options.showValues && value !== undefined
        ? `${key}: ${formatValue(value)}`
        : key
      lines.push(`${prefix}${connector}${valueStr}`)
    }
  })
}

function formatValue(value: string | number | boolean | null | undefined): string {
  if (value === null) return '(null)'
  if (value === undefined) return '(undefined)'
  if (typeof value === 'boolean') return value ? '✓' : '✗'
  return String(value)
}

/**
 * Build a TreeNode from an array of items with optional grouping.
 */
export function arrayToTree(
  items: string[],
  groupBy?: (item: string) => string,
): TreeNode {
  if (!groupBy) {
    return Object.fromEntries(items.map(item => [item, null]))
  }

  const groups: Record<string, string[]> = {}
  for (const item of items) {
    const group = groupBy(item)
    if (!groups[group]) groups[group] = []
    groups[group].push(item)
  }

  return Object.fromEntries(
    Object.entries(groups).map(([group, groupItems]) => [
      group,
      Object.fromEntries(groupItems.map(i => [i, null])),
    ])
  )
}

/**
 * Format a simple list as a bulleted tree.
 */
export function listToTree(label: string, items: string[]): string {
  if (items.length === 0) return `${label}: (none)`
  const node: TreeNode = { [label]: arrayToTree(items) }
  return treeify(node)
}
