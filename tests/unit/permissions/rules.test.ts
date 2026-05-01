import { describe, test, expect } from 'bun:test'
import { evaluateRules, checkRules } from '../../../src/permissions/rules'

describe('evaluateRules — tool name matching', () => {
  test('exact tool name matches', () => {
    expect(evaluateRules(['Bash'], 'Bash', 'git status')).toBe(true)
  })

  test('wrong tool name does not match', () => {
    expect(evaluateRules(['Bash'], 'FileRead', 'test.ts')).toBe(false)
  })

  test('wildcard * matches any tool', () => {
    expect(evaluateRules(['*'], 'Bash', 'ls')).toBe(true)
    expect(evaluateRules(['*'], 'FileEdit', 'src/foo.ts')).toBe(true)
  })

  test('case-insensitive tool name match', () => {
    expect(evaluateRules(['bash'], 'Bash', 'ls')).toBe(true)
  })
})

describe('evaluateRules — argument pattern matching', () => {
  test('Bash(git *) matches git commands', () => {
    expect(evaluateRules(['Bash(git *)'], 'Bash', 'git status')).toBe(true)
    expect(evaluateRules(['Bash(git *)'], 'Bash', 'git commit -m "fix"')).toBe(true)
    expect(evaluateRules(['Bash(git *)'], 'Bash', 'git log --oneline')).toBe(true)
  })

  test('Bash(git *) does not match non-git commands', () => {
    expect(evaluateRules(['Bash(git *)'], 'Bash', 'npm run build')).toBe(false)
    expect(evaluateRules(['Bash(git *)'], 'Bash', 'rm -rf /')).toBe(false)
  })

  test('FileEdit(src/*.ts) matches TS files in src/', () => {
    expect(evaluateRules(['FileEdit(src/*.ts)'], 'FileEdit', 'src/auth.ts')).toBe(true)
    expect(evaluateRules(['FileEdit(src/*.ts)'], 'FileEdit', 'src/index.ts')).toBe(true)
  })

  test('FileEdit(src/*.ts) does not match files outside src/', () => {
    expect(evaluateRules(['FileEdit(src/*.ts)'], 'FileEdit', 'tests/auth.test.ts')).toBe(false)
    expect(evaluateRules(['FileEdit(src/*.ts)'], 'FileEdit', 'README.md')).toBe(false)
  })

  test('rule without arg pattern matches any arg', () => {
    expect(evaluateRules(['FileRead'], 'FileRead', 'any/path/at/all.ts')).toBe(true)
  })
})

describe('checkRules — priority order', () => {
  test('deny rules take priority over allow rules', () => {
    const result = checkRules(
      ['Bash(git *)'],
      ['Bash(git push --force*)'],
      'Bash',
      'git push --force origin main'
    )
    expect(result?.type).toBe('deny')
  })

  test('allow rule permits matching call', () => {
    const result = checkRules(['Bash(git *)'], [], 'Bash', 'git status')
    expect(result?.type).toBe('allow')
  })

  test('returns null when no rule matches (should ask user)', () => {
    const result = checkRules(['Bash(git *)'], [], 'Bash', 'rm -rf /')
    expect(result).toBeNull()
  })

  test('deny without allow → deny wins', () => {
    const result = checkRules([], ['Bash(rm *)'], 'Bash', 'rm -rf /tmp')
    expect(result?.type).toBe('deny')
  })

  test('no rules at all → null (ask user)', () => {
    expect(checkRules([], [], 'Bash', 'any command')).toBeNull()
  })
})

describe('evaluateRules — multiple rules', () => {
  test('matches first applicable rule in list', () => {
    expect(evaluateRules(['Bash(npm *)', 'Bash(git *)'], 'Bash', 'npm run build')).toBe(true)
    expect(evaluateRules(['Bash(npm *)', 'Bash(git *)'], 'Bash', 'git log')).toBe(true)
    expect(evaluateRules(['Bash(npm *)', 'Bash(git *)'], 'Bash', 'ls')).toBe(false)
  })
})
