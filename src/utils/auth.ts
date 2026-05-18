/**
 * Authentication utilities — adapted from CC's utils/auth.ts
 *
 * Provides dynamic credential refresh for cloud providers (AWS Bedrock, GCP Vertex).
 * QiLing's providers (src/providers/bedrock.ts, vertex.ts) handle static credentials;
 * this module handles dynamic refresh via external commands.
 *
 * Configuration via settings.json or environment:
 *   AWS: { awsAuthRefresh: "aws sso login --profile myprofile" }
 *   GCP: { gcpAuthRefresh: "gcloud auth application-default login" }
 */

import { exec } from 'node:child_process'
import { promisify } from 'node:util'

const execAsync = promisify(exec)

const AWS_AUTH_REFRESH_TIMEOUT_MS = 5 * 60 * 1000   // 5 minutes
const GCP_AUTH_REFRESH_TIMEOUT_MS = 5 * 60 * 1000   // 5 minutes

// ─── API Key helpers ──────────────────────────────────────────────────────────

/** Get the Anthropic API key from env, falling back to settings */
export function getAnthropicApiKey(): string | null {
  return process.env.ANTHROPIC_API_KEY ?? null
}

/** Check if direct API key auth is configured */
export function hasAnthropicApiKeyAuth(): boolean {
  return Boolean(getAnthropicApiKey())
}

// ─── AWS credential refresh ───────────────────────────────────────────────────

let _awsRefreshInProgress = false
let _awsLastRefreshAt = 0
const AWS_REFRESH_COOLDOWN_MS = 30_000  // 30s cooldown

/**
 * Run an external AWS auth refresh command (e.g., "aws sso login").
 * Returns true if the command succeeded.
 */
export async function refreshAwsAuth(awsAuthRefresh: string): Promise<boolean> {
  if (_awsRefreshInProgress) {
    if (process.env.QILING_DEBUG === '1') console.error('[auth] AWS refresh already in progress')
    return false
  }

  const now = Date.now()
  if (now - _awsLastRefreshAt < AWS_REFRESH_COOLDOWN_MS) {
    return true  // Recently refreshed, assume still valid
  }

  _awsRefreshInProgress = true
  if (process.env.QILING_DEBUG === '1') console.error('[auth] Running AWS auth refresh:', awsAuthRefresh)

  try {
    await execAsync(awsAuthRefresh, { timeout: AWS_AUTH_REFRESH_TIMEOUT_MS })
    _awsLastRefreshAt = Date.now()
    return true
  } catch (err) {
    console.error('[auth] AWS auth refresh failed:', err instanceof Error ? err.message : err)
    return false
  } finally {
    _awsRefreshInProgress = false
  }
}

/**
 * Get AWS credentials via credential export command.
 * The command should output JSON: { accessKeyId, secretAccessKey, sessionToken }
 */
export async function getAwsCredentialsFromExport(
  credentialExportCommand: string,
): Promise<{ accessKeyId: string; secretAccessKey: string; sessionToken?: string } | null> {
  try {
    const { stdout } = await execAsync(credentialExportCommand, {
      timeout: 30_000,
    })
    const parsed = JSON.parse(stdout.trim()) as Record<string, unknown>
    const accessKeyId = String(parsed.accessKeyId ?? parsed.AccessKeyId ?? '')
    const secretAccessKey = String(parsed.secretAccessKey ?? parsed.SecretAccessKey ?? '')
    const sessionToken = parsed.sessionToken ?? parsed.SessionToken
      ? String(parsed.sessionToken ?? parsed.SessionToken) : undefined

    if (!accessKeyId || !secretAccessKey) return null
    return { accessKeyId, secretAccessKey, sessionToken }
  } catch {
    return null
  }
}

// ─── GCP credential refresh ───────────────────────────────────────────────────

let _gcpRefreshInProgress = false
let _gcpLastRefreshAt = 0

/**
 * Check if GCP application default credentials are valid.
 */
export async function checkGcpCredentialsValid(): Promise<boolean> {
  try {
    // Try gcloud auth print-access-token (fastest check)
    const { stdout } = await execAsync('gcloud auth application-default print-access-token', {
      timeout: 10_000,
    })
    return stdout.trim().length > 0
  } catch {
    return false
  }
}

/**
 * Run an external GCP auth refresh command.
 * Returns true if the command succeeded.
 */
export async function refreshGcpAuth(gcpAuthRefresh: string): Promise<boolean> {
  if (_gcpRefreshInProgress) return false

  const now = Date.now()
  if (now - _gcpLastRefreshAt < AWS_REFRESH_COOLDOWN_MS) return true

  _gcpRefreshInProgress = true
  if (process.env.QILING_DEBUG === '1') console.error('[auth] Running GCP auth refresh:', gcpAuthRefresh)

  try {
    await execAsync(gcpAuthRefresh, { timeout: GCP_AUTH_REFRESH_TIMEOUT_MS })
    _gcpLastRefreshAt = Date.now()
    return true
  } catch (err) {
    console.error('[auth] GCP auth refresh failed:', err instanceof Error ? err.message : err)
    return false
  } finally {
    _gcpRefreshInProgress = false
  }
}

/**
 * Get a GCP access token using gcloud CLI.
 */
export async function getGcpAccessToken(): Promise<string | null> {
  try {
    const { stdout } = await execAsync(
      'gcloud auth application-default print-access-token',
      { timeout: 10_000 },
    )
    const token = stdout.trim()
    return token || null
  } catch {
    return null
  }
}

// ─── Cache helpers ────────────────────────────────────────────────────────────

/** Clear all cached credential state (e.g., after settings change) */
export function clearCredentialCaches(): void {
  _awsLastRefreshAt = 0
  _gcpLastRefreshAt = 0
  _awsRefreshInProgress = false
  _gcpRefreshInProgress = false
}
