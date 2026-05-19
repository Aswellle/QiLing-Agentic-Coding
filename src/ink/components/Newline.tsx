/**
 * Newline component — adapted from CC's ink/components/Newline.tsx
 * Inserts N newline characters inside a Text component.
 */

import React from 'react'

export type Props = {
  readonly count?: number
}

export default function Newline({ count = 1 }: Props) {
  return <>{'\n'.repeat(count)}</>
}
