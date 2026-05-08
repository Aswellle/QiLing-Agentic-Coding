/**
 * Stream utility — ported from CC's utils/stream.ts (verbatim)
 *
 * Push-based async iterable that can be consumed exactly once.
 * Useful for bridging callback-based APIs to async iteration.
 */

export class Stream<T> implements AsyncIterator<T> {
  private readonly queue: T[] = []
  private readResolve?: (value: IteratorResult<T>) => void
  private readReject?: (error: unknown) => void
  private isDone = false
  private hasError: unknown | undefined
  private started = false

  constructor(private readonly returned?: () => void) {}

  [Symbol.asyncIterator](): AsyncIterableIterator<T> {
    if (this.started) throw new Error('Stream can only be iterated once')
    this.started = true
    return this as AsyncIterableIterator<T>
  }

  next(): Promise<IteratorResult<T, unknown>> {
    if (this.queue.length > 0) return Promise.resolve({ done: false, value: this.queue.shift()! })
    if (this.isDone) return Promise.resolve({ done: true, value: undefined })
    if (this.hasError) return Promise.reject(this.hasError)
    return new Promise<IteratorResult<T>>((resolve, reject) => {
      this.readResolve = resolve
      this.readReject = reject
    })
  }

  enqueue(value: T): void {
    if (this.readResolve) {
      const resolve = this.readResolve
      this.readResolve = undefined
      this.readReject = undefined
      resolve({ done: false, value })
    } else {
      this.queue.push(value)
    }
  }

  done(): void {
    this.isDone = true
    if (this.readResolve) {
      const resolve = this.readResolve
      this.readResolve = undefined
      this.readReject = undefined
      resolve({ done: true, value: undefined })
    }
  }

  error(err: unknown): void {
    this.hasError = err
    if (this.readReject) {
      const reject = this.readReject
      this.readResolve = undefined
      this.readReject = undefined
      reject(err)
    }
  }

  return(): Promise<IteratorResult<T, unknown>> {
    this.isDone = true
    this.returned?.()
    return Promise.resolve({ done: true, value: undefined })
  }
}
