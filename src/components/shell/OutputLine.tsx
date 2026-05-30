import * as React from 'react'
import { useMemo } from 'react'
import { useTerminalSize } from '../../hooks/useTerminalSize.js'
import { Ansi } from '../../ink/Ansi.js'
import { Text } from 'ink'
import { createHyperlink } from '../../utils/hyperlink.js'
import { jsonParse, jsonStringify } from '../../utils/slowOperations.js'
import { renderTruncatedContent } from '../../utils/terminal.js'
import { MessageResponse } from '../MessageResponse.js'
import { InVirtualListContext } from '../CtrlOToExpand.js'
import { useExpandShellOutput } from './ExpandShellOutputContext.js'

export function tryFormatJson(line: string): string {
  try {
    const parsed = jsonParse(line)
    const stringified = jsonStringify(parsed)

    const normalizedOriginal = line.replace(/\\\//g, '/').replace(/\s+/g, '')
    const normalizedStringified = stringified.replace(/\s+/g, '')
    if (normalizedOriginal !== normalizedStringified) {
      return line
    }

    return jsonStringify(parsed, null, 2)
  } catch {
    return line
  }
}

const MAX_JSON_FORMAT_LENGTH = 10_000

export function tryJsonFormatContent(content: string): string {
  if (content.length > MAX_JSON_FORMAT_LENGTH) {
    return content
  }
  const allLines = content.split('\n')
  return allLines.map(tryFormatJson).join('\n')
}

// Match http(s) URLs inside JSON string values
const URL_IN_JSON = /https?:\/\/[^\s"'<>\\]+/g

export function linkifyUrlsInText(content: string): string {
  return content.replace(URL_IN_JSON, url => createHyperlink(url))
}

export function OutputLine({
  content,
  verbose,
  isError,
  isWarning,
  linkifyUrls,
}: {
  content: string
  verbose: boolean
  isError?: boolean
  isWarning?: boolean
  linkifyUrls?: boolean
}): React.ReactNode {
  const { columns } = useTerminalSize()
  const expandShellOutput = useExpandShellOutput()
  const inVirtualList = React.useContext(InVirtualListContext)
  const shouldShowFull = verbose || expandShellOutput

  const formattedContent = useMemo(() => {
    let formatted = tryJsonFormatContent(content)
    if (linkifyUrls) {
      formatted = linkifyUrlsInText(formatted)
    }
    if (shouldShowFull) {
      return stripUnderlineAnsi(formatted)
    }
    return stripUnderlineAnsi(
      renderTruncatedContent(formatted, columns, inVirtualList),
    )
  }, [content, shouldShowFull, columns, linkifyUrls, inVirtualList])

  const color = isError ? 'error' : isWarning ? 'warning' : undefined

  return (
    <MessageResponse>
      <Text color={color}>
        <Ansi>{formattedContent}</Ansi>
      </Text>
    </MessageResponse>
  )
}

/**
 * Underline ANSI codes tend to leak out. Strip them specifically without
 * removing all ANSI formatting.
 */
export function stripUnderlineAnsi(content: string): string {
  return content.replace(
    // eslint-disable-next-line no-control-regex
    /\[([0-9]+;)*4(;[0-9]+)*m|\[4(;[0-9]+)*m|\[([0-9]+;)*4m/g,
    '',
  )
}
