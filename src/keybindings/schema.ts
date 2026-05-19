/**
 * Keybinding configuration schema — adapted from CC's keybindings/schema.ts
 *
 * Defines all valid context names, action identifiers, and the Zod schema for
 * keybindings.json validation. Used by validate.ts and the /doctor command.
 */

import { z } from 'zod/v4'
import { lazySchema } from '../utils/lazySchema.js'

export const KEYBINDING_CONTEXTS = [
  'Global', 'Chat', 'Autocomplete', 'Confirmation', 'Help', 'Transcript',
  'HistorySearch', 'Task', 'ThemePicker', 'Settings', 'Tabs',
  'Attachments', 'Footer', 'MessageSelector', 'DiffDialog', 'ModelPicker', 'Select', 'Plugin',
] as const

export const KEYBINDING_CONTEXT_DESCRIPTIONS: Record<(typeof KEYBINDING_CONTEXTS)[number], string> = {
  Global: 'Active everywhere, regardless of focus',
  Chat: 'When the chat input is focused',
  Autocomplete: 'When autocomplete menu is visible',
  Confirmation: 'When a confirmation/permission dialog is shown',
  Help: 'When the help overlay is open',
  Transcript: 'When viewing the transcript',
  HistorySearch: 'When searching command history (ctrl+r)',
  Task: 'When a task/agent is running in the foreground',
  ThemePicker: 'When the theme picker is open',
  Settings: 'When the settings menu is open',
  Tabs: 'When tab navigation is active',
  Attachments: 'When navigating image attachments in a select dialog',
  Footer: 'When footer indicators are focused',
  MessageSelector: 'When the message selector (rewind) is open',
  DiffDialog: 'When the diff dialog is open',
  ModelPicker: 'When the model picker is open',
  Select: 'When a select/list component is focused',
  Plugin: 'When the plugin dialog is open',
}

export const KEYBINDING_ACTIONS = [
  // App
  'app:interrupt', 'app:exit', 'app:toggleTodos', 'app:toggleTranscript',
  'app:toggleBrief', 'app:toggleTeammatePreview', 'app:toggleTerminal',
  'app:redraw', 'app:globalSearch', 'app:quickOpen',
  // History
  'history:search', 'history:previous', 'history:next',
  // Chat
  'chat:cancel', 'chat:killAgents', 'chat:cycleMode', 'chat:modelPicker',
  'chat:fastMode', 'chat:thinkingToggle', 'chat:submit', 'chat:newline',
  'chat:undo', 'chat:externalEditor', 'chat:stash', 'chat:imagePaste', 'chat:messageActions',
  // Autocomplete
  'autocomplete:accept', 'autocomplete:dismiss', 'autocomplete:previous', 'autocomplete:next',
  // Confirm
  'confirm:yes', 'confirm:no', 'confirm:previous', 'confirm:next',
  'confirm:nextField', 'confirm:previousField', 'confirm:cycleMode', 'confirm:toggle', 'confirm:toggleExplanation',
  // Tabs
  'tabs:next', 'tabs:previous',
  // Transcript
  'transcript:toggleShowAll', 'transcript:exit',
  // History search
  'historySearch:next', 'historySearch:previous', 'historySearch:accept', 'historySearch:cancel', 'historySearch:execute',
  // Task
  'task:background',
  // Theme
  'theme:toggleSyntaxHighlighting',
  // Help
  'help:dismiss',
  // Attachments
  'attachments:next', 'attachments:previous', 'attachments:remove', 'attachments:exit',
  // Footer
  'footer:up', 'footer:down', 'footer:next', 'footer:previous', 'footer:openSelected', 'footer:clearSelection', 'footer:close',
  // Message selector
  'messageSelector:up', 'messageSelector:down', 'messageSelector:top', 'messageSelector:bottom', 'messageSelector:select',
  // Diff
  'diff:dismiss', 'diff:previousSource', 'diff:nextSource', 'diff:back', 'diff:viewDetails', 'diff:previousFile', 'diff:nextFile',
  // Model picker
  'modelPicker:decreaseEffort', 'modelPicker:increaseEffort',
  // Select
  'select:next', 'select:previous', 'select:accept', 'select:cancel',
  // Plugin
  'plugin:toggle', 'plugin:install',
  // Permission
  'permission:toggleDebug',
  // Settings
  'settings:search', 'settings:retry', 'settings:close',
  // Voice
  'voice:pushToTalk',
] as const

export const KeybindingBlockSchema = lazySchema(() =>
  z.object({
    context: z.enum(KEYBINDING_CONTEXTS).describe('UI context where these bindings apply'),
    bindings: z.record(
      z.string().describe('Keystroke pattern (e.g., "ctrl+k", "shift+tab")'),
      z.union([
        z.enum(KEYBINDING_ACTIONS),
        z.string().regex(/^command:[a-zA-Z0-9:\-_]+$/).describe('Command binding'),
        z.null().describe('Set to null to unbind a default shortcut'),
      ]).describe('Action to trigger, command to invoke, or null to unbind'),
    ).describe('Map of keystroke patterns to actions'),
  }).describe('A block of keybindings for a specific context'),
)

export const KeybindingsSchema = lazySchema(() =>
  z.object({
    $schema: z.string().optional(),
    $docs: z.string().optional(),
    bindings: z.array(KeybindingBlockSchema()).describe('Array of keybinding blocks by context'),
  }).describe('QiLing keybindings configuration'),
)

export type KeybindingsSchemaType = z.infer<ReturnType<typeof KeybindingsSchema>>
