/**
 * Auto mode denial tracking — adapted from CC's utils/autoModeDenials.ts
 *
 * Tracks commands recently denied by the classifier (YOLO/auto-mode).
 * Populated by the permission check path; read by the /permissions dialog.
 *
 * CC uses `feature('TRANSCRIPT_CLASSIFIER')` gating. QiLing uses
 * QILING_AUTO_MODE_DENIALS_ENABLED env var.
 */

export type AutoModeDenial = {
  toolName: string
  /** Human-readable description of the denied command (e.g. bash command) */
  display: string
  reason: string
  timestamp: number
}

let DENIALS: readonly AutoModeDenial[] = []
const MAX_DENIALS = 20

export function recordAutoModeDenial(denial: AutoModeDenial): void {
  if (!process.env.QILING_AUTO_MODE_DENIALS_ENABLED) return
  DENIALS = [denial, ...DENIALS.slice(0, MAX_DENIALS - 1)]
}

export function getAutoModeDenials(): readonly AutoModeDenial[] {
  return DENIALS
}

export function clearAutoModeDenials(): void {
  DENIALS = []
}
