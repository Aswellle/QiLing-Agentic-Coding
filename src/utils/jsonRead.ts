/**
 * JSON BOM stripping — direct port of CC's utils/jsonRead.ts
 *
 * PowerShell 5.x writes UTF-8 with BOM by default.
 * Without stripping, JSON.parse fails with "Unexpected token".
 */

const UTF8_BOM = '﻿'

export function stripBOM(content: string): string {
  return content.startsWith(UTF8_BOM) ? content.slice(1) : content
}
