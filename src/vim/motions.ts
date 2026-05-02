// Vim cursor motions — ported from CC's vim/motions.ts

/** Count characters that form a "word" in vim's sense */
function isWordChar(ch: string): boolean {
  return /[a-zA-Z0-9_]/.test(ch)
}
function isWORDChar(ch: string): boolean {
  return /\S/.test(ch)  // WORD = any non-whitespace
}

/** Apply a single motion step to an offset, returning new offset */
export function applyMotion(
  motion: string,
  text: string,
  offset: number,
  count = 1
): number {
  let pos = offset
  for (let i = 0; i < count; i++) {
    pos = applyOneMotion(motion, text, pos)
  }
  return pos
}

function applyOneMotion(motion: string, text: string, pos: number): number {
  switch (motion) {
    case 'h': return Math.max(0, pos - 1)
    case 'l': return Math.min(text.length, pos + 1)
    case '0': return 0
    case '^': {
      const i = text.search(/\S/)
      return i === -1 ? 0 : i
    }
    case '$': return text.length
    case 'w': return wordForward(text, pos, isWordChar)
    case 'W': return wordForward(text, pos, isWORDChar)
    case 'b': return wordBackward(text, pos, isWordChar)
    case 'B': return wordBackward(text, pos, isWORDChar)
    case 'e': return wordEnd(text, pos, isWordChar)
    case 'E': return wordEnd(text, pos, isWORDChar)
    default: return pos
  }
}

function wordForward(text: string, pos: number, isWord: (c: string) => boolean): number {
  if (pos >= text.length) return text.length
  let i = pos
  const atWord = isWord(text[i] ?? '')
  // Skip current cluster (word or non-word non-space)
  while (i < text.length && (isWord(text[i] ?? '') === atWord && text[i] !== ' ' && text[i] !== '\t')) i++
  // Skip whitespace
  while (i < text.length && (text[i] === ' ' || text[i] === '\t')) i++
  return i
}

function wordBackward(text: string, pos: number, isWord: (c: string) => boolean): number {
  if (pos <= 0) return 0
  let i = pos - 1
  // Skip whitespace
  while (i > 0 && (text[i] === ' ' || text[i] === '\t')) i--
  const atWord = isWord(text[i] ?? '')
  // Go back while same type
  while (i > 0 && (isWord(text[i - 1] ?? '') === atWord && text[i - 1] !== ' ' && text[i - 1] !== '\t')) i--
  return i
}

function wordEnd(text: string, pos: number, isWord: (c: string) => boolean): number {
  if (pos >= text.length - 1) return text.length
  let i = pos + 1
  // Skip whitespace
  while (i < text.length && (text[i] === ' ' || text[i] === '\t')) i++
  const atWord = isWord(text[i] ?? '')
  // Move forward while same type
  while (i < text.length - 1 && isWord(text[i + 1] ?? '') === atWord && text[i + 1] !== ' ' && text[i + 1] !== '\t') i++
  return i
}

/** Apply f/F/t/T find motion */
export function applyFind(
  findType: string,
  char: string,
  text: string,
  pos: number,
  count = 1
): number {
  let cur = pos
  for (let i = 0; i < count; i++) {
    const next = applyOneFind(findType, char, text, cur)
    if (next === cur) break
    cur = next
  }
  return cur
}

function applyOneFind(findType: string, char: string, text: string, pos: number): number {
  if (findType === 'f') {
    const idx = text.indexOf(char, pos + 1)
    return idx === -1 ? pos : idx
  }
  if (findType === 'F') {
    const idx = text.lastIndexOf(char, pos - 1)
    return idx === -1 ? pos : idx
  }
  if (findType === 't') {
    const idx = text.indexOf(char, pos + 1)
    return idx <= 0 ? pos : idx - 1
  }
  if (findType === 'T') {
    const idx = text.lastIndexOf(char, pos - 1)
    return idx === -1 ? pos : idx + 1
  }
  return pos
}

/** Inclusive motions include the character under the cursor in operations */
export function isInclusiveMotion(motion: string): boolean {
  return motion === 'e' || motion === 'E' || motion === '$'
}
