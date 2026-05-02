import { describe, test, expect } from 'bun:test'
import { StreamingToolExecutor } from '../../../src/query/StreamingToolExecutor'
import type { ToolResultContent } from '../../../src/types/message'

const SAFE = new Set(['FileRead', 'Glob', 'Grep'])

function makeRunner(
  delayMs: number,
  result: string,
  isError = false
) {
  return async (_id: string, _name: string, _input: unknown): Promise<ToolResultContent> => {
    await Bun.sleep(delayMs)
    return {
      type: 'tool_result',
      tool_use_id: _id,
      content: result,
      is_error: isError,
    }
  }
}

// Helper: collect all results from getRemainingResults
async function collectAll(
  executor: StreamingToolExecutor
): Promise<ToolResultContent[]> {
  const results: ToolResultContent[] = []
  for await (const r of executor.getRemainingResults(makeRunner(0, 'fallback'))) {
    results.push(r)
  }
  return results
}

describe('StreamingToolExecutor — ordering', () => {
  test('single safe tool → result returned', async () => {
    const ex = new StreamingToolExecutor(SAFE)
    ex.addTool('t1', 'FileRead', {}, makeRunner(10, 'file-content'))
    const results = await collectAll(ex)
    expect(results).toHaveLength(1)
    expect(results[0].content).toBe('file-content')
    expect(results[0].tool_use_id).toBe('t1')
  })

  test('two safe tools run concurrently → both results collected', async () => {
    const order: string[] = []
    const ex = new StreamingToolExecutor(SAFE)

    // t1 takes longer, t2 is fast — both should complete
    const runner1 = async (id: string): Promise<ToolResultContent> => {
      await Bun.sleep(50)
      order.push('t1-done')
      return { type: 'tool_result', tool_use_id: id, content: 'r1' }
    }
    const runner2 = async (id: string): Promise<ToolResultContent> => {
      await Bun.sleep(5)
      order.push('t2-done')
      return { type: 'tool_result', tool_use_id: id, content: 'r2' }
    }

    ex.addTool('t1', 'FileRead', {}, runner1)
    ex.addTool('t2', 'Glob', {}, runner2)

    const results = await collectAll(ex)

    // t2 finished first (faster)
    expect(order).toEqual(['t2-done', 't1-done'])
    // both results present (Anthropic API matches by tool_use_id, not position)
    expect(results).toHaveLength(2)
    const ids = results.map(r => r.tool_use_id)
    expect(ids).toContain('t1')
    expect(ids).toContain('t2')
  })

  test('non-safe tool waits for ALL preceding safe tools to complete', async () => {
    const execOrder: string[] = []
    const ex = new StreamingToolExecutor(SAFE)

    ex.addTool('t1', 'FileRead', {}, async (id) => {
      await Bun.sleep(30)
      execOrder.push('safe-done')
      return { type: 'tool_result', tool_use_id: id, content: 'safe' }
    })
    ex.addTool('t2', 'Bash', {}, async (id) => {
      execOrder.push('bash-start')
      return { type: 'tool_result', tool_use_id: id, content: 'bash' }
    })

    const results = await collectAll(ex)

    // Safe tool must complete before bash starts (Bash is not concurrent-safe,
    // so it queues and processQueue only unblocks it after safe finishes)
    const safeIdx = execOrder.indexOf('safe-done')
    const bashIdx = execOrder.indexOf('bash-start')
    expect(safeIdx).toBeGreaterThanOrEqual(0)
    expect(bashIdx).toBeGreaterThanOrEqual(0)
    expect(safeIdx).toBeLessThan(bashIdx)  // safe before bash

    // Both results present
    expect(results).toHaveLength(2)
    const byId = Object.fromEntries(results.map(r => [r.tool_use_id, r]))
    expect(byId['t1'].content).toBe('safe')
    expect(byId['t2'].content).toBe('bash')
  })

  test('three safe tools all run in parallel', async () => {
    const startTimes: Record<string, number> = {}
    const ex = new StreamingToolExecutor(SAFE)

    for (const name of ['FileRead', 'Glob', 'Grep']) {
      ex.addTool(name, name, {}, async (id) => {
        startTimes[id] = Date.now()
        await Bun.sleep(30)
        return { type: 'tool_result', tool_use_id: id, content: name }
      })
    }

    const results = await collectAll(ex)
    expect(results).toHaveLength(3)

    // All three should have started within a few ms of each other (parallel)
    const times = Object.values(startTimes)
    const spread = Math.max(...times) - Math.min(...times)
    expect(spread).toBeLessThan(20)  // started within 20ms of each other
  })
})

describe('StreamingToolExecutor — error handling', () => {
  test('discard makes getRemainingResults return nothing', async () => {
    const ex = new StreamingToolExecutor(SAFE)
    ex.addTool('t1', 'FileRead', {}, makeRunner(100, 'slow'))
    ex.discard()
    const results = await collectAll(ex)
    expect(results).toHaveLength(0)
  })

  test('tool not found returns synthetic error', async () => {
    const ex = new StreamingToolExecutor(SAFE)
    // Add a tool that doesn't exist in the safe set and provide a failing runner
    ex.addTool('t1', 'UnknownTool', {}, async (id) => {
      throw new Error('not found')
    })
    const results = await collectAll(ex)
    expect(results[0].is_error).toBe(true)
    expect(results[0].content).toContain('not found')
  })

  test('multiple tools added — all results collected', async () => {
    const ex = new StreamingToolExecutor(SAFE)
    for (let i = 0; i < 5; i++) {
      const n = `t${i}`
      ex.addTool(n, 'FileRead', {}, makeRunner(5 * i, `result-${i}`))
    }
    const results = await collectAll(ex)
    expect(results).toHaveLength(5)
    // Results in add order
    for (let i = 0; i < 5; i++) {
      expect(results[i].tool_use_id).toBe(`t${i}`)
      expect(results[i].content).toBe(`result-${i}`)
    }
  })
})

describe('StreamingToolExecutor — metrics', () => {
  test('toolCount and concurrentSafeCount reflect added tools', () => {
    const ex = new StreamingToolExecutor(SAFE)
    ex.addTool('t1', 'FileRead', {}, makeRunner(0, ''))
    ex.addTool('t2', 'Bash', {}, makeRunner(0, ''))
    ex.addTool('t3', 'Glob', {}, makeRunner(0, ''))
    expect(ex.toolCount).toBe(3)
    expect(ex.concurrentSafeCount).toBe(2)  // FileRead + Glob
  })
})
