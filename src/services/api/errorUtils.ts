/**
 * API error utility functions — adapted from CC's services/api/errorUtils.ts
 *
 * Standalone module with no heavyweight dependencies. Handles:
 * - SSL/TLS error code detection and user-friendly messages
 * - API error formatting (HTML sanitization, nested error shapes)
 * - Connection error details from the Bun/Node cause chain
 */

import type { APIError } from '@anthropic-ai/sdk'

// SSL/TLS error codes from OpenSSL (Node.js and Bun share these)
const SSL_ERROR_CODES = new Set([
  'UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'UNABLE_TO_GET_ISSUER_CERT',
  'UNABLE_TO_GET_ISSUER_CERT_LOCALLY', 'CERT_SIGNATURE_FAILURE',
  'CERT_NOT_YET_VALID', 'CERT_HAS_EXPIRED', 'CERT_REVOKED',
  'CERT_REJECTED', 'CERT_UNTRUSTED',
  'DEPTH_ZERO_SELF_SIGNED_CERT', 'SELF_SIGNED_CERT_IN_CHAIN',
  'CERT_CHAIN_TOO_LONG', 'PATH_LENGTH_EXCEEDED',
  'ERR_TLS_CERT_ALTNAME_INVALID', 'HOSTNAME_MISMATCH',
  'ERR_TLS_HANDSHAKE_TIMEOUT', 'ERR_SSL_WRONG_VERSION_NUMBER',
  'ERR_SSL_DECRYPTION_FAILED_OR_BAD_RECORD_MAC',
])

export type ConnectionErrorDetails = {
  code: string
  message: string
  isSSLError: boolean
}

/**
 * Walk the error cause chain to find the root NodeJS error code.
 * The Anthropic SDK wraps underlying network errors in the `cause` property.
 */
export function extractConnectionErrorDetails(
  error: unknown,
): ConnectionErrorDetails | null {
  if (!error || typeof error !== 'object') return null

  let current: unknown = error
  const maxDepth = 5
  let depth = 0

  while (current && depth < maxDepth) {
    if (
      current instanceof Error &&
      'code' in current &&
      typeof current.code === 'string'
    ) {
      const code = current.code
      return { code, message: current.message, isSSLError: SSL_ERROR_CODES.has(code) }
    }
    if (current instanceof Error && 'cause' in current && current.cause !== current) {
      current = current.cause
      depth++
    } else {
      break
    }
  }
  return null
}

/**
 * Returns an actionable hint for SSL/TLS errors.
 * Useful for OAuth token exchange and preflight checks where formatAPIError
 * doesn't apply.
 */
export function getSSLErrorHint(error: unknown): string | null {
  const details = extractConnectionErrorDetails(error)
  if (!details?.isSSLError) return null
  return (
    `SSL certificate error (${details.code}). ` +
    `If you are behind a corporate proxy or TLS-intercepting firewall, ` +
    `set NODE_EXTRA_CA_CERTS to your CA bundle path, or ask IT to allowlist *.anthropic.com. ` +
    `Run /doctor for details.`
  )
}

function sanitizeMessageHTML(message: string): string {
  if (message.includes('<!DOCTYPE html') || message.includes('<html')) {
    const titleMatch = message.match(/<title>([^<]+)<\/title>/)
    return titleMatch?.[1]?.trim() ?? ''
  }
  return message
}

export function sanitizeAPIError(apiError: APIError): string {
  const message = apiError.message
  if (!message) return ''
  return sanitizeMessageHTML(message)
}

type NestedAPIError = {
  error?: { message?: string; error?: { message?: string } }
}

function hasNestedError(value: unknown): value is NestedAPIError {
  return (
    typeof value === 'object' && value !== null &&
    'error' in value && typeof (value as { error: unknown }).error === 'object'
  )
}

function extractNestedErrorMessage(error: APIError): string | null {
  if (!hasNestedError(error)) return null
  const narrowed: NestedAPIError = error
  const nested = narrowed.error

  // Standard Anthropic API shape: { error: { error: { message } } }
  const deepMsg = nested?.error?.message
  if (typeof deepMsg === 'string' && deepMsg.length > 0) {
    const sanitized = sanitizeMessageHTML(deepMsg)
    if (sanitized.length > 0) return sanitized
  }

  // Bedrock shape: { error: { message } }
  const msg = nested?.message
  if (typeof msg === 'string' && msg.length > 0) {
    const sanitized = sanitizeMessageHTML(msg)
    if (sanitized.length > 0) return sanitized
  }

  return null
}

/**
 * Format an APIError into a user-facing string.
 * Handles: SSL errors, connection errors, HTML error pages, nested error shapes,
 * and deserialized errors (from JSONL replay) that lack a .message property.
 */
export function formatAPIError(error: APIError): string {
  const connectionDetails = extractConnectionErrorDetails(error)

  if (connectionDetails) {
    const { code, isSSLError } = connectionDetails

    if (code === 'ETIMEDOUT') {
      return 'Request timed out. Check your internet connection and proxy settings'
    }

    if (isSSLError) {
      switch (code) {
        case 'UNABLE_TO_VERIFY_LEAF_SIGNATURE':
        case 'UNABLE_TO_GET_ISSUER_CERT':
        case 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY':
          return 'Unable to connect to API: SSL certificate verification failed. Check your proxy or corporate SSL certificates'
        case 'CERT_HAS_EXPIRED':
          return 'Unable to connect to API: SSL certificate has expired'
        case 'CERT_REVOKED':
          return 'Unable to connect to API: SSL certificate has been revoked'
        case 'DEPTH_ZERO_SELF_SIGNED_CERT':
        case 'SELF_SIGNED_CERT_IN_CHAIN':
          return 'Unable to connect to API: Self-signed certificate detected. Check your proxy or corporate SSL certificates'
        case 'ERR_TLS_CERT_ALTNAME_INVALID':
        case 'HOSTNAME_MISMATCH':
          return 'Unable to connect to API: SSL certificate hostname mismatch'
        case 'CERT_NOT_YET_VALID':
          return 'Unable to connect to API: SSL certificate is not yet valid'
        default:
          return `Unable to connect to API: SSL error (${code})`
      }
    }
  }

  if (error.message === 'Connection error.') {
    if (connectionDetails?.code) {
      return `Unable to connect to API (${connectionDetails.code})`
    }
    return 'Unable to connect to API. Check your internet connection'
  }

  // Deserialized from JSONL (e.g. --resume): the error may lack .message
  if (!error.message) {
    return (
      extractNestedErrorMessage(error) ??
      `API error (status ${error.status ?? 'unknown'})`
    )
  }

  const sanitizedMessage = sanitizeAPIError(error)
  return sanitizedMessage !== error.message && sanitizedMessage.length > 0
    ? sanitizedMessage
    : error.message
}
