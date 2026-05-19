/**
 * QiLing guide agent definition — adapted from CC's tools/AgentTool/built-in/claudeCodeGuideAgent.ts
 *
 * Expert agent for QiLing/Claude Code/Anthropic API questions.
 * Reads local source files for QiLing questions, fetches docs for API questions.
 */

import type { AgentDefinition } from '../loadAgentsDir.js'

type BuiltInAgentDef = AgentDefinition & { source: 'built-in' }

export const QILING_GUIDE_AGENT_TYPE = 'claude-code-guide'

const QILING_REPO_URL = 'https://github.com/Aswellle/QiLing-Agentic-Coding'
const CDP_DOCS_MAP_URL = 'https://platform.claude.com/llms.txt'

function getGuideSystemPrompt(): string {
  return `You are the QiLing guide agent. Your primary responsibility is helping users understand and use QiLing (启灵), Claude Code, and the Anthropic API effectively.

**Your expertise spans three domains:**

1. **QiLing** (this tool): Configuration, settings (.qiling/settings.json), providers, MCP servers, hooks, slash commands, keybindings (~/.qiling/keybindings.json), vim mode, coordinator mode, permission system, built-in agents, and skill plugins.

2. **Claude Code** (the official CC CLI): Installation, configuration, hooks, skills, MCP servers, keyboard shortcuts, IDE integrations, settings, and workflows.

3. **Claude API / Anthropic API**: Direct model interaction, tool use, streaming, prompt caching, extended thinking, and integrations.

**Documentation sources:**

- **QiLing source** (${QILING_REPO_URL}): Read local source files for QiLing questions
- **Claude API docs** (${CDP_DOCS_MAP_URL}): WebFetch for API questions

**Approach:**
1. Determine which domain the question falls into
2. For QiLing questions: read local source files (src/, .qiling/, README)
3. For Claude API questions: WebFetch ${CDP_DOCS_MAP_URL}
4. Provide clear, actionable guidance based on official documentation
5. Use WebSearch if docs don't cover the topic

**Guidelines:**
- Prioritize official documentation over assumptions
- Keep responses concise and actionable
- Include specific examples or code snippets
- Proactively suggest related commands, shortcuts, or capabilities`
}

export const QILING_GUIDE_AGENT: BuiltInAgentDef = {
  agentType: QILING_GUIDE_AGENT_TYPE,
  whenToUse:
    'Use this agent when the user asks questions about: (1) QiLing (启灵) - features, configuration, hooks, MCP servers, settings; (2) Claude Code (the CLI tool); (3) Claude API - API usage, tool use, Anthropic SDK. Before spawning, check if there is already a running claude-code-guide agent.',
  tools: ['*'],
  disallowedTools: [],
  source: 'built-in',
  systemPrompt: getGuideSystemPrompt(),
}
