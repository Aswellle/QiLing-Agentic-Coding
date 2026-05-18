/**
 * PDF file utilities — adapted from CC's utils/pdf.ts
 *
 * readPDF(): read a PDF as base64 for direct API send (≤20MB)
 * getPDFPageCount(): query page count via pdfinfo (poppler-utils)
 * isPdftoppmAvailable(): detect pdftoppm binary, cached
 * extractPDFPages(): render PDF pages as JPEG images via pdftoppm
 *
 * Large-PDF workflow: if PDF exceeds PDF_TARGET_RAW_SIZE (20MB), extractPDFPages()
 * renders individual pages as JPEGs which can be individually sent to the API.
 */

import { randomUUID } from 'node:crypto'
import { mkdir, readdir, readFile, stat } from 'node:fs/promises'
import { join } from 'node:path'
import {
  PDF_MAX_EXTRACT_SIZE,
  PDF_TARGET_RAW_SIZE,
} from '../constants/apiLimits.js'
import { errorMessage } from './errors.js'
import { execFileNoThrow } from './execFileNoThrow.js'
import { formatFileSize } from './format.js'
import { getToolResultsDir } from './toolResultStorage.js'

// ─── Result type ──────────────────────────────────────────────────────────────

export type PDFError = {
  reason:
    | 'empty'
    | 'too_large'
    | 'password_protected'
    | 'corrupted'
    | 'unknown'
    | 'unavailable'
  message: string
}

export type PDFResult<T> =
  | { success: true; data: T }
  | { success: false; error: PDFError }

// ─── readPDF ──────────────────────────────────────────────────────────────────

/**
 * Read a PDF file and return it as base64-encoded data for direct API use.
 * Validates magic bytes and size; returns structured error on failure.
 */
export async function readPDF(filePath: string): Promise<
  PDFResult<{
    type: 'pdf'
    file: {
      filePath: string
      base64: string
      originalSize: number
    }
  }>
> {
  try {
    const stats = await stat(filePath)
    const originalSize = stats.size

    if (originalSize === 0) {
      return {
        success: false,
        error: { reason: 'empty', message: `PDF file is empty: ${filePath}` },
      }
    }

    // After base64 encoding (~33% overhead), a PDF must be under ~20MB raw
    // to leave room for conversation context within the 32MB API request limit.
    if (originalSize > PDF_TARGET_RAW_SIZE) {
      return {
        success: false,
        error: {
          reason: 'too_large',
          message: `PDF file exceeds maximum allowed size of ${formatFileSize(PDF_TARGET_RAW_SIZE)}.`,
        },
      }
    }

    const fileBuffer = await readFile(filePath)

    // Validate PDF magic bytes — reject non-PDF files before they enter context.
    // Once an invalid PDF document block is in message history, every subsequent
    // API call fails with 400 "The PDF specified was not valid" and the session
    // becomes unrecoverable without /clear.
    const header = fileBuffer.subarray(0, 5).toString('ascii')
    if (!header.startsWith('%PDF-')) {
      return {
        success: false,
        error: {
          reason: 'corrupted',
          message: `File is not a valid PDF (missing %PDF- header): ${filePath}`,
        },
      }
    }

    const base64 = fileBuffer.toString('base64')

    return {
      success: true,
      data: {
        type: 'pdf',
        file: { filePath, base64, originalSize },
      },
    }
  } catch (e: unknown) {
    return {
      success: false,
      error: { reason: 'unknown', message: errorMessage(e) },
    }
  }
}

// ─── getPDFPageCount ──────────────────────────────────────────────────────────

/**
 * Get page count via `pdfinfo` (poppler-utils).
 * Returns null if pdfinfo is unavailable or page count cannot be parsed.
 */
export async function getPDFPageCount(filePath: string): Promise<number | null> {
  const { code, stdout } = await execFileNoThrow('pdfinfo', [filePath], {
    timeout: 10_000,
  })
  if (code !== 0) return null
  const match = /^Pages:\s+(\d+)/m.exec(stdout)
  if (!match) return null
  const count = parseInt(match[1]!, 10)
  return isNaN(count) ? null : count
}

// ─── isPdftoppmAvailable ──────────────────────────────────────────────────────

let pdftoppmAvailable: boolean | undefined

/** Reset availability cache (for tests). */
export function resetPdftoppmCache(): void {
  pdftoppmAvailable = undefined
}

/**
 * Check if `pdftoppm` (poppler-utils) is available. Cached for process lifetime.
 */
export async function isPdftoppmAvailable(): Promise<boolean> {
  if (pdftoppmAvailable !== undefined) return pdftoppmAvailable
  const { code, stderr } = await execFileNoThrow('pdftoppm', ['-v'], {
    timeout: 5_000,
  })
  // pdftoppm prints version to stderr; exits 0 or sometimes 99 on older versions
  pdftoppmAvailable = code === 0 || stderr.length > 0
  return pdftoppmAvailable
}

// ─── extractPDFPages ──────────────────────────────────────────────────────────

export type PDFExtractPagesResult = {
  type: 'parts'
  file: {
    filePath: string
    originalSize: number
    count: number
    outputDir: string
  }
}

/**
 * Extract PDF pages as JPEG images using `pdftoppm`.
 * Produces page-01.jpg, page-02.jpg, etc. in a temp output directory.
 * Enables reading large PDFs that exceed PDF_TARGET_RAW_SIZE.
 *
 * Requires poppler-utils: `brew install poppler` or `apt-get install poppler-utils`
 *
 * @param filePath  Path to the PDF file
 * @param options   Optional 1-indexed page range (inclusive)
 */
export async function extractPDFPages(
  filePath: string,
  options?: { firstPage?: number; lastPage?: number },
): Promise<PDFResult<PDFExtractPagesResult>> {
  try {
    const stats = await stat(filePath)
    const originalSize = stats.size

    if (originalSize === 0) {
      return {
        success: false,
        error: { reason: 'empty', message: `PDF file is empty: ${filePath}` },
      }
    }

    if (originalSize > PDF_MAX_EXTRACT_SIZE) {
      return {
        success: false,
        error: {
          reason: 'too_large',
          message: `PDF file exceeds maximum allowed size for text extraction (${formatFileSize(PDF_MAX_EXTRACT_SIZE)}).`,
        },
      }
    }

    const available = await isPdftoppmAvailable()
    if (!available) {
      return {
        success: false,
        error: {
          reason: 'unavailable',
          message:
            'pdftoppm is not installed. Install poppler-utils ' +
            '(e.g. `brew install poppler` or `apt-get install poppler-utils`) to enable PDF page rendering.',
        },
      }
    }

    const uuid = randomUUID()
    const outputDir = join(getToolResultsDir(), `pdf-${uuid}`)
    await mkdir(outputDir, { recursive: true })

    // pdftoppm produces files like <prefix>-01.jpg, <prefix>-02.jpg, etc.
    const prefix = join(outputDir, 'page')
    const args = ['-jpeg', '-r', '100']
    if (options?.firstPage) args.push('-f', String(options.firstPage))
    if (options?.lastPage && options.lastPage !== Infinity) {
      args.push('-l', String(options.lastPage))
    }
    args.push(filePath, prefix)

    const { code, stderr } = await execFileNoThrow('pdftoppm', args, {
      timeout: 120_000,
    })

    if (code !== 0) {
      if (/password/i.test(stderr)) {
        return {
          success: false,
          error: {
            reason: 'password_protected',
            message: 'PDF is password-protected. Please provide an unprotected version.',
          },
        }
      }
      if (/damaged|corrupt|invalid/i.test(stderr)) {
        return {
          success: false,
          error: { reason: 'corrupted', message: 'PDF file is corrupted or invalid.' },
        }
      }
      return {
        success: false,
        error: { reason: 'unknown', message: `pdftoppm failed: ${stderr}` },
      }
    }

    const entries = await readdir(outputDir)
    const imageFiles = entries.filter(f => f.endsWith('.jpg')).sort()
    const pageCount = imageFiles.length

    if (pageCount === 0) {
      return {
        success: false,
        error: {
          reason: 'corrupted',
          message: 'pdftoppm produced no output pages. The PDF may be invalid.',
        },
      }
    }

    return {
      success: true,
      data: {
        type: 'parts',
        file: {
          filePath,
          originalSize,
          outputDir,
          count: pageCount,
        },
      },
    }
  } catch (e: unknown) {
    return {
      success: false,
      error: { reason: 'unknown', message: errorMessage(e) },
    }
  }
}
