/**
 * StreamingToolExecutor — ported from CC's services/tools/StreamingToolExecutor.ts
 *
 * Core insight: safe (read-only) tools can start executing the moment their
 * input JSON is complete, while the AI is still streaming other tool calls.
 * Non-safe tools (Bash, FileWrite) are queued and execute serially after
 * the stream ends so they can go through the permission dialog.
 *
 * Concurrency rules (identical to CC):
 *   - concurrent-safe tools run in parallel with other safe tools
 *   - non-safe tools execute alone (exclusive)
 *   - results are yielded in original order regardless of completion order
 */

import type { ToolResultContent } from '../types/message'

type ToolStatus = 'queued' | 'executing' | 'completed' | 'yielded'

export interface TrackedTool {
  id: string
  name: string
  input: unknown
  status: ToolStatus
  isConcurrencySafe: boolean
  runner: ToolRunner        // stored at addTool time, used at execution time
  promise?: Promise<void>
  result?: ToolResultContent
}

/**
 * Signature of the function that actually runs one tool.
 * Provided by query.ts; encapsulates permission check + tool.call().
 */
export type ToolRunner = (
  id: string,
  name: string,
  input: unknown,
  signal: AbortSignal
) => Promise<ToolResultContent>

// ─── StreamingToolExecutor ────────────────────────────────────────────────────

export class StreamingToolExecutor {
  private tools: TrackedTool[] = []
  /** Child abort controller — aborted when a Bash tool errors so siblings die */
  private siblingAbortCtrl: AbortController
  /** Notify getRemainingResults() that a tool completed */
  private wakeup?: () => void
  private discarded = false
  private hasErrored = false
  private erroredToolName = ''

  constructor(
    private readonly parallelSafeNames: Set<string>,
    parentSignal?: AbortSignal
  ) {
    this.siblingAbortCtrl = new AbortController()
    // Propagate parent abort to sibling controller
    parentSignal?.addEventListener('abort', () => {
      if (!this.siblingAbortCtrl.signal.aborted) {
        this.siblingAbortCtrl.abort(parentSignal.reason)
      }
    }, { once: true })
  }

  /**
   * Register a tool and immediately start execution if concurrency conditions
   * allow. Called from query.ts on every tool_use_stop event.
   */
  addTool(id: string, name: string, input: unknown, runner: ToolRunner, isSafe?: boolean): void {
    const safe = isSafe ?? this.parallelSafeNames.has(name)
    const tracked: TrackedTool = { id, name, input, status: 'queued', isConcurrencySafe: safe, runner }
    this.tools.push(tracked)

    // Try to start immediately — may be deferred if a non-safe tool is running
    void this.tryStart(tracked)
  }

  /** Discard all pending/in-progress work (streaming fallback / model switch). */
  discard(): void {
    this.discarded = true
    this.siblingAbortCtrl.abort('streaming_fallback')
    // Mark any still-executing tools so getRemainingResults returns synthetic errors
    for (const t of this.tools) {
      if (t.status === 'executing' || t.status === 'queued') {
        t.status = 'completed'
        t.result = {
          type: 'tool_result',
          tool_use_id: t.id,
          content: '<tool_use_error>Streaming fallback — tool execution discarded</tool_use_error>',
          is_error: true,
        }
      }
    }
  }

  /**
   * Check if `isSafe` tool can start now based on what is executing.
   * Mirrors CC's canExecuteTool():
   *   - Nothing executing → always OK
   *   - Only safe tools executing + this tool is safe → OK
   *   - Anything else → must wait
   */
  private canStart(isSafe: boolean): boolean {
    const executing = this.tools.filter(t => t.status === 'executing')
    if (executing.length === 0) return true
    return isSafe && executing.every(t => t.isConcurrencySafe)
  }

  private async tryStart(tool: TrackedTool): Promise<void> {
    if (this.discarded) return
    if (tool.status !== 'queued') return
    if (!this.canStart(tool.isConcurrencySafe)) return

    tool.status = 'executing'

    const execute = async () => {
      // Already aborted before we even start
      if (this.discarded || this.siblingAbortCtrl.signal.aborted) {
        tool.result = this.syntheticError(tool.id, this.discarded ? 'fallback' : 'sibling')
        tool.status = 'completed'
        this.wake()
        return
      }

      try {
        // Use the runner stored at addTool time — not any external runner
        tool.result = await tool.runner(tool.id, tool.name, tool.input, this.siblingAbortCtrl.signal)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        tool.result = {
          type: 'tool_result',
          tool_use_id: tool.id,
          content: `<tool_use_error>Tool error: ${msg}</tool_use_error>`,
          is_error: true,
        }
        // Bash errors abort siblings (same as CC)
        if (tool.name === 'Bash' || tool.name === 'PowerShell') {
          this.hasErrored = true
          this.erroredToolName = tool.name
          if (!this.siblingAbortCtrl.signal.aborted) {
            this.siblingAbortCtrl.abort('sibling_error')
          }
        }
      }

      tool.status = 'completed'
      this.wake()

      // Unblock queued tools now that one slot freed up
      void this.processQueue()
    }

    tool.promise = execute()
  }

  /**
   * Scan the queue and start any tools that can now run.
   * Called after each tool completes to unblock the next.
   */
  private async processQueue(): Promise<void> {
    for (const tool of this.tools) {
      if (tool.status !== 'queued') continue

      if (!this.canStart(tool.isConcurrencySafe)) {
        if (!tool.isConcurrencySafe) break  // hard stop — must stay ordered
        continue  // safe tool can't start yet, keep scanning
      }

      void this.tryStart(tool)
    }
  }

  private wake(): void {
    this.wakeup?.()
    this.wakeup = undefined
  }

  /** Sleep until any tool completes or progress arrives */
  private waitForProgress(): Promise<void> {
    return new Promise(resolve => {
      this.wakeup = resolve
      // Also race against all executing promises
      const executing = this.tools
        .filter(t => t.status === 'executing' && t.promise)
        .map(t => t.promise!)
      if (executing.length > 0) {
        void Promise.race(executing).then(resolve)
      }
    })
  }

  private hasUnfinished(): boolean {
    return this.tools.some(t => t.status !== 'yielded')
  }

  private hasExecuting(): boolean {
    return this.tools.some(t => t.status === 'executing')
  }

  /**
   * Await all pending tools and yield results.
   *
   * Ordering for Anthropic API: results are matched by tool_use_id, not by
   * position. Concurrent-safe tools are yielded as they complete. Non-safe
   * tools block subsequent yields until they finish (exclusive access).
   *
   * `_fallbackRunner` is never used (each tool carries its own runner set at
   * addTool time) but is kept for backwards-compatible call sites.
   */
  async *getRemainingResults(
    _fallbackRunner?: ToolRunner
  ): AsyncGenerator<ToolResultContent> {
    if (this.discarded) return

    // Start any tools still queued
    await this.processQueue()

    while (this.hasUnfinished()) {
      // Sweep and yield whatever is ready
      for (const tool of this.tools) {
        if (tool.status === 'yielded') continue

        if (tool.status === 'completed' && tool.result) {
          tool.status = 'yielded'
          yield tool.result
        } else if (tool.status === 'queued') {
          void this.tryStart(tool)
          if (!tool.isConcurrencySafe && tool.status === 'queued') break
        } else if (tool.status === 'executing' && !tool.isConcurrencySafe) {
          break  // must wait for non-safe tool to finish
        }
      }

      if (!this.hasUnfinished()) break

      if (this.hasExecuting()) {
        await this.waitForProgress()
      } else {
        break
      }
    }

    // Final sweep
    for (const tool of this.tools) {
      if (tool.status === 'completed' && tool.result) {
        tool.status = 'yielded'
        yield tool.result
      }
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private syntheticError(toolUseId: string, reason: 'fallback' | 'sibling'): ToolResultContent {
    const msg = reason === 'fallback'
      ? 'Streaming fallback — tool execution discarded'
      : `Cancelled: parallel tool ${this.erroredToolName} errored`
    return {
      type: 'tool_result',
      tool_use_id: toolUseId,
      content: `<tool_use_error>${msg}</tool_use_error>`,
      is_error: true,
    }
  }

  /** How many tools were added total (for metrics). */
  get toolCount(): number { return this.tools.length }

  /** How many ran concurrently at peak (for debugging). */
  get concurrentSafeCount(): number {
    return this.tools.filter(t => t.isConcurrencySafe).length
  }
}
