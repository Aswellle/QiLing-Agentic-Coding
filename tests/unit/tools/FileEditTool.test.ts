import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { writeFileSync, readFileSync, mkdirSync, rmSync, existsSync } from 'fs'
import { join } from 'path'
import { FileEditTool } from '../../../src/tools/FileEditTool'

const TEST_DIR = join(import.meta.dir, '__tmp__')
const ctx = { workingDir: TEST_DIR, sessionId: 'test' }

function testFile(name: string, content: string): string {
  const p = join(TEST_DIR, name)
  writeFileSync(p, content, 'utf-8')
  return p
}

beforeEach(() => mkdirSync(TEST_DIR, { recursive: true }))
afterEach(() => { if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true }) })

describe('FileEditTool — successful edits', () => {
  test('replaces a unique string', async () => {
    testFile('a.ts', 'function hello() {\n  return "world"\n}\n')
    const r = await FileEditTool.call(
      { file_path: 'a.ts', old_string: 'return "world"', new_string: 'return "qiling"', replace_all: false },
      ctx
    )
    expect(r.isError).toBeFalsy()
    expect(readFileSync(join(TEST_DIR, 'a.ts'), 'utf-8')).toContain('return "qiling"')
  })

  test('replaces multiline old_string', async () => {
    testFile('b.ts', 'function foo() {\n  const x = 1\n  return x\n}\n')
    const r = await FileEditTool.call(
      { file_path: 'b.ts', old_string: '  const x = 1\n  return x', new_string: '  const x = 42\n  return x * 2', replace_all: false },
      ctx
    )
    expect(r.isError).toBeFalsy()
    expect(readFileSync(join(TEST_DIR, 'b.ts'), 'utf-8')).toContain('const x = 42')
  })

  test('replace_all replaces all occurrences', async () => {
    testFile('c.ts', 'foo\nfoo\nfoo\n')
    const r = await FileEditTool.call(
      { file_path: 'c.ts', old_string: 'foo', new_string: 'bar', replace_all: true },
      ctx
    )
    expect(r.isError).toBeFalsy()
    expect(readFileSync(join(TEST_DIR, 'c.ts'), 'utf-8')).toBe('bar\nbar\nbar\n')
  })
})

describe('FileEditTool — error cases', () => {
  test('returns error when file not found', async () => {
    const r = await FileEditTool.call(
      { file_path: 'nonexistent.ts', old_string: 'x', new_string: 'y', replace_all: false },
      ctx
    )
    expect(r.isError).toBe(true)
    expect(r.content[0].text).toMatch(/not found/i)
  })

  test('returns error when old_string not in file', async () => {
    testFile('d.ts', 'const x = 1\n')
    const r = await FileEditTool.call(
      { file_path: 'd.ts', old_string: 'does not exist', new_string: 'replacement', replace_all: false },
      ctx
    )
    expect(r.isError).toBe(true)
    expect(r.content[0].text).toMatch(/not found/i)
  })

  test('returns error when old_string has multiple matches without replace_all', async () => {
    testFile('e.ts', 'foo\nfoo\n')
    const r = await FileEditTool.call(
      { file_path: 'e.ts', old_string: 'foo', new_string: 'bar', replace_all: false },
      ctx
    )
    expect(r.isError).toBe(true)
    expect(r.content[0].text).toMatch(/2.*occurrence/i)
  })
})

describe('FileEditTool — edge cases', () => {
  test('handles empty old_string error gracefully', async () => {
    testFile('f.ts', 'content\n')
    // Empty old_string would match everywhere — function should handle or fail gracefully
    const r = await FileEditTool.call(
      { file_path: 'f.ts', old_string: '', new_string: 'x', replace_all: false },
      ctx
    )
    // Either succeeds (replacing nothing) or fails with a clear error
    expect(r.content[0].text).toBeTruthy()
  })

  test('preserves file encoding (no BOM added)', async () => {
    testFile('g.ts', 'const a = 1\n')
    await FileEditTool.call(
      { file_path: 'g.ts', old_string: 'const a = 1', new_string: 'const a = 2', replace_all: false },
      ctx
    )
    const buf = readFileSync(join(TEST_DIR, 'g.ts'))
    // Should not start with BOM bytes
    expect(buf[0]).not.toBe(0xEF)
  })
})
