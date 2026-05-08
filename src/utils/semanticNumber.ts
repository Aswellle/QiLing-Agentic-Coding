/**
 * Semantic number Zod schema — ported from CC's utils/semanticNumber.ts
 *
 * Accepts numeric strings like "30", "-5", "3.14" in addition to numbers.
 * Only valid decimal number literals are coerced (not "" or null).
 * Emits {"type":"number"} to the API schema (invisible to model).
 */

import { z } from 'zod'

export function semanticNumber<T extends z.ZodType>(
  inner: T = z.number() as unknown as T,
) {
  return z.preprocess(
    (v: unknown) =>
      typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v) ? Number(v) : v,
    inner,
  )
}
