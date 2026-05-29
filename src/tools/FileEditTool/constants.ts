// In its own file to avoid circular dependencies — CC pattern
export const FILE_EDIT_TOOL_NAME = 'FileEdit'

export const FILE_UNEXPECTEDLY_MODIFIED_ERROR =
  'File has been unexpectedly modified. Read it again before attempting to write it.'

// Permission patterns for .qiling/ folder access
export const QILING_FOLDER_PERMISSION_PATTERN = '/.qiling/**'
export const GLOBAL_QILING_FOLDER_PERMISSION_PATTERN = '~/.qiling/**'
// CC-compat aliases (filesystem.ts port)
export const CLAUDE_FOLDER_PERMISSION_PATTERN = QILING_FOLDER_PERMISSION_PATTERN
export const GLOBAL_CLAUDE_FOLDER_PERMISSION_PATTERN = GLOBAL_QILING_FOLDER_PERMISSION_PATTERN
