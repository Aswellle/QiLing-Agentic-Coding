/**
 * Auto-mode state — ported from CC's utils/permissions/autoModeState.ts
 *
 * Manages the global flag indicating whether the session is in "auto" mode
 * (YOLO-lite: AI classifies each command, user not prompted for low-risk ops).
 *
 * In QiLing this maps to the --yolo CLI flag and the 'auto' permission mode.
 */

let _autoModeActive = false
let _autoModeFlagCli = false
let _autoModeCircuitBroken = false

export function setAutoModeActive(active: boolean): void {
  _autoModeActive = active
}

export function isAutoModeActive(): boolean {
  return _autoModeActive
}

export function setAutoModeFlagCli(passed: boolean): void {
  _autoModeFlagCli = passed
}

export function getAutoModeFlagCli(): boolean {
  return _autoModeFlagCli
}

/** Circuit breaker: set when the classifier repeatedly denies (fall back to prompting) */
export function setAutoModeCircuitBroken(broken: boolean): void {
  _autoModeCircuitBroken = broken
}

export function isAutoModeCircuitBroken(): boolean {
  return _autoModeCircuitBroken
}

export function resetAutoModeState(): void {
  _autoModeActive = false
  _autoModeFlagCli = false
  _autoModeCircuitBroken = false
}
