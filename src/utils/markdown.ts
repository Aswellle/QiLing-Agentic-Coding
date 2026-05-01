import chalk from 'chalk'

/**
 * Render markdown-ish text for terminal output using chalk.
 * Handles: headers, bold, code blocks, inline code, bullets.
 */
export function renderMarkdown(text: string): string {
  const lines = text.split('\n')
  const result: string[] = []
  let inCodeBlock = false
  let codeLang = ''

  for (const line of lines) {
    // Code block fences
    if (line.startsWith('```')) {
      if (!inCodeBlock) {
        inCodeBlock = true
        codeLang = line.slice(3).trim()
        result.push(chalk.gray('─'.repeat(40)))
        continue
      } else {
        inCodeBlock = false
        result.push(chalk.gray('─'.repeat(40)))
        continue
      }
    }

    if (inCodeBlock) {
      result.push(chalk.green(line))
      continue
    }

    // H1/H2/H3
    if (line.startsWith('### ')) {
      result.push(chalk.cyan.bold(line.slice(4)))
      continue
    }
    if (line.startsWith('## ')) {
      result.push(chalk.cyan.bold(line.slice(3)))
      continue
    }
    if (line.startsWith('# ')) {
      result.push(chalk.white.bold.underline(line.slice(2)))
      continue
    }

    // Horizontal rule
    if (/^[-*_]{3,}$/.test(line.trim())) {
      result.push(chalk.gray('─'.repeat(50)))
      continue
    }

    // Bullet points
    let processed = line
    if (/^(\s*)[*\-+] /.test(processed)) {
      processed = processed.replace(/^(\s*)[*\-+] /, (_, indent) => `${indent}${chalk.cyan('•')} `)
    }

    // Numbered list items
    processed = processed.replace(/^(\s*)(\d+)\. /, (_, indent, num) =>
      `${indent}${chalk.cyan(`${num}.`)} `
    )

    // Inline formatting (applied to non-code-block lines)
    // Bold: **text** or __text__
    processed = processed.replace(/\*\*(.+?)\*\*/g, (_, t) => chalk.bold(t))
    processed = processed.replace(/__(.+?)__/g, (_, t) => chalk.bold(t))

    // Italic: *text* or _text_
    processed = processed.replace(/(?<![*_])\*(?!\s)(.+?)(?<!\s)\*(?![*_])/g, (_, t) => chalk.italic(t))

    // Inline code: `code`
    processed = processed.replace(/`([^`]+)`/g, (_, t) => chalk.yellow(`\`${t}\``))

    result.push(processed)
  }

  return result.join('\n')
}

/**
 * Simple diff renderer for FileEdit output.
 * Shows removed lines in red, added lines in green.
 */
export function renderDiff(oldStr: string, newStr: string, filePath: string): string {
  const oldLines = oldStr.split('\n')
  const newLines = newStr.split('\n')
  const lines: string[] = [chalk.bold(`── ${filePath} ──────────────────`)]

  // Simple line-by-line diff (sufficient for short edits)
  let oldIdx = 0
  let newIdx = 0

  while (oldIdx < oldLines.length || newIdx < newLines.length) {
    const old = oldLines[oldIdx]
    const nw = newLines[newIdx]

    if (oldIdx >= oldLines.length) {
      lines.push(chalk.green(`+ ${nw}`))
      newIdx++
    } else if (newIdx >= newLines.length) {
      lines.push(chalk.red(`- ${old}`))
      oldIdx++
    } else if (old === nw) {
      lines.push(chalk.gray(`  ${old}`))
      oldIdx++
      newIdx++
    } else {
      lines.push(chalk.red(`- ${old}`))
      lines.push(chalk.green(`+ ${nw}`))
      oldIdx++
      newIdx++
    }
  }

  return lines.join('\n')
}
