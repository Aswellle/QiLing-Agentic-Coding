import { describe, test, expect } from 'bun:test'
import { formatSessionList } from '../../../src/session/resume'

describe('formatSessionList', () => {
  test('shows message when no sessions', () => {
    const output = formatSessionList([])
    expect(output).toContain('暂无历史会话')
  })

  test('formats session list correctly', () => {
    const sessions = [
      {
        sessionId: 'abc123def456',
        startTime: new Date('2026-05-01T10:00:00Z').getTime(),
        workingDir: 'D:/projects/foo',
        messageCount: 12,
        lastMessage: 'Help me refactor auth.ts',
        filePath: '/tmp/session.jsonl',
      },
    ]
    const output = formatSessionList(sessions)
    expect(output).toContain('def456')  // last 8 chars of sessionId
    expect(output).toContain('12')      // message count
    expect(output).toContain('/resume') // usage hint
  })
})
