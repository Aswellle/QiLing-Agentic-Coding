/**
 * Async generator utilities — ported from CC's utils/generators.ts (verbatim)
 *
 * Key functions:
 * - lastX(): get last value from async generator
 * - returnValue(): get return value (final .done value) from generator
 * - all(): run generators concurrently with a concurrency cap
 * - toArray(): collect all values into array
 * - fromArray(): create generator from array
 */

const NO_VALUE = Symbol('NO_VALUE')

export async function lastX<A>(as: AsyncGenerator<A>): Promise<A> {
  let lastValue: A | typeof NO_VALUE = NO_VALUE
  for await (const a of as) lastValue = a
  if (lastValue === NO_VALUE) throw new Error('No items in generator')
  return lastValue
}

export async function returnValue<A>(as: AsyncGenerator<unknown, A>): Promise<A> {
  let e
  do { e = await as.next() } while (!e.done)
  return e.value
}

type QueuedGenerator<A> = {
  done: boolean | void
  value: A | void
  generator: AsyncGenerator<A, void>
  promise: Promise<QueuedGenerator<A>>
}

/** Run all generators concurrently up to concurrencyCap, yielding values as they come in. */
export async function* all<A>(
  generators: AsyncGenerator<A, void>[],
  concurrencyCap = Infinity,
): AsyncGenerator<A, void> {
  const next = (generator: AsyncGenerator<A, void>) => {
    const promise: Promise<QueuedGenerator<A>> = generator
      .next()
      .then(({ done, value }) => ({ done, value, generator, promise }))
    return promise
  }
  const waiting = [...generators]
  const promises = new Set<Promise<QueuedGenerator<A>>>()
  while (promises.size < concurrencyCap && waiting.length > 0) promises.add(next(waiting.shift()!))
  while (promises.size > 0) {
    const { done, value, generator, promise } = await Promise.race(promises)
    promises.delete(promise)
    if (!done) {
      promises.add(next(generator))
      if (value !== undefined) yield value
    } else if (waiting.length > 0) {
      promises.add(next(waiting.shift()!))
    }
  }
}

export async function toArray<A>(generator: AsyncGenerator<A, void>): Promise<A[]> {
  const result: A[] = []
  for await (const a of generator) result.push(a)
  return result
}

export async function* fromArray<T>(values: T[]): AsyncGenerator<T, void> {
  for (const value of values) yield value
}
