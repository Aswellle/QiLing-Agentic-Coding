export type ModifierKey = 'ctrl' | 'alt' | 'shift' | 'meta' | 'super'

export interface ParsedKeystroke {
  key: string      // e.g. 'c', 'tab', 'escape', 'up', 'enter', 'space'
  ctrl: boolean
  alt: boolean
  shift: boolean
  meta: boolean
  super: boolean
}

export type ParsedChord = ParsedKeystroke[]  // multi-keystroke sequence

// All supported context names
export type KeybindingContextName =
  | 'Global'
  | 'Chat'
  | 'Autocomplete'
  | 'Confirmation'
  | 'Settings'
  | 'Select'
  | 'Transcript'
  | 'HistorySearch'
  | 'Task'
  | 'Scroll'
  | 'Help'
  | 'Tabs'
  | 'Footer'
  | 'MessageSelector'
  | 'DiffDialog'
  | 'ModelPicker'
  | 'Plugin'
  | 'ThemePicker'
  | 'Attachments'

// A keybinding block groups bindings by context
export interface KeybindingBlock {
  context: KeybindingContextName
  bindings: Record<string, string | null>  // key string → action name (null = unbind)
}

// Parsed form of a single binding
export interface ParsedBinding {
  context: KeybindingContextName
  chord: ParsedChord       // parsed key sequence (1+ keystrokes)
  action: string | null    // null = explicitly unbound
}

// Shape of keybindings.json
export interface UserKeybindingsFile {
  $schema?: string
  bindings?: KeybindingBlock[]
}
