/**
 * Session storage utilities — adapted from CC's utils/sessionStorage.ts
 *
 * Manages session-related file paths and metadata for JSONL transcript storage.
 * CC uses this extensively for session restore, analytics, and history.
 *
 * QiLing adaptation: simplified to the core path utilities and custom title support.
 * Full transcript writing is handled by src/history/manager.ts.
 */

import { join } from 'node:path'
import { homedir } from 'node:os'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'

// ─── Config directories ───────────────────────────────────────────────────────

export function getQilingConfigDir(): string {
  return process.env.QILING_CONFIG_HOME ?? join(homedir(), '.qiling')
}

export function getProjectsDir(): string {
  return join(getQilingConfigDir(), 'projects')
}

/**
 * Get the project directory for a given working directory path.
 * Creates a stable hash-like path from the cwd: ~/.qiling/projects/<slug>/
 */
export function getProjectDir(projectPath: string): string {
  const slug = projectPath
    .replace(/[/\\:]/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
  return join(getProjectsDir(), slug)
}

// ─── Session paths ────────────────────────────────────────────────────────────

export function getTranscriptPath(
  sessionId: string,
  projectPath = process.cwd(),
): string {
  const dir = getProjectDir(projectPath)
  mkdirSync(dir, { recursive: true })
  return join(dir, `${sessionId}.jsonl`)
}

export function sessionIdExists(sessionId: string, projectPath = process.cwd()): boolean {
  return existsSync(getTranscriptPath(sessionId, projectPath))
}

// ─── Session metadata ─────────────────────────────────────────────────────────

export type SessionMetadata = {
  sessionId: string
  customTitle?: string
  agentName?: string
  agentColor?: string
  createdAt: number
  updatedAt: number
}

function getMetadataPath(sessionId: string, projectPath = process.cwd()): string {
  const dir = getProjectDir(projectPath)
  return join(dir, `${sessionId}.meta.json`)
}

export function readSessionMetadata(
  sessionId: string,
  projectPath = process.cwd(),
): SessionMetadata | null {
  const path = getMetadataPath(sessionId, projectPath)
  if (!existsSync(path)) return null
  try {
    return JSON.parse(readFileSync(path, 'utf-8')) as SessionMetadata
  } catch {
    return null
  }
}

export function writeSessionMetadata(
  metadata: SessionMetadata,
  projectPath = process.cwd(),
): void {
  const path = getMetadataPath(metadata.sessionId, projectPath)
  const dir = getProjectDir(projectPath)
  mkdirSync(dir, { recursive: true })
  writeFileSync(path, JSON.stringify(metadata, null, 2), 'utf-8')
}

/**
 * Save a custom title for the current session.
 * Used by /rename command.
 */
export function saveCustomTitle(
  sessionId: string,
  title: string,
  projectPath = process.cwd(),
): void {
  const existing = readSessionMetadata(sessionId, projectPath)
  writeSessionMetadata({
    sessionId,
    customTitle: title,
    createdAt: existing?.createdAt ?? Date.now(),
    updatedAt: Date.now(),
    agentName: existing?.agentName,
    agentColor: existing?.agentColor,
  }, projectPath)
}

/**
 * Save an agent name for the current session.
 */
export function saveAgentName(
  sessionId: string,
  name: string,
  projectPath = process.cwd(),
): void {
  const existing = readSessionMetadata(sessionId, projectPath)
  writeSessionMetadata({
    sessionId,
    customTitle: existing?.customTitle,
    agentName: name,
    createdAt: existing?.createdAt ?? Date.now(),
    updatedAt: Date.now(),
  }, projectPath)
}

/**
 * Get the display name for a session (custom title > agent name > session ID).
 */
export function getSessionDisplayName(
  sessionId: string,
  projectPath = process.cwd(),
): string {
  const meta = readSessionMetadata(sessionId, projectPath)
  return meta?.customTitle ?? meta?.agentName ?? sessionId.slice(0, 8)
}

// ─── Custom title check ───────────────────────────────────────────────────────

export function isCustomTitleEnabled(): boolean {
  return true  // Always enabled in QiLing
}
