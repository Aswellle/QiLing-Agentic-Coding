/**
 * Activity manager — adapted from CC's utils/activityManager.ts
 *
 * Tracks user activity and CLI operation timing for session statistics.
 * Deduplicates overlapping operations and provides separate user vs CLI metrics.
 */

const USER_ACTIVITY_TIMEOUT_MS = 5_000  // 5 seconds

export class ActivityManager {
  private activeOperations = new Set<string>()
  private lastUserActivityTime = 0
  private lastCLIRecordedTime = Date.now()
  private isCLIActive = false
  private totalActiveMs = 0
  private lastActiveStart = 0

  private static _instance: ActivityManager | null = null

  static getInstance(): ActivityManager {
    if (!ActivityManager._instance) ActivityManager._instance = new ActivityManager()
    return ActivityManager._instance
  }

  static resetInstance(): void { ActivityManager._instance = null }

  /** Record that the user performed an action (keystroke, command, etc.) */
  recordUserActivity(): void {
    this.lastUserActivityTime = Date.now()
    if (!this.isCLIActive) {
      this.lastActiveStart = Date.now()
      this.isCLIActive = true
    }
  }

  /** Record that a CLI operation (tool call, etc.) started */
  startOperation(id: string): void {
    this.activeOperations.add(id)
    if (this.lastActiveStart === 0) this.lastActiveStart = Date.now()
    this.isCLIActive = true
  }

  /** Record that a CLI operation completed */
  endOperation(id: string): void {
    this.activeOperations.delete(id)
    if (this.activeOperations.size === 0) {
      const now = Date.now()
      if (this.lastActiveStart > 0) {
        this.totalActiveMs += now - this.lastActiveStart
        this.lastActiveStart = 0
      }
      const sinceUserActivity = now - this.lastUserActivityTime
      if (sinceUserActivity > USER_ACTIVITY_TIMEOUT_MS) {
        this.isCLIActive = false
      }
    }
  }

  /** Check if there are any active operations */
  get isActive(): boolean {
    return this.activeOperations.size > 0 || this.isCLIActive
  }

  /** Get total active time in milliseconds */
  get totalActiveDurationMs(): number {
    if (this.lastActiveStart > 0) {
      return this.totalActiveMs + (Date.now() - this.lastActiveStart)
    }
    return this.totalActiveMs
  }

  /** Reset all tracking state */
  reset(): void {
    this.activeOperations.clear()
    this.lastUserActivityTime = 0
    this.lastCLIRecordedTime = Date.now()
    this.isCLIActive = false
    this.totalActiveMs = 0
    this.lastActiveStart = 0
  }
}
