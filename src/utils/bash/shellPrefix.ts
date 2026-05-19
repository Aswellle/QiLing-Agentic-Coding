/**
 * Shell prefix command formatting — adapted from CC's utils/bash/shellPrefix.ts
 *
 * Formats shell commands when a custom shell prefix is configured
 * (e.g., running bash via a wrapper or with specific flags).
 *
 * @example
 * formatShellPrefixCommand('bash', 'ls -la') → "'bash' 'ls -la'"
 * formatShellPrefixCommand('/usr/bin/bash -c', 'ls -la') → "'/usr/bin/bash' -c 'ls -la'"
 */

import { quote } from './shellQuote.js'

export function formatShellPrefixCommand(
  prefix: string,
  command: string,
): string {
  // Split on the last space before a dash to separate executable from args
  const spaceBeforeDash = prefix.lastIndexOf(' -')
  if (spaceBeforeDash > 0) {
    const execPath = prefix.slice(0, spaceBeforeDash)
    const args = prefix.slice(spaceBeforeDash + 1)
    return `${quote([execPath])} ${args} ${quote([command])}`
  }
  return `${quote([prefix])} ${quote([command])}`
}
