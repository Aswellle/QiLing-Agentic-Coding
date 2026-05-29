/**
 * Tree-sitter AST analysis utilities for bash command security validation.
 *
 * These functions extract security-relevant information from tree-sitter
 * parse trees, providing more accurate analysis than regex/shell-quote
 * parsing. Each function takes a root node and command string, and returns
 * structured data that can be used by security validators.
 *
 * The native NAPI parser returns plain JS objects — no cleanup needed.
 */

type TreeSitterNode = {
  type: string
  text: string
  startIndex: number
  endIndex: number
  children: TreeSitterNode[]
  childCount: number
}

export type QuoteContext = {
  /** Command text with single-quoted content removed (double-quoted content preserved) */
  withDoubleQuotes: string
  /** Command text with all quoted content removed */
  fullyUnquoted: string
  /** Like fullyUnquoted but preserves quote characters (', ") */
  unquotedKeepQuoteChars: string
}

export type CompoundStructure = {
  /** Whether the command has compound operators (&&, ||, ;) at the top level */
  hasCompoundOperators: boolean
  /** Whether the command has pipelines */
  hasPipeline: boolean
  /** Whether the command has subshells */
  hasSubshell: boolean
  /** Whether the command has command groups ({...}) */
  hasCommandGroup: boolean
  /** Top-level compound operator types found */
  operators: string[]
  /** Individual command segments split by compound operators */
  segments: string[]
}

export type DangerousPatterns = {
  /** Has $() or backtick command substitution (outside quotes that would make it safe) */
  hasCommandSubstitution: boolean
  /** Has <() or >() process substitution */
  hasProcessSubstitution: boolean
  /** Has ${...} parameter expansion */
  hasParameterExpansion: boolean
  /** Has heredoc */
  hasHeredoc: boolean
  /** Has comment */
  hasComment: boolean
}

export type TreeSitterAnalysis = {
  quoteContext: QuoteContext
  compoundStructure: CompoundStructure
  /** Whether actual operator nodes (;, &&, ||) exist — if false, \; is just a word argument */
  hasActualOperatorNodes: boolean
  dangerousPatterns: DangerousPatterns
}

type QuoteSpans = {
  raw: Array<[number, number]> // raw_string (single-quoted)
  ansiC: Array<[number, number]> // ansi_c_string ($'...')
  double: Array<[number, number]> // string (double-quoted)
  heredoc: Array<[number, number]> // quoted heredoc_redirect
}

/**
 * Single-pass collection of all quote-related spans.
 * Previously this was 5 separate tree walks (one per type-set plus
 * allQuoteTypes plus heredoc); fusing cuts tree-traversal ~5x.
 */
function collectQuoteSpans(
  node: TreeSitterNode,
  out: QuoteSpans,
  inDouble: boolean,
): void {
  switch (node.type) {
    case 'raw_string':
      out.raw.push([node.startIndex, node.endIndex])
      return
    case 'ansi_c_string':
      out.ansiC.push([node.startIndex, node.endIndex])
      return
    case 'string':
      if (!inDouble) out.double.push([node.startIndex, node.endIndex])
      for (const child of node.children) {
        if (child) collectQuoteSpans(child, out, true)
      }
      return
    case 'heredoc_redirect': {
      let isQuoted = false
      for (const child of node.children) {
        if (child && child.type === 'heredoc_start') {
          const first = child.text[0]
          isQuoted = first === "'" || first === '"' || first === '\\'
          break
        }
      }
      if (isQuoted) {
        out.heredoc.push([node.startIndex, node.endIndex])
        return
      }
      break
    }
  }

  for (const child of node.children) {
    if (child) collectQuoteSpans(child, out, inDouble)
  }
}

function buildPositionSet(spans: Array<[number, number]>): Set<number> {
  const set = new Set<number>()
  for (const [start, end] of spans) {
    for (let i = start; i < end; i++) {
      set.add(i)
    }
  }
  return set
}

function dropContainedSpans<T extends readonly [number, number, ...unknown[]]>(
  spans: T[],
): T[] {
  return spans.filter(
    (s, i) =>
      !spans.some(
        (other, j) =>
          j !== i &&
          other[0] <= s[0] &&
          other[1] >= s[1] &&
          (other[0] < s[0] || other[1] > s[1]),
      ),
  )
}

function removeSpans(command: string, spans: Array<[number, number]>): string {
  if (spans.length === 0) return command
  const sorted = dropContainedSpans(spans).sort((a, b) => b[0] - a[0])
  let result = command
  for (const [start, end] of sorted) {
    result = result.slice(0, start) + result.slice(end)
  }
  return result
}

function replaceSpansKeepQuotes(
  command: string,
  spans: Array<[number, number, string, string]>,
): string {
  if (spans.length === 0) return command
  const sorted = dropContainedSpans(spans).sort((a, b) => b[0] - a[0])
  let result = command
  for (const [start, end, open, close] of sorted) {
    result = result.slice(0, start) + open + close + result.slice(end)
  }
  return result
}

export function extractQuoteContext(
  rootNode: unknown,
  command: string,
): QuoteContext {
  const spans: QuoteSpans = { raw: [], ansiC: [], double: [], heredoc: [] }
  collectQuoteSpans(rootNode as TreeSitterNode, spans, false)
  const singleQuoteSpans = spans.raw
  const ansiCSpans = spans.ansiC
  const doubleQuoteSpans = spans.double
  const quotedHeredocSpans = spans.heredoc
  const allQuoteSpans = [
    ...singleQuoteSpans,
    ...ansiCSpans,
    ...doubleQuoteSpans,
    ...quotedHeredocSpans,
  ]

  const singleQuoteSet = buildPositionSet([
    ...singleQuoteSpans,
    ...ansiCSpans,
    ...quotedHeredocSpans,
  ])
  const doubleQuoteDelimSet = new Set<number>()
  for (const [start, end] of doubleQuoteSpans) {
    doubleQuoteDelimSet.add(start)
    doubleQuoteDelimSet.add(end - 1)
  }
  let withDoubleQuotes = ''
  for (let i = 0; i < command.length; i++) {
    if (singleQuoteSet.has(i)) continue
    if (doubleQuoteDelimSet.has(i)) continue
    withDoubleQuotes += command[i]
  }

  const fullyUnquoted = removeSpans(command, allQuoteSpans)

  const spansWithQuoteChars: Array<[number, number, string, string]> = []
  for (const [start, end] of singleQuoteSpans) {
    spansWithQuoteChars.push([start, end, "'", "'"])
  }
  for (const [start, end] of ansiCSpans) {
    spansWithQuoteChars.push([start, end, "$'", "'"])
  }
  for (const [start, end] of doubleQuoteSpans) {
    spansWithQuoteChars.push([start, end, '"', '"'])
  }
  for (const [start, end] of quotedHeredocSpans) {
    spansWithQuoteChars.push([start, end, '', ''])
  }
  const unquotedKeepQuoteChars = replaceSpansKeepQuotes(
    command,
    spansWithQuoteChars,
  )

  return { withDoubleQuotes, fullyUnquoted, unquotedKeepQuoteChars }
}

export function extractCompoundStructure(
  rootNode: unknown,
  command: string,
): CompoundStructure {
  const n = rootNode as TreeSitterNode
  const operators: string[] = []
  const segments: string[] = []
  let hasSubshell = false
  let hasCommandGroup = false
  let hasPipeline = false

  function walkTopLevel(node: TreeSitterNode): void {
    for (const child of node.children) {
      if (!child) continue

      if (child.type === 'list') {
        for (const listChild of child.children) {
          if (!listChild) continue
          if (listChild.type === '&&' || listChild.type === '||') {
            operators.push(listChild.type)
          } else if (
            listChild.type === 'list' ||
            listChild.type === 'redirected_statement'
          ) {
            walkTopLevel({ ...node, children: [listChild] } as TreeSitterNode)
          } else if (listChild.type === 'pipeline') {
            hasPipeline = true
            segments.push(listChild.text)
          } else if (listChild.type === 'subshell') {
            hasSubshell = true
            segments.push(listChild.text)
          } else if (listChild.type === 'compound_statement') {
            hasCommandGroup = true
            segments.push(listChild.text)
          } else {
            segments.push(listChild.text)
          }
        }
      } else if (child.type === ';') {
        operators.push(';')
      } else if (child.type === 'pipeline') {
        hasPipeline = true
        segments.push(child.text)
      } else if (child.type === 'subshell') {
        hasSubshell = true
        segments.push(child.text)
      } else if (child.type === 'compound_statement') {
        hasCommandGroup = true
        segments.push(child.text)
      } else if (
        child.type === 'command' ||
        child.type === 'declaration_command' ||
        child.type === 'variable_assignment'
      ) {
        segments.push(child.text)
      } else if (child.type === 'redirected_statement') {
        let foundInner = false
        for (const inner of child.children) {
          if (!inner || inner.type === 'file_redirect') continue
          foundInner = true
          walkTopLevel({ ...child, children: [inner] } as TreeSitterNode)
        }
        if (!foundInner) {
          segments.push(child.text)
        }
      } else if (child.type === 'negated_command') {
        segments.push(child.text)
        walkTopLevel(child)
      } else if (
        child.type === 'if_statement' ||
        child.type === 'while_statement' ||
        child.type === 'for_statement' ||
        child.type === 'case_statement' ||
        child.type === 'function_definition'
      ) {
        segments.push(child.text)
        walkTopLevel(child)
      }
    }
  }

  walkTopLevel(n)

  if (segments.length === 0) {
    segments.push(command)
  }

  return {
    hasCompoundOperators: operators.length > 0,
    hasPipeline,
    hasSubshell,
    hasCommandGroup,
    operators,
    segments,
  }
}

export function hasActualOperatorNodes(rootNode: unknown): boolean {
  const n = rootNode as TreeSitterNode

  function walk(node: TreeSitterNode): boolean {
    if (node.type === ';' || node.type === '&&' || node.type === '||') {
      return true
    }
    if (node.type === 'list') {
      return true
    }
    for (const child of node.children) {
      if (child && walk(child)) return true
    }
    return false
  }

  return walk(n)
}

export function extractDangerousPatterns(rootNode: unknown): DangerousPatterns {
  const n = rootNode as TreeSitterNode
  let hasCommandSubstitution = false
  let hasProcessSubstitution = false
  let hasParameterExpansion = false
  let hasHeredoc = false
  let hasComment = false

  function walk(node: TreeSitterNode): void {
    switch (node.type) {
      case 'command_substitution':
        hasCommandSubstitution = true
        break
      case 'process_substitution':
        hasProcessSubstitution = true
        break
      case 'expansion':
        hasParameterExpansion = true
        break
      case 'heredoc_redirect':
        hasHeredoc = true
        break
      case 'comment':
        hasComment = true
        break
    }
    for (const child of node.children) {
      if (child) walk(child)
    }
  }

  walk(n)

  return {
    hasCommandSubstitution,
    hasProcessSubstitution,
    hasParameterExpansion,
    hasHeredoc,
    hasComment,
  }
}

export function analyzeCommand(
  rootNode: unknown,
  command: string,
): TreeSitterAnalysis {
  return {
    quoteContext: extractQuoteContext(rootNode, command),
    compoundStructure: extractCompoundStructure(rootNode, command),
    hasActualOperatorNodes: hasActualOperatorNodes(rootNode),
    dangerousPatterns: extractDangerousPatterns(rootNode),
  }
}
