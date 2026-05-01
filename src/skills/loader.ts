/**
 * Skills System — 自定义 slash 命令（类似 Claude Code 的 skills 系统）
 *
 * 加载路径（优先级从低到高）：
 *   ~/.qiling/skills/*.md
 *   .claude/skills/ (兼容 Claude Code skills)
 *   .qiling/skills/*.md
 *
 * skill 文件格式：
 * ---
 * name: verify
 * description: 运行 lint、类型检查和测试
 * ---
 *
 * 在这里写给 AI 的指令...
 * 可以包含工具调用示例、步骤等。
 */

import { existsSync, readdirSync, readFileSync } from 'fs'
import { join, basename } from 'path'
import { homedir } from 'os'

export interface Skill {
  name: string              // 命令名，不含 /
  description: string
  content: string           // 完整 markdown 内容（含 frontmatter）
  instructions: string      // 去掉 frontmatter 的指令部分
  source: string            // 文件路径
}

interface SkillFrontmatter {
  name?: string
  description?: string
  [key: string]: unknown
}

function parseFrontmatter(content: string): { fm: SkillFrontmatter; body: string } {
  const fm: SkillFrontmatter = {}
  let body = content

  if (content.startsWith('---')) {
    const end = content.indexOf('\n---', 3)
    if (end !== -1) {
      const fmBlock = content.slice(3, end).trim()
      body = content.slice(end + 4).trim()

      for (const line of fmBlock.split('\n')) {
        const colon = line.indexOf(':')
        if (colon !== -1) {
          const key = line.slice(0, colon).trim()
          const value = line.slice(colon + 1).trim().replace(/^["']|["']$/g, '')
          fm[key] = value
        }
      }
    }
  }

  return { fm, body }
}

function loadSkillsFromDir(dir: string): Skill[] {
  if (!existsSync(dir)) return []
  const skills: Skill[] = []

  try {
    const files = readdirSync(dir).filter(f => f.endsWith('.md'))
    for (const file of files) {
      const filePath = join(dir, file)
      try {
        const content = readFileSync(filePath, 'utf-8')
        const { fm, body } = parseFrontmatter(content)
        const name = fm.name ?? basename(file, '.md')
        const description = fm.description ?? `Custom skill: ${name}`

        skills.push({ name, description, content, instructions: body, source: filePath })
      } catch { /* skip unreadable files */ }
    }
  } catch { /* skip unreadable dirs */ }

  return skills
}

export function loadAllSkills(workingDir: string): Skill[] {
  const skillMap = new Map<string, Skill>()

  const searchDirs = [
    join(homedir(), '.qiling', 'skills'),        // global user skills
    join(workingDir, '.claude', 'skills'),        // Claude Code compat
    join(workingDir, '.qiling', 'skills'),        // project skills (highest prio)
  ]

  for (const dir of searchDirs) {
    for (const skill of loadSkillsFromDir(dir)) {
      skillMap.set(skill.name, skill)  // later entries override earlier
    }
  }

  return Array.from(skillMap.values()).sort((a, b) => a.name.localeCompare(b.name))
}

export function formatSkillList(skills: Skill[]): string {
  if (skills.length === 0) {
    return '暂无自定义 skill。\n\n创建方法:\n  mkdir -p .qiling/skills\n  echo "---\\nname: verify\\ndescription: 运行测试\\n---\\nbun test" > .qiling/skills/verify.md'
  }
  return skills
    .map(s => `  /${s.name.padEnd(16)}${s.description}`)
    .join('\n')
}
