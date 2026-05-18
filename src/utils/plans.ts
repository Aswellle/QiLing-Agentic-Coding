/**
 * Plan management utilities — adapted from CC's utils/plans.ts
 *
 * Manages plan files created in /plan mode. Plans are stored as markdown files
 * in .qiling/plans/ with word-slug filenames for readability.
 *
 * CC version: integrates with session state, file snapshots, word slugs.
 * QiLing adaptation: simplified session-independent version.
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { randomUUID } from 'node:crypto'

const MAX_SLUG_RETRIES = 10

// ─── Directory ────────────────────────────────────────────────────────────────

/**
 * Get the plans directory for a project.
 */
export function getPlansDirectory(cwd = process.cwd()): string {
  return join(cwd, '.qiling', 'plans')
}

/**
 * Ensure the plans directory exists.
 */
function ensurePlansDir(cwd = process.cwd()): string {
  const dir = getPlansDirectory(cwd)
  mkdirSync(dir, { recursive: true })
  return dir
}

// ─── Slug generation ──────────────────────────────────────────────────────────

/** Generate a short unique slug for a plan file */
function generatePlanSlug(): string {
  return randomUUID().slice(0, 8)
}

// Session-scoped plan slug cache
const _planSlugCache = new Map<string, string>()

/**
 * Get or generate a word slug for the current session's plan.
 * Cached for the session lifetime.
 */
export function getPlanSlug(sessionId: string, cwd = process.cwd()): string {
  const cached = _planSlugCache.get(sessionId)
  if (cached) return cached

  const plansDir = getPlansDirectory(cwd)
  let slug: string

  for (let i = 0; i < MAX_SLUG_RETRIES; i++) {
    slug = generatePlanSlug()
    if (!existsSync(join(plansDir, `${slug}.md`))) break
  }

  _planSlugCache.set(sessionId, slug!)
  return slug!
}

/** Set a specific plan slug for a session (used when resuming) */
export function setPlanSlug(sessionId: string, slug: string): void {
  _planSlugCache.set(sessionId, slug)
}

/** Clear the plan slug for the current session */
export function clearPlanSlug(sessionId: string): void {
  _planSlugCache.delete(sessionId)
}

// ─── Plan CRUD ─────────────────────────────────────────────────────────────────

/**
 * Get the path to the plan file for a session.
 */
export function getPlanFilePath(sessionId: string, cwd = process.cwd()): string {
  const slug = getPlanSlug(sessionId, cwd)
  return join(getPlansDirectory(cwd), `${slug}.md`)
}

/**
 * Read the current plan content for a session.
 */
export function readPlan(sessionId: string, cwd = process.cwd()): string | null {
  const filePath = getPlanFilePath(sessionId, cwd)
  if (!existsSync(filePath)) return null
  try { return readFileSync(filePath, 'utf-8') } catch { return null }
}

/**
 * Write/update the plan file for a session.
 */
export function writePlan(sessionId: string, content: string, cwd = process.cwd()): void {
  ensurePlansDir(cwd)
  writeFileSync(getPlanFilePath(sessionId, cwd), content, 'utf-8')
}

/**
 * Delete the plan file for a session.
 */
export function deletePlan(sessionId: string, cwd = process.cwd()): void {
  const filePath = getPlanFilePath(sessionId, cwd)
  if (existsSync(filePath)) {
    try { unlinkSync(filePath) } catch { /* ignore */ }
  }
  clearPlanSlug(sessionId)
}

/**
 * List all plan files in a project.
 */
export function listPlans(cwd = process.cwd()): Array<{ slug: string; path: string }> {
  const dir = getPlansDirectory(cwd)
  if (!existsSync(dir)) return []

  return readdirSync(dir)
    .filter(f => f.endsWith('.md'))
    .map(f => ({ slug: f.slice(0, -3), path: join(dir, f) }))
}
