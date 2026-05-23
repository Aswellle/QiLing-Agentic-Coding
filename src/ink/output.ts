/**
 * output — adapted from CC's ink/output.ts
 *
 * Terminal output buffer with deferred flush semantics.
 * Batches writes within a single render cycle to minimize stdout calls.
 * Wraps process.stdout (or any WriteStream) with:
 *   - write buffering (push to queue, flush all at once)
 *   - column-tracking for cursor position
 *   - optional throttling (skip write if nothing changed)
 *
 * QiLing: functional implementation, no dependency on screen.ts.
 * Heavy ANSI-diff optimization from CC is deferred to B-T4-13.
 */

export type OutputOptions = {
  stream?: NodeJS.WriteStream
  /** If true, buffer all writes and flush() explicitly */
  buffered?: boolean
}

export class Output {
  private _stream: NodeJS.WriteStream
  private _buffered: boolean
  private _buffer: string[] = []
  private _col = 0
  private _row = 0

  constructor(opts: OutputOptions = {}) {
    this._stream = opts.stream ?? process.stdout
    this._buffered = opts.buffered ?? false
  }

  get col(): number { return this._col }
  get row(): number { return this._row }

  /** Write a string to the output (buffered or immediate). */
  write(text: string): void {
    if (!text) return
    if (this._buffered) {
      this._buffer.push(text)
    } else {
      this._stream.write(text)
    }
    this._trackPosition(text)
  }

  /** Flush all buffered writes to the stream. */
  flush(): void {
    if (this._buffer.length === 0) return
    this._stream.write(this._buffer.join(''))
    this._buffer = []
  }

  /** Get buffered content without flushing. */
  get(): string {
    return this._buffer.join('')
  }

  /** Clear the buffer without writing. */
  clear(): void {
    this._buffer = []
  }

  private _trackPosition(text: string): void {
    for (const ch of text) {
      if (ch === '\n') {
        this._row++
        this._col = 0
      } else if (ch === '\r') {
        this._col = 0
      } else {
        // crude column tracking (ignores wide chars / ANSI sequences)
        this._col++
      }
    }
  }
}

/** Create a buffered output instance for a render cycle. */
export function createOutput(stream?: NodeJS.WriteStream): Output {
  return new Output({ stream, buffered: true })
}

/** Write directly to stdout (un-buffered, for urgent output). */
export function writeToStdout(text: string): void {
  process.stdout.write(text)
}
