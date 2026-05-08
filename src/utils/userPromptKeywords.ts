/**
 * User prompt keyword detection — ported from CC's utils/userPromptKeywords.ts (verbatim)
 *
 * - matchesNegativeKeyword(): detect frustrated user expressions
 * - matchesKeepGoingKeyword(): detect "continue" / "keep going" requests
 */

/** Returns true if the input contains negative/frustrated expressions. */
export function matchesNegativeKeyword(input: string): boolean {
  const lower = input.toLowerCase()
  const negativePattern =
    /\b(wtf|wth|ffs|omfg|shit(ty|tiest)?|dumbass|horrible|awful|piss(ed|ing)? off|piece of (shit|crap|junk)|what the (fuck|hell)|fucking? (broken|useless|terrible|awful|horrible)|fuck you|screw (this|you)|so frustrating|this sucks|damn it)\b/
  return negativePattern.test(lower)
}

/** Returns true if the input is a "keep going" or "continue" request. */
export function matchesKeepGoingKeyword(input: string): boolean {
  const lower = input.toLowerCase().trim()
  if (lower === 'continue' || lower === '继续') return true
  return /\b(keep going|go on|继续|继续做|接着做)\b/.test(lower)
}
