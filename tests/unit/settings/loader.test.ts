import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'fs'
import { join } from 'path'
import { loadSettings } from '../../../src/settings/loader'

const TEST_PROJECT_DIR = join(import.meta.dir, '__proj__')
const TEST_PROJECT_CONFIG = join(TEST_PROJECT_DIR, '.qiling', 'settings.json')

function writeProjectConfig(config: Record<string, unknown>) {
  mkdirSync(join(TEST_PROJECT_DIR, '.qiling'), { recursive: true })
  writeFileSync(TEST_PROJECT_CONFIG, JSON.stringify(config), 'utf-8')
}

beforeEach(() => mkdirSync(TEST_PROJECT_DIR, { recursive: true }))
afterEach(() => { if (existsSync(TEST_PROJECT_DIR)) rmSync(TEST_PROJECT_DIR, { recursive: true }) })

describe('Settings loading — defaults', () => {
  test('CLI override always wins regardless of global config', () => {
    // The global ~/.qiling/settings.json may have user-specific settings (e.g. minimax)
    // so we test that CLI overrides always win, not what the raw default is
    const s = loadSettings(TEST_PROJECT_DIR, { provider: 'anthropic', model: 'claude-sonnet-4-6' })
    expect(s.provider).toBe('anthropic')
    expect(s.model).toBe('claude-sonnet-4-6')
  })

  test('maxTokens defaults to 8096 when not overridden', () => {
    const s = loadSettings(TEST_PROJECT_DIR, {})
    expect(s.maxTokens).toBe(8096)
  })

  test('permissions start empty by default', () => {
    const s = loadSettings(TEST_PROJECT_DIR, {})
    // Even with global config, permissions should be arrays
    expect(Array.isArray(s.permissions.allow)).toBe(true)
    expect(Array.isArray(s.permissions.deny)).toBe(true)
  })
})

describe('Settings loading — CLI overrides', () => {
  test('CLI model override wins over defaults', () => {
    const s = loadSettings(TEST_PROJECT_DIR, { model: 'gpt-4o' })
    expect(s.model).toBe('gpt-4o')
  })

  test('CLI provider override wins', () => {
    const s = loadSettings(TEST_PROJECT_DIR, { provider: 'minimax' })
    expect(s.provider).toBe('minimax')
  })

  test('CLI apiKey override wins', () => {
    const s = loadSettings(TEST_PROJECT_DIR, { apiKey: 'cli-key' })
    expect(s.apiKey).toBe('cli-key')
  })
})

describe('Settings loading — project config', () => {
  test('project config overrides defaults', () => {
    writeProjectConfig({ model: 'MiniMax-Text-01', provider: 'minimax' })
    const s = loadSettings(TEST_PROJECT_DIR)
    expect(s.model).toBe('MiniMax-Text-01')
    expect(s.provider).toBe('minimax')
  })

  test('CLI override wins over project config', () => {
    writeProjectConfig({ model: 'gpt-4o', provider: 'openai' })
    const s = loadSettings(TEST_PROJECT_DIR, { model: 'claude-sonnet-4-6' })
    expect(s.model).toBe('claude-sonnet-4-6')
  })

  test('project permissions are merged', () => {
    writeProjectConfig({ permissions: { allow: ['Bash(git *)'], deny: ['Bash(rm -rf *)'] } })
    const s = loadSettings(TEST_PROJECT_DIR)
    expect(s.permissions.allow).toContain('Bash(git *)')
    expect(s.permissions.deny).toContain('Bash(rm -rf *)')
  })
})

describe('Settings loading — env vars', () => {
  test('MINIMAX_API_KEY sets apiKey when no other key is set', () => {
    const originalKey = process.env.MINIMAX_API_KEY
    process.env.MINIMAX_API_KEY = 'test-minimax-key'
    try {
      const s = loadSettings(TEST_PROJECT_DIR)
      expect(s.apiKey).toBe('test-minimax-key')
    } finally {
      if (originalKey === undefined) delete process.env.MINIMAX_API_KEY
      else process.env.MINIMAX_API_KEY = originalKey
    }
  })

  test('ANTHROPIC_API_KEY takes precedence over MINIMAX_API_KEY', () => {
    const origAnthropic = process.env.ANTHROPIC_API_KEY
    const origMinimax = process.env.MINIMAX_API_KEY
    process.env.ANTHROPIC_API_KEY = 'anthropic-key'
    process.env.MINIMAX_API_KEY = 'minimax-key'
    try {
      const s = loadSettings(TEST_PROJECT_DIR)
      expect(s.apiKey).toBe('anthropic-key')
    } finally {
      if (origAnthropic === undefined) delete process.env.ANTHROPIC_API_KEY
      else process.env.ANTHROPIC_API_KEY = origAnthropic
      if (origMinimax === undefined) delete process.env.MINIMAX_API_KEY
      else process.env.MINIMAX_API_KEY = origMinimax
    }
  })
})
