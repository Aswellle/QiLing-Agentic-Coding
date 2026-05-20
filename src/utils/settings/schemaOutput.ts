/**
 * Settings JSON schema output — adapted from CC's utils/settings/schemaOutput.ts
 *
 * Generates the JSON Schema for settings.json, used by the /doctor command
 * and editor integrations for validation.
 */

import { jsonStringify } from '../slowOperations.js'

export function generateSettingsJSONSchema(): string {
  // Settings schema JSON export — uses zodToJsonSchema when zod/v4 compatibility is confirmed
  // Stub: return empty schema for now to avoid zod version mismatch
  return jsonStringify({
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: 'QiLing Settings',
    type: 'object',
  }, null, 2)
}
