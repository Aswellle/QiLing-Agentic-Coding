/**
 * Memory taxonomy — 4 types matching CC exactly.
 * These types classify what gets stored in the memory directory system.
 */

export type MemoryType = 'user' | 'feedback' | 'project' | 'reference'

export function parseMemoryType(raw: unknown): MemoryType | undefined {
  if (raw === 'user' || raw === 'feedback' || raw === 'project' || raw === 'reference') return raw
  return undefined
}

// Injected into the system prompt to explain the memory system to the AI
export const TYPES_SECTION_INDIVIDUAL: string[] = [
  '## Types of memory',
  '',
  'There are several discrete types of memory that you can store in your memory system:',
  '',
  '<types>',
  '<type>',
  '    <name>user</name>',
  '    <description>Contain information about the user\'s role, goals, responsibilities, and knowledge. Great user memories help you tailor your future behavior to the user\'s preferences and perspective.</description>',
  '    <when_to_save>When you learn any details about the user\'s role, preferences, responsibilities, or knowledge</when_to_save>',
  '    <how_to_use>When your work should be informed by the user\'s profile or perspective.</how_to_use>',
  '</type>',
  '<type>',
  '    <name>feedback</name>',
  '    <description>Guidance the user has given you about how to approach work — both what to avoid and what to keep doing.</description>',
  '    <when_to_save>Any time the user corrects your approach OR confirms a non-obvious approach worked.</when_to_save>',
  '    <how_to_use>Let these memories guide your behavior so that the user does not need to offer the same guidance twice.</how_to_use>',
  '    <body_structure>Lead with the rule itself, then a **Why:** line and a **How to apply:** line.</body_structure>',
  '</type>',
  '<type>',
  '    <name>project</name>',
  '    <description>Information that you learn about ongoing work, goals, initiatives, bugs, or incidents within the project.</description>',
  '    <when_to_save>When you learn who is doing what, why, or by when.</when_to_save>',
  '    <how_to_use>Use these memories to more fully understand the details and nuance behind the user\'s request.</how_to_use>',
  '    <body_structure>Lead with the fact or decision, then a **Why:** line and a **How to apply:** line.</body_structure>',
  '</type>',
  '<type>',
  '    <name>reference</name>',
  '    <description>Stores pointers to where information can be found in external systems.</description>',
  '    <when_to_save>When you learn about resources in external systems and their purpose.</when_to_save>',
  '    <how_to_use>When the user references an external system or information that may be in an external system.</how_to_use>',
  '</type>',
  '</types>',
  '',
]

export const WHAT_NOT_TO_SAVE_SECTION: string[] = [
  '## What NOT to save in memory',
  '',
  '- Code patterns, conventions, architecture, file paths, or project structure — these can be derived by reading the current project state.',
  '- Git history, recent changes, or who-changed-what — `git log` / `git blame` are authoritative.',
  '- Debugging solutions or fix recipes — the fix is in the code; the commit message has the context.',
  '- Anything already documented in CLAUDE.md files.',
  '- Ephemeral task details: in-progress work, temporary state, current conversation context.',
  '',
]

export const WHEN_TO_ACCESS_SECTION: string[] = [
  '## When to access memories',
  '- When memories seem relevant, or the user references prior-conversation work.',
  '- You MUST access memory when the user explicitly asks you to check, recall, or remember.',
  '- Memory records can become stale over time. Before answering based solely on memory, verify the memory is still correct and up-to-date.',
  '',
]

export const TRUSTING_RECALL_SECTION: string[] = [
  '## Before recommending from memory',
  '',
  'A memory that names a specific function, file, or flag is a claim that it existed *when the memory was written*. It may have been renamed, removed, or never merged. Before recommending it:',
  '',
  '- If the memory names a file path: check the file exists.',
  '- If the memory names a function or flag: grep for it.',
  '- If the user is about to act on your recommendation (not just asking about history), verify first.',
  '',
  '"The memory says X exists" is not the same as "X exists now."',
  '',
]

export const MEMORY_FRONTMATTER_EXAMPLE: string[] = [
  '```markdown',
  '---',
  'name: {{short-kebab-case-slug}}',
  'description: {{one-line summary — used to decide relevance in future conversations, so be specific}}',
  'metadata:',
  '  type: {{user, feedback, project, reference}}',
  '---',
  '',
  '{{memory content — for feedback/project types, structure as: rule/fact, then **Why:** and **How to apply:** lines. Link related memories with [[their-name]].}}',
  '```',
  '',
]
