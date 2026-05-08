/**
 * XML utility functions — ported from CC's utils/xml.ts (verbatim)
 */

/** Escape XML/HTML special characters for safe text content interpolation. */
export function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** Escape for interpolation into double- or single-quoted attribute values. */
export function escapeXmlAttr(s: string): string {
  return escapeXml(s).replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}
