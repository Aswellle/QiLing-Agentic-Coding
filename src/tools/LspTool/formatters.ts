/**
 * LSP result formatters — ported from CC's tools/LSPTool/formatters.ts
 *
 * Converts LSP protocol responses into human-readable strings for the AI.
 * Handles: definitions, references, hover, document symbols, call hierarchy.
 */

import { relative } from 'node:path'

// ─── Type helpers (vscode-languageserver-types compatible) ────────────────────

type Position = { line: number; character: number }
type Range = { start: Position; end: Position }
type Location = { uri: string; range: Range }
type LocationLink = { targetUri: string; targetRange: Range; originSelectionRange?: Range }
type Hover = { contents: unknown; range?: Range }
type SymbolKind = number
type DocumentSymbol = { name: string; kind: SymbolKind; range: Range; children?: DocumentSymbol[] }
type SymbolInformation = { name: string; kind: SymbolKind; location: Location; containerName?: string }
type CallHierarchyItem = { name: string; uri: string; range: Range; kind: SymbolKind }
type CallHierarchyIncomingCall = { from: CallHierarchyItem; fromRanges: Range[] }
type CallHierarchyOutgoingCall = { to: CallHierarchyItem; fromRanges: Range[] }

const SYMBOL_KIND_NAMES: Record<number, string> = {
  1: 'File', 2: 'Module', 3: 'Namespace', 4: 'Package', 5: 'Class',
  6: 'Method', 7: 'Property', 8: 'Field', 9: 'Constructor', 10: 'Enum',
  11: 'Interface', 12: 'Function', 13: 'Variable', 14: 'Constant',
  15: 'String', 16: 'Number', 17: 'Boolean', 18: 'Array', 19: 'Object',
  20: 'Key', 21: 'Null', 22: 'EnumMember', 23: 'Struct', 24: 'Event',
  25: 'Operator', 26: 'TypeParameter',
}

// ─── URI / path utilities ─────────────────────────────────────────────────────

function formatUri(uri: string | undefined, cwd?: string): string {
  if (!uri) return '<unknown location>'

  let filePath = uri.replace(/^file:\/\//, '')
  if (/^\/[A-Za-z]:/.test(filePath)) filePath = filePath.slice(1)

  try { filePath = decodeURIComponent(filePath) } catch { /* use as-is */ }

  if (cwd) {
    const rel = relative(cwd, filePath).replaceAll('\\', '/')
    if (rel.length < filePath.length && !rel.startsWith('../../')) return rel
  }

  return filePath.replaceAll('\\', '/')
}

function formatPosition(pos: Position): string {
  return `${pos.line + 1}:${pos.character + 1}`
}

function formatLocation(loc: Location, cwd?: string): string {
  return `${formatUri(loc.uri, cwd)}:${formatPosition(loc.range.start)}`
}

function isLocationLink(item: Location | LocationLink): item is LocationLink {
  return 'targetUri' in item
}

function locationLinkToLocation(ll: LocationLink): Location {
  return { uri: ll.targetUri, range: ll.targetRange }
}

function extractMarkupText(contents: unknown): string {
  if (typeof contents === 'string') return contents
  if (Array.isArray(contents)) {
    return contents
      .map(c => typeof c === 'string' ? c : (c as { value?: string }).value ?? '')
      .join('\n\n')
  }
  if (contents && typeof contents === 'object') {
    return (contents as { value?: string }).value ?? String(contents)
  }
  return String(contents ?? '')
}

function groupByFile<T extends { uri: string } | { location: { uri: string } }>(
  items: T[],
  cwd?: string,
): Map<string, T[]> {
  const byFile = new Map<string, T[]>()
  for (const item of items) {
    const uri = 'uri' in item ? (item as { uri: string }).uri : (item as { location: { uri: string } }).location.uri
    const path = formatUri(uri, cwd)
    const arr = byFile.get(path)
    if (arr) arr.push(item)
    else byFile.set(path, [item])
  }
  return byFile
}

// ─── Public formatters ────────────────────────────────────────────────────────

export function formatGoToDefinitionResult(
  result: Location | Location[] | LocationLink | LocationLink[] | null,
  cwd?: string,
): string {
  const NOT_FOUND = 'No definition found. This may occur if the cursor is not on a symbol, or if the definition is in an external library not indexed by the LSP server.'

  if (!result) return NOT_FOUND

  if (Array.isArray(result)) {
    const locations = result
      .map(item => isLocationLink(item) ? locationLinkToLocation(item) : item as Location)
      .filter(loc => loc?.uri)

    if (locations.length === 0) return NOT_FOUND
    if (locations.length === 1) return `Defined in ${formatLocation(locations[0]!, cwd)}`
    return `Found ${locations.length} definitions:\n${locations.map(loc => `  ${formatLocation(loc, cwd)}`).join('\n')}`
  }

  const location = isLocationLink(result) ? locationLinkToLocation(result) : result as Location
  return `Defined in ${formatLocation(location, cwd)}`
}

export function formatFindReferencesResult(
  result: Location[] | null,
  cwd?: string,
): string {
  if (!result || result.length === 0) {
    return 'No references found. This may occur if the symbol is not used, or if the LSP server has not fully indexed the workspace.'
  }

  const byFile = groupByFile(result, cwd)
  const totalRefs = result.length
  const fileCount = byFile.size

  const lines = [`Found ${totalRefs} reference${totalRefs > 1 ? 's' : ''} in ${fileCount} file${fileCount > 1 ? 's' : ''}:`]
  for (const [filePath, refs] of byFile) {
    lines.push(`\n${filePath}:`)
    for (const ref of refs) {
      lines.push(`  Line ${ref.range.start.line + 1}: ${formatPosition(ref.range.start)}`)
    }
  }
  return lines.join('\n')
}

export function formatHoverResult(result: Hover | null, _cwd?: string): string {
  if (!result) {
    return 'No hover information available. This may occur if the cursor is not on a symbol, or if the LSP server has not fully indexed the file.'
  }

  const content = extractMarkupText(result.contents)
  if (result.range) {
    return `Hover info at ${formatPosition(result.range.start)}:\n\n${content}`
  }
  return content
}

export function formatDocumentSymbolResult(
  result: DocumentSymbol[] | SymbolInformation[] | null,
  cwd?: string,
): string {
  if (!result || result.length === 0) {
    return 'No symbols found in this document.'
  }

  function renderDocSymbol(sym: DocumentSymbol, indent = 0): string {
    const prefix = '  '.repeat(indent)
    const kindName = SYMBOL_KIND_NAMES[sym.kind] ?? `Kind${sym.kind}`
    const line = sym.range.start.line + 1
    let out = `${prefix}${kindName}: ${sym.name} (line ${line})`
    if (sym.children?.length) {
      out += '\n' + sym.children.map(c => renderDocSymbol(c, indent + 1)).join('\n')
    }
    return out
  }

  // Detect type: DocumentSymbol has 'range', SymbolInformation has 'location'
  if ('range' in result[0]!) {
    return (result as DocumentSymbol[]).map(s => renderDocSymbol(s)).join('\n')
  }

  // SymbolInformation[]
  const syms = result as SymbolInformation[]
  return syms.map(s => {
    const kindName = SYMBOL_KIND_NAMES[s.kind] ?? `Kind${s.kind}`
    const loc = formatLocation(s.location, cwd)
    const container = s.containerName ? ` (in ${s.containerName})` : ''
    return `${kindName}: ${s.name}${container} — ${loc}`
  }).join('\n')
}

export function formatWorkspaceSymbolResult(
  result: SymbolInformation[] | null,
  cwd?: string,
): string {
  if (!result || result.length === 0) return 'No workspace symbols found matching the query.'

  const byFile = groupByFile(result, cwd)
  const lines = [`Found ${result.length} symbol${result.length > 1 ? 's' : ''}:`]

  for (const [filePath, syms] of byFile) {
    lines.push(`\n${filePath}:`)
    for (const sym of syms) {
      const kindName = SYMBOL_KIND_NAMES[sym.kind] ?? `Kind${sym.kind}`
      lines.push(`  ${kindName}: ${sym.name} (line ${sym.location.range.start.line + 1})`)
    }
  }
  return lines.join('\n')
}

export function formatPrepareCallHierarchyResult(
  result: CallHierarchyItem[] | null,
  _cwd?: string,
): string {
  if (!result || result.length === 0) {
    return 'No call hierarchy items found. The cursor may not be on a callable symbol.'
  }
  return result
    .map(item => `${SYMBOL_KIND_NAMES[item.kind] ?? 'Symbol'}: ${item.name}`)
    .join('\n')
}

export function formatIncomingCallsResult(
  result: CallHierarchyIncomingCall[] | null,
  cwd?: string,
): string {
  if (!result || result.length === 0) return 'No incoming calls found.'
  return result
    .map(({ from, fromRanges }) => {
      const loc = formatUri(from.uri, cwd)
      const lines = fromRanges.map(r => r.start.line + 1).join(', ')
      return `${from.name} — ${loc} (line${fromRanges.length > 1 ? 's' : ''} ${lines})`
    })
    .join('\n')
}

export function formatOutgoingCallsResult(
  result: CallHierarchyOutgoingCall[] | null,
  cwd?: string,
): string {
  if (!result || result.length === 0) return 'No outgoing calls found.'
  return result
    .map(({ to, fromRanges }) => {
      const loc = formatUri(to.uri, cwd)
      const lines = fromRanges.map(r => r.start.line + 1).join(', ')
      return `${to.name} — ${loc} (called at line${fromRanges.length > 1 ? 's' : ''} ${lines})`
    })
    .join('\n')
}
