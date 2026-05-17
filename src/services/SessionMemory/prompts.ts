/**
 * Session Memory prompts — ported from CC's services/SessionMemory/prompts.ts
 *
 * Template and update prompts for the session memory notes file.
 */

export const DEFAULT_SESSION_MEMORY_TEMPLATE = `# Session Title
_A short and distinctive 5-10 word descriptive title for the session_

# Current State
_What is actively being worked on right now? Pending tasks not yet completed. Immediate next steps._

# Task specification
_What did the user ask to build? Any design decisions or explanatory context_

# Files and Functions
_What are the important files? In short, what do they contain and why are they relevant?_

# Workflow
_What commands are usually run and in what order? How to interpret their output?_

# Errors & Corrections
_Errors encountered and how they were fixed. What approaches failed and should not be tried again._

# Key Results
_If the user asked a specific question or wanted a document, repeat the exact result here_

# Worklog
_Step by step, what was attempted, done? Very terse summary for each step_
`

export function buildSessionMemoryUpdatePrompt(
  notesPath: string,
  currentNotes: string,
): string {
  return `IMPORTANT: This message and these instructions are NOT part of the actual user conversation. Do NOT include any references to "note-taking" or "session notes extraction" in the notes content.

Based on the user conversation above (EXCLUDING this note-taking instruction message), update the session notes file.

The file ${notesPath} has been read. Here are its current contents:
<current_notes_content>
${currentNotes}
</current_notes_content>

Your ONLY task: output JSON describing the sections to update in this exact format:
{
  "updates": [
    {"section": "# Session Title", "content": "New title text"},
    {"section": "# Current State", "content": "New content for this section"}
  ]
}

CRITICAL RULES:
- NEVER modify or delete section headers (lines starting with '#')
- NEVER modify the italic _description_ lines immediately under headers
- ONLY update the actual content below each italic description
- Keep entries terse. High signal only. No filler words.
- Update IN-PLACE to reflect current state, not append history
- Output ONLY valid JSON, no other text`
}

export function getSessionMemoryInitPrompt(conversationSummary: string): string {
  return `Based on this conversation, create initial session notes in this JSON format:
{
  "updates": [
    {"section": "# Session Title", "content": "short distinctive title"},
    {"section": "# Current State", "content": "what's happening now"},
    {"section": "# Task specification", "content": "what was asked"},
    {"section": "# Worklog", "content": "- step 1\\n- step 2"}
  ]
}

Conversation summary:
${conversationSummary}

Output ONLY valid JSON, no other text.`
}
