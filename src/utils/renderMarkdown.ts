/**
 * Markdown → Ink-compatible plain text renderer.
 * Converts Markdown syntax into terminal-friendly output using ANSI escape codes.
 * Not a full parser — covers the common patterns in AI responses.
 */

// ANSI escape helpers (Ink renders these natively)
const RESET = '\x1b[0m'
const BOLD = '\x1b[1m'
const DIM = '\x1b[2m'
const CYAN = '\x1b[36m'
const YELLOW = '\x1b[33m'
const GREEN = '\x1b[32m'
const GRAY = '\x1b[90m'
const BG_GRAY = '\x1b[100m'

const bold = (s: string) => `${BOLD}${s}${RESET}`
const dim = (s: string) => `${DIM}${s}${RESET}`
const cyan = (s: string) => `${CYAN}${s}${RESET}`
const yellow = (s: string) => `${YELLOW}${s}${RESET}`
const green = (s: string) => `${GREEN}${s}${RESET}`
const gray = (s: string) => `${GRAY}${s}${RESET}`

// Simple syntax keywords for code blocks
const TS_KEYWORDS = /\b(const|let|var|function|async|await|return|import|export|type|interface|class|extends|implements|if|else|for|while|switch|case|break|continue|new|this|typeof|instanceof|void|null|undefined|true|false)\b/g
const PY_KEYWORDS = /\b(def|class|import|from|return|if|elif|else|for|while|in|not|and|or|is|None|True|False|try|except|raise|with|as|pass|break|continue|lambda|yield)\b/g

function highlightCode(code: string, lang: string): string {
  const lower = lang.toLowerCase()
  let result = code
    .replace(/</g, '‹').replace(/>/g, '›')  // avoid HTML-like confusion

  if (lower === 'typescript' || lower === 'ts' || lower === 'javascript' || lower === 'js') {
    result = result
      .replace(TS_KEYWORDS, m => `${CYAN}${m}${RESET}`)
      .replace(/(["'`])([^"'`\n]*)\1/g, m => `${GREEN}${m}${RESET}`)
      .replace(/(\/\/[^\n]*)/g, m => `${GRAY}${m}${RESET}`)
  } else if (lower === 'python' || lower === 'py') {
    result = result
      .replace(PY_KEYWORDS, m => `${CYAN}${m}${RESET}`)
      .replace(/(["'])([^"'\n]*)\1/g, m => `${GREEN}${m}${RESET}`)
      .replace(/(#[^\n]*)/g, m => `${GRAY}${m}${RESET}`)
  } else if (lower === 'bash' || lower === 'sh' || lower === 'shell') {
    result = result
      .replace(/\$\w+/g, m => `${YELLOW}${m}${RESET}`)
      .replace(/(#[^\n]*)/g, m => `${GRAY}${m}${RESET}`)
  }
  return result
}

function renderInline(text: string): string {
  return text
    // **bold** or __bold__
    .replace(/\*\*([^*]+)\*\*|__([^_]+)__/g, (_, a, b) => bold(a ?? b))
    // *italic* or _italic_ (single)
    .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)|(?<!_)_([^_\n]+)_(?!_)/g, (_, a, b) => dim(a ?? b))
    // `inline code`
    .replace(/`([^`]+)`/g, (_, code) => `${BG_GRAY}${cyan(` ${code} `)}${RESET}`)
    // [link text](url)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, url) => `${green(text)} ${gray(`(${url})`)}`)
}

interface RenderedLine {
  text: string
  indent?: number
  dim?: boolean
}

export function renderMarkdown(input: string): RenderedLine[] {
  const lines = input.split('\n')
  const output: RenderedLine[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]!

    // ── Code block ─────────────────────────────────────────────────────────
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim()
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i]!.startsWith('```')) {
        codeLines.push(lines[i]!)
        i++
      }
      i++ // skip closing ```

      const highlighted = highlightCode(codeLines.join('\n'), lang)
      const langLabel = lang ? gray(` ${lang} `) : ''
      output.push({ text: gray(`┌─${langLabel}${'─'.repeat(Math.max(0, 30 - lang.length))}`) })
      for (const codeLine of highlighted.split('\n')) {
        output.push({ text: `${gray('│')} ${codeLine}`, indent: 0 })
      }
      output.push({ text: gray('└' + '─'.repeat(31)) })
      continue
    }

    // ── Headings ────────────────────────────────────────────────────────────
    if (line.startsWith('### ')) {
      output.push({ text: bold(yellow(line.slice(4))) })
      i++; continue
    }
    if (line.startsWith('## ')) {
      output.push({ text: '' })
      output.push({ text: bold(yellow(line.slice(3))) })
      output.push({ text: yellow('─'.repeat(Math.min(line.length - 3, 40))) })
      i++; continue
    }
    if (line.startsWith('# ')) {
      output.push({ text: '' })
      output.push({ text: bold(yellow('═'.repeat(40))) })
      output.push({ text: bold(yellow(line.slice(2))) })
      output.push({ text: bold(yellow('═'.repeat(40))) })
      i++; continue
    }

    // ── Blockquote ──────────────────────────────────────────────────────────
    if (line.startsWith('> ')) {
      output.push({ text: gray(`▎ ${renderInline(line.slice(2))}`) })
      i++; continue
    }

    // ── Horizontal rule ─────────────────────────────────────────────────────
    if (/^[-*_]{3,}$/.test(line.trim())) {
      output.push({ text: gray('─'.repeat(40)) })
      i++; continue
    }

    // ── Unordered list ──────────────────────────────────────────────────────
    if (/^(\s*)[-*+] /.test(line)) {
      const indent = line.match(/^(\s*)/)?.[1].length ?? 0
      const content = line.replace(/^\s*[-*+] /, '')
      output.push({ text: `${'  '.repeat(indent / 2)}${cyan('•')} ${renderInline(content)}` })
      i++; continue
    }

    // ── Ordered list ────────────────────────────────────────────────────────
    if (/^\d+\. /.test(line)) {
      const num = line.match(/^(\d+)\. /)?.[1] ?? '1'
      const content = line.replace(/^\d+\. /, '')
      output.push({ text: `${cyan(num + '.')} ${renderInline(content)}` })
      i++; continue
    }

    // ── Table ───────────────────────────────────────────────────────────────
    if (line.includes('|') && line.trim().startsWith('|')) {
      const tableLines: string[] = []
      while (i < lines.length && lines[i]!.includes('|')) {
        tableLines.push(lines[i]!)
        i++
      }
      for (const tl of renderTable(tableLines)) {
        output.push({ text: tl })
      }
      continue
    }

    // ── Plain line ───────────────────────────────────────────────────────────
    output.push({ text: renderInline(line) })
    i++
  }

  return output
}

function renderTable(lines: string[]): string[] {
  const rows = lines
    .filter(l => !/^\s*\|[-| :]+\|\s*$/.test(l))  // skip separator row
    .map(l =>
      l.split('|')
        .slice(1, -1)
        .map(c => c.trim())
    )

  if (rows.length === 0) return lines
  const colWidths = rows[0]!.map((_, ci) =>
    Math.max(...rows.map(r => (r[ci] ?? '').length))
  )

  const result: string[] = []
  for (let ri = 0; ri < rows.length; ri++) {
    const row = rows[ri]!
    const cells = row.map((cell, ci) => {
      const padded = cell.padEnd(colWidths[ci] ?? 0)
      return ri === 0 ? bold(cyan(padded)) : padded
    })
    result.push(`${gray('│')} ${cells.join(` ${gray('│')} `)} ${gray('│')}`)
    if (ri === 0) {
      result.push(gray('├' + colWidths.map(w => '─'.repeat(w + 2)).join('┼') + '┤'))
    }
  }
  return result
}

/** Convert rendered lines back to a plain string for Ink's <Text> */
export function flattenRendered(lines: RenderedLine[]): string {
  return lines.map(l => l.text).join('\n')
}

/** Full pipeline: markdown string → display string */
export function markdownToText(input: string): string {
  return flattenRendered(renderMarkdown(input))
}
