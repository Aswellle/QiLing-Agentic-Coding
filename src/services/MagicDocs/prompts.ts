/**
 * Magic Docs prompts — ported from CC's services/MagicDocs/prompts.ts
 */

export function buildMagicDocsUpdatePrompt(
  docPath: string,
  docTitle: string,
  docContents: string,
  customInstructions?: string,
): string {
  const customSection = customInstructions
    ? `\nCustom instructions: ${customInstructions}\n`
    : ''

  return `IMPORTANT: These instructions are NOT part of the actual user conversation.

Based on the user conversation above, update the Magic Doc file to incorporate NEW learnings, insights, or information worth preserving.

The file ${docPath} current contents:
<current_doc_content>
${docContents}
</current_doc_content>

Document title: ${docTitle}${customSection}

Your ONLY task: output JSON describing the sections to update (or nothing if no update needed):
{
  "shouldUpdate": true,
  "updates": [
    {"oldText": "text to replace", "newText": "replacement text"}
  ]
}

If there's nothing substantial to add, output: {"shouldUpdate": false}

CRITICAL RULES:
- Preserve the Magic Doc header exactly: # MAGIC DOC: ${docTitle}
- Keep content CURRENT, not a changelog — update IN-PLACE
- Be terse. High signal only. No filler.
- Focus on: WHY things exist, HOW components connect, non-obvious patterns
- Skip: obvious code mechanics, exhaustive API docs, step-by-step details
- Output ONLY valid JSON, no other text`
}
