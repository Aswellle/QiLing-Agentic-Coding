/**
 * Update notification hook — adapted from CC's hooks/useUpdateNotification.ts
 *
 * Returns the new semver string when an update is available, or null.
 * Deduplicates: only returns once per distinct version.
 */

import { useState } from 'react'

function parseSemver(version: string): string {
  // Extract major.minor.patch from strings like "1.2.3" or "1.2.3-beta.1"
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)/)
  if (!match) return version
  return `${match[1]}.${match[2]}.${match[3]}`
}

export function getSemverPart(version: string): string {
  return parseSemver(version)
}

export function shouldShowUpdateNotification(
  updatedVersion: string,
  lastNotifiedSemver: string | null,
): boolean {
  return getSemverPart(updatedVersion) !== lastNotifiedSemver
}

export function useUpdateNotification(
  updatedVersion: string | null | undefined,
  initialVersion = '0.0.0',
): string | null {
  const [lastNotifiedSemver, setLastNotifiedSemver] = useState<string | null>(
    () => getSemverPart(initialVersion),
  )

  if (!updatedVersion) return null

  const updatedSemver = getSemverPart(updatedVersion)
  if (updatedSemver !== lastNotifiedSemver) {
    setLastNotifiedSemver(updatedSemver)
    return updatedSemver
  }
  return null
}
