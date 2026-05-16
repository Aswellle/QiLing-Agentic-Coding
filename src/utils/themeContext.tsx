/**
 * React context for QiLing's theme system.
 *
 * Usage:
 *   const { theme, themeName, setTheme } = useTheme()
 *   <Text color={theme.permission}>…</Text>
 */

import React, { createContext, useContext, useState, useCallback } from 'react'
import type { Theme, ThemeName, ThemeSetting } from './theme'
import { getTheme, resolveTheme } from './theme'

// ─── Context type ─────────────────────────────────────────────────────────────
interface ThemeContextValue {
  theme: Theme
  themeName: ThemeName
  themeSetting: ThemeSetting
  setTheme: (setting: ThemeSetting) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

// ─── Provider ─────────────────────────────────────────────────────────────────
interface ThemeProviderProps {
  children: React.ReactNode
  initialSetting?: ThemeSetting
}

export function ThemeProvider({ children, initialSetting = 'auto' }: ThemeProviderProps) {
  const [setting, setSetting] = useState<ThemeSetting>(initialSetting)

  const resolved = resolveTheme(setting)
  const theme = getTheme(resolved)

  const setTheme = useCallback((newSetting: ThemeSetting) => {
    setSetting(newSetting)
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, themeName: resolved, themeSetting: setting, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    // Fallback when used outside provider (e.g., in tests)
    const resolved = resolveTheme('auto')
    return {
      theme: getTheme(resolved),
      themeName: resolved,
      themeSetting: 'auto',
      setTheme: () => {},
    }
  }
  return ctx
}
