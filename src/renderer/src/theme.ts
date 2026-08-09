import { createTheme, type Theme } from '@mui/material/styles'
import type { AccentName } from '@shared/types'

export type ThemeMode = 'light' | 'dark'

const ACCENTS: Record<AccentName, Record<ThemeMode, string>> = {
  red: { light: '#a03f3f', dark: '#c98585' },
  green: { light: '#3b6350', dark: '#8fae9c' },
  blue: { light: '#33597f', dark: '#87abc9' },
  violet: { light: '#564b84', dark: '#a79cd6' },
  amber: { light: '#856226', dark: '#c6a76d' },
  slate: { light: '#4c5661', dark: '#9ba6b2' }
}

export function accentColour(accent: AccentName, mode: ThemeMode): string {
  return (ACCENTS[accent] ?? ACCENTS.red)[mode]
}

export const SURFACE = {
  light: '#ffffff',
  dark: '#1a1a1a'
} as const

const FONT_STACK = '"Inter Variable", Inter, system-ui, -apple-system, "Segoe UI", sans-serif'

export const LOGO_FONT_STACK = '"Comfortaa Variable", Comfortaa, "Inter Variable", sans-serif'

const RADIUS = 7

export function buildTheme(mode: ThemeMode, accent: AccentName = 'red'): Theme {
  const isDark = mode === 'dark'

  const divider = isDark ? 'rgba(255,255,255,0.09)' : 'rgba(17,17,17,0.10)'

  return createTheme({
    palette: {
      mode,
      primary: { main: accentColour(accent, mode) },
      secondary: { main: isDark ? '#9a9a95' : '#5f5e5a' },
      success: { main: isDark ? '#6f9c6f' : '#3d7a3d' },
      warning: { main: isDark ? '#c9a55d' : '#8a6a1f' },
      error: { main: isDark ? '#c07d7d' : '#a34040' },
      background: {
        default: isDark ? '#121212' : '#f4f4f3',
        paper: isDark ? SURFACE.dark : SURFACE.light
      },
      text: {
        primary: isDark ? '#e8e8e6' : '#151514',
        secondary: isDark ? '#a3a39e' : '#5c5b57'
      },
      divider
    },
    shape: { borderRadius: RADIUS },
    typography: {
      fontFamily: FONT_STACK,
      h5: { fontWeight: 600, letterSpacing: '-0.015em' },
      h6: { fontWeight: 600, letterSpacing: '-0.01em' },
      subtitle2: { fontWeight: 600 },
      body2: { letterSpacing: 0 },
      caption: { letterSpacing: 0 },
      button: { textTransform: 'none', fontWeight: 500, letterSpacing: 0 }
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          'html, body, #root': { height: '100%', overflow: 'hidden' },
          body: { WebkitFontSmoothing: 'antialiased' },
          '*::-webkit-scrollbar': { width: 10, height: 10 },
          '*::-webkit-scrollbar-thumb': {
            backgroundColor: isDark ? 'rgba(255,255,255,0.14)' : 'rgba(17,17,17,0.16)',
            borderRadius: 6
          }
        }
      },
      MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: { root: { border: `1px solid ${divider}` } }
      },
      MuiButton: { styleOverrides: { root: { borderRadius: RADIUS } } },
      MuiToggleButton: { styleOverrides: { root: { borderRadius: RADIUS } } },
      MuiOutlinedInput: { styleOverrides: { root: { borderRadius: RADIUS } } },
      MuiChip: {
        styleOverrides: {
          root: { fontWeight: 500, borderRadius: 5 },
          sizeSmall: { height: 22 }
        }
      },
      MuiTableCell: {
        styleOverrides: {
          root: { borderColor: divider },
          head: { fontWeight: 600, whiteSpace: 'nowrap' }
        }
      },
      MuiTooltip: {
        defaultProps: { arrow: true },
        styleOverrides: { tooltip: { fontSize: 12, lineHeight: 1.5, maxWidth: 320, borderRadius: 6 } }
      },
      MuiLinearProgress: { styleOverrides: { root: { borderRadius: 3, height: 5 } } },
      MuiCheckbox: { defaultProps: { size: 'small' } }
    }
  })
}
