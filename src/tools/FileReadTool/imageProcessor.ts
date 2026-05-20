/**
 * Image processor — adapted from CC's tools/FileReadTool/imageProcessor.ts
 *
 * Lazy-loads sharp (image resizing/format conversion).
 * Falls back gracefully when sharp is not available.
 */

import type { Buffer } from 'buffer'

export type SharpInstance = {
  metadata(): Promise<{ width: number; height: number; format: string }>
  resize(width: number, height: number, options?: { fit?: string; withoutEnlargement?: boolean }): SharpInstance
  jpeg(options?: { quality?: number }): SharpInstance
  png(options?: { compressionLevel?: number; palette?: boolean; colors?: number }): SharpInstance
  webp(options?: { quality?: number }): SharpInstance
  toBuffer(): Promise<Buffer>
}

export type SharpFunction = (input: Buffer) => SharpInstance
type MaybeDefault<T> = T | { default: T }
function unwrapDefault<T extends (...args: never[]) => unknown>(mod: MaybeDefault<T>): T {
  return typeof mod === 'function' ? mod : mod.default
}

let imageProcessorModule: { default: SharpFunction } | null = null

export async function getImageProcessor(): Promise<SharpFunction> {
  if (imageProcessorModule) return imageProcessorModule.default
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const imported = (await (eval("import('sharp')") as Promise<any>)) as unknown as MaybeDefault<SharpFunction>
    const sharp = unwrapDefault(imported)
    imageProcessorModule = { default: sharp }
    return sharp
  } catch {
    throw new Error('Image processing requires the sharp package: bun add sharp')
  }
}
