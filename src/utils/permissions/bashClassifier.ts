/**
 * Bash command classifier — adapted from CC's utils/permissions/bashClassifier.ts
 *
 * Stubs for the AI-based bash command classification system.
 * In CC, this is an ant-only feature. QiLing implements the interface
 * but returns no-match results (disabled).
 *
 * The interface is preserved for potential future implementation.
 */

export const PROMPT_PREFIX = 'prompt:'

export type ClassifierResult = {
  matches: boolean
  matchedDescription?: string
  confidence: 'high' | 'medium' | 'low'
  reason: string
}

export type ClassifierBehavior = 'deny' | 'ask' | 'allow'

export function extractPromptDescription(
  _ruleContent: string | undefined,
): string | null {
  return null
}

export function createPromptRuleContent(description: string): string {
  return `${PROMPT_PREFIX} ${description.trim()}`
}

export function isClassifierPermissionsEnabled(): boolean {
  return process.env.QILING_CLASSIFIER_PERMISSIONS === '1'
}

export function getBashPromptDenyDescriptions(_context: unknown): string[] {
  return []
}

export function getBashPromptAskDescriptions(_context: unknown): string[] {
  return []
}

export function getBashPromptAllowDescriptions(_context: unknown): string[] {
  return []
}

/**
 * Classify a bash command against a set of descriptions.
 * Returns no-match when classifier is disabled.
 */
export async function classifyBashCommand(
  _command: string,
  _cwd: string,
  _descriptions: string[],
  _behavior: ClassifierBehavior,
  _signal: AbortSignal,
  _isNonInteractiveSession: boolean,
): Promise<ClassifierResult> {
  return {
    matches: false,
    confidence: 'high',
    reason: 'Classifier disabled in QiLing',
  }
}
