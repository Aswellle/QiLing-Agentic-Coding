/**
 * Classify an MCP tool as a search/read operation for UI collapsing.
 * Returns { isSearch: false, isRead: false } for tools that should not
 * collapse (e.g., send_message, create_*, update_*).
 *
 * Ported from CC's MCPTool/classifyForCollapse.ts
 *
 * Uses explicit per-tool allowlists for the most common MCP servers.
 * Tool names are stable across installs, so matching is keyed on the tool
 * name alone after normalizing camelCase/kebab-case to snake_case.
 * Unknown tool names don't collapse (conservative).
 */

// prettier-ignore
const SEARCH_TOOLS = new Set([
  // Slack (hosted + @modelcontextprotocol/server-slack)
  'slack_search_public', 'slack_search_public_and_private', 'slack_search_channels', 'slack_search_users',
  // GitHub (github/github-mcp-server)
  'search_code', 'search_repositories', 'search_issues', 'search_pull_requests', 'search_orgs', 'search_users',
  // Linear (mcp.linear.app)
  'search_documentation',
  // Datadog (mcp.datadoghq.com)
  'search_logs', 'search_spans', 'search_rum_events', 'search_audit_logs', 'search_monitors',
  'search_monitor_groups', 'find_slow_spans', 'find_monitors_matching_pattern',
  // Sentry (getsentry/sentry-mcp)
  'search_docs', 'search_events', 'search_issue_events', 'find_organizations', 'find_teams',
  'find_projects', 'find_releases', 'find_dsns',
  // Notion
  'search',
  // Gmail
  'gmail_search_messages',
  // Google Drive
  'google_drive_search',
  // Google Calendar
  'gcal_find_my_free_time', 'gcal_find_meeting_times', 'gcal_find_user_emails',
  // Atlassian/Jira
  'search_jira_issues_using_jql', 'search_confluence_using_cql', 'lookup_jira_account_id',
  // Community Atlassian
  'confluence_search', 'jira_search', 'jira_search_fields',
  // Asana
  'asana_search_tasks', 'asana_typeahead_search',
  // Filesystem
  'search_files',
  // Memory
  'search_nodes',
  // Brave Search
  'brave_web_search', 'brave_local_search',
  // Grafana
  'search_dashboards', 'search_folders',
  // PagerDuty
  'list_incidents', 'list_services', 'list_teams', 'list_users', 'get_oncalls', 'list_schedules',
  // HubSpot
  'hubspot_search_objects',
  // Obsidian
  'search_notes', 'search_vault',
  // GBrain
  'query', 'search',
])

// prettier-ignore
const READ_TOOLS = new Set([
  // Slack
  'slack_get_channel_history', 'slack_get_thread_replies', 'slack_get_user_profile',
  'slack_get_users', 'slack_get_channels',
  // GitHub
  'get_file_contents', 'get_issue', 'get_pull_request', 'get_pull_request_diff',
  'get_pull_request_files', 'get_commit', 'get_repository', 'list_commits',
  'list_issues', 'list_pull_requests', 'list_workflow_runs', 'list_branches',
  // Filesystem
  'read_file', 'read_multiple_files', 'list_directory', 'list_allowed_directories',
  'get_file_info',
  // Memory
  'read_graph', 'open_nodes',
  // Notion
  'get_page', 'get_database', 'get_block', 'get_block_children',
  // Google Drive
  'google_drive_get_file', 'google_drive_list_files',
  // Gmail
  'gmail_get_message', 'gmail_get_thread', 'gmail_list_messages',
  // Google Calendar
  'gcal_list_events', 'gcal_get_event',
  // Atlassian
  'get_confluence_page_by_id', 'get_issue_by_id', 'get_jira_issue',
  // Obsidian
  'read_note', 'get_page', 'list_all_tags', 'list_directory', 'get_vault_stats',
  // GBrain
  'get_page', 'get_raw_data', 'get_tags', 'get_links', 'get_backlinks', 'list_pages',
  'get_chunks', 'get_stats', 'file_list',
])

function toSnakeCase(name: string): string {
  return name
    .replace(/([A-Z])/g, '_$1')
    .replace(/-/g, '_')
    .toLowerCase()
    .replace(/^_/, '')
}

export type McpCollapseClassification = {
  isSearch: boolean
  isRead: boolean
}

export function classifyMcpToolForCollapse(toolName: string): McpCollapseClassification {
  const normalized = toSnakeCase(toolName)
  return {
    isSearch: SEARCH_TOOLS.has(normalized),
    isRead: READ_TOOLS.has(normalized),
  }
}

export function isMcpToolCollapsible(toolName: string): boolean {
  const { isSearch, isRead } = classifyMcpToolForCollapse(toolName)
  return isSearch || isRead
}
