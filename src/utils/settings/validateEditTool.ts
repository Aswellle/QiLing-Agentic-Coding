import type { ValidationResult } from '../../Tool.js'
import { isClaudeSettingsPath } from '../permissions/filesystem.js'
import { validateSettingsFileContent } from './validation.js'

/**
 * Validates settings file edits to ensure the result conforms to SettingsSchema.
 * Used by FileEditTool to avoid code duplication.
 */
export function validateInputForSettingsFileEdit(
  filePath: string,
  originalContent: string,
  getUpdatedContent: () => string,
): Extract<ValidationResult, { result: false }> | null {
  if (!isClaudeSettingsPath(filePath)) {
    return null
  }

  const beforeValidation = validateSettingsFileContent(originalContent)

  if (!beforeValidation.isValid) {
    return null
  }

  const updatedContent = getUpdatedContent()
  const afterValidation = validateSettingsFileContent(updatedContent)

  if (!afterValidation.isValid) {
    return {
      result: false,
      // // NAME: Claude Code - settings file reference
      message: `Claude Code settings.json validation failed after edit:\n${afterValidation.error}\n\nFull schema:\n${afterValidation.fullSchema}\nIMPORTANT: Do not update the env unless explicitly instructed to do so.`,
    }
  }

  return null
}
