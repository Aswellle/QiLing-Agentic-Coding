/**
 * CSI (Control Sequence Introducer) — core terminal control sequences
 * Simplified version for QiLing (no complex parsing, just generation).
 */

export const ESC = '\x1b'
export const CSI = ESC + '['

/** Generate a CSI sequence: ESC [ params command */
export function csi(params: string): string {
  return CSI + params
}
