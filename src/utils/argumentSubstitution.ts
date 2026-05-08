/**
 * Argument substitution for skill prompts — ported from CC's utils/argumentSubstitution.ts
 *
 * Supports in skill/command prompts:
 * - $ARGUMENTS - full arguments string
 * - $ARGUMENTS[0], $ARGUMENTS[1] - indexed arguments
 * - $0, $1 - shorthand indexed
 * - $foo, $bar - named arguments (mapped from argumentNames frontmatter)
 */

/** Parse arguments string into tokens (respecting quotes). */
export function parseArguments(args: string): string[] {
  if (!args?.trim()) return []

  // Simple shell-like tokenizer: split on whitespace, respect quotes
  const tokens: string[] = []
  let current = ''
  let inSingle = false, inDouble = false

  for (let i = 0; i < args.length; i++) {
    const ch = args[i]!
    if (ch === "'" && !inDouble) {
      inSingle = !inSingle
    } else if (ch === '"' && !inSingle) {
      inDouble = !inDouble
    } else if (ch === ' ' && !inSingle && !inDouble) {
      if (current) { tokens.push(current); current = '' }
    } else {
      current += ch
    }
  }
  if (current) tokens.push(current)
  return tokens
}

/**
 * Substitute $ARGUMENTS placeholders in content with actual argument values.
 *
 * @param content - The content containing placeholders
 * @param args - The raw arguments string (undefined = no args, '' = empty args)
 * @param appendIfNoPlaceholder - If true and no placeholder found, append "ARGUMENTS: {args}"
 * @param argumentNames - Named args that map to indexed positions ($foo → parsedArgs[0])
 */
export function substituteArguments(
  content: string,
  args: string | undefined,
  appendIfNoPlaceholder = true,
  argumentNames: string[] = [],
): string {
  if (args === undefined || args === null) return content

  const parsedArgs = parseArguments(args)
  const originalContent = content

  // Named arguments ($foo, $bar) → positional
  for (let i = 0; i < argumentNames.length; i++) {
    const name = argumentNames[i]
    if (!name) continue
    content = content.replace(new RegExp(`\\$${name}(?![\\[\\w])`, 'g'), parsedArgs[i] ?? '')
  }

  // Indexed: $ARGUMENTS[0], $ARGUMENTS[1]
  content = content.replace(/\$ARGUMENTS\[(\d+)\]/g, (_, idx: string) => parsedArgs[parseInt(idx, 10)] ?? '')

  // Shorthand: $0, $1
  content = content.replace(/\$(\d+)(?!\w)/g, (_, idx: string) => parsedArgs[parseInt(idx, 10)] ?? '')

  // Full: $ARGUMENTS
  content = content.replaceAll('$ARGUMENTS', args)

  // Append if no placeholder matched and args non-empty
  if (content === originalContent && appendIfNoPlaceholder && args) {
    content = content + `\n\nARGUMENTS: ${args}`
  }

  return content
}
