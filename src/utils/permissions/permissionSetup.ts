/**
 * Permission setup utilities — STUB (parseToolListFromCLI ported verbatim).
 * FROM CC: utils/permissions/permissionSetup.js (1532L)
 * Minimal export surface for forkedAgent compatibility; full port pending.
 */

// FROM CC: parseToolListFromCLI — splits CLI tool lists on commas/spaces
// while respecting parenthesized rule content like Bash(npm run:*).
export function parseToolListFromCLI(tools: string[]): string[] {
  if (tools.length === 0) {
    return []
  }

  const result: string[] = []

  // Process each string in the array
  for (const toolString of tools) {
    if (!toolString) continue

    let current = ''
    let isInParens = false

    // Parse each character in the string
    for (const char of toolString) {
      switch (char) {
        case '(':
          isInParens = true
          current += char
          break
        case ')':
          isInParens = false
          current += char
          break
        case ',':
          if (isInParens) {
            current += char
          } else {
            // Comma separator - push current tool and start new one
            if (current.trim()) {
              result.push(current.trim())
            }
            current = ''
          }
          break
        case ' ':
          if (isInParens) {
            current += char
          } else if (current.trim()) {
            // Space separator - push current tool and start new one
            result.push(current.trim())
            current = ''
          }
          break
        default:
          current += char
      }
    }

    // Push any remaining tool
    if (current.trim()) {
      result.push(current.trim())
    }
  }

  return result
}

export function loadAllPermissionRulesFromDisk(): void {}
