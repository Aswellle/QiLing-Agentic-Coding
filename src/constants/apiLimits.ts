/**
 * Anthropic API limits — ported from CC's constants/apiLimits.ts (verbatim)
 * Keep dependency-free to prevent circular imports.
 */

// Image limits
export const API_IMAGE_MAX_BASE64_SIZE = 5 * 1024 * 1024  // 5 MB (base64 length)
export const IMAGE_TARGET_RAW_SIZE = (API_IMAGE_MAX_BASE64_SIZE * 3) / 4  // 3.75 MB
export const IMAGE_MAX_WIDTH = 2000
export const IMAGE_MAX_HEIGHT = 2000

// PDF limits
export const PDF_TARGET_RAW_SIZE = 20 * 1024 * 1024  // 20 MB
export const API_PDF_MAX_PAGES = 100
export const PDF_EXTRACT_SIZE_THRESHOLD = 3 * 1024 * 1024  // 3 MB
export const PDF_MAX_EXTRACT_SIZE = 100 * 1024 * 1024  // 100 MB
export const PDF_MAX_PAGES_PER_READ = 20
export const PDF_AT_MENTION_INLINE_THRESHOLD = 10

// Media limits
export const API_MAX_MEDIA_PER_REQUEST = 100
