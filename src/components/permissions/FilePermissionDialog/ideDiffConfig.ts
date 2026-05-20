/**
 * IDE diff configuration types — adapted from CC's components/permissions/FilePermissionDialog/ideDiffConfig.ts
 *
 * Types for diff-in-IDE integration: file edits, diff configs, and support interface.
 */

export type ToolInput = Record<string, unknown>

export interface FileEdit {
  old_string: string
  new_string: string
  replace_all?: boolean
}

export interface IDEDiffConfig {
  filePath: string
  edits?: FileEdit[]
  editMode?: 'single' | 'multiple'
}

export interface IDEDiffChangeInput {
  file_path: string
  edits: FileEdit[]
}

export interface IDEDiffSupport<TInput extends ToolInput> {
  getConfig(input: TInput): IDEDiffConfig
  applyChanges(input: TInput, modifiedEdits: FileEdit[]): TInput
}

export function createSingleEditDiffConfig(filePath: string, oldString: string, newString: string, replaceAll?: boolean): IDEDiffConfig {
  return { filePath, edits: [{ old_string: oldString, new_string: newString, replace_all: replaceAll }], editMode: 'single' }
}
