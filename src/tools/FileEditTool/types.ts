/**
 * FileEdit tool input types — adapted from CC's tools/FileEditTool/types.ts
 *
 * Defines the input schema and types for the FileEdit tool.
 */

import { z } from 'zod'

export const fileEditInputSchema = z.object({
  file_path: z.string().describe('The absolute path to the file to modify'),
  old_string: z.string().describe('The text to replace'),
  new_string: z.string().describe('The text to replace it with (must be different from old_string)'),
  replace_all: z.boolean().default(false).optional()
    .describe('Replace all occurrences of old_string (default false)'),
})

export type FileEditInput = z.output<typeof fileEditInputSchema>

/** Individual edit without file_path (for batch edits) */
export type EditInput = Omit<FileEditInput, 'file_path'>

/** Result of a file edit operation */
export type FileEditResult = {
  success: boolean
  filePath: string
  oldString: string
  newString: string
  replaceAll: boolean
  occurrencesReplaced?: number
  error?: string
}
