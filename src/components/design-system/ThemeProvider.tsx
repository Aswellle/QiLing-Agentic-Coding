/**
 * ThemeProvider re-export — bridges CC's useTheme() tuple interface
 * to QiLing's context-based theme system.
 *
 * CC's useTheme() returns [ThemeName] (used like const [theme] = useTheme()).
 * QiLing's useTheme() returns { theme, themeName, ... }.
 * This shim makes CC-style component code work in QiLing.
 */

import type { ThemeName, ThemeSetting } from '../../utils/theme.js'
import { useTheme as useQilingTheme, ThemeProvider } from '../../utils/themeContext.js'

export { ThemeProvider }

export type { ThemeName, ThemeSetting }

/** CC-compatible useTheme hook — returns [themeName, setTheme] tuple */
export function useTheme(): [ThemeName, (setting: ThemeSetting) => void] {
  const { themeName, setTheme } = useQilingTheme()
  return [themeName, setTheme]
}

/** CC-compatible useThemeSetting hook */
export function useThemeSetting(): ThemeSetting {
  const { themeSetting } = useQilingTheme()
  return themeSetting
}

/** Preview theme (no-op in QiLing, theme switching is instant) */
export function usePreviewTheme(): (setting: ThemeSetting) => void {
  const { setTheme } = useQilingTheme()
  return setTheme
}
