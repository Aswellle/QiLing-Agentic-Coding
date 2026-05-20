/**
 * WorkerStateUploader — adapted from CC's cli/transports/WorkerStateUploader.ts
 *
 * Coalescing uploader for session state. 1 in-flight + 1 pending slot.
 * New calls coalesce into pending (never grows). Exponential backoff with retries.
 * RFC 7396 merge for external_metadata (keys added/overwritten, null=delete).
 */

import { sleep } from '../../utils/sleep.js'

type WorkerStateUploaderConfig = {
  send: (body: Record<string, unknown>) => Promise<boolean>
  baseDelayMs: number
  maxDelayMs: number
  jitterMs: number
}

export class WorkerStateUploader {
  private inflight: Promise<void> | null = null
  private pending: Record<string, unknown> | null = null
  private closed = false
  private readonly config: WorkerStateUploaderConfig

  constructor(config: WorkerStateUploaderConfig) {
    this.config = config
  }

  enqueue(patch: Record<string, unknown>): void {
    if (this.closed) return
    this.pending = this.pending ? coalescePatches(this.pending, patch) : patch
    void this.drain()
  }

  close(): void {
    this.closed = true
    this.pending = null
  }

  private async drain(): Promise<void> {
    if (this.inflight || this.closed || !this.pending) return
    const payload = this.pending
    this.pending = null
    this.inflight = this.sendWithRetry(payload).then(() => {
      this.inflight = null
      if (this.pending && !this.closed) void this.drain()
    })
  }

  private async sendWithRetry(payload: Record<string, unknown>): Promise<void> {
    let current = payload
    let failures = 0
    while (!this.closed) {
      const ok = await this.config.send(current)
      if (ok) return
      failures++
      await sleep(this.retryDelay(failures))
      if (this.pending) { current = coalescePatches(current, this.pending); this.pending = null }
    }
  }

  private retryDelay(failures: number): number {
    const exp = Math.min(this.config.baseDelayMs * 2 ** (failures - 1), this.config.maxDelayMs)
    return exp + Math.random() * this.config.jitterMs
  }
}

function coalescePatches(base: Record<string, unknown>, patch: Record<string, unknown>): Record<string, unknown> {
  const result = { ...base }
  for (const [key, value] of Object.entries(patch)) {
    if (key === 'external_metadata' || key === 'internal_metadata') {
      result[key] = mergeMeta(result[key] as Record<string, unknown> | undefined, value as Record<string, unknown>)
    } else {
      result[key] = value
    }
  }
  return result
}

function mergeMeta(base: Record<string, unknown> | undefined, patch: Record<string, unknown>): Record<string, unknown> {
  return { ...(base ?? {}), ...patch }
}
