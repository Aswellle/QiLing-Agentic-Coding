/**
 * File history snapshot system — simplified port from CC's utils/fileHistory.ts
 *
 * Before every FileEdit / FileWrite, `backupFile()` saves the original content
 * to ~/.qiling/file-history/<sessionId>/<hash>@v<N>.
 *
 * Backups are keyed by (filePath, session). The same file edited N times in one
 * session has N versioned backups. The /restore command restores the v1 backup,
 * returning the file to its pre-session state.
 *
 * CC deps replaced: getSessionId/getOriginalCwd/getClaudeConfigHomeDir → local
 *                   getters, React state updater pattern → simple module Map,
 *                   diff package → readFile comparison, analytics → removed.
 */

import { createHash } from 'crypto'
import { copyFile, mkdir, readFile, stat, unlink } from 'fs/promises'
import { dirname, isAbsolute, join, relative, resolve } from 'path'
import { getGlobalConfigDir } from '../settings/loader'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FileBackup {
  filePath: string
  backupPath: string
  version: number
  backedUpAt: Date
  existed: boolean  // false = file did not exist (will be deleted on restore)
}

// ─── Session state ────────────────────────────────────────────────────────────

let _sessionId: string | null = null
const _backups = new Map<string, FileBackup[]>()  // normalized filePath → backups sorted by version

export function initFileHistory(sessionId: string): void {
  _sessionId = sessionId
}

function getSessionId(): string {
  return _sessionId ?? 'default'
}

function getBackupDir(): string {
  return join(getGlobalConfigDir(), 'file-history', getSessionId())
}

function hashPath(filePath: string): string {
  return createHash('sha256').update(filePath).digest('hex').slice(0, 16)
}

function normalizePath(filePath: string, cwd: string): string {
  const abs = isAbsolute(filePath) ? filePath : resolve(cwd, filePath)
  return abs
}

function getBackupPath(filePath: string, version: number): string {
  return join(getBackupDir(), `${hashPath(filePath)}@v${version}`)
}

// ─── Core: backup before edit ─────────────────────────────────────────────────

/**
 * Backup `filePath` before it is modified. Safe to call multiple times on the
 * same file in one session — only creates v1 once; subsequent calls are no-ops.
 *
 * Returns the backup record, or null if the file could not be backed up.
 */
export async function backupFile(filePath: string, cwd: string): Promise<FileBackup | null> {
  if (process.env.QILING_DISABLE_FILE_CHECKPOINTING === '1') return null

  const normalized = normalizePath(filePath, cwd)
  const existing = _backups.get(normalized)

  // v1 already created for this session — don't overwrite the original
  if (existing && existing.some(b => b.version === 1)) {
    return existing[0]!
  }

  const version = 1
  const backupPath = getBackupPath(normalized, version)

  let existed = true
  try {
    await stat(normalized)
  } catch {
    existed = false
  }

  if (existed) {
    try {
      await mkdir(dirname(backupPath), { recursive: true })
      await copyFile(normalized, backupPath)
    } catch {
      return null
    }
  }

  const backup: FileBackup = {
    filePath: normalized,
    backupPath,
    version,
    backedUpAt: new Date(),
    existed,
  }

  const list = _backups.get(normalized) ?? []
  list.push(backup)
  _backups.set(normalized, list)

  if (process.env.QILING_DEBUG === '1') {
    process.stderr.write(`[fileHistory] Backed up ${filePath} → v${version}\n`)
  }

  return backup
}

// ─── Restore ──────────────────────────────────────────────────────────────────

/** Restore a file to its pre-session state (v1 backup). */
export async function restoreFile(filePath: string, cwd: string): Promise<string> {
  const normalized = normalizePath(filePath, cwd)
  const backups = _backups.get(normalized)
  const v1 = backups?.find(b => b.version === 1)

  if (!v1) {
    return `未找到 ${filePath} 的备份（本次会话未修改该文件）`
  }

  if (!v1.existed) {
    // File didn't exist before — delete it
    try {
      await unlink(normalized)
      return `✓ 已删除 ${filePath}（恢复到会话前状态：文件不存在）`
    } catch {
      return `✓ ${filePath} 已不存在（无需操作）`
    }
  }

  try {
    await mkdir(dirname(normalized), { recursive: true })
    await copyFile(v1.backupPath, normalized)
    return `✓ 已恢复 ${filePath} 到会话前的版本（${v1.backedUpAt.toLocaleTimeString('zh-CN')}）`
  } catch (e) {
    return `✗ 恢复失败: ${e instanceof Error ? e.message : String(e)}`
  }
}

// ─── List ─────────────────────────────────────────────────────────────────────

/** Return all files that have been backed up in the current session. */
export function listBackedUpFiles(cwd: string): Array<{ relPath: string; version: number; at: Date; existed: boolean }> {
  const results: Array<{ relPath: string; version: number; at: Date; existed: boolean }> = []
  for (const [absPath, backups] of _backups) {
    for (const b of backups) {
      let relPath: string
      try {
        relPath = relative(cwd, absPath)
        if (relPath.startsWith('..')) relPath = absPath
      } catch {
        relPath = absPath
      }
      results.push({ relPath, version: b.version, at: b.backedUpAt, existed: b.existed })
    }
  }
  return results.sort((a, b) => a.relPath.localeCompare(b.relPath))
}

/** True if the file has a v1 backup in this session. */
export function hasBackup(filePath: string, cwd: string): boolean {
  const normalized = normalizePath(filePath, cwd)
  return !!_backups.get(normalized)?.some(b => b.version === 1)
}

// ─── Diff check ───────────────────────────────────────────────────────────────

/** Return true if the file currently differs from its v1 backup. */
export async function fileChangedFromBackup(filePath: string, cwd: string): Promise<boolean> {
  const normalized = normalizePath(filePath, cwd)
  const v1 = _backups.get(normalized)?.find(b => b.version === 1)
  if (!v1) return false
  if (!v1.existed) {
    try { await stat(normalized); return true } catch { return false }
  }
  try {
    const [current, backup] = await Promise.all([
      readFile(normalized, 'utf-8'),
      readFile(v1.backupPath, 'utf-8'),
    ])
    return current !== backup
  } catch {
    return true
  }
}
