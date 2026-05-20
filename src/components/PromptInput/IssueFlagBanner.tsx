/**
 * Issue flag banner — adapted from CC's components/PromptInput/IssueFlagBanner.tsx
 *
 * ANT-ONLY: Shown when friction is detected; prompts /issue command.
 * Always returns null in external (QiLing) builds.
 */

import React from 'react'

export function IssueFlagBanner(): React.ReactNode {
  return null // External builds: never shown
}
