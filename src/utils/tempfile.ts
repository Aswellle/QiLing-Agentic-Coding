/**
 * Temp file path generation — ported from CC's utils/tempfile.ts (verbatim)
 *
 * contentHash option: produces stable paths for same content (cache-friendly)
 */

import { createHash, randomUUID } from 'crypto'
import { tmpdir } from 'os'
import { join } from 'path'

export function generateTempFilePath(
  prefix = 'qiling-prompt',
  extension = '.md',
  options?: { contentHash?: string },
): string {
  const id = options?.contentHash
    ? createHash('sha256').update(options.contentHash).digest('hex').slice(0, 16)
    : randomUUID()
  return join(tmpdir(), `${prefix}-${id}${extension}`)
}
