import { describe, test, expect } from 'bun:test'
import { microcompact, extractToolCallSummary } from '../../../src/compact/engine'
import type { Message } from '../../../src/types/message'

const makeToolUseMsg = (name: string, input: Record<string, unknown>): Message => ({
  role: 'assistant',
  content: [{ type: 'tool_use', id: `id-${name}`, name, input }],
})

const makeToolResultMsg = (id: string, text: string): Message => ({
  role: 'user',
  content: [{ type: 'tool_result', tool_use_id: id, content: text }],
})

describe('microcompact', () => {
  test('returns messages unchanged when count <= keepLastN', () => {
    const msgs: Message[] = [
      { role: 'user', content: 'hello' },
      { role: 'assistant', content: 'hi' },
    ]
    const result = microcompact(msgs, 6)
    expect(result).toEqual(msgs)
  })

  test('truncates long tool_result content in older messages', () => {
    const longContent = 'x'.repeat(1000)
    const msgs: Message[] = [
      makeToolResultMsg('t1', longContent),
      makeToolResultMsg('t2', longContent),
      makeToolResultMsg('t3', longContent),
      makeToolResultMsg('t4', longContent),
      makeToolResultMsg('t5', longContent),
      makeToolResultMsg('t6', longContent),
      makeToolResultMsg('t7', 'short'),  // keepLastN=6, this is kept full
    ]

    const result = microcompact(msgs, 6)

    // First message (older than keepLastN) should be truncated
    const firstBlock = result[0].content as Array<{ type: string; content: string }>
    const firstContent = firstBlock[0].content
    expect(firstContent.length).toBeLessThan(longContent.length)
    expect(firstContent).toContain('truncated')

    // Last messages should be unchanged
    const lastBlock = result[result.length - 1].content as Array<{ type: string; content: string }>
    expect(lastBlock[0].content).toBe('short')
  })

  test('preserves string messages', () => {
    const msgs: Message[] = Array.from({ length: 10 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant' as 'user' | 'assistant',
      content: `message ${i}`,
    }))

    const result = microcompact(msgs, 4)
    // String messages should pass through unchanged
    expect(result.filter(m => typeof m.content === 'string').length)
      .toBe(msgs.filter(m => typeof m.content === 'string').length)
  })
})

describe('extractToolCallSummary', () => {
  test('returns empty string with no tool calls', () => {
    const msgs: Message[] = [
      { role: 'user', content: 'hello' },
      { role: 'assistant', content: 'hi' },
    ]
    expect(extractToolCallSummary(msgs)).toBe('')
  })

  test('extracts FileRead calls', () => {
    const msgs: Message[] = [
      makeToolUseMsg('FileRead', { file_path: 'src/auth.ts' }),
    ]
    const summary = extractToolCallSummary(msgs)
    expect(summary).toContain('FileRead')
    expect(summary).toContain('src/auth.ts')
  })

  test('extracts Bash calls', () => {
    const msgs: Message[] = [
      makeToolUseMsg('Bash', { command: 'git status' }),
      makeToolUseMsg('Bash', { command: 'npm run build' }),
    ]
    const summary = extractToolCallSummary(msgs)
    expect(summary).toContain('Bash')
    expect(summary).toContain('git status')
    expect(summary).toContain('npm run build')
  })

  test('extracts FileEdit with old_string preview', () => {
    const msgs: Message[] = [
      makeToolUseMsg('FileEdit', {
        file_path: 'src/utils.ts',
        old_string: 'function oldName() {',
        new_string: 'function newName() {',
      }),
    ]
    const summary = extractToolCallSummary(msgs)
    expect(summary).toContain('FileEdit')
    expect(summary).toContain('src/utils.ts')
  })

  test('handles multiple tool calls in sequence', () => {
    const msgs: Message[] = [
      makeToolUseMsg('Glob', { pattern: '**/*.ts' }),
      makeToolUseMsg('Grep', { pattern: 'TODO', path: 'src/' }),
      makeToolUseMsg('FileWrite', { file_path: 'output.md' }),
    ]
    const summary = extractToolCallSummary(msgs)
    expect(summary).toContain('Glob')
    expect(summary).toContain('Grep')
    expect(summary).toContain('FileWrite')
  })
})
