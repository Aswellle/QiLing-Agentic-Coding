/**
 * Image resize utilities — adapted from CC's utils/imageResizer.ts
 *
 * Resizes and compresses images to fit within API limits.
 * Uses `sharp` if available; otherwise validates size and passes through.
 *
 * CC uses `image-processor-napi` (bundled native) or `sharp` (dev).
 * QiLing uses `sharp` lazily — no hard dependency. If sharp is absent,
 * images within size limits pass through; oversized images throw ImageResizeError.
 */

import type {
  Base64ImageSource,
  ImageBlockParam,
} from '@anthropic-ai/sdk/resources/messages.mjs'
import {
  API_IMAGE_MAX_BASE64_SIZE,
  IMAGE_MAX_HEIGHT,
  IMAGE_MAX_WIDTH,
  IMAGE_TARGET_RAW_SIZE,
} from '../constants/apiLimits.js'
import { errorMessage } from './errors.js'
import { formatFileSize } from './format.js'

export class ImageResizeError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ImageResizeError'
  }
}

// ─── Format detection ─────────────────────────────────────────────────────────

type ImageMediaType = 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp'

export function detectImageFormatFromBuffer(buf: Buffer): ImageMediaType {
  if (buf.length >= 8 &&
      buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return 'image/png'
  }
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return 'image/jpeg'
  }
  if (buf.length >= 6 &&
      buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) {
    return 'image/gif'
  }
  if (buf.length >= 12 &&
      buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) {
    return 'image/webp'
  }
  return 'image/jpeg'
}

function mediaTypeToExt(mediaType: ImageMediaType): string {
  return mediaType.split('/')[1]!
}

function normalizeExt(ext: string): string {
  return ext === 'jpg' ? 'jpeg' : ext
}

// ─── PNG dimension check (magic bytes only, no sharp needed) ──────────────────

function pngExceedsDimensions(buf: Buffer): boolean {
  if (buf.length < 24) return false
  if (!(buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47)) {
    return false
  }
  const w = buf.readUInt32BE(16)
  const h = buf.readUInt32BE(20)
  return w > IMAGE_MAX_WIDTH || h > IMAGE_MAX_HEIGHT
}

// ─── Sharp lazy loader ────────────────────────────────────────────────────────

type SharpFn = (buf: Buffer) => {
  metadata(): Promise<{ width?: number; height?: number; format?: string }>
  resize(w: number, h: number, opts?: object): ReturnType<SharpFn>
  jpeg(opts?: { quality?: number }): ReturnType<SharpFn>
  png(opts?: { compressionLevel?: number; palette?: boolean; colors?: number }): ReturnType<SharpFn>
  toBuffer(): Promise<Buffer>
}

let _sharp: SharpFn | null | undefined = undefined

async function getSharp(): Promise<SharpFn | null> {
  if (_sharp !== undefined) return _sharp
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    _sharp = (require('sharp') as { default: SharpFn }).default ?? (require('sharp') as SharpFn)
  } catch {
    _sharp = null
  }
  return _sharp
}

// ─── Public types ─────────────────────────────────────────────────────────────

export type ImageDimensions = {
  originalWidth: number
  originalHeight: number
  displayWidth: number
  displayHeight: number
}

export type ResizedImageResult = {
  buffer: Buffer
  mediaType: string
  dimensions?: ImageDimensions
}

export type CompressedImageResult = {
  base64: string
  mediaType: string
  originalSize: number
}

export interface ImageBlockWithDimensions {
  block: ImageBlockParam
  dimensions?: ImageDimensions
}

// ─── Core resize logic ────────────────────────────────────────────────────────

export async function maybeResizeAndDownsampleImageBuffer(
  imageBuffer: Buffer,
  originalSize: number,
  ext: string,
): Promise<ResizedImageResult> {
  const normalizedMediaType = normalizeExt(ext)
  const sharp = await getSharp()

  if (!sharp) {
    // No sharp available — pass through if within limits, throw if over
    const base64Size = Math.ceil((originalSize * 4) / 3)
    const overDim = pngExceedsDimensions(imageBuffer)

    if (base64Size <= API_IMAGE_MAX_BASE64_SIZE && !overDim) {
      return { buffer: imageBuffer, mediaType: normalizedMediaType }
    }

    throw new ImageResizeError(
      overDim
        ? `Image dimensions exceed the ${IMAGE_MAX_WIDTH}x${IMAGE_MAX_HEIGHT}px limit. ` +
          `Install \`sharp\` for automatic resizing, or resize manually.`
        : `Image (${formatFileSize(originalSize)}) exceeds the 5MB API limit. ` +
          `Install \`sharp\` for automatic compression, or use a smaller image.`,
    )
  }

  try {
    const metadata = await sharp(imageBuffer).metadata()
    if (!metadata.width || !metadata.height) {
      return { buffer: imageBuffer, mediaType: normalizedMediaType }
    }

    const originalWidth = metadata.width
    const originalHeight = metadata.height

    if (
      originalSize <= IMAGE_TARGET_RAW_SIZE &&
      originalWidth <= IMAGE_MAX_WIDTH &&
      originalHeight <= IMAGE_MAX_HEIGHT
    ) {
      return {
        buffer: imageBuffer,
        mediaType: normalizedMediaType,
        dimensions: { originalWidth, originalHeight, displayWidth: originalWidth, displayHeight: originalHeight },
      }
    }

    // Calculate target dimensions maintaining aspect ratio
    let w = originalWidth
    let h = originalHeight
    if (w > IMAGE_MAX_WIDTH) { h = Math.round((h * IMAGE_MAX_WIDTH) / w); w = IMAGE_MAX_WIDTH }
    if (h > IMAGE_MAX_HEIGHT) { w = Math.round((w * IMAGE_MAX_HEIGHT) / h); h = IMAGE_MAX_HEIGHT }

    const isPng = normalizedMediaType === 'png'

    // Compression without resize first (if dimensions are ok)
    if (originalWidth <= IMAGE_MAX_WIDTH && originalHeight <= IMAGE_MAX_HEIGHT && originalSize > IMAGE_TARGET_RAW_SIZE) {
      if (isPng) {
        const compressed = await sharp(imageBuffer).png({ compressionLevel: 9, palette: true }).toBuffer()
        if (compressed.length <= IMAGE_TARGET_RAW_SIZE) {
          return { buffer: compressed, mediaType: 'png', dimensions: { originalWidth, originalHeight, displayWidth: w, displayHeight: h } }
        }
      }
      for (const quality of [80, 60, 40, 20]) {
        const compressed = await sharp(imageBuffer).jpeg({ quality }).toBuffer()
        if (compressed.length <= IMAGE_TARGET_RAW_SIZE) {
          return { buffer: compressed, mediaType: 'jpeg', dimensions: { originalWidth, originalHeight, displayWidth: w, displayHeight: h } }
        }
      }
    }

    // Resize + compress
    const resized = await sharp(imageBuffer).resize(w, h, { fit: 'inside', withoutEnlargement: true }).toBuffer()
    if (resized.length <= IMAGE_TARGET_RAW_SIZE) {
      return { buffer: resized, mediaType: normalizedMediaType, dimensions: { originalWidth, originalHeight, displayWidth: w, displayHeight: h } }
    }

    // Progressive JPEG compression after resize
    for (const quality of [80, 60, 40, 20]) {
      const compressed = await sharp(imageBuffer).resize(w, h, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality }).toBuffer()
      if (compressed.length <= IMAGE_TARGET_RAW_SIZE) {
        return { buffer: compressed, mediaType: 'jpeg', dimensions: { originalWidth, originalHeight, displayWidth: w, displayHeight: h } }
      }
    }

    // Last resort: smaller + aggressive JPEG
    const sw = Math.min(w, 1000)
    const sh = Math.round((h * sw) / Math.max(w, 1))
    const last = await sharp(imageBuffer).resize(sw, sh, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 20 }).toBuffer()
    return { buffer: last, mediaType: 'jpeg', dimensions: { originalWidth, originalHeight, displayWidth: sw, displayHeight: sh } }
  } catch (error) {
    const detected = detectImageFormatFromBuffer(imageBuffer)
    const base64Size = Math.ceil((originalSize * 4) / 3)
    const overDim = pngExceedsDimensions(imageBuffer)

    if (base64Size <= API_IMAGE_MAX_BASE64_SIZE && !overDim) {
      return { buffer: imageBuffer, mediaType: mediaTypeToExt(detected) }
    }

    throw new ImageResizeError(
      overDim
        ? `Unable to resize image — dimensions exceed ${IMAGE_MAX_WIDTH}x${IMAGE_MAX_HEIGHT}px and resize failed (${errorMessage(error)}). Please resize manually.`
        : `Unable to compress image (${formatFileSize(originalSize)}): ${errorMessage(error)}. Please use a smaller image.`,
    )
  }
}

export async function maybeResizeAndDownsampleImageBlock(
  imageBlock: ImageBlockParam,
): Promise<ImageBlockWithDimensions> {
  if (imageBlock.source.type !== 'base64') return { block: imageBlock }

  const imageBuffer = Buffer.from(imageBlock.source.data, 'base64')
  const originalSize = imageBuffer.length
  const mediaType = imageBlock.source.media_type
  const ext = mediaType?.split('/')[1] ?? 'png'

  const resized = await maybeResizeAndDownsampleImageBuffer(imageBuffer, originalSize, ext)

  return {
    block: {
      type: 'image',
      source: {
        type: 'base64',
        media_type: `image/${resized.mediaType}` as Base64ImageSource['media_type'],
        data: resized.buffer.toString('base64'),
      },
    },
    dimensions: resized.dimensions,
  }
}

export async function compressImageBuffer(
  imageBuffer: Buffer,
  maxBytes = IMAGE_TARGET_RAW_SIZE,
  originalMediaType?: string,
): Promise<CompressedImageResult> {
  const fallbackExt = (originalMediaType?.split('/')[1] ?? 'jpeg')
  const ext = normalizeExt(fallbackExt)
  const originalSize = imageBuffer.length

  if (originalSize <= maxBytes) {
    return {
      base64: imageBuffer.toString('base64'),
      mediaType: ext,
      originalSize,
    }
  }

  try {
    const resized = await maybeResizeAndDownsampleImageBuffer(imageBuffer, originalSize, ext)
    return {
      base64: resized.buffer.toString('base64'),
      mediaType: resized.mediaType,
      originalSize,
    }
  } catch (error) {
    if (imageBuffer.length <= maxBytes) {
      const detected = detectImageFormatFromBuffer(imageBuffer)
      return { base64: imageBuffer.toString('base64'), mediaType: mediaTypeToExt(detected), originalSize }
    }
    throw new ImageResizeError(
      `Unable to compress image (${formatFileSize(imageBuffer.length)}) to fit within ${formatFileSize(maxBytes)}. ` +
      `Please use a smaller image. (${errorMessage(error)})`,
    )
  }
}

export async function compressImageBufferWithTokenLimit(
  imageBuffer: Buffer,
  maxTokens: number,
  originalMediaType?: string,
): Promise<CompressedImageResult> {
  const maxBase64Chars = Math.floor(maxTokens / 0.125)
  const maxBytes = Math.floor(maxBase64Chars * 0.75)
  return compressImageBuffer(imageBuffer, maxBytes, originalMediaType)
}

// FROM CC: compressImageBlock — compress base64 ImageBlockParam to fit within maxBytes
export async function compressImageBlock(
  imageBlock: ImageBlockParam,
  maxBytes: number = IMAGE_TARGET_RAW_SIZE,
): Promise<ImageBlockParam> {
  if (imageBlock.source.type !== 'base64') return imageBlock
  const imageBuffer = Buffer.from(imageBlock.source.data, 'base64')
  if (imageBuffer.length <= maxBytes) return imageBlock
  const compressed = await compressImageBuffer(imageBuffer, maxBytes)
  return {
    type: 'image',
    source: {
      type: 'base64',
      media_type: `image/${compressed.mediaType}` as Base64ImageSource['media_type'],
      data: compressed.base64,
    },
  }
}

// FROM CC: detectImageFormatFromBase64 — detect format from base64 string via magic bytes
export function detectImageFormatFromBase64(base64Data: string): ImageMediaType {
  try {
    return detectImageFormatFromBuffer(Buffer.from(base64Data, 'base64'))
  } catch {
    return 'image/png'
  }
}

// FROM CC: createImageMetadataText — text description of image dimensions for context
export function createImageMetadataText(dims: ImageDimensions, sourcePath?: string): string | null {
  const { originalWidth, originalHeight, displayWidth, displayHeight } = dims
  if (!originalWidth || !originalHeight || !displayWidth || !displayHeight || displayWidth <= 0 || displayHeight <= 0) {
    return sourcePath ? `[Image source: ${sourcePath}]` : null
  }
  const wasResized = originalWidth !== displayWidth || originalHeight !== displayHeight
  if (!wasResized && !sourcePath) return null
  const parts: string[] = []
  if (sourcePath) parts.push(`source: ${sourcePath}`)
  if (wasResized) {
    const scaleFactor = originalWidth / displayWidth
    parts.push(
      `original ${originalWidth}x${originalHeight}, displayed at ${displayWidth}x${displayHeight}. Multiply coordinates by ${scaleFactor.toFixed(2)} to map to original image.`,
    )
  }
  return `[Image: ${parts.join(', ')}]`
}
