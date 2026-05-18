/**
 * Cross-platform system directories — adapted from CC's utils/systemDirectories.ts
 */

import { homedir } from 'node:os'
import { join } from 'node:path'

export type SystemDirectories = {
  HOME: string
  DESKTOP: string
  DOCUMENTS: string
  DOWNLOADS: string
  [key: string]: string
}

export function getSystemDirectories(): SystemDirectories {
  const home = homedir()

  if (process.platform === 'win32') {
    return {
      HOME: process.env.USERPROFILE ?? home,
      DESKTOP: join(process.env.USERPROFILE ?? home, 'Desktop'),
      DOCUMENTS: join(process.env.USERPROFILE ?? home, 'Documents'),
      DOWNLOADS: join(process.env.USERPROFILE ?? home, 'Downloads'),
    }
  }

  // macOS / Linux
  return {
    HOME: home,
    DESKTOP: join(home, 'Desktop'),
    DOCUMENTS: join(home, 'Documents'),
    DOWNLOADS: join(home, 'Downloads'),
  }
}
