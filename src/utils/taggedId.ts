/**
 * Tagged ID encoding — direct port of CC's utils/taggedId.ts
 *
 * Produces API-compatible tagged IDs like "user_01PaGUP2rbg1XDh7Z9W1CEpd"
 * from UUID strings. Format: {tag}_{version}{base58(uuid_as_128bit_int)}
 *
 * Must stay in sync with the API's tagged_id.py format.
 */

const BASE_58_CHARS = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
const VERSION = '01'
const ENCODED_LENGTH = 22  // ceil(128 / log2(58))

function base58Encode(n: bigint): string {
  const base = BigInt(BASE_58_CHARS.length)
  const result = new Array<string>(ENCODED_LENGTH).fill(BASE_58_CHARS[0]!)
  let i = ENCODED_LENGTH - 1
  let value = n
  while (value > 0n) {
    const rem = Number(value % base)
    result[i] = BASE_58_CHARS[rem]!
    value = value / base
    i--
  }
  return result.join('')
}

function uuidToBigInt(uuid: string): bigint {
  const hex = uuid.replace(/-/g, '')
  if (hex.length !== 32) throw new Error(`Invalid UUID hex length: ${hex.length}`)
  return BigInt('0x' + hex)
}

/**
 * Convert an account UUID to a tagged ID in the API's format.
 * @param tag  — prefix (e.g. "user", "org")
 * @param uuid — UUID string (with or without hyphens)
 * @returns Tagged ID like "user_01PaGUP2rbg1XDh7Z9W1CEpd"
 */
export function toTaggedId(tag: string, uuid: string): string {
  return `${tag}_${VERSION}${base58Encode(uuidToBigInt(uuid))}`
}
