'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark'
type FontScale = 'small' | 'normal' | 'large'

const FONT_SCALE_MAP: Record<FontScale, number> = {
  small: 0.9,
  normal: 1.0,
  large: 1.1,
}

interface ThemeContextValue {
  theme: Theme
  setTheme: (t: Theme) => void
  fontScale: FontScale
  setFontScale: (s: FontScale) => void
}

const Ctx = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({
  initialTheme = 'light',
  initialFontScale = 'normal',
  children,
}: {
  initialTheme?: Theme
  initialFontScale?: FontScale
  children: React.ReactNode
}) {
  const [theme, setThemeState] = useState<Theme>(initialTheme)
  const [fontScale, setFontScaleState] = useState<FontScale>(initialFontScale)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.cookie = `nlic_theme=${theme}; path=/; max-age=31536000; samesite=lax`
  }, [theme])

  useEffect(() => {
    document.documentElement.style.setProperty(
      '--font-scale',
      String(FONT_SCALE_MAP[fontScale]),
    )
    document.cookie = `nlic_font_scale=${fontScale}; path=/; max-age=31536000; samesite=lax`
  }, [fontScale])

  return (
    <Ctx.Provider
      value={{
        theme,
        setTheme: setThemeState,
        fontScale,
        setFontScale: setFontScaleState,
      }}
    >
      {children}
    </Ctx.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider')
  return ctx
}
