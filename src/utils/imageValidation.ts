/**
 * Image validation utilities — adapted from CC's utils/imageValidation.ts
 *
 * Validates that images in API requests don't exceed the API size limit.
 * The limit is on the base64-encoded string length, not raw bytes.
 */

import { formatFileSize } from './format'

// Anthropic API image size limit: 5MB base64-encoded
export const API_IMAGE_MAX_BASE64_SIZE = 5 * 1024 * 1024

export type OversizedImage = {
  index: number
  size: number
}

export class ImageSizeError extends Error {
  constructor(oversizedImages: OversizedImage[], maxSize: number) {
    const first = oversizedImages[0]
    const message = oversizedImages.length === 1 && first
      ? `Image base64 size (${formatFileSize(first.size)}) exceeds API limit (${formatFileSize(maxSize)}). Please resize the image before sending.`
      : `${oversizedImages.length} images exceed the API limit (${formatFileSize(maxSize)}): ` +
        oversizedImages.map(img => `Image ${img.index}: ${formatFileSize(img.size)}`).join(', ') +
        `. Please resize these images before sending.`
    super(message)
    this.name = 'ImageSizeError'
  }
}

function isBase64ImageBlock(block: unknown): block is { type: 'image'; source: { type: 'base64'; data: string } } {
  if (typeof block !== 'object' || block === null) return false
  const b = block as Record<string, unknown>
  if (b.type !== 'image') return false
  const source = b.source as Record<string, unknown> | undefined
  return source?.type === 'base64' && typeof source.data === 'string'
}

/**
 * Validate that all images in messages are within the API size limit.
 * Throws ImageSizeError if any image exceeds the limit.
 */
export function validateImageSizes(
  messages: Array<{ content?: unknown; role?: string }>,
  maxSize = API_IMAGE_MAX_BASE64_SIZE,
): void {
  const oversized: OversizedImage[] = []
  let index = 0

  for (const msg of messages) {
    const content = Array.isArray(msg.content) ? msg.content : []
    for (const block of content) {
      if (isBase64ImageBlock(block)) {
        const size = block.source.data.length
        if (size > maxSize) oversized.push({ index, size })
        index++
      }
    }
  }

  if (oversized.length > 0) throw new ImageSizeError(oversized, maxSize)
}

/**
 * Get the total size of all base64 image data in a message array.
 */
export function getTotalImageSizeBytes(
  messages: Array<{ content?: unknown }>,
): number {
  let total = 0
  for (const msg of messages) {
    const content = Array.isArray(msg.content) ? msg.content : []
    for (const block of content) {
      if (isBase64ImageBlock(block)) total += block.source.data.length
    }
  }
  return total
}
