// FROM CC: utils/settings/types.ts (adapt-new)
// Stripped: bun:bundle feature() guards → use EXTERNAL_PERMISSION_MODES always
// Stripped: XAA IdP section (env-gated ANT feature)
import { z } from 'zod/v4'
import { SandboxSettingsSchema } from '../../entrypoints/sandboxTypes.js'
import { isEnvTruthy } from '../envUtils.js'
import { lazySchema } from '../lazySchema.js'
import {
  EXTERNAL_PERMISSION_MODES,
} from '../permissions/PermissionMode.js'
import { MarketplaceSourceSchema } from '../plugins/schemas.js'
import { CLAUDE_CODE_SETTINGS_SCHEMA_URL } from './constants.js'
import { PermissionRuleSchema } from './permissionValidation.js'

// Re-export hook schemas and types
export {
  type AgentHook,
  type BashCommandHook,
  type HookCommand,
  HookCommandSchema,
  type HookMatcher,
  HookMatcherSchema,
  HooksSchema,
  type HooksSettings,
  type HttpHook,
  type PromptHook,
} from '../../schemas/hooks.js'

import { type HookCommand, HooksSchema } from '../../schemas/hooks.js'
import { count } from '../array.js'

export const EnvironmentVariablesSchema = lazySchema(() =>
  z.record(z.string(), z.coerce.string()),
)

export const PermissionsSchema = lazySchema(() =>
  z
    .object({
      allow: z.array(PermissionRuleSchema()).optional().describe('List of permission rules for allowed operations'),
      deny: z.array(PermissionRuleSchema()).optional().describe('List of permission rules for denied operations'),
      ask: z.array(PermissionRuleSchema()).optional().describe('List of permission rules that should always prompt for confirmation'),
      defaultMode: z.enum(EXTERNAL_PERMISSION_MODES).optional().describe('Default permission mode when Claude Code needs access'),
      disableBypassPermissionsMode: z.enum(['disable']).optional().describe('Disable the ability to bypass permission prompts'),
      disableAutoMode: z.enum(['disable']).optional().describe('Disable auto mode'),
      additionalDirectories: z.array(z.string()).optional().describe('Additional directories to include in the permission scope'),
    })
    .passthrough(),
)

export const ExtraKnownMarketplaceSchema = lazySchema(() =>
  z.object({
    source: MarketplaceSourceSchema().describe('Where to fetch the marketplace from'),
    installLocation: z.string().optional().describe('Local cache path where marketplace manifest is stored'),
    autoUpdate: z.boolean().optional().describe('Whether to automatically update this marketplace and its installed plugins'),
  }),
)

export const AllowedMcpServerEntrySchema = lazySchema(() =>
  z.object({
    serverName: z.string().regex(/^[a-zA-Z0-9_-]+$/).optional().describe('Name of the MCP server'),
    serverCommand: z.array(z.string()).min(1).optional().describe('Command array for allowed stdio servers'),
    serverUrl: z.string().optional().describe('URL pattern for allowed remote MCP servers'),
  }),
)

export const DeniedMcpServerEntrySchema = lazySchema(() =>
  z.object({
    serverName: z.string().regex(/^[a-zA-Z0-9_-]+$/).optional().describe('Name of the MCP server'),
    serverCommand: z.array(z.string()).min(1).optional().describe('Command array for blocked stdio servers'),
    serverUrl: z.string().optional().describe('URL pattern for blocked remote MCP servers'),
  }),
)

export const CUSTOMIZATION_SURFACES = ['skills', 'agents', 'hooks', 'mcp'] as const

export const SettingsSchema = lazySchema(() =>
  z
    .object({
      $schema: z.literal(CLAUDE_CODE_SETTINGS_SCHEMA_URL).optional().describe('JSON Schema reference for Claude Code settings'),
      apiKeyHelper: z.string().optional().describe('Path to a script that outputs authentication values'),
      proxyAuthHelper: z.string().optional().describe('Shell command that outputs a Proxy-Authorization header value'),
      awsCredentialExport: z.string().optional().describe('Path to a script that exports AWS credentials'),
      awsAuthRefresh: z.string().optional().describe('Path to a script that refreshes AWS authentication'),
      gcpAuthRefresh: z.string().optional().describe('Command to refresh GCP authentication'),
      fileSuggestion: z.object({ type: z.literal('command'), command: z.string() }).optional().describe('Custom file suggestion configuration for @ mentions'),
      respectGitignore: z.boolean().optional().describe('Whether file picker should respect .gitignore files (default: true). Note: .ignore files are always respected.'),
      cleanupPeriodDays: z.number().nonnegative().int().optional().describe('Number of days to retain chat transcripts (default: 30).'),
      env: EnvironmentVariablesSchema().optional().describe('Environment variables to set for Claude Code sessions'),
      attribution: z.object({
        commit: z.string().optional().describe('Attribution text for git commits, including any trailers. Empty string hides attribution.'),
        pr: z.string().optional().describe('Attribution text for pull request descriptions. Empty string hides attribution.'),
      }).optional().describe('Customize attribution text for commits and PRs.'),
      includeCoAuthoredBy: z.boolean().optional().describe("Deprecated: Use attribution instead. Whether to include Claude's co-authored by attribution in commits and PRs (defaults to true)"),
      includeGitInstructions: z.boolean().optional().describe("Include built-in commit and PR workflow instructions in Claude's system prompt (default: true)"),
      permissions: PermissionsSchema().optional().describe('Tool usage permissions configuration'),
      model: z.string().optional().describe('Override the default model used by Claude Code'),
      availableModels: z.array(z.string()).optional().describe('Allowlist of models that users can select.'),
      modelOverrides: z.record(z.string(), z.string()).optional().describe('Override mapping from Anthropic model ID to provider-specific model ID.'),
      enableAllProjectMcpServers: z.boolean().optional().describe('Whether to automatically approve all MCP servers in the project'),
      enabledMcpjsonServers: z.array(z.string()).optional().describe('List of approved MCP servers from .mcp.json'),
      disabledMcpjsonServers: z.array(z.string()).optional().describe('List of rejected MCP servers from .mcp.json'),
      allowedMcpServers: z.array(AllowedMcpServerEntrySchema()).optional().describe('Enterprise allowlist of MCP servers that can be used.'),
      deniedMcpServers: z.array(DeniedMcpServerEntrySchema()).optional().describe('Enterprise denylist of MCP servers that are explicitly blocked.'),
      hooks: HooksSchema().optional().describe('Custom commands to run before/after tool executions'),
      worktree: z.object({
        symlinkDirectories: z.array(z.string()).optional().describe('Directories to symlink from main repository to worktrees.'),
        sparsePaths: z.array(z.string()).optional().describe('Directories to include when creating worktrees, via git sparse-checkout.'),
        baseRef: z.enum(['fresh', 'head']).optional().describe("Which ref new worktrees branch from. 'fresh' (default) branches from origin/<default-branch>. 'head' branches from current local HEAD."),
        bgIsolation: z.enum(['worktree', 'none']).optional().describe("Isolation mode for background sessions."),
      }).optional().describe('Git worktree configuration for --worktree flag.'),
      disableAllHooks: z.boolean().optional().describe('Disable all hooks and statusLine execution'),
      defaultShell: z.enum(['bash', 'powershell']).optional().describe("Default shell for input-box ! commands."),
      allowManagedHooksOnly: z.boolean().optional().describe('When true (and set in managed settings), only hooks from managed settings run.'),
      allowedHttpHookUrls: z.array(z.string()).optional().describe('Allowlist of URL patterns that HTTP hooks may target.'),
      httpHookAllowedEnvVars: z.array(z.string()).optional().describe('Allowlist of environment variable names HTTP hooks may interpolate into headers.'),
      allowManagedPermissionRulesOnly: z.boolean().optional().describe('When true (and set in managed settings), only permission rules from managed settings are respected.'),
      allowManagedMcpServersOnly: z.boolean().optional().describe('When true (and set in managed settings), allowedMcpServers is only read from managed settings.'),
      allowAllClaudeAiMcps: z.boolean().optional().describe('When true (and set in managed settings), claude.ai cloud MCP connectors load.'),
      strictPluginOnlyCustomization: z.preprocess(
        v => Array.isArray(v) ? v.filter(x => (CUSTOMIZATION_SURFACES as readonly string[]).includes(x)) : v,
        z.union([z.boolean(), z.array(z.enum(CUSTOMIZATION_SURFACES))]),
      ).optional().catch(undefined).describe('When set in managed settings, blocks non-plugin customization sources.'),
      statusLine: z.object({
        type: z.literal('command'),
        command: z.string(),
        padding: z.number().optional(),
        refreshInterval: z.number().min(1).optional().describe('Re-run the status line command every N seconds'),
        hideVimModeIndicator: z.boolean().optional(),
      }).optional().describe('Custom status line display configuration'),
      subagentStatusLine: z.object({ type: z.literal('command'), command: z.string() }).optional().describe('Custom per-subagent status line shown in the agent panel'),
      enabledPlugins: z.record(z.string(), z.union([z.array(z.string()), z.boolean(), z.undefined()])).optional().describe('Enabled plugins using plugin-id@marketplace-id format.'),
      extraKnownMarketplaces: z.record(z.string(), ExtraKnownMarketplaceSchema()).optional().describe('Additional marketplaces to make available for this repository.'),
      strictKnownMarketplaces: z.array(MarketplaceSourceSchema()).optional().describe('Enterprise strict list of allowed marketplace sources.'),
      blockedMarketplaces: z.array(MarketplaceSourceSchema()).optional().describe('Enterprise blocklist of marketplace sources.'),
      pluginSuggestionMarketplaces: z.array(z.string()).optional().describe('Marketplace names whose plugins may surface as contextual install suggestions.'),
      forceLoginMethod: z.enum(['claudeai', 'console']).optional().describe('Force a specific login method.'),
      forceLoginOrgUUID: z.union([z.string(), z.array(z.string())]).optional().describe('Organization UUID to require for OAuth login.'),
      forceRemoteSettingsRefresh: z.boolean().optional().describe('When set in managed settings, the CLI blocks startup until remote managed settings are freshly fetched.'),
      otelHeadersHelper: z.string().optional().describe('Path to a script that outputs OpenTelemetry headers'),
      outputStyle: z.string().optional().describe('Controls the output style for assistant responses'),
      viewMode: z.enum(['default', 'verbose', 'focus']).optional().describe('Default transcript view mode on startup'),
      language: z.string().optional().describe('Preferred language for Claude responses and voice dictation'),
      skipWebFetchPreflight: z.boolean().optional().describe('Skip the WebFetch blocklist check for enterprise environments.'),
      sandbox: SandboxSettingsSchema().optional(),
      feedbackSurveyRate: z.number().min(0).max(1).optional().describe('Probability (0–1) that the session quality survey appears when eligible.'),
      spinnerTipsEnabled: z.boolean().optional().describe('Whether to show tips in the spinner'),
      spinnerVerbs: z.object({ mode: z.enum(['append', 'replace']), verbs: z.array(z.string()) }).optional().describe('Customize spinner verbs.'),
      spinnerTipsOverride: z.object({ excludeDefault: z.boolean().optional(), tips: z.array(z.string()) }).optional().describe('Override spinner tips.'),
      syntaxHighlightingDisabled: z.boolean().optional().describe('Whether to disable syntax highlighting in diffs'),
      terminalTitleFromRename: z.boolean().optional().describe('Whether /rename updates the terminal tab title (defaults to true).'),
      alwaysThinkingEnabled: z.boolean().optional().describe('When false, thinking is disabled. When absent or true, thinking is enabled automatically for supported models.'),
      effortLevel: z.enum(['low', 'medium', 'high', 'xhigh']).optional().describe('Persisted effort level for supported models.'),
      ultracode: z.boolean().optional().describe('Enable ultracode for the session.'),
      autoCompactWindow: z.number().int().min(100000).max(1000000).optional().describe('Auto-compact window size'),
      advisorModel: z.string().optional().describe('Advisor model for the server-side advisor tool.'),
      fastMode: z.boolean().optional().describe('When true, fast mode is enabled.'),
      fastModePerSessionOptIn: z.boolean().optional().describe('When true, fast mode does not persist across sessions.'),
      promptSuggestionEnabled: z.boolean().optional().describe('When false, prompt suggestions are disabled.'),
      awaySummaryEnabled: z.boolean().optional().describe('When false, the session recap is disabled.'),
      showClearContextOnPlanAccept: z.boolean().optional().describe('When true, the plan-approval dialog offers a "clear context" option.'),
      agent: z.string().optional().describe('Name of an agent (built-in or custom) to use for the main thread.'),
      companyAnnouncements: z.array(z.string()).optional().describe('Company announcements to display at startup'),
      pluginConfigs: z.record(z.string(), z.object({
        mcpServers: z.record(z.string(), z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]))).optional(),
        options: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.array(z.string())])).optional(),
      })).optional().describe('Per-plugin configuration including MCP server user configs'),
      remote: z.object({ defaultEnvironmentId: z.string().optional() }).optional().describe('Remote session configuration'),
      autoUpdatesChannel: z.enum(['latest', 'stable', 'rc']).optional().describe('Release channel for auto-updates'),
      minimumVersion: z.string().optional().describe('Minimum version to stay on'),
      plansDirectory: z.string().optional().describe('Custom directory for plan files, relative to project root.'),
      tui: z.enum(['default', 'fullscreen']).optional().describe('Terminal UI renderer.'),
      voice: z.object({
        enabled: z.boolean().optional(),
        mode: z.enum(['hold', 'tap']).optional().describe("'hold' (default): hold to talk. 'tap': tap to start, tap to stop+submit."),
        autoSubmit: z.boolean().optional().describe('Submit the prompt when hold-to-talk is released (hold mode only)'),
      }).optional().describe('Voice mode settings (hold-to-talk / tap-to-toggle dictation)'),
      channelsEnabled: z.boolean().optional().describe('Managed-org opt-in for channel notifications'),
      prefersReducedMotion: z.boolean().optional().describe('Reduce or disable animations for accessibility'),
      doneMeansMerged: z.boolean().optional().describe('When true, Claude keeps working until the PR is ready for you to merge.'),
      autoMemoryEnabled: z.boolean().optional().describe('Enable auto-memory for this project.'),
      autoMemoryDirectory: z.string().optional().describe('Custom directory path for auto-memory storage.'),
      autoDreamEnabled: z.boolean().optional().describe('Enable background memory consolidation (auto-dream).'),
      showThinkingSummaries: z.boolean().optional().describe('Request API-side thinking summaries and show them in the conversation.'),
      skipDangerousModePermissionPrompt: z.boolean().optional().describe('Whether the user has accepted the bypass permissions mode dialog'),
      skipWorkflowUsageWarning: z.boolean().optional().describe('Whether the user has accepted the multi-agent workflow usage warning.'),
      disableAutoMode: z.enum(['disable']).optional().describe('Disable auto mode'),
      disableAgentView: z.boolean().optional().describe('Disable agent view'),
      disableRemoteControl: z.boolean().optional().describe('Disable Remote Control'),
      disableWorkflows: z.boolean().optional().describe('Disable the Workflows feature'),
      enableWorkflows: z.boolean().optional().describe('Enable or disable the Workflows feature for this user.'),
      disableSkillShellExecution: z.boolean().optional().describe('Disable inline shell execution in skills'),
      skillOverrides: z.record(z.string(), z.enum(['on', 'name-only', 'user-invocable-only', 'off'])).optional().describe('Per-skill listing overrides'),
      prUrlTemplate: z.string().optional().describe('URL template for PR links in the footer badge and inline messages.'),
      theme: z.union([
        z.enum(['auto', 'dark', 'light', 'light-daltonized', 'dark-daltonized', 'light-ansi', 'dark-ansi']),
        z.string().regex(/^custom:.*/).optional(),
      ]).optional().describe('Color theme for the UI'),
      editorMode: z.enum(['normal', 'vim']).optional().describe('Key binding mode for the prompt input'),
      verbose: z.boolean().optional().describe('Show full tool output instead of truncated summaries'),
      preferredNotifChannel: z.enum(['auto', 'iterm2', 'iterm2_with_bell', 'terminal_bell', 'kitty', 'ghostty', 'notifications_disabled']).optional().describe('Preferred OS notification channel'),
      autoCompactEnabled: z.boolean().optional().describe('Automatically compact conversation when context fills'),
      autoScrollEnabled: z.boolean().optional().describe('Auto-scroll the conversation view to bottom (fullscreen mode only)'),
      fileCheckpointingEnabled: z.boolean().optional().describe('Snapshot files before edits so /rewind can restore them'),
      showTurnDuration: z.boolean().optional().describe('Show "Cooked for Nm Ns" after each assistant turn'),
      showMessageTimestamps: z.boolean().optional().describe('Stamp each assistant message with its arrival time'),
      terminalProgressBarEnabled: z.boolean().optional().describe('Emit OSC 9;4 progress sequences during long operations'),
      todoFeatureEnabled: z.boolean().optional().describe('Enable the todo / task tracking panel'),
      teammateMode: z.enum(['auto', 'tmux', 'in-process']).optional().describe('How spawned teammates execute'),
      remoteControlAtStartup: z.boolean().optional().describe('Start Remote Control bridge automatically each session'),
      isolatePeerMachines: z.boolean().optional().describe('Require explicit approval before SendMessage can reach a peer session'),
      daemonColdStart: z.enum(['transient', 'ask']).optional().describe("When no background service is running: 'transient' spawns one for this login session"),
      autoUploadSessions: z.boolean().optional().describe('Mirror local sessions to claude.ai as view-only'),
      inputNeededNotifEnabled: z.boolean().optional().describe('Push to mobile when a permission prompt or question is waiting'),
      agentPushNotifEnabled: z.boolean().optional().describe('Allow Claude to push proactive mobile notifications'),
      skipAutoPermissionPrompt: z.boolean().optional().describe('Whether the user has accepted the auto mode opt-in dialog'),
      useAutoModeDuringPlan: z.boolean().optional().describe('Whether plan mode uses auto mode semantics when auto mode is available (default: true)'),
      autoMode: z.object({
        allow: z.array(z.string()).optional(),
        soft_deny: z.array(z.string()).optional(),
        hard_deny: z.array(z.string()).optional(),
        environment: z.array(z.string()).optional(),
      }).optional().describe('Auto mode classifier prompt customization'),
      disableDeepLinkRegistration: z.enum(['disable']).optional().describe('Prevent claude-cli:// protocol handler registration with the OS'),
      voiceEnabled: z.boolean().optional().describe('Enable voice mode (hold-to-talk dictation)'),
      defaultView: z.enum(['chat', 'transcript']).optional().describe('Default transcript view: chat or transcript'),
    })
    .passthrough(),
)

export type SettingsJson = z.infer<ReturnType<typeof SettingsSchema>>

export type AllowedMcpServerEntry = z.infer<ReturnType<typeof AllowedMcpServerEntrySchema>>
export type DeniedMcpServerEntry = z.infer<ReturnType<typeof DeniedMcpServerEntrySchema>>

export function isMcpServerNameEntry(
  entry: AllowedMcpServerEntry | DeniedMcpServerEntry,
): entry is { serverName: string } {
  return 'serverName' in entry && typeof entry.serverName === 'string'
}

export function isMcpServerCommandEntry(
  entry: AllowedMcpServerEntry | DeniedMcpServerEntry,
): entry is { serverCommand: string[] } {
  return 'serverCommand' in entry && Array.isArray(entry.serverCommand)
}

export function isMcpServerUrlEntry(
  entry: AllowedMcpServerEntry | DeniedMcpServerEntry,
): entry is { serverUrl: string } {
  return 'serverUrl' in entry && typeof entry.serverUrl === 'string'
}

export type UserConfigValues = Record<
  string,
  string | number | boolean | string[]
>

export type PluginConfig = {
  mcpServers?: Record<string, Record<string, string | number | boolean | string[]>>
  options?: UserConfigValues
}

// Suppress unused import warning for count (used in CC's schema for validation)
void count
void isEnvTruthy
