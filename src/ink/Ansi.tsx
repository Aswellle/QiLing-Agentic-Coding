/**
 * Ansi component — adapted from CC's ink/Ansi.tsx
 *
 * Parses ANSI escape codes and renders them as Ink Text components.
 * Use as an escape hatch for pre-formatted ANSI strings from external tools
 * (e.g. cli-highlight). Memoized to prevent re-renders when string is unchanged.
 */

import React from 'react'
import { Text } from 'ink'
import Link from './components/Link.js'
import { type NamedColor, Parser, type Color as TermioColor, type TextStyle } from './termio.js'

type Props = {
  children: string
  dimColor?: boolean
}

type SpanProps = {
  color?: string
  backgroundColor?: string
  dim?: boolean
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strikethrough?: boolean
  inverse?: boolean
  hyperlink?: string
}

const NAMED_COLOR_MAP: Record<NamedColor, string> = {
  black: 'black', red: 'red', green: 'green', yellow: 'yellow',
  blue: 'blue', magenta: 'magenta', cyan: 'cyan', white: 'white',
  brightBlack: 'blackBright', brightRed: 'redBright', brightGreen: 'greenBright',
  brightYellow: 'yellowBright', brightBlue: 'blueBright', brightMagenta: 'magentaBright',
  brightCyan: 'cyanBright', brightWhite: 'whiteBright',
}

function colorToString(color: TermioColor): string | undefined {
  switch (color.type) {
    case 'named': return NAMED_COLOR_MAP[color.name]
    case 'indexed': return `#${color.index.toString(16).padStart(2, '0').repeat(3)}`
    case 'rgb': return `rgb(${color.r},${color.g},${color.b})`
    case 'default': return undefined
  }
}

function textStyleToSpanProps(style: TextStyle): SpanProps {
  const props: SpanProps = {}
  if (style.bold) props.bold = true
  if (style.dim) props.dim = true
  if (style.italic) props.italic = true
  if (style.underline !== 'none') props.underline = true
  if (style.strikethrough) props.strikethrough = true
  if (style.inverse) props.inverse = true
  const fg = colorToString(style.fg)
  if (fg) props.color = fg
  const bg = colorToString(style.bg)
  if (bg) props.backgroundColor = bg
  return props
}

function propsEqual(a: SpanProps, b: SpanProps): boolean {
  return a.color === b.color && a.backgroundColor === b.backgroundColor &&
    a.bold === b.bold && a.dim === b.dim && a.italic === b.italic &&
    a.underline === b.underline && a.strikethrough === b.strikethrough &&
    a.inverse === b.inverse && a.hyperlink === b.hyperlink
}

function hasAnyProps(p: SpanProps): boolean {
  return p.color !== undefined || p.backgroundColor !== undefined ||
    p.dim === true || p.bold === true || p.italic === true ||
    p.underline === true || p.strikethrough === true || p.inverse === true || p.hyperlink !== undefined
}

function hasAnyTextProps(p: SpanProps): boolean {
  return p.color !== undefined || p.backgroundColor !== undefined ||
    p.dim === true || p.bold === true || p.italic === true ||
    p.underline === true || p.strikethrough === true || p.inverse === true
}

type Span = { text: string; props: SpanProps }

function parseToSpans(input: string): Span[] {
  const parser = new Parser()
  const actions = parser.feed(input)
  const spans: Span[] = []
  let currentHyperlink: string | undefined

  for (const action of actions) {
    if (action.type === 'link') {
      currentHyperlink = action.action.type === 'start' ? action.action.url : undefined
      continue
    }
    if (action.type === 'text') {
      const text = action.graphemes.map(g => g.value).join('')
      if (!text) continue
      const props = textStyleToSpanProps(action.style)
      if (currentHyperlink) props.hyperlink = currentHyperlink
      const lastSpan = spans[spans.length - 1]
      if (lastSpan && propsEqual(lastSpan.props, props)) lastSpan.text += text
      else spans.push({ text, props })
    }
  }
  return spans
}

function StyledText({ bold, dim, children, ...rest }: SpanProps & { children: string }): React.ReactNode {
  if (dim) return <Text {...rest} dimColor>{children}</Text>
  if (bold) return <Text {...rest} bold>{children}</Text>
  return <Text {...rest}>{children}</Text>
}

export const Ansi = React.memo(function Ansi({ children, dimColor }: Props): React.ReactNode {
  if (typeof children !== 'string') {
    return dimColor ? <Text dimColor>{String(children)}</Text> : <Text>{String(children)}</Text>
  }
  if (children === '') return null

  const spans = parseToSpans(children)
  if (spans.length === 0) return null

  if (spans.length === 1 && !hasAnyProps(spans[0]!.props)) {
    return dimColor ? <Text dimColor>{spans[0]!.text}</Text> : <Text>{spans[0]!.text}</Text>
  }

  const content = spans.map((span, i) => {
    const hyperlink = span.props.hyperlink
    if (dimColor) span.props.dim = true
    const hasText = hasAnyTextProps(span.props)

    if (hyperlink) {
      return hasText
        ? <Link key={i} url={hyperlink}><StyledText {...span.props}>{span.text}</StyledText></Link>
        : <Link key={i} url={hyperlink}>{span.text}</Link>
    }
    return hasText
      ? <StyledText key={i} {...span.props}>{span.text}</StyledText>
      : span.text
  })

  return dimColor ? <Text dimColor>{content}</Text> : <Text>{content}</Text>
})
