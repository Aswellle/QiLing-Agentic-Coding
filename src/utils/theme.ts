/**
 * QiLing theme system — ported from CC's utils/theme.ts
 *
 * Six themes (exact color match with CC):
 *   dark            — dark RGB (default for Windows Terminal / true-color terminals)
 *   light           — light RGB
 *   dark-ansi       — dark, 16 ANSI colors only (cmd.exe / legacy terminals)
 *   light-ansi      — light, 16 ANSI colors only
 *   dark-daltonized — dark, colorblind-friendly RGB
 *   light-daltonized— light, colorblind-friendly RGB
 *
 * Plus 'auto' which resolves at runtime (dark on Windows Terminal, auto-detect elsewhere).
 */

// ─── Theme type ───────────────────────────────────────────────────────────────
export type Theme = {
  // Core UI
  text: string
  inverseText: string
  inactive: string
  subtle: string
  suggestion: string
  background: string
  // Semantic
  success: string
  error: string
  warning: string
  // Borders & prompts
  promptBorder: string
  permission: string
  planMode: string
  bashBorder: string
  autoAccept: string
  // Tool result backgrounds (for terminals that support bg colors)
  userMessageBackground: string
  bashMessageBackgroundColor: string
  memoryBackgroundColor: string
  // Diff
  diffAdded: string
  diffRemoved: string
  diffAddedWord: string
  diffRemovedWord: string
  // Agent colors
  red_FOR_SUBAGENTS_ONLY: string
  blue_FOR_SUBAGENTS_ONLY: string
  green_FOR_SUBAGENTS_ONLY: string
  yellow_FOR_SUBAGENTS_ONLY: string
  purple_FOR_SUBAGENTS_ONLY: string
  orange_FOR_SUBAGENTS_ONLY: string
  pink_FOR_SUBAGENTS_ONLY: string
  cyan_FOR_SUBAGENTS_ONLY: string
  // Misc
  claude: string
  fastMode: string
  rate_limit_fill: string
}

// ─── Theme name constants ─────────────────────────────────────────────────────
export const THEME_NAMES = [
  'dark',
  'light',
  'dark-ansi',
  'light-ansi',
  'dark-daltonized',
  'light-daltonized',
] as const

export type ThemeName = (typeof THEME_NAMES)[number]

export const THEME_SETTINGS = ['auto', ...THEME_NAMES] as const
export type ThemeSetting = (typeof THEME_SETTINGS)[number]

// ─── Theme descriptions ───────────────────────────────────────────────────────
export const THEME_DESCRIPTIONS: Record<ThemeSetting, string> = {
  'auto':            '自动（Windows Terminal 使用 dark，其他终端检测系统偏好）',
  'dark':            '深色 RGB（推荐：Windows Terminal / iTerm2 / VS Code 终端）',
  'light':           '浅色 RGB（推荐：浅色系终端）',
  'dark-ansi':       '深色 ANSI（16色，适配所有终端包括 cmd.exe）',
  'light-ansi':      '浅色 ANSI（16色，适配所有终端）',
  'dark-daltonized':  '深色色盲友好（RGB，红绿色盲适配）',
  'light-daltonized': '浅色色盲友好（RGB，红绿色盲适配）',
}

// ─── Dark theme (primary, optimized for Windows Terminal) ────────────────────
const darkTheme: Theme = {
  text: 'rgb(255,255,255)',
  inverseText: 'rgb(0,0,0)',
  inactive: 'rgb(153,153,153)',
  subtle: 'rgb(80,80,80)',
  suggestion: 'rgb(177,185,249)',
  background: 'rgb(0,204,204)',
  success: 'rgb(78,186,101)',
  error: 'rgb(255,107,128)',
  warning: 'rgb(255,193,7)',
  promptBorder: 'rgb(136,136,136)',
  permission: 'rgb(177,185,249)',
  planMode: 'rgb(72,150,140)',
  bashBorder: 'rgb(253,93,177)',
  autoAccept: 'rgb(175,135,255)',
  userMessageBackground: 'rgb(55,55,55)',
  bashMessageBackgroundColor: 'rgb(65,60,65)',
  memoryBackgroundColor: 'rgb(55,65,70)',
  diffAdded: 'rgb(34,92,43)',
  diffRemoved: 'rgb(122,41,54)',
  diffAddedWord: 'rgb(56,166,96)',
  diffRemovedWord: 'rgb(179,89,107)',
  red_FOR_SUBAGENTS_ONLY: 'rgb(220,38,38)',
  blue_FOR_SUBAGENTS_ONLY: 'rgb(37,99,235)',
  green_FOR_SUBAGENTS_ONLY: 'rgb(22,163,74)',
  yellow_FOR_SUBAGENTS_ONLY: 'rgb(202,138,4)',
  purple_FOR_SUBAGENTS_ONLY: 'rgb(147,51,234)',
  orange_FOR_SUBAGENTS_ONLY: 'rgb(234,88,12)',
  pink_FOR_SUBAGENTS_ONLY: 'rgb(219,39,119)',
  cyan_FOR_SUBAGENTS_ONLY: 'rgb(8,145,178)',
  claude: 'rgb(215,119,87)',
  fastMode: 'rgb(255,120,20)',
  rate_limit_fill: 'rgb(177,185,249)',
}

// ─── Light theme ─────────────────────────────────────────────────────────────
const lightTheme: Theme = {
  text: 'rgb(0,0,0)',
  inverseText: 'rgb(255,255,255)',
  inactive: 'rgb(102,102,102)',
  subtle: 'rgb(175,175,175)',
  suggestion: 'rgb(87,105,247)',
  background: 'rgb(0,153,153)',
  success: 'rgb(44,122,57)',
  error: 'rgb(171,43,63)',
  warning: 'rgb(150,108,30)',
  promptBorder: 'rgb(153,153,153)',
  permission: 'rgb(87,105,247)',
  planMode: 'rgb(0,102,102)',
  bashBorder: 'rgb(255,0,135)',
  autoAccept: 'rgb(135,0,255)',
  userMessageBackground: 'rgb(240,240,240)',
  bashMessageBackgroundColor: 'rgb(250,245,250)',
  memoryBackgroundColor: 'rgb(230,245,250)',
  diffAdded: 'rgb(105,219,124)',
  diffRemoved: 'rgb(255,168,180)',
  diffAddedWord: 'rgb(47,157,68)',
  diffRemovedWord: 'rgb(209,69,75)',
  red_FOR_SUBAGENTS_ONLY: 'rgb(220,38,38)',
  blue_FOR_SUBAGENTS_ONLY: 'rgb(37,99,235)',
  green_FOR_SUBAGENTS_ONLY: 'rgb(22,163,74)',
  yellow_FOR_SUBAGENTS_ONLY: 'rgb(202,138,4)',
  purple_FOR_SUBAGENTS_ONLY: 'rgb(147,51,234)',
  orange_FOR_SUBAGENTS_ONLY: 'rgb(234,88,12)',
  pink_FOR_SUBAGENTS_ONLY: 'rgb(219,39,119)',
  cyan_FOR_SUBAGENTS_ONLY: 'rgb(8,145,178)',
  claude: 'rgb(215,119,87)',
  fastMode: 'rgb(255,106,0)',
  rate_limit_fill: 'rgb(87,105,247)',
}

// ─── Dark ANSI (16 colors only — works in cmd.exe, legacy terminals) ─────────
const darkAnsiTheme: Theme = {
  text: 'white',
  inverseText: 'black',
  inactive: 'gray',
  subtle: 'gray',
  suggestion: 'blueBright',
  background: 'cyanBright',
  success: 'greenBright',
  error: 'redBright',
  warning: 'yellowBright',
  promptBorder: 'white',
  permission: 'blueBright',
  planMode: 'cyanBright',
  bashBorder: 'magentaBright',
  autoAccept: 'magentaBright',
  userMessageBackground: 'blackBright',
  bashMessageBackgroundColor: 'black',
  memoryBackgroundColor: 'blackBright',
  diffAdded: 'green',
  diffRemoved: 'red',
  diffAddedWord: 'greenBright',
  diffRemovedWord: 'redBright',
  red_FOR_SUBAGENTS_ONLY: 'redBright',
  blue_FOR_SUBAGENTS_ONLY: 'blueBright',
  green_FOR_SUBAGENTS_ONLY: 'greenBright',
  yellow_FOR_SUBAGENTS_ONLY: 'yellowBright',
  purple_FOR_SUBAGENTS_ONLY: 'magentaBright',
  orange_FOR_SUBAGENTS_ONLY: 'redBright',
  pink_FOR_SUBAGENTS_ONLY: 'magentaBright',
  cyan_FOR_SUBAGENTS_ONLY: 'cyanBright',
  claude: 'redBright',
  fastMode: 'redBright',
  rate_limit_fill: 'yellow',
}

// ─── Light ANSI ───────────────────────────────────────────────────────────────
const lightAnsiTheme: Theme = {
  text: 'black',
  inverseText: 'white',
  inactive: 'blackBright',
  subtle: 'blackBright',
  suggestion: 'blue',
  background: 'cyan',
  success: 'green',
  error: 'red',
  warning: 'yellow',
  promptBorder: 'white',
  permission: 'blue',
  planMode: 'cyan',
  bashBorder: 'magenta',
  autoAccept: 'magenta',
  userMessageBackground: 'white',
  bashMessageBackgroundColor: 'whiteBright',
  memoryBackgroundColor: 'white',
  diffAdded: 'green',
  diffRemoved: 'red',
  diffAddedWord: 'greenBright',
  diffRemovedWord: 'redBright',
  red_FOR_SUBAGENTS_ONLY: 'red',
  blue_FOR_SUBAGENTS_ONLY: 'blue',
  green_FOR_SUBAGENTS_ONLY: 'green',
  yellow_FOR_SUBAGENTS_ONLY: 'yellow',
  purple_FOR_SUBAGENTS_ONLY: 'magenta',
  orange_FOR_SUBAGENTS_ONLY: 'redBright',
  pink_FOR_SUBAGENTS_ONLY: 'magentaBright',
  cyan_FOR_SUBAGENTS_ONLY: 'cyan',
  claude: 'redBright',
  fastMode: 'red',
  rate_limit_fill: 'yellow',
}

// ─── Dark daltonized (colorblind-friendly) ────────────────────────────────────
const darkDaltonizedTheme: Theme = {
  text: 'rgb(255,255,255)',
  inverseText: 'rgb(0,0,0)',
  inactive: 'rgb(153,153,153)',
  subtle: 'rgb(80,80,80)',
  suggestion: 'rgb(153,204,255)',
  background: 'rgb(0,204,204)',
  success: 'rgb(51,153,255)',
  error: 'rgb(255,102,102)',
  warning: 'rgb(255,204,0)',
  promptBorder: 'rgb(136,136,136)',
  permission: 'rgb(153,204,255)',
  planMode: 'rgb(102,153,153)',
  bashBorder: 'rgb(51,153,255)',
  autoAccept: 'rgb(175,135,255)',
  userMessageBackground: 'rgb(55,55,55)',
  bashMessageBackgroundColor: 'rgb(65,60,65)',
  memoryBackgroundColor: 'rgb(55,65,70)',
  diffAdded: 'rgb(0,68,102)',
  diffRemoved: 'rgb(102,0,0)',
  diffAddedWord: 'rgb(0,119,179)',
  diffRemovedWord: 'rgb(179,0,0)',
  red_FOR_SUBAGENTS_ONLY: 'rgb(255,102,102)',
  blue_FOR_SUBAGENTS_ONLY: 'rgb(102,178,255)',
  green_FOR_SUBAGENTS_ONLY: 'rgb(102,255,102)',
  yellow_FOR_SUBAGENTS_ONLY: 'rgb(255,255,102)',
  purple_FOR_SUBAGENTS_ONLY: 'rgb(178,102,255)',
  orange_FOR_SUBAGENTS_ONLY: 'rgb(255,178,102)',
  pink_FOR_SUBAGENTS_ONLY: 'rgb(255,153,204)',
  cyan_FOR_SUBAGENTS_ONLY: 'rgb(102,204,204)',
  claude: 'rgb(255,153,51)',
  fastMode: 'rgb(255,120,20)',
  rate_limit_fill: 'rgb(153,204,255)',
}

// ─── Light daltonized ─────────────────────────────────────────────────────────
const lightDaltonizedTheme: Theme = {
  text: 'rgb(0,0,0)',
  inverseText: 'rgb(255,255,255)',
  inactive: 'rgb(102,102,102)',
  subtle: 'rgb(175,175,175)',
  suggestion: 'rgb(51,102,255)',
  background: 'rgb(0,153,153)',
  success: 'rgb(0,102,153)',
  error: 'rgb(204,0,0)',
  warning: 'rgb(255,153,0)',
  promptBorder: 'rgb(153,153,153)',
  permission: 'rgb(51,102,255)',
  planMode: 'rgb(51,102,102)',
  bashBorder: 'rgb(0,102,204)',
  autoAccept: 'rgb(135,0,255)',
  userMessageBackground: 'rgb(220,220,220)',
  bashMessageBackgroundColor: 'rgb(250,245,250)',
  memoryBackgroundColor: 'rgb(230,245,250)',
  diffAdded: 'rgb(153,204,255)',
  diffRemoved: 'rgb(255,204,204)',
  diffAddedWord: 'rgb(51,102,204)',
  diffRemovedWord: 'rgb(153,51,51)',
  red_FOR_SUBAGENTS_ONLY: 'rgb(204,0,0)',
  blue_FOR_SUBAGENTS_ONLY: 'rgb(0,102,204)',
  green_FOR_SUBAGENTS_ONLY: 'rgb(0,204,0)',
  yellow_FOR_SUBAGENTS_ONLY: 'rgb(255,204,0)',
  purple_FOR_SUBAGENTS_ONLY: 'rgb(128,0,128)',
  orange_FOR_SUBAGENTS_ONLY: 'rgb(255,128,0)',
  pink_FOR_SUBAGENTS_ONLY: 'rgb(255,102,178)',
  cyan_FOR_SUBAGENTS_ONLY: 'rgb(0,178,178)',
  claude: 'rgb(255,153,51)',
  fastMode: 'rgb(255,106,0)',
  rate_limit_fill: 'rgb(51,102,255)',
}

// ─── Theme resolver ───────────────────────────────────────────────────────────
export function getTheme(name: ThemeName): Theme {
  switch (name) {
    case 'light':            return lightTheme
    case 'dark-ansi':        return darkAnsiTheme
    case 'light-ansi':       return lightAnsiTheme
    case 'dark-daltonized':  return darkDaltonizedTheme
    case 'light-daltonized': return lightDaltonizedTheme
    default:                 return darkTheme
  }
}

/**
 * Resolve ThemeSetting → ThemeName.
 *
 * 'auto' resolution order:
 *  1. Windows Terminal (WT_SESSION) → dark
 *  2. COLORFGBG env var (dark background = dark theme)
 *  3. NO_COLOR → dark-ansi
 *  4. Default → dark
 */
export function resolveTheme(setting: ThemeSetting): ThemeName {
  if (setting !== 'auto') return setting

  // Windows Terminal sets WT_SESSION — always use dark (full RGB supported)
  if (process.env.WT_SESSION) return 'dark'

  // NO_COLOR hint → fall back to ANSI
  if (process.env.NO_COLOR) return 'dark-ansi'

  // COLORFGBG is set by some terminals: "15;0" = light bg, "0;15" = dark bg
  const colorfgbg = process.env.COLORFGBG
  if (colorfgbg) {
    const parts = colorfgbg.split(';')
    const bg = parseInt(parts[parts.length - 1] ?? '0', 10)
    // bg < 8 is typically dark, bg >= 8 is typically light
    if (bg < 8) return 'dark'
    return 'light'
  }

  // Default: dark
  return 'dark'
}

/**
 * Detect whether the current terminal is Windows Terminal.
 */
export function isWindowsTerminal(): boolean {
  return !!process.env.WT_SESSION
}

/**
 * Convert a theme color value to Ink-compatible color prop.
 * Ink accepts: named colors ('red', 'blue', etc.), '#hex', 'rgb(r,g,b)'.
 * ANSI theme values are already named colors; RGB values pass through.
 */
export function themeColor(color: string): string {
  return color
}
