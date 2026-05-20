/**
 * StructuredDiffList — adapted from CC's components/StructuredDiffList.tsx
 *
 * Renders a list of diff hunks with "..." separators between them.
 * Uses StructuredDiff for each hunk (stub until StructuredDiff is ported).
 */

import React from 'react'
import type { StructuredPatchHunk } from 'diff'
import { Box, Text } from 'ink'
import { NoSelect } from '../ink/components/NoSelect.js'
import { intersperse } from '../utils/array.js'

type Props = {
  hunks: StructuredPatchHunk[]
  dim: boolean
  width: number
  filePath: string
  firstLine: string | null
  fileContent?: string
}

// Stub StructuredDiff (renders hunk summary until full component is ported)
function StructuredDiffStub({ patch, dim }: { patch: StructuredPatchHunk; dim: boolean }): React.ReactNode {
  const additions = patch.lines.filter(l => l.startsWith('+')).length
  const removals = patch.lines.filter(l => l.startsWith('-')).length
  return (
    <Box flexDirection="column">
      <Text dimColor={dim}>
        @@ -{patch.oldStart},{patch.oldLines} +{patch.newStart},{patch.newLines} @@
        {additions > 0 ? ` +${additions}` : ''}{removals > 0 ? ` -${removals}` : ''}
      </Text>
    </Box>
  )
}

export function StructuredDiffList({ hunks, dim, width: _width, filePath: _filePath, firstLine: _firstLine, fileContent: _fileContent }: Props): React.ReactNode {
  return intersperse(
    hunks.map(hunk => (
      <Box flexDirection="column" key={hunk.newStart}>
        <StructuredDiffStub patch={hunk} dim={dim} />
      </Box>
    )),
    i => (
      <NoSelect fromLeftEdge key={`ellipsis-${i}`}>
        <Text dimColor>...</Text>
      </NoSelect>
    ),
  )
}
