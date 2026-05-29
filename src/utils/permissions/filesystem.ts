// FROM CC: utils/permissions/filesystem.ts (adapt-new)
// Changes: removed bun-bundle/ANT analytics/Statsig; inline stubs for
// memdir/agentMemory/settings/containsVulnerableUncPath; adapted getPlanSlug/
// getPlansDirectory signatures; feature()=false; MACRO.VERSION='0.0.0';
// isScratchpadEnabled=false; PermissionDecisionReason mode/workingDir/safetyCheck→other;
// tool.getPath cast as any.

import ignore from 'ignore'
import memoize from 'lodash-es/memoize.js'
import { randomBytes } from 'crypto'
import { homedir, tmpdir } from 'os'
import { join, normalize, posix, sep } from 'path'
import { getOriginalCwd, getSessionId } from '../../bootstrap/state.js'
import type { AnyObject, Tool, ToolPermissionContext } from '../../Tool.js'
import type { z } from 'zod'
import {
  CLAUDE_FOLDER_PERMISSION_PATTERN,
  FILE_EDIT_TOOL_NAME,
  GLOBAL_CLAUDE_FOLDER_PERMISSION_PATTERN,
} from '../../tools/FileEditTool/constants.js'
import { FILE_READ_TOOL_NAME } from '../../tools/FileReadTool/prompt.js'
import { getCwd } from '../cwd.js'
import { getClaudeConfigHomeDir } from '../envUtils.js'
import {
  getFsImplementation,
  getPathsForPermissionCheck,
} from '../fsOperations.js'
import {
  containsPathTraversal,
  expandPath,
  getDirectoryForPath,
  sanitizePath,
} from '../path.js'
import { getPlanSlug, getPlansDirectory } from '../plans.js'
import { getPlatform } from '../platform.js'
import { getProjectDir } from '../sessionStorage.js'
import { getToolResultsDir } from '../toolResultStorage.js'
import { windowsPathToPosixPath } from '../windowsPaths.js'
import type { PermissionDecision, PermissionResult } from './PermissionResult.js'
import type { PermissionRule, PermissionRuleSource } from './PermissionRule.js'
import { createReadRuleSuggestion } from './PermissionUpdate.js'
import type { PermissionUpdate } from './PermissionUpdateSchema.js'
import { getRuleByContentsForToolName } from './permissions.js'

// ─── Inline stubs for CC-only dependencies ───────────────────────────────────

// ANT-only: memdir not in QiLing
const hasAutoMemPathOverride = () => false
const isAutoMemPath = (_path: string) => false

// AgentTool memory path stub
const isAgentMemoryPath = (_path: string) => false

// Windows UNC path detection (defense-in-depth; full impl in CC's readOnlyCommandValidation.ts)
// LOC: vulnerable unc path detection
function containsVulnerableUncPath(path: string): boolean {
  return /^(\\\\|\/\/)/.test(path)
}

// Settings stubs — QiLing settings API differs from CC
// LOC: settings source paths
const SETTING_SOURCES: PermissionRuleSource[] = ['session', 'project', 'global', 'policy']
function getSettingsFilePathForSource(_source: PermissionRuleSource): string | undefined {
  return undefined
}
function getSettingsRootPathForSource(_source: PermissionRuleSource): string {
  return getOriginalCwd()
}

// Scratchpad (Statsig gate in CC, always false in QiLing)
// LOC: isScratchpadEnabled
const isScratchpadEnabled = () => false

// ANT-only build macro
const MACRO_VERSION = '0.0.0'

const DIR_SEP = posix.sep

// ─── Constants ────────────────────────────────────────────────────────────────

export const DANGEROUS_FILES = [
  '.gitconfig',
  '.gitmodules',
  '.bashrc',
  '.bash_profile',
  '.zshrc',
  '.zprofile',
  '.profile',
  '.ripgreprc',
  '.mcp.json',
  '.claude.json',
] as const

export const DANGEROUS_DIRECTORIES = [
  '.git',
  '.vscode',
  '.idea',
  '.claude',
] as const

// ─── Utility functions ────────────────────────────────────────────────────────

export function normalizeCaseForComparison(path: string): string {
  return path.toLowerCase()
}

export function getClaudeSkillScope(
  filePath: string,
): { skillName: string; pattern: string } | null {
  const absolutePath = expandPath(filePath)
  const absolutePathLower = normalizeCaseForComparison(absolutePath)

  const bases = [
    {
      dir: expandPath(join(getOriginalCwd(), '.claude', 'skills')),
      prefix: '/.claude/skills/',
    },
    {
      dir: expandPath(join(homedir(), '.claude', 'skills')),
      prefix: '~/.claude/skills/',
    },
  ]

  for (const { dir, prefix } of bases) {
    const dirLower = normalizeCaseForComparison(dir)
    if (!absolutePathLower.startsWith(dirLower + sep)) continue

    const relativePart = absolutePath.slice(dir.length + 1)
    const firstSlash = relativePart.indexOf(sep)
    if (firstSlash === -1) continue

    const skillName = relativePart.slice(0, firstSlash)
    if (!skillName) continue

    return {
      skillName,
      pattern: `${prefix}${skillName}/**`,
    }
  }

  return null
}

export function relativePath(from: string, to: string): string {
  if (getPlatform() === 'windows') {
    const posixFrom = windowsPathToPosixPath(from)
    const posixTo = windowsPathToPosixPath(to)
    return posix.relative(posixFrom, posixTo)
  }
  return posix.relative(from, to)
}

export function toPosixPath(path: string): string {
  if (getPlatform() === 'windows') {
    return windowsPathToPosixPath(path)
  }
  return path
}

function getSettingsPaths(): string[] {
  return SETTING_SOURCES.map(source =>
    getSettingsFilePathForSource(source),
  ).filter((p): p is string => p !== undefined)
}

export function isClaudeSettingsPath(filePath: string): boolean {
  const expandedPath = expandPath(filePath)
  const normalizedPath = normalizeCaseForComparison(expandedPath)

  if (
    normalizedPath.endsWith(`${sep}.claude${sep}settings.json`) ||
    normalizedPath.endsWith(`${sep}.claude${sep}settings.local.json`)
  ) {
    return true
  }
  return getSettingsPaths().some(
    settingsPath => normalizeCaseForComparison(settingsPath) === normalizedPath,
  )
}

function isClaudeConfigFilePath(filePath: string): boolean {
  if (isClaudeSettingsPath(filePath)) return true

  const commandsDir = join(getOriginalCwd(), '.claude', 'commands')
  const agentsDir = join(getOriginalCwd(), '.claude', 'agents')
  const skillsDir = join(getOriginalCwd(), '.claude', 'skills')

  return (
    pathInWorkingPath(filePath, commandsDir) ||
    pathInWorkingPath(filePath, agentsDir) ||
    pathInWorkingPath(filePath, skillsDir)
  )
}

function isSessionPlanFile(absolutePath: string): boolean {
  const expectedPrefix = join(
    getPlansDirectory(getOriginalCwd()),  // LOC: adapted — QiLing takes cwd arg
    getPlanSlug(getSessionId(), getOriginalCwd()),  // LOC: adapted — QiLing takes (sessionId, cwd)
  )
  const normalizedPath = normalize(absolutePath)
  return normalizedPath.startsWith(expectedPrefix) && normalizedPath.endsWith('.md')
}

export function getSessionMemoryDir(): string {
  return join(getProjectDir(getCwd()), getSessionId(), 'session-memory') + sep
}

export function getSessionMemoryPath(): string {
  return join(getSessionMemoryDir(), 'summary.md')
}

function isSessionMemoryPath(absolutePath: string): boolean {
  const normalizedPath = normalize(absolutePath)
  return normalizedPath.startsWith(getSessionMemoryDir())
}

function isProjectDirPath(absolutePath: string): boolean {
  const projectDir = getProjectDir(getCwd())
  const normalizedPath = normalize(absolutePath)
  return (
    normalizedPath === projectDir || normalizedPath.startsWith(projectDir + sep)
  )
}

export function isScratchpadEnabled_CC(): boolean {
  return false  // Statsig gate — always false in QiLing
}

export function getClaudeTempDirName(): string {
  if (getPlatform() === 'windows') return 'claude'
  const uid = process.getuid?.() ?? 0
  return `claude-${uid}`
}

export const getClaudeTempDir = memoize(function getClaudeTempDir(): string {
  const baseTmpDir =
    process.env.CLAUDE_CODE_TMPDIR ||
    (getPlatform() === 'windows' ? tmpdir() : '/tmp')

  const fs = getFsImplementation()
  let resolvedBaseTmpDir = baseTmpDir
  try {
    resolvedBaseTmpDir = fs.realpathSync(baseTmpDir)
  } catch {
    // keep original
  }

  return join(resolvedBaseTmpDir, getClaudeTempDirName()) + sep
})

export const getBundledSkillsRoot = memoize(
  function getBundledSkillsRoot(): string {
    const nonce = randomBytes(16).toString('hex')
    return join(getClaudeTempDir(), 'bundled-skills', MACRO_VERSION, nonce)
  },
)

export function getProjectTempDir(): string {
  return join(getClaudeTempDir(), sanitizePath(getOriginalCwd())) + sep
}

export function getScratchpadDir(): string {
  return join(getProjectTempDir(), getSessionId(), 'scratchpad')
}

export async function ensureScratchpadDir(): Promise<string> {
  if (!isScratchpadEnabled()) {
    throw new Error('Scratchpad directory feature is not enabled')
  }
  const fs = getFsImplementation()
  const scratchpadDir = getScratchpadDir()
  await fs.mkdir(scratchpadDir, { mode: 0o700 })
  return scratchpadDir
}

function isScratchpadPath(absolutePath: string): boolean {
  if (!isScratchpadEnabled()) return false
  const scratchpadDir = getScratchpadDir()
  const normalizedPath = normalize(absolutePath)
  return (
    normalizedPath === scratchpadDir ||
    normalizedPath.startsWith(scratchpadDir + sep)
  )
}

function isDangerousFilePathToAutoEdit(path: string): boolean {
  const absolutePath = expandPath(path)
  const pathSegments = absolutePath.split(sep)
  const fileName = pathSegments.at(-1)

  if (path.startsWith('\\\\') || path.startsWith('//')) return true

  for (let i = 0; i < pathSegments.length; i++) {
    const segment = pathSegments[i]!
    const normalizedSegment = normalizeCaseForComparison(segment)

    for (const dir of DANGEROUS_DIRECTORIES) {
      if (normalizedSegment !== normalizeCaseForComparison(dir)) continue
      if (dir === '.claude') {
        const nextSegment = pathSegments[i + 1]
        if (nextSegment && normalizeCaseForComparison(nextSegment) === 'worktrees') {
          break
        }
      }
      return true
    }
  }

  if (fileName) {
    const normalizedFileName = normalizeCaseForComparison(fileName)
    if (
      (DANGEROUS_FILES as readonly string[]).some(
        f => normalizeCaseForComparison(f) === normalizedFileName,
      )
    ) {
      return true
    }
  }

  return false
}

function hasSuspiciousWindowsPathPattern(path: string): boolean {
  if (getPlatform() === 'windows' || getPlatform() === 'wsl') {
    const colonIndex = path.indexOf(':', 2)
    if (colonIndex !== -1) return true
  }
  if (/~\d/.test(path)) return true
  if (
    path.startsWith('\\\\?\\') ||
    path.startsWith('\\\\.\\') ||
    path.startsWith('//?/') ||
    path.startsWith('//./')
  ) return true
  if (/[.\s]+$/.test(path)) return true
  if (/\.(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i.test(path)) return true
  if (/(^|\/|\\)\.{3,}(\/|\\|$)/.test(path)) return true
  if (containsVulnerableUncPath(path)) return true
  return false
}

export function checkPathSafetyForAutoEdit(
  path: string,
  precomputedPathsToCheck?: readonly string[],
):
  | { safe: true }
  | { safe: false; message: string; classifierApprovable: boolean } {
  const pathsToCheck = precomputedPathsToCheck ?? getPathsForPermissionCheck(path)

  for (const pathToCheck of pathsToCheck) {
    if (hasSuspiciousWindowsPathPattern(pathToCheck)) {
      return {
        safe: false,
        message: `Claude requested permissions to write to ${path}, which contains a suspicious Windows path pattern that requires manual approval.`,
        classifierApprovable: false,
      }
    }
  }

  for (const pathToCheck of pathsToCheck) {
    if (isClaudeConfigFilePath(pathToCheck)) {
      return {
        safe: false,
        message: `Claude requested permissions to write to ${path}, but you haven't granted it yet.`,
        classifierApprovable: true,
      }
    }
  }

  for (const pathToCheck of pathsToCheck) {
    if (isDangerousFilePathToAutoEdit(pathToCheck)) {
      return {
        safe: false,
        message: `Claude requested permissions to edit ${path} which is a sensitive file.`,
        classifierApprovable: true,
      }
    }
  }

  return { safe: true }
}

export function allWorkingDirectories(
  context: ToolPermissionContext,
): Set<string> {
  return new Set([
    getOriginalCwd(),
    ...context.additionalWorkingDirectories.keys(),
  ])
}

export const getResolvedWorkingDirPaths = memoize(getPathsForPermissionCheck)

export function pathInAllowedWorkingPath(
  path: string,
  toolPermissionContext: ToolPermissionContext,
  precomputedPathsToCheck?: readonly string[],
): boolean {
  const pathsToCheck =
    precomputedPathsToCheck ?? getPathsForPermissionCheck(path)

  const workingPaths = Array.from(
    allWorkingDirectories(toolPermissionContext),
  ).flatMap(wp => getResolvedWorkingDirPaths(wp))

  return pathsToCheck.every(pathToCheck =>
    workingPaths.some(workingPath =>
      pathInWorkingPath(pathToCheck, workingPath),
    ),
  )
}

export function pathInWorkingPath(path: string, workingPath: string): boolean {
  const absolutePath = expandPath(path)
  const absoluteWorkingPath = expandPath(workingPath)

  const normalizedPath = absolutePath
    .replace(/^\/private\/var\//, '/var/')
    .replace(/^\/private\/tmp(\/|$)/, '/tmp$1')
  const normalizedWorkingPath = absoluteWorkingPath
    .replace(/^\/private\/var\//, '/var/')
    .replace(/^\/private\/tmp(\/|$)/, '/tmp$1')

  const caseNormalizedPath = normalizeCaseForComparison(normalizedPath)
  const caseNormalizedWorkingPath = normalizeCaseForComparison(normalizedWorkingPath)

  const relative = relativePath(caseNormalizedWorkingPath, caseNormalizedPath)

  if (relative === '') return true
  if (containsPathTraversal(relative)) return false

  return !posix.isAbsolute(relative)
}

function rootPathForSource(source: PermissionRuleSource): string {
  switch (source as string) {
    case 'cliArg':
    case 'command':
    case 'session':
    case 'apiArg':
      return expandPath(getOriginalCwd())
    default:
      return getSettingsRootPathForSource(source)
  }
}

function prependDirSep(path: string): string {
  return posix.join(DIR_SEP, path)
}

function normalizePatternToPath({
  patternRoot,
  pattern,
  rootPath,
}: {
  patternRoot: string
  pattern: string
  rootPath: string
}): string | null {
  const fullPattern = posix.join(patternRoot, pattern)
  if (patternRoot === rootPath) {
    return prependDirSep(pattern)
  } else if (fullPattern.startsWith(`${rootPath}${DIR_SEP}`)) {
    const relativePart = fullPattern.slice(rootPath.length)
    return prependDirSep(relativePart)
  } else {
    const rel = posix.relative(rootPath, patternRoot)
    if (!rel || rel.startsWith(`..${DIR_SEP}`) || rel === '..') return null
    const relativePattern = posix.join(rel, pattern)
    return prependDirSep(relativePattern)
  }
}

export function normalizePatternsToPath(
  patternsByRoot: Map<string | null, string[]>,
  root: string,
): string[] {
  const result = new Set(patternsByRoot.get(null) ?? [])

  for (const [patternRoot, patterns] of patternsByRoot.entries()) {
    if (patternRoot === null) continue
    for (const pattern of patterns) {
      const normalizedPattern = normalizePatternToPath({
        patternRoot,
        pattern,
        rootPath: root,
      })
      if (normalizedPattern) result.add(normalizedPattern)
    }
  }
  return Array.from(result)
}

export function getFileReadIgnorePatterns(
  toolPermissionContext: ToolPermissionContext,
): Map<string | null, string[]> {
  const patternsByRoot = getPatternsByRoot(toolPermissionContext, 'read', 'deny')
  const result = new Map<string | null, string[]>()
  for (const [patternRoot, patternMap] of patternsByRoot.entries()) {
    result.set(patternRoot, Array.from(patternMap.keys()))
  }
  return result
}

function patternWithRoot(
  pattern: string,
  source: PermissionRuleSource,
): {
  relativePattern: string
  root: string | null
} {
  if (pattern.startsWith(`${DIR_SEP}${DIR_SEP}`)) {
    const patternWithoutDoubleSlash = pattern.slice(1)
    if (
      getPlatform() === 'windows' &&
      patternWithoutDoubleSlash.match(/^\/[a-z]\//i)
    ) {
      const driveLetter = patternWithoutDoubleSlash[1]?.toUpperCase() ?? 'C'
      const pathAfterDrive = patternWithoutDoubleSlash.slice(2)
      const driveRoot = `${driveLetter}:\\`
      const relativeFromDrive = pathAfterDrive.startsWith('/')
        ? pathAfterDrive.slice(1)
        : pathAfterDrive
      return { relativePattern: relativeFromDrive, root: driveRoot }
    }
    return { relativePattern: patternWithoutDoubleSlash, root: DIR_SEP }
  } else if (pattern.startsWith(`~${DIR_SEP}`)) {
    return {
      relativePattern: pattern.slice(1),
      root: homedir().normalize('NFC'),
    }
  } else if (pattern.startsWith(DIR_SEP)) {
    return {
      relativePattern: pattern,
      root: rootPathForSource(source),
    }
  }
  let normalizedPattern = pattern
  if (pattern.startsWith(`.${DIR_SEP}`)) {
    normalizedPattern = pattern.slice(2)
  }
  return { relativePattern: normalizedPattern, root: null }
}

function getPatternsByRoot(
  toolPermissionContext: ToolPermissionContext,
  toolType: 'edit' | 'read',
  behavior: 'allow' | 'deny' | 'ask',
): Map<string | null, Map<string, PermissionRule>> {
  const toolName = toolType === 'edit' ? FILE_EDIT_TOOL_NAME : FILE_READ_TOOL_NAME

  const rules = getRuleByContentsForToolName(toolPermissionContext, toolName, behavior)
  const patternsByRoot = new Map<string | null, Map<string, PermissionRule>>()
  for (const [pattern, rule] of rules.entries()) {
    const { relativePattern, root } = patternWithRoot(pattern, rule.source)
    let patternsForRoot = patternsByRoot.get(root)
    if (patternsForRoot === undefined) {
      patternsForRoot = new Map<string, PermissionRule>()
      patternsByRoot.set(root, patternsForRoot)
    }
    const patternsForRootMap = patternsByRoot.get(root)!
    const relativePatternWithRoot = root
      ? relativePattern
      : relativePattern
    patternsForRootMap.set(relativePatternWithRoot, rule)
  }
  return patternsByRoot
}

export function matchingRuleForInput(
  path: string,
  toolPermissionContext: ToolPermissionContext,
  toolType: 'edit' | 'read',
  behavior: 'allow' | 'deny' | 'ask',
): PermissionRule | null {
  let fileAbsolutePath = expandPath(path)

  if (getPlatform() === 'windows' && fileAbsolutePath.includes('\\')) {
    fileAbsolutePath = windowsPathToPosixPath(fileAbsolutePath)
  }

  const patternsByRoot = getPatternsByRoot(toolPermissionContext, toolType, behavior)

  for (const [root, patternMap] of patternsByRoot.entries()) {
    const patterns = Array.from(patternMap.keys()).map(pattern => {
      let adjustedPattern = pattern
      if (adjustedPattern.endsWith('/**')) {
        adjustedPattern = adjustedPattern.slice(0, -3)
      }
      return adjustedPattern
    })

    const ig = ignore().add(patterns)

    const relativePathStr = relativePath(
      root ?? getCwd(),
      fileAbsolutePath ?? getCwd(),
    )

    if (relativePathStr.startsWith(`..${DIR_SEP}`)) continue
    if (!relativePathStr) continue

    const igResult = ig.test(relativePathStr)

    if (igResult.ignored && igResult.rule) {
      const originalPattern = igResult.rule.pattern
      const withWildcard = originalPattern + '/**'
      if (patternMap.has(withWildcard)) {
        return patternMap.get(withWildcard) ?? null
      }
      return patternMap.get(originalPattern) ?? null
    }
  }

  return null
}

export function checkReadPermissionForTool(
  tool: Tool,
  input: { [key: string]: unknown },
  toolPermissionContext: ToolPermissionContext,
): PermissionDecision {
  const getPath = (tool as any).getPath
  if (typeof getPath !== 'function') {
    return {
      behavior: 'ask',
      message: `Claude requested permissions to use ${tool.name}, but you haven't granted it yet.`,
    }
  }
  const path = getPath(input) as string

  const pathsToCheck = getPathsForPermissionCheck(path)

  for (const pathToCheck of pathsToCheck) {
    if (pathToCheck.startsWith('\\\\') || pathToCheck.startsWith('//')) {
      return {
        behavior: 'ask',
        message: `Claude requested permissions to read from ${path}, which appears to be a UNC path that could access network resources.`,
        decisionReason: { type: 'other', reason: 'UNC path detected (defense-in-depth check)' },
      }
    }
  }

  for (const pathToCheck of pathsToCheck) {
    if (hasSuspiciousWindowsPathPattern(pathToCheck)) {
      return {
        behavior: 'ask',
        message: `Claude requested permissions to read from ${path}, which contains a suspicious Windows path pattern that requires manual approval.`,
        decisionReason: { type: 'other', reason: 'Path contains suspicious Windows-specific patterns' },
      }
    }
  }

  for (const pathToCheck of pathsToCheck) {
    const denyRule = matchingRuleForInput(pathToCheck, toolPermissionContext, 'read', 'deny')
    if (denyRule) {
      return {
        behavior: 'deny',
        message: `Permission to read ${path} has been denied.`,
        decisionReason: { type: 'rule', rule: denyRule },
      }
    }
  }

  for (const pathToCheck of pathsToCheck) {
    const askRule = matchingRuleForInput(pathToCheck, toolPermissionContext, 'read', 'ask')
    if (askRule) {
      return {
        behavior: 'ask',
        message: `Claude requested permissions to read from ${path}, but you haven't granted it yet.`,
        decisionReason: { type: 'rule', rule: askRule },
      }
    }
  }

  const editResult = checkWritePermissionForTool(tool as any, input, toolPermissionContext, pathsToCheck)
  if (editResult.behavior === 'allow') return editResult

  const isInWorkingDir = pathInAllowedWorkingPath(path, toolPermissionContext, pathsToCheck)
  if (isInWorkingDir) {
    return {
      behavior: 'allow',
      updatedInput: input,
      decisionReason: { type: 'other', reason: 'Path is within allowed working directories' },
    }
  }

  const absolutePath = expandPath(path)
  const internalReadResult = checkReadableInternalPath(absolutePath, input)
  if (internalReadResult.behavior !== 'passthrough') {
    return internalReadResult as PermissionDecision
  }

  const allowRule = matchingRuleForInput(path, toolPermissionContext, 'read', 'allow')
  if (allowRule) {
    return {
      behavior: 'allow',
      updatedInput: input,
      decisionReason: { type: 'rule', rule: allowRule },
    }
  }

  return {
    behavior: 'ask',
    message: `Claude requested permissions to read from ${path}, but you haven't granted it yet.`,
    suggestions: generateSuggestions(path, 'read', toolPermissionContext, pathsToCheck),
    decisionReason: { type: 'other', reason: 'Path is outside allowed working directories' },
  }
}

export function checkWritePermissionForTool<Input extends AnyObject>(
  tool: Tool<Input>,
  input: z.infer<Input>,
  toolPermissionContext: ToolPermissionContext,
  precomputedPathsToCheck?: readonly string[],
): PermissionDecision {
  const getPath = (tool as any).getPath
  if (typeof getPath !== 'function') {
    return {
      behavior: 'ask',
      message: `Claude requested permissions to use ${tool.name}, but you haven't granted it yet.`,
    }
  }
  const path = getPath(input) as string

  const pathsToCheck = precomputedPathsToCheck ?? getPathsForPermissionCheck(path)

  for (const pathToCheck of pathsToCheck) {
    const denyRule = matchingRuleForInput(pathToCheck, toolPermissionContext, 'edit', 'deny')
    if (denyRule) {
      return {
        behavior: 'deny',
        message: `Permission to edit ${path} has been denied.`,
        decisionReason: { type: 'rule', rule: denyRule },
      }
    }
  }

  const absolutePathForEdit = expandPath(path)
  const internalEditResult = checkEditableInternalPath(absolutePathForEdit, input as { [key: string]: unknown })
  if (internalEditResult.behavior !== 'passthrough') {
    return internalEditResult as PermissionDecision
  }

  const claudeFolderAllowRule = matchingRuleForInput(
    path,
    {
      ...toolPermissionContext,
      alwaysAllowRules: {
        session: toolPermissionContext.alwaysAllowRules.session ?? [],
      },
    },
    'edit',
    'allow',
  )
  if (claudeFolderAllowRule) {
    const ruleContent = claudeFolderAllowRule.ruleValue.ruleContent
    if (
      ruleContent &&
      (ruleContent.startsWith(CLAUDE_FOLDER_PERMISSION_PATTERN.slice(0, -2)) ||
        ruleContent.startsWith(GLOBAL_CLAUDE_FOLDER_PERMISSION_PATTERN.slice(0, -2))) &&
      !ruleContent.includes('..') &&
      ruleContent.endsWith('/**')
    ) {
      return {
        behavior: 'allow',
        updatedInput: input,
        decisionReason: { type: 'rule', rule: claudeFolderAllowRule },
      }
    }
  }

  const safetyCheck = checkPathSafetyForAutoEdit(path, pathsToCheck)
  if (!safetyCheck.safe) {
    const skillScope = getClaudeSkillScope(path)
    const safetySuggestions: PermissionUpdate[] = skillScope
      ? [
          {
            type: 'addRules',
            rules: [{ toolName: FILE_EDIT_TOOL_NAME, ruleContent: skillScope.pattern }],
            behavior: 'allow',
            destination: 'session',
          },
        ]
      : generateSuggestions(path, 'write', toolPermissionContext, pathsToCheck)
    return {
      behavior: 'ask',
      message: safetyCheck.message,
      suggestions: safetySuggestions,
      decisionReason: { type: 'other', reason: safetyCheck.message },
    }
  }

  for (const pathToCheck of pathsToCheck) {
    const askRule = matchingRuleForInput(pathToCheck, toolPermissionContext, 'edit', 'ask')
    if (askRule) {
      return {
        behavior: 'ask',
        message: `Claude requested permissions to write to ${path}, but you haven't granted it yet.`,
        decisionReason: { type: 'rule', rule: askRule },
      }
    }
  }

  const isInWorkingDir = pathInAllowedWorkingPath(path, toolPermissionContext, pathsToCheck)
  if (toolPermissionContext.mode === 'acceptEdits' && isInWorkingDir) {
    return {
      behavior: 'allow',
      updatedInput: input,
      decisionReason: { type: 'other', reason: `acceptEdits mode allows writes in working directory` },
    }
  }

  const allowRule = matchingRuleForInput(path, toolPermissionContext, 'edit', 'allow')
  if (allowRule) {
    return {
      behavior: 'allow',
      updatedInput: input,
      decisionReason: { type: 'rule', rule: allowRule },
    }
  }

  return {
    behavior: 'ask',
    message: `Claude requested permissions to write to ${path}, but you haven't granted it yet.`,
    suggestions: generateSuggestions(path, 'write', toolPermissionContext, pathsToCheck),
    decisionReason: !isInWorkingDir
      ? { type: 'other', reason: 'Path is outside allowed working directories' }
      : undefined,
  }
}

export function generateSuggestions(
  filePath: string,
  operationType: 'read' | 'write' | 'create',
  toolPermissionContext: ToolPermissionContext,
  precomputedPathsToCheck?: readonly string[],
): PermissionUpdate[] {
  const isOutsideWorkingDir = !pathInAllowedWorkingPath(
    filePath,
    toolPermissionContext,
    precomputedPathsToCheck,
  )

  if (operationType === 'read' && isOutsideWorkingDir) {
    const dirPath = getDirectoryForPath(filePath)
    const dirsToAdd = getPathsForPermissionCheck(dirPath)
    return dirsToAdd
      .map(dir => createReadRuleSuggestion(dir, 'session'))
      .filter((s): s is PermissionUpdate => s !== undefined)
  }

  const shouldSuggestAcceptEdits =
    toolPermissionContext.mode === 'default' ||
    toolPermissionContext.mode === 'plan'

  if (operationType === 'write' || operationType === 'create') {
    const updates: PermissionUpdate[] = shouldSuggestAcceptEdits
      ? [{ type: 'setMode', mode: 'acceptEdits', destination: 'session' }]
      : []

    if (isOutsideWorkingDir) {
      const dirPath = getDirectoryForPath(filePath)
      const dirsToAdd = getPathsForPermissionCheck(dirPath)
      updates.push({
        type: 'addDirectories',
        directories: dirsToAdd,
        destination: 'session',
      })
    }

    return updates
  }

  return shouldSuggestAcceptEdits
    ? [{ type: 'setMode', mode: 'acceptEdits', destination: 'session' }]
    : []
}

export function checkEditableInternalPath(
  absolutePath: string,
  input: { [key: string]: unknown },
): PermissionResult {
  const normalizedPath = normalize(absolutePath)

  if (isSessionPlanFile(normalizedPath)) {
    return {
      behavior: 'allow',
      updatedInput: input,
      decisionReason: { type: 'other', reason: 'Plan files for current session are allowed for writing' },
    }
  }

  if (isScratchpadPath(normalizedPath)) {
    return {
      behavior: 'allow',
      updatedInput: input,
      decisionReason: { type: 'other', reason: 'Scratchpad files for current session are allowed for writing' },
    }
  }

  // feature('TEMPLATES') = false in QiLing — job dir check skipped

  if (isAgentMemoryPath(normalizedPath)) {
    return {
      behavior: 'allow',
      updatedInput: input,
      decisionReason: { type: 'other', reason: 'Agent memory files are allowed for writing' },
    }
  }

  if (!hasAutoMemPathOverride() && isAutoMemPath(normalizedPath)) {
    return {
      behavior: 'allow',
      updatedInput: input,
      decisionReason: { type: 'other', reason: 'auto memory files are allowed for writing' },
    }
  }

  // .claude/launch.json — desktop preview config
  if (
    normalizeCaseForComparison(normalizedPath) ===
    normalizeCaseForComparison(join(getOriginalCwd(), '.claude', 'launch.json'))
  ) {
    return {
      behavior: 'allow',
      updatedInput: input,
      decisionReason: { type: 'other', reason: 'Preview launch config is allowed for writing' },
    }
  }

  return { behavior: 'passthrough', message: '' }
}

export function checkReadableInternalPath(
  absolutePath: string,
  input: { [key: string]: unknown },
): PermissionResult {
  const normalizedPath = normalize(absolutePath)

  if (isSessionMemoryPath(normalizedPath)) {
    return {
      behavior: 'allow',
      updatedInput: input,
      decisionReason: { type: 'other', reason: 'Session memory files are allowed for reading' },
    }
  }

  if (isProjectDirPath(normalizedPath)) {
    return {
      behavior: 'allow',
      updatedInput: input,
      decisionReason: { type: 'other', reason: 'Project directory files are allowed for reading' },
    }
  }

  if (isSessionPlanFile(normalizedPath)) {
    return {
      behavior: 'allow',
      updatedInput: input,
      decisionReason: { type: 'other', reason: 'Plan files for current session are allowed for reading' },
    }
  }

  const toolResultsDir = getToolResultsDir()
  const toolResultsDirWithSep = toolResultsDir.endsWith(sep) ? toolResultsDir : toolResultsDir + sep
  if (normalizedPath === toolResultsDir || normalizedPath.startsWith(toolResultsDirWithSep)) {
    return {
      behavior: 'allow',
      updatedInput: input,
      decisionReason: { type: 'other', reason: 'Tool result files are allowed for reading' },
    }
  }

  if (isScratchpadPath(normalizedPath)) {
    return {
      behavior: 'allow',
      updatedInput: input,
      decisionReason: { type: 'other', reason: 'Scratchpad files for current session are allowed for reading' },
    }
  }

  const projectTempDir = getProjectTempDir()
  if (normalizedPath.startsWith(projectTempDir)) {
    return {
      behavior: 'allow',
      updatedInput: input,
      decisionReason: { type: 'other', reason: 'Project temp directory files are allowed for reading' },
    }
  }

  if (isAgentMemoryPath(normalizedPath)) {
    return {
      behavior: 'allow',
      updatedInput: input,
      decisionReason: { type: 'other', reason: 'Agent memory files are allowed for reading' },
    }
  }

  if (isAutoMemPath(normalizedPath)) {
    return {
      behavior: 'allow',
      updatedInput: input,
      decisionReason: { type: 'other', reason: 'auto memory files are allowed for reading' },
    }
  }

  const tasksDir = join(getClaudeConfigHomeDir(), 'tasks') + sep
  if (normalizedPath === tasksDir.slice(0, -1) || normalizedPath.startsWith(tasksDir)) {
    return {
      behavior: 'allow',
      updatedInput: input,
      decisionReason: { type: 'other', reason: 'Task files are allowed for reading' },
    }
  }

  const teamsReadDir = join(getClaudeConfigHomeDir(), 'teams') + sep
  if (normalizedPath === teamsReadDir.slice(0, -1) || normalizedPath.startsWith(teamsReadDir)) {
    return {
      behavior: 'allow',
      updatedInput: input,
      decisionReason: { type: 'other', reason: 'Team files are allowed for reading' },
    }
  }

  const bundledSkillsRoot = getBundledSkillsRoot() + sep
  if (normalizedPath.startsWith(bundledSkillsRoot)) {
    return {
      behavior: 'allow',
      updatedInput: input,
      decisionReason: { type: 'other', reason: 'Bundled skill reference files are allowed for reading' },
    }
  }

  return { behavior: 'passthrough', message: '' }
}
