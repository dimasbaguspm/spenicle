const key = 'spenicle.token'

export function token(): string | undefined {
  return sessionStorage.getItem(key) ?? undefined
}

export function setToken(value: string): void {
  sessionStorage.setItem(key, value)
}

export function clearToken(): void {
  sessionStorage.removeItem(key)
}

export function hasToken(): boolean {
  return token() !== undefined
}
