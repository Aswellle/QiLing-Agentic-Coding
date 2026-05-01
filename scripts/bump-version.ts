#!/usr/bin/env bun
/**
 * Version bump script
 * Usage: bun run scripts/bump-version.ts [patch|minor|major]
 *
 * 1. Bumps version in package.json
 * 2. Updates VERSION constant in src/main.tsx
 * 3. Creates git tag
 * 4. Pushes tag (triggers release CI)
 */

import { readFileSync, writeFileSync } from 'fs'

const type = process.argv[2] as 'patch' | 'minor' | 'major' | undefined

if (!['patch', 'minor', 'major'].includes(type ?? '')) {
  console.error('Usage: bun run scripts/bump-version.ts [patch|minor|major]')
  process.exit(1)
}

// Read current version from package.json
const pkgPath = new URL('../package.json', import.meta.url).pathname
const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as { version: string; [key: string]: unknown }
const [major, minor, patch] = pkg.version.split('.').map(Number)

let newMajor = major
let newMinor = minor
let newPatch = patch

switch (type) {
  case 'major': newMajor++; newMinor = 0; newPatch = 0; break
  case 'minor': newMinor++; newPatch = 0; break
  case 'patch': newPatch++; break
}

const newVersion = `${newMajor}.${newMinor}.${newPatch}`
const newTag = `v${newVersion}`

// Update package.json
pkg.version = newVersion
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8')
console.log(`✓ package.json: ${pkg.version} → ${newVersion}`)

// Update src/main.tsx
const mainPath = new URL('../src/main.tsx', import.meta.url).pathname
let mainContent = readFileSync(mainPath, 'utf-8')
mainContent = mainContent.replace(
  /const VERSION = '[^']+'/,
  `const VERSION = '${newVersion}'`
)
writeFileSync(mainPath, mainContent, 'utf-8')
console.log(`✓ src/main.tsx: VERSION = '${newVersion}'`)

// Git commit + tag
const { execSync } = await import('child_process')

try {
  execSync(`git add package.json src/main.tsx`, { stdio: 'inherit' })
  execSync(`git commit -m "chore: bump version to ${newVersion}"`, { stdio: 'inherit' })
  execSync(`git tag -a ${newTag} -m "Release ${newTag}"`, { stdio: 'inherit' })
  console.log(`✓ Git tag: ${newTag}`)

  const push = process.argv.includes('--push')
  if (push) {
    execSync(`git push origin main --tags`, { stdio: 'inherit' })
    console.log(`✓ Pushed to origin — GitHub Actions release workflow will start`)
  } else {
    console.log(`\n  Run the following to publish:`)
    console.log(`  git push origin main --tags`)
  }
} catch (err) {
  console.error('Git error:', err)
  process.exit(1)
}
