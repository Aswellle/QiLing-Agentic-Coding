/**
 * Extended Key type — CC's ink fork adds fields to ink's useInput Key.
 *
 * npm ink's Key lacks fn/home/end/wheelUp/wheelDown. They are optional here:
 * ink's runtime never sets them, so branches reading them are unreachable
 * until the CC input layer (parse-keypress → InputEvent → useInput) is wired
 * in. Keeping the fields lets CC-ported key-routing control flow compile
 * verbatim. Home/End still work via their raw CSI fallbacks in consumers.
 */

import type { Key as InkKey } from 'ink'

export type Key = InkKey & {
  readonly fn?: boolean
  readonly home?: boolean
  readonly end?: boolean
  readonly wheelUp?: boolean
  readonly wheelDown?: boolean
}
