// FROM CC: utils/imagePaste.ts (adapt-new stub)
// Stripped: native NSPasteboard (bun-bundle ANT), GrowthBook feature gate
// Keeps: hasImageInClipboard via osascript (macOS only)
import { execFileNoThrow } from './execFileNoThrow.js'

/**
 * Check if clipboard contains an image without retrieving it.
 * Returns false on non-macOS platforms.
 */
export async function hasImageInClipboard(): Promise<boolean> {
  if (process.platform !== 'darwin') {
    return false
  }
  const result = await execFileNoThrow('osascript', [
    '-e',
    'the clipboard as «class PNGf»',
  ])
  return result.code === 0
}
