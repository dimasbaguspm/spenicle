import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type Theme = 'light' | 'dark'

/** What the client asked for: a pinned theme, or the browser's own preference. */
export type ThemeChoice = Theme | 'system'

type ThemeState = {
  /** the theme on screen now */
  theme: Theme
  choice: ThemeChoice
  setTheme: (next: ThemeChoice) => void
  toggle: () => void
}

const storageKey = 'spenicle.theme'
const prefersLight = '(prefers-color-scheme: light)'

function storedChoice(): ThemeChoice {
  const value = localStorage.getItem(storageKey)

  return value === 'light' || value === 'dark' ? value : 'system'
}

function systemTheme(): Theme {
  return window.matchMedia(prefersLight).matches ? 'light' : 'dark'
}

const ThemeContext = createContext<ThemeState | undefined>(undefined)

export function useTheme(): ThemeState {
  const value = useContext(ThemeContext)

  if (value === undefined) {
    throw new Error('useTheme is only available inside <ThemeProvider>')
  }

  return value
}

/**
 * Light and dark, decided the way a browser decides: no stored choice means the client's
 * preference and follows it live, and the moment somebody picks one that choice is kept.
 * `index.html` paints the same rule before the first frame, so nothing flashes.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [choice, setChoice] = useState<ThemeChoice>(storedChoice)
  const [system, setSystem] = useState<Theme>(systemTheme)
  const theme: Theme = choice === 'system' ? system : choice

  useEffect(() => {
    const media = window.matchMedia(prefersLight)
    const follow = () => {
      setSystem(media.matches ? 'light' : 'dark')
    }

    media.addEventListener('change', follow)

    return () => {
      media.removeEventListener('change', follow)
    }
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
  }, [theme])

  const setTheme = useCallback((next: ThemeChoice) => {
    setChoice(next)

    if (next === 'system') {
      localStorage.removeItem(storageKey)
      return
    }

    localStorage.setItem(storageKey, next)
  }, [])

  const toggle = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }, [setTheme, theme])

  const value = useMemo(
    () => ({ theme, choice, setTheme, toggle }),
    [theme, choice, setTheme, toggle],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
