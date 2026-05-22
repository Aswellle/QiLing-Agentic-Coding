/**
 * Bootstrap global state — adapted from CC's bootstrap/state.ts
 *
 * CC version is a 1700+ line singleton managing all application state.
 * QiLing version: lightweight adapter covering the core exports. Many
 * CC-specific items (telemetry meters, OTEL, ANT-specific flags) are
 * no-op stubs. State that QiLing already manages elsewhere is delegated:
 *   - CWD:      utils/cwd.ts
 *   - Settings: settings/loader.ts
 *   - Costs:    cost-tracker.ts
 *   - Stats:    context/stats.tsx
 */

import { randomUUID } from 'crypto'
import { getCwd } from '../utils/cwd.js'

// ─── Session ──────────────────────────────────────────────────────────────────

let _sessionId: string = randomUUID()
let _parentSessionId: string | undefined
let _originalCwd: string = getCwd()
let _projectRoot: string = getCwd()
let _cwdState: string = getCwd()

export function getSessionId(): string { return _sessionId }
export function regenerateSessionId(): string { _sessionId = randomUUID(); return _sessionId }
export function getParentSessionId(): string | undefined { return _parentSessionId }
export function switchSession(newId: string): void { _parentSessionId = _sessionId; _sessionId = newId }
export function getSessionProjectDir(): string | null { return _projectRoot }
export function getOriginalCwd(): string { return _originalCwd }
export function setOriginalCwd(cwd: string): void { _originalCwd = cwd }
export function getProjectRoot(): string { return _projectRoot }
export function setProjectRoot(cwd: string): void { _projectRoot = cwd }
export function getCwdState(): string { return _cwdState }
export function setCwdState(cwd: string): void { _cwdState = cwd }

// ─── Cost / Token Tracking ───────────────────────────────────────────────────

let _totalCostUSD = 0
let _totalInputTokens = 0
let _totalOutputTokens = 0
let _totalCacheReadTokens = 0
let _totalCacheCreationTokens = 0
let _totalWebSearchRequests = 0
let _totalAPIDurationMs = 0
let _totalToolDurationMs = 0
let _turnOutputTokensSnapshot = 0
let _currentTurnBudget: number | null = null
let _budgetContinuationCount = 0
let _hasUnknownModelCost = false
let _totalLinesAdded = 0
let _totalLinesRemoved = 0

export function addToTotalCostState(cost: number): void { _totalCostUSD += cost }
export function getTotalCostUSD(): number { return _totalCostUSD }
export function getTotalInputTokens(): number { return _totalInputTokens }
export function getTotalOutputTokens(): number { return _totalOutputTokens }
export function getTotalCacheReadInputTokens(): number { return _totalCacheReadTokens }
export function getTotalCacheCreationInputTokens(): number { return _totalCacheCreationTokens }
export function getTotalWebSearchRequests(): number { return _totalWebSearchRequests }
export function getTotalAPIDuration(): number { return _totalAPIDurationMs }
export function getTotalToolDuration(): number { return _totalToolDurationMs }
export function getTurnOutputTokens(): number { return _turnOutputTokensSnapshot }
export function getCurrentTurnTokenBudget(): number | null { return _currentTurnBudget }
export function getBudgetContinuationCount(): number { return _budgetContinuationCount }
export function incrementBudgetContinuationCount(): void { _budgetContinuationCount++ }
export function setHasUnknownModelCost(): void { _hasUnknownModelCost = true }
export function hasUnknownModelCost(): boolean { return _hasUnknownModelCost }
export function getTotalLinesAdded(): number { return _totalLinesAdded }
export function getTotalLinesRemoved(): number { return _totalLinesRemoved }

export function addToTotalDurationState(durationMs: number, _apiMs: number): void {
  _totalAPIDurationMs += _apiMs
}
export function addToToolDuration(duration: number): void { _totalToolDurationMs += duration }
export function snapshotOutputTokensForTurn(budget: number | null): void {
  _turnOutputTokensSnapshot = _totalOutputTokens
  _currentTurnBudget = budget
}
export function addToTotalLinesChanged(added: number, removed: number): void {
  _totalLinesAdded += added; _totalLinesRemoved += removed
}

export function addToTotalUsageTokens(input: number, output: number, cacheRead: number, cacheCreate: number): void {
  _totalInputTokens += input
  _totalOutputTokens += output
  _totalCacheReadTokens += cacheRead
  _totalCacheCreationTokens += cacheCreate
}

export function resetCostState(): void {
  _totalCostUSD = 0; _totalInputTokens = 0; _totalOutputTokens = 0
  _totalCacheReadTokens = 0; _totalCacheCreationTokens = 0
  _totalWebSearchRequests = 0; _totalAPIDurationMs = 0; _totalToolDurationMs = 0
  _hasUnknownModelCost = false; _totalLinesAdded = 0; _totalLinesRemoved = 0
  _budgetContinuationCount = 0; _currentTurnBudget = null
}

// ─── Model Tracking ──────────────────────────────────────────────────────────

type ModelSetting = { model: string; [k: string]: unknown }
let _initialMainLoopModel: ModelSetting = { model: 'claude-sonnet-4-6' }
let _mainLoopModelOverride: ModelSetting | undefined

export function getInitialMainLoopModel(): ModelSetting { return _initialMainLoopModel }
export function setInitialMainLoopModel(model: ModelSetting): void { _initialMainLoopModel = model }
export function getMainLoopModelOverride(): ModelSetting | undefined { return _mainLoopModelOverride }
export function setMainLoopModelOverride(model: ModelSetting | undefined): void { _mainLoopModelOverride = model }

export function getModelUsage(): Record<string, { inputTokens: number; outputTokens: number; cost: number }> {
  return {}
}

// ─── Interaction / Timing ────────────────────────────────────────────────────

let _lastInteractionTime = Date.now()
let _lastApiCompletionTimestamp: number | null = null
let _lastMainRequestId: string | undefined

export function updateLastInteractionTime(): void { _lastInteractionTime = Date.now() }
export function getLastInteractionTime(): number { return _lastInteractionTime }
export function getLastApiCompletionTimestamp(): number | null { return _lastApiCompletionTimestamp }
export function setLastApiCompletionTimestamp(ts: number): void { _lastApiCompletionTimestamp = ts }
export function getLastMainRequestId(): string | undefined { return _lastMainRequestId }
export function setLastMainRequestId(id: string): void { _lastMainRequestId = id }

// ─── Boolean Flags ────────────────────────────────────────────────────────────

let _isRemoteMode = false
let _isInteractive = true
let _sessionBypassPermissions = false
let _sessionTrustAccepted = false
let _sessionPersistenceDisabled = false
let _hasExitedPlanMode = false
let _needsPlanModeExitAttachment = false
let _isNonInteractive = false
let _scheduledTasksEnabled = false
let _strictToolResultPairing = false

export function getIsRemoteMode(): boolean { return _isRemoteMode }
export function setIsRemoteMode(v: boolean): void { _isRemoteMode = v }
export function getIsInteractive(): boolean { return _isInteractive }
export function setIsInteractive(v: boolean): void { _isInteractive = v; _isNonInteractive = !v }
export function getIsNonInteractiveSession(): boolean { return _isNonInteractive }
export function getSessionBypassPermissionsMode(): boolean { return _sessionBypassPermissions }
export function setSessionBypassPermissionsMode(v: boolean): void { _sessionBypassPermissions = v }
export function getSessionTrustAccepted(): boolean { return _sessionTrustAccepted }
export function setSessionTrustAccepted(v: boolean): void { _sessionTrustAccepted = v }
export function isSessionPersistenceDisabled(): boolean { return _sessionPersistenceDisabled }
export function setSessionPersistenceDisabled(v: boolean): void { _sessionPersistenceDisabled = v }
export function hasExitedPlanModeInSession(): boolean { return _hasExitedPlanMode }
export function setHasExitedPlanMode(v: boolean): void { _hasExitedPlanMode = v }
export function needsPlanModeExitAttachment(): boolean { return _needsPlanModeExitAttachment }
export function setNeedsPlanModeExitAttachment(v: boolean): void { _needsPlanModeExitAttachment = v }
export function getScheduledTasksEnabled(): boolean { return _scheduledTasksEnabled }
export function setScheduledTasksEnabled(v: boolean): void { _scheduledTasksEnabled = v }
export function getStrictToolResultPairing(): boolean { return _strictToolResultPairing }
export function setStrictToolResultPairing(v: boolean): void { _strictToolResultPairing = v }

// ─── Client / Session Metadata ───────────────────────────────────────────────

let _clientType = 'cli'
let _sessionSource: string | undefined
let _directConnectServerUrl: string | undefined
let _flagSettingsPath: string | undefined
let _flagSettingsInline: Record<string, unknown> | null = null
let _cachedClaudeMdContent: string | null = null
let _additionalDirs: string[] = []
let _inlinePlugins: string[] = []
let _allowedChannels: unknown[] = []
let _hasDevChannels = false

export function getClientType(): string { return _clientType }
export function setClientType(t: string): void { _clientType = t }
export function getSessionSource(): string | undefined { return _sessionSource }
export function setSessionSource(s: string): void { _sessionSource = s }
export function getDirectConnectServerUrl(): string | undefined { return _directConnectServerUrl }
export function setDirectConnectServerUrl(url: string): void { _directConnectServerUrl = url }
export function getFlagSettingsPath(): string | undefined { return _flagSettingsPath }
export function setFlagSettingsPath(p: string | undefined): void { _flagSettingsPath = p }
export function getFlagSettingsInline(): Record<string, unknown> | null { return _flagSettingsInline }
export function setFlagSettingsInline(v: Record<string, unknown> | null): void { _flagSettingsInline = v }
export function getCachedClaudeMdContent(): string | null { return _cachedClaudeMdContent }
export function setCachedClaudeMdContent(v: string | null): void { _cachedClaudeMdContent = v }
export function getAdditionalDirectoriesForClaudeMd(): string[] { return _additionalDirs }
export function setAdditionalDirectoriesForClaudeMd(dirs: string[]): void { _additionalDirs = dirs }
export function getInlinePlugins(): string[] { return _inlinePlugins }
export function setInlinePlugins(plugins: string[]): void { _inlinePlugins = plugins }
export function getAllowedChannels(): unknown[] { return _allowedChannels }
export function setAllowedChannels(entries: unknown[]): void { _allowedChannels = entries }
export function getHasDevChannels(): boolean { return _hasDevChannels }
export function setHasDevChannels(v: boolean): void { _hasDevChannels = v }

// ─── Turn-level Hooks (OTEL / telemetry stubs) ───────────────────────────────

let _turnHookDurationMs = 0
let _turnToolDurationMs = 0
let _turnClassifierDurationMs = 0
let _postCompactionPending = false

export function getTurnHookDurationMs(): number { return _turnHookDurationMs }
export function addToTurnHookDuration(ms: number): void { _turnHookDurationMs += ms }
export function resetTurnHookDuration(): void { _turnHookDurationMs = 0 }
export function getTurnHookCount(): number { return 0 }
export function getTurnToolDurationMs(): number { return _turnToolDurationMs }
export function resetTurnToolDuration(): void { _turnToolDurationMs = 0 }
export function getTurnToolCount(): number { return 0 }
export function getTurnClassifierDurationMs(): number { return _turnClassifierDurationMs }
export function addToTurnClassifierDuration(ms: number): void { _turnClassifierDurationMs += ms }
export function resetTurnClassifierDuration(): void { _turnClassifierDurationMs = 0 }
export function getTurnClassifierCount(): number { return 0 }
export function markPostCompaction(): void { _postCompactionPending = true }
export function consumePostCompaction(): boolean { const v = _postCompactionPending; _postCompactionPending = false; return v }

// ─── Telemetry stubs (OTEL — no-op in QiLing) ───────────────────────────────

export function getMeter(): null { return null }
export function setMeter(_m: unknown): void {}
export function getLoggerProvider(): null { return null }
export function setLoggerProvider(_p: unknown): void {}
export function getEventLogger(): null { return null }
export function setEventLogger(_l: unknown): void {}
export function getMeterProvider(): null { return null }
export function setMeterProvider(_p: unknown): void {}
export function getTracerProvider(): null { return null }
export function setTracerProvider(_p: unknown): void {}
export function getSessionCounter(): null { return null }
export function getLocCounter(): null { return null }
export function getPrCounter(): null { return null }
export function getCommitCounter(): null { return null }
export function getCostCounter(): null { return null }
export function getTokenCounter(): null { return null }
export function getCodeEditToolDecisionCounter(): null { return null }
export function getActiveTimeCounter(): null { return null }

// ─── Misc ─────────────────────────────────────────────────────────────────────

export function getSdkBetas(): string[] | undefined { return undefined }
export function setSdkBetas(_betas: string[] | undefined): void {}
export function getSdkAgentProgressSummariesEnabled(): boolean { return false }
export function setSdkAgentProgressSummariesEnabled(_v: boolean): void {}
export function getKairosActive(): boolean { return false }
export function setKairosActive(_v: boolean): void {}
export function getUserMsgOptIn(): boolean { return false }
export function setUserMsgOptIn(_v: boolean): void {}
export function getQuestionPreviewFormat(): 'markdown' | 'html' | undefined { return undefined }
export function setQuestionPreviewFormat(_f: 'markdown' | 'html'): void {}
export function getUseCoworkPlugins(): boolean { return false }
export function setUseCoworkPlugins(_v: boolean): void {}
export function preferThirdPartyAuthentication(): boolean { return false }
export function getIsScrollDraining(): boolean { return false }
export function markScrollActivity(): void {}
export async function waitForScrollIdle(): Promise<void> {}
export function getSystemPromptSectionCache(): Map<string, string | null> { return new Map() }
export function setSystemPromptSectionCacheEntry(_k: string, _v: string | null): void {}
export function clearSystemPromptSectionState(): void {}
export function getLastEmittedDate(): string | null { return null }
export function setLastEmittedDate(_d: string | null): void {}
export function getMainThreadAgentType(): string | undefined { return undefined }
export function setMainThreadAgentType(_t: string | undefined): void {}
export function flushInteractionTime(): void {}
export function addSlowOperation(_op: string, _ms: number): void {}
export function getSlowOperations(): ReadonlyArray<{ operation: string; durationMs: number }> { return [] }
export function getPromptId(): string | null { return null }
export function setPromptId(_id: string | null): void {}
export function getStatsStore(): null { return null }
export function setStatsStore(_s: unknown): void {}
export function getAllowedSettingSources(): string[] { return ['userSettings', 'projectSettings', 'localSettings'] }
export function setAllowedSettingSources(_s: string[]): void {}
export function getPromptCache1hAllowlist(): string[] | null { return null }
export function setPromptCache1hAllowlist(_v: string[] | null): void {}
export function getPromptCache1hEligible(): boolean | null { return null }
export function setPromptCache1hEligible(_v: boolean | null): void {}
export function registerHookCallbacks(_hooks: unknown): void {}
export function getRegisteredHooks(): Record<string, unknown> { return {} }
export function clearRegisteredHooks(): void {}
export function clearRegisteredPluginHooks(): void {}
export function resetSdkInitState(): void {}
export function getPlanSlugCache(): Map<string, string> { return new Map() }
export function getSessionCreatedTeams(): Set<string> { return new Set() }
export function getInvokedSkills(): Map<string, unknown> { return new Map() }
export function addInvokedSkill(_agentId: string | undefined, _info: unknown): void {}
export function getInvokedSkillsForAgent(_agentId: string | undefined): unknown[] { return [] }
export function clearInvokedSkills(_agentId?: string): void {}
export function clearInvokedSkillsForAgent(_agentId: string): void {}
export function resetStateForTests(): void { resetCostState() }
export function resetTotalDurationStateAndCost_FOR_TESTS_ONLY(): void { resetCostState() }
export function setChromeFlagOverride(_v: boolean | undefined): void {}
export function getChromeFlagOverride(): boolean | undefined { return undefined }
export function setTeleportedSessionInfo(_info: unknown): void {}
export function getTeleportedSessionInfo(): { sessionId?: string; cwd?: string } { return {} }
export function markFirstTeleportMessageLogged(): void {}
export function hasLspRecommendationShownThisSession(): boolean { return false }
export function setLspRecommendationShownThisSession(_v: boolean): void {}
export function setInitJsonSchema(_schema: Record<string, unknown>): void {}
export function getInitJsonSchema(): Record<string, unknown> | null { return null }
export function getAfkModeHeaderLatched(): boolean | null { return null }
export function setAfkModeHeaderLatched(_v: boolean): void {}
export function getFastModeHeaderLatched(): boolean | null { return null }
export function setFastModeHeaderLatched(_v: boolean): void {}
export function getCacheEditingHeaderLatched(): boolean | null { return null }
export function setCacheEditingHeaderLatched(_v: boolean): void {}
export function getThinkingClearLatched(): boolean | null { return null }
export function setThinkingClearLatched(_v: boolean): void {}
export function clearBetaHeaderLatches(): void {}
export function getSessionIngressToken(): string | null | undefined { return undefined }
export function setSessionIngressToken(_t: string | null): void {}
export function getOauthTokenFromFd(): string | null | undefined { return undefined }
export function setOauthTokenFromFd(_t: string | null): void {}
export function getApiKeyFromFd(): string | null | undefined { return undefined }
export function setApiKeyFromFd(_k: string | null): void {}
export function setLastAPIRequest(_req: unknown): void {}
export function getLastAPIRequest(): unknown { return null }
export function setLastAPIRequestMessages(_msgs: unknown): void {}
export function getLastAPIRequestMessages(): unknown { return null }
export function setLastClassifierRequests(_reqs: unknown[] | null): void {}
export function getLastClassifierRequests(): unknown[] | null { return null }
export function addToInMemoryErrorLog(_info: unknown): void {}
export function getTotalAPIDurationWithoutRetries(): number { return _totalAPIDurationMs }
export function getModelStrings(): null { return null }
export function setModelStrings(_ms: unknown): void {}
export function resetModelStringsForTestingOnly(): void {}
export function setCostStateForRestore(_state: unknown): void {}
export function getAgentColorMap(): Map<string, string> { return new Map() }
export function needsAutoModeExitAttachment(): boolean { return false }
export function setNeedsAutoModeExitAttachment(_v: boolean): void {}
export function handlePlanModeTransition(_mode: string): void {}
export function handleAutoModeTransition(_mode: string): void {}
export const onSessionSwitch = (_cb: () => void): (() => void) => () => {}
