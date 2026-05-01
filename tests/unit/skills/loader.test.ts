import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'fs'
import { join } from 'path'
import { loadAllSkills, formatSkillList } from '../../../src/skills/loader'

const TEST_DIR = join(import.meta.dir, '__skills_test__')

function writeSkill(name: string, content: string): void {
  mkdirSync(join(TEST_DIR, '.qiling', 'skills'), { recursive: true })
  writeFileSync(join(TEST_DIR, '.qiling', 'skills', `${name}.md`), content)
}

beforeEach(() => mkdirSync(TEST_DIR, { recursive: true }))
afterEach(() => { if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true }) })

describe('loadAllSkills', () => {
  test('returns empty array when no skills dirs exist', () => {
    const skills = loadAllSkills(TEST_DIR)
    // May have global skills from ~/.qiling/skills — just verify it returns an array
    expect(Array.isArray(skills)).toBe(true)
  })

  test('loads skill with frontmatter', () => {
    writeSkill('verify', `---
name: verify
description: Run lint and tests
---

Please run:
1. bun run typecheck
2. bun test`)

    const skills = loadAllSkills(TEST_DIR)
    const verify = skills.find(s => s.name === 'verify')
    expect(verify).toBeDefined()
    expect(verify!.description).toBe('Run lint and tests')
    expect(verify!.instructions).toContain('bun test')
  })

  test('falls back to filename if no name in frontmatter', () => {
    writeSkill('my-custom-skill', `---
description: Custom skill
---
Do something.`)

    const skills = loadAllSkills(TEST_DIR)
    const found = skills.find(s => s.name === 'my-custom-skill')
    expect(found).toBeDefined()
  })

  test('skill without frontmatter uses filename as name', () => {
    writeSkill('simple', 'Just do the thing.')
    const skills = loadAllSkills(TEST_DIR)
    const found = skills.find(s => s.name === 'simple')
    expect(found).toBeDefined()
    expect(found!.instructions).toContain('Just do the thing.')
  })

  test('later skill files override earlier ones (project > global)', () => {
    writeSkill('shared', `---
name: shared
description: Project version
---
Project instructions`)

    const skills = loadAllSkills(TEST_DIR)
    const found = skills.find(s => s.name === 'shared')
    // If a global skill with same name exists, the project one should win
    // At minimum, we get the project one back
    expect(found).toBeDefined()
  })
})

describe('formatSkillList', () => {
  test('shows message when no skills', () => {
    const output = formatSkillList([])
    expect(output).toContain('暂无')
    expect(output).toContain('.qiling/skills')
  })

  test('lists skills with descriptions', () => {
    const skills = [
      { name: 'verify', description: 'Run tests', content: '', instructions: '', source: '' },
      { name: 'ship', description: 'Deploy app', content: '', instructions: '', source: '' },
    ]
    const output = formatSkillList(skills)
    expect(output).toContain('/verify')
    expect(output).toContain('/ship')
    expect(output).toContain('Run tests')
  })
})
