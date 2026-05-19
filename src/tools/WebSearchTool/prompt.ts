/**
 * WebSearch tool prompt — adapted from CC's tools/WebSearchTool/prompt.ts
 */

import { getLocalMonthYear } from '../../constants/common.js'

export const WEB_SEARCH_TOOL_NAME = 'WebSearch'

export function getWebSearchPrompt(): string {
  const currentMonthYear = getLocalMonthYear()
  return `
- Allows Claude to search the web and use the results to inform responses
- Provides up-to-date information for current events and recent data
- Returns search result information formatted as search result blocks, including links as markdown hyperlinks
- Use this tool for accessing information beyond Claude's knowledge cutoff

CRITICAL: After answering the user's question, include a "Sources:" section with relevant URLs:

    Sources:
    - [Source Title](https://example.com)

IMPORTANT - Use the correct year in search queries:
  - The current month is ${currentMonthYear}. Use this year when searching for recent documentation or events.
`
}
