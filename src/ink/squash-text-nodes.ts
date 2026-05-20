/**
 * Squash text nodes into styled segments — adapted from CC's ink/squash-text-nodes.ts
 *
 * Traverses a DOM subtree and collects text segments with their associated styles
 * and hyperlinks. Used for structured rendering without ANSI string transforms.
 */

type TextStyles = Record<string, unknown>

type DOMElement = {
  nodeName: string
  childNodes: DOMElement[]
  nodeValue?: string
  textStyles?: TextStyles
  attributes?: Record<string, unknown>
}

export type StyledSegment = {
  text: string
  styles: TextStyles
  hyperlink?: string
}

export function squashTextNodesToSegments(
  node: DOMElement,
  inheritedStyles: TextStyles = {},
  inheritedHyperlink?: string,
  out: StyledSegment[] = [],
): StyledSegment[] {
  const mergedStyles = node.textStyles ? { ...inheritedStyles, ...node.textStyles } : inheritedStyles

  for (const child of node.childNodes) {
    if (child === undefined) continue
    if (child.nodeName === '#text') {
      if (child.nodeValue && child.nodeValue.length > 0) {
        out.push({ text: child.nodeValue, styles: mergedStyles, hyperlink: inheritedHyperlink })
      }
    } else if (child.nodeName === 'ink-text' || child.nodeName === 'ink-virtual-text') {
      squashTextNodesToSegments(child, mergedStyles, inheritedHyperlink, out)
    } else if (child.nodeName === 'ink-link') {
      const href = child.attributes?.['href'] as string | undefined
      squashTextNodesToSegments(child, mergedStyles, href || inheritedHyperlink, out)
    }
  }
  return out
}

function squashTextNodes(node: DOMElement): string {
  let text = ''
  for (const child of node.childNodes) {
    if (child === undefined) continue
    if (child.nodeName === '#text') text += child.nodeValue ?? ''
    else if (child.nodeName === 'ink-text' || child.nodeName === 'ink-virtual-text') text += squashTextNodes(child)
    else if (child.nodeName === 'ink-link') text += squashTextNodes(child)
  }
  return text
}

export default squashTextNodes
