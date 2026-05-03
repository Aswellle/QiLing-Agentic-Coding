/**
 * Array utility functions — ported from CC's utils/array.ts (verbatim)
 */

export function intersperse<A>(as: A[], separator: (index: number) => A): A[] {
  return as.flatMap((a, i) => (i ? [separator(i), a] : [a]))
}

export function count<T>(arr: readonly T[], pred: (x: T) => unknown): number {
  let n = 0
  for (const x of arr) n += +!!pred(x)
  return n
}

export function uniq<T>(xs: Iterable<T>): T[] {
  return [...new Set(xs)]
}
