// FROM CC: utils/memory/types.ts (adapt-new)
// Stripped: bun:bundle feature('TEAMMEM') (QiLing: TeamMem not enabled)
// NOTE: This MemoryType is for CLAUDE.md file locations, NOT for AI memory categories.
// AI memory categories are in memdir/memoryTypes.ts (user/feedback/project/reference).

export const MEMORY_TYPE_VALUES = [
  'User',
  'Project',
  'Local',
  'Managed',
  'AutoMem',
  // TeamMem omitted: feature('TEAMMEM') is ANT-only
] as const

export type MemoryType = (typeof MEMORY_TYPE_VALUES)[number]
