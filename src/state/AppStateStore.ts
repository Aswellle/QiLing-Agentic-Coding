/**
 * AppState type definition — adapted from CC's state/AppStateStore.ts
 *
 * CC version: 570L, deeply coupled to ANT infrastructure (Bridge, Speculation,
 * Swarm/Teammate, Tungsten, Bagel, Ultraplan, Auth subscriptions).
 *
 * QiLing version: retains the core fields used by QiLing's REPL, tools, MCP,
 * plugins, and permission system. ANT-specific features are omitted:
 *   - replBridge* (Remote Control) — not in QiLing's roadmap yet
 *   - Swarm/Teammate context — QiLing has coordinator but no in-process Swarm
 *   - Speculation state — Phase D candidate
 *   - Tungsten/Bagel/ComputerUse — ANT-internal tools
 *   - Ultraplan — Phase D candidate
 *   - Auth subscriptions (Pro/Max/Team) — QiLing uses API key auth
 *
 * improved: State shape is leaner, easier to trace, and doesn't import
 * CC's bun-bundle feature flags that would break QiLing's build.
 */

import type { Settings } from '../settings/schema.js'
import { createStore, type Store } from './store.js'
import type { PermissionMode } from '../utils/permissions/PermissionMode.js'
import type { EffortLevel } from '../utils/effort.js'
import type { MCPServerConnection } from '../services/mcp/types.js'
import type { Notification } from '../context/notifications.js'

/** Inline — QiLing's fileHistory.ts doesn't export a consolidated state type */
type FileHistoryState = {
  snapshots: Array<{ filePath: string; content: string; timestamp: number }>
  trackedFiles: Set<string>
  snapshotSequence: number
}

/** Resource exposed by an MCP server */
type ServerResource = { uri: string; name: string; description?: string; mimeType?: string }

// ─── Auxiliary types ──────────────────────────────────────────────────────────

export type ToolPermissionContext = {
  mode: PermissionMode
  /** Glob-pattern allow rules (session scope) */
  allow: string[]
  /** Glob-pattern deny rules (session scope) */
  deny: string[]
  /** Additional working directories beyond project root */
  additionalDirectories: string[]
}

export function getEmptyToolPermissionContext(): ToolPermissionContext {
  return { mode: 'default', allow: [], deny: [], additionalDirectories: [] }
}

export type MCPState = {
  clients: MCPServerConnection[]
  tools: unknown[]
  commands: unknown[]
  resources: Record<string, ServerResource[]>
  /** Incremented by /reload-plugins to trigger MCP reconnect effects */
  pluginReconnectKey: number
}

export type PluginEntry = {
  id: string
  name: string
  version?: string
  source: 'user' | 'project' | 'local'
  description?: string
}

export type PluginError = {
  pluginId: string
  message: string
  type: 'load' | 'init' | 'mcp'
}

export type PluginState = {
  enabled: PluginEntry[]
  disabled: PluginEntry[]
  commands: unknown[]
  errors: PluginError[]
  needsRefresh: boolean
}

export type ElicitationEvent = {
  requestId: string
  toolName: string
  serverName: string
  schema: unknown
}

export type TodoItem = {
  id: string
  content: string
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  priority: 'low' | 'medium' | 'high'
}

export type TodoList = TodoItem[]

export type TaskState = {
  id: string
  type: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'killed'
  description: string
  command?: string
  isBackgrounded?: boolean
  toolUseId?: string
  notified?: boolean
  [k: string]: unknown
}

// ─── AppState ─────────────────────────────────────────────────────────────────

export type AppState = {
  // ── Core ──────────────────────────────────────────────────────────────────
  settings: Settings
  verbose: boolean

  /** Active model identifier or alias (null = use default) */
  mainLoopModel: string | null
  /** Model pinned for this session via /model (survives compact, not restart) */
  mainLoopModelForSession: string | null

  /** Permission mode + session-scoped allow/deny rules */
  toolPermissionContext: ToolPermissionContext

  /** Thinking depth control */
  thinkingEnabled: boolean | undefined
  /** Effort level for extended thinking */
  effortValue: EffortLevel | undefined
  /** Fast mode toggle (/fast) */
  fastMode: boolean

  // ── UI state ──────────────────────────────────────────────────────────────
  expandedView: 'none' | 'tasks'
  statusLineText: string | undefined
  /** Set of overlay IDs currently open (for Escape coordination) */
  activeOverlays: Set<string>
  isBriefOnly: boolean
  spinnerTip?: string

  // ── Agent / CLI ───────────────────────────────────────────────────────────
  /** Agent name from --agent flag or settings */
  agent: string | undefined

  // ── MCP ───────────────────────────────────────────────────────────────────
  mcp: MCPState

  // ── Plugins ───────────────────────────────────────────────────────────────
  plugins: PluginState

  // ── Tasks (background agents / shell tasks) ───────────────────────────────
  tasks: Record<string, TaskState>

  // ── Notifications ─────────────────────────────────────────────────────────
  notifications: {
    current: Notification | null
    queue: Notification[]
  }

  // ── Todos ─────────────────────────────────────────────────────────────────
  /** Per-agent todo lists keyed by agentId ('' = main thread) */
  todos: Record<string, TodoList>

  // ── MCP Elicitation ───────────────────────────────────────────────────────
  elicitation: { queue: ElicitationEvent[] }

  // ── File history ──────────────────────────────────────────────────────────
  fileHistory: FileHistoryState

  // ── Initial message (from CLI args or plan mode exit) ─────────────────────
  initialMessage: {
    message: { role: 'user'; content: string }
    clearContext?: boolean
    mode?: PermissionMode
  } | null
}

// ─── Store type ───────────────────────────────────────────────────────────────

export type AppStateStore = Store<AppState>

// ─── Default state ────────────────────────────────────────────────────────────

export function getDefaultAppState(): AppState {
  return {
    settings: {} as Settings,
    verbose: false,
    mainLoopModel: null,
    mainLoopModelForSession: null,
    toolPermissionContext: getEmptyToolPermissionContext(),
    thinkingEnabled: undefined,
    effortValue: undefined,
    fastMode: false,
    expandedView: 'none',
    statusLineText: undefined,
    activeOverlays: new Set(),
    isBriefOnly: false,
    spinnerTip: undefined,
    agent: undefined,
    mcp: {
      clients: [],
      tools: [],
      commands: [],
      resources: {},
      pluginReconnectKey: 0,
    },
    plugins: {
      enabled: [],
      disabled: [],
      commands: [],
      errors: [],
      needsRefresh: false,
    },
    tasks: {},
    notifications: { current: null, queue: [] },
    todos: {},
    elicitation: { queue: [] },
    fileHistory: {
      snapshots: [],
      trackedFiles: new Set(),
      snapshotSequence: 0,
    },
    initialMessage: null,
  }
}

// ─── Store factory ────────────────────────────────────────────────────────────

export function createAppStore(initial?: Partial<AppState>): AppStateStore {
  return createStore<AppState>({ ...getDefaultAppState(), ...initial })
}
