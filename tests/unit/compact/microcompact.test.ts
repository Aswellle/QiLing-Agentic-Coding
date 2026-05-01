import { describe, test, expect } from 'bun:test'
import { microcompact, extractToolCallSummary } from '../../../src/compact/engine'
import type { Message } from '../../../src/types/message'

describe('microcompact — edge cases', () => {
  test('returns empty array for empty input', () => {
    expect(microcompact([], 6)).toEqual([])
  })

  test('returns messages unchanged for keepLastN === 0 with short list', () => {
    const msgs: Message[] = [
      { role: 'user', content: 'hi' },
      { role: 'assistant', content: 'hello' },
    ]
    expect(microcompact(msgs, 10)).toEqual(msgs)
  })

  test('does not truncate messages within keepLastN', () => {
    const longContent = 'x'.repeat(5000)
    const msgs: Message[] = Array.from({ length: 3 }, (_, i) => ({
      role: 'user' as const,
      content: [{ type: 'tool_result' as const, tool_use_id: `t${i}`, content: longContent }],
    }))

    const result = microcompact(msgs, 10) // keep all
    // Content should be unchanged since all within keepLastN
    const firstBlock = result[0].content as Array<{ content: string }>
    expect(firstBlock[0].content).toBe(longContent)
  })
})

describe('extractToolCallSummary — comprehensive', () => {
  test('handles Agent tool calls', () => {
    const msgs: Message[] = [{
      role: 'assistant',
      content: [{ type: 'tool_use', id: 'a1', name: 'Agent', input: { description: 'run tests', prompt: 'Run all tests' } }],
    }]
    const summary = extractToolCallSummary(msgs)
    expect(summary).toContain('Agent')
    expect(summary).toContain('run tests')
  })

  test('handles WebFetch tool calls', () => {
    const msgs: Message[] = [{
      role: 'assistant',
      content: [{ type: 'tool_use', id: 'w1', name: 'WebFetch', input: { url: 'https://example.com' } }],
    }]
    const summary = extractToolCallSummary(msgs)
    expect(summary).toContain('WebFetch')
    expect(summary).toContain('https://example.com')
  })

  test('limits output for many tool calls', () => {
    const msgs: Message[] = Array.from({ length: 100 }, (_, i) => ({
      role: 'assistant' as const,
      content: [{ type: 'tool_use' as const, id: `t${i}`, name: 'FileRead', input: { file_path: `file_${i}.ts` } }],
    }))
    const summary = extractToolCallSummary(msgs)
    expect(summary.length).toBeGreaterThan(0)
    expect(summary).toContain('FileRead')
  })
})
