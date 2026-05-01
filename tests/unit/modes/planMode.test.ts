import { describe, test, expect } from 'bun:test'
import { filterToolsForMode, buildModeSystemPrompt, PLAN_MODE_TOOLS } from '../../../src/modes/planMode'
import type { Tool } from '../../../src/types/tool'
import { z } from 'zod'

function makeMockTool(name: string): Tool {
  return {
    name,
    description: `Mock ${name}`,
    inputSchema: z.object({}),
    call: async () => ({ content: [{ type: 'text', text: 'ok' }] }),
    toDefinition: () => ({ name, description: `Mock ${name}`, input_schema: { type: 'object', properties: {} } }),
  }
}

describe('filterToolsForMode', () => {
  const allTools = new Map([
    ['FileRead', makeMockTool('FileRead')],
    ['FileEdit', makeMockTool('FileEdit')],
    ['FileWrite', makeMockTool('FileWrite')],
    ['Bash', makeMockTool('Bash')],
    ['Glob', makeMockTool('Glob')],
    ['Grep', makeMockTool('Grep')],
  ])

  test('act mode returns all tools unchanged', () => {
    const filtered = filterToolsForMode(allTools, 'act')
    expect(filtered.size).toBe(allTools.size)
  })

  test('plan mode only allows PLAN_MODE_TOOLS', () => {
    const filtered = filterToolsForMode(allTools, 'plan')
    for (const [name] of filtered) {
      expect(PLAN_MODE_TOOLS.has(name)).toBe(true)
    }
  })

  test('plan mode blocks FileEdit and FileWrite', () => {
    const filtered = filterToolsForMode(allTools, 'plan')
    expect(filtered.has('FileEdit')).toBe(false)
    expect(filtered.has('FileWrite')).toBe(false)
    expect(filtered.has('Bash')).toBe(false)
  })

  test('plan mode keeps FileRead, Glob, Grep', () => {
    const filtered = filterToolsForMode(allTools, 'plan')
    expect(filtered.has('FileRead')).toBe(true)
    expect(filtered.has('Glob')).toBe(true)
    expect(filtered.has('Grep')).toBe(true)
  })
})

describe('buildModeSystemPrompt', () => {
  const base = 'You are QiLing.'

  test('act mode returns base prompt unchanged', () => {
    const result = buildModeSystemPrompt(base, 'act')
    expect(result).toBe(base)
  })

  test('plan mode appends plan-mode instructions', () => {
    const result = buildModeSystemPrompt(base, 'plan')
    expect(result).toContain(base)
    expect(result).toContain('PLAN MODE')
    expect(result).toContain('只能读取文件')
  })
})
