/**
 * Semantic boolean Zod schema — ported from CC's utils/semanticBoolean.ts
 *
 * Accepts "true"/"false" strings in addition to booleans.
 * The model sometimes quotes booleans — this coerces them transparently.
 * Emits {"type":"boolean"} to the API schema (invisible to model).
 */

import { z } from 'zod'

export function semanticBoolean<T extends z.ZodType>(
  inner: T = z.boolean() as unknown as T,
) {
  return z.preprocess(
    (v: unknown) => (v === 'true' ? true : v === 'false' ? false : v),
    inner,
  )
}
