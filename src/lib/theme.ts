import { useColorScheme } from 'react-native'

/**
 * One palette, two schemes. React Native has no cascade and no CSS variables,
 * so the theme is a plain object read through a hook — every component asks for
 * colours instead of inheriting them.
 */
export interface Colors {
  readonly background: string
  readonly surface: string
  readonly surfaceAlt: string
  readonly border: string
  readonly text: string
  readonly textSoft: string
  readonly accent: string
  readonly onAccent: string
  readonly danger: string
  readonly success: string
}

export const palette: { light: Colors; dark: Colors } = {
  light: {
    background: '#f6f7f9',
    surface: '#ffffff',
    surfaceAlt: '#eef0f4',
    border: '#dfe3e9',
    text: '#141922',
    textSoft: '#5a6474',
    accent: '#1f6feb',
    onAccent: '#ffffff',
    danger: '#c62828',
    success: '#0f7b45',
  },
  dark: {
    background: '#0e1116',
    surface: '#171b22',
    surfaceAlt: '#1f242d',
    border: '#2b323d',
    text: '#e9edf3',
    textSoft: '#98a2b3',
    accent: '#6ea1ff',
    onAccent: '#0b1220',
    danger: '#ff7a7a',
    success: '#4cc38a',
  },
}

export function useTheme(): Colors {
  return palette[useColorScheme() === 'dark' ? 'dark' : 'light']
}

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const
export const radius = { sm: 8, md: 12, lg: 18 } as const
