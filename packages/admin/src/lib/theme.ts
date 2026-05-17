export type Theme = 'light' | 'dark'

export const themeStorageKey = 'admin-theme'

function isTheme(value: string | null): value is Theme {
  return value === 'light' || value === 'dark'
}

export function getInitialTheme(storage: Pick<Storage, 'getItem'>, prefersDark: boolean): Theme {
  const storedTheme = storage.getItem(themeStorageKey)

  if (isTheme(storedTheme)) {
    return storedTheme
  }

  return prefersDark ? 'dark' : 'light'
}

export function setStoredTheme(storage: Pick<Storage, 'setItem'>, theme: Theme): void {
  storage.setItem(themeStorageKey, theme)
}
