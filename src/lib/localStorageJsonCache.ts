/**
 * 带 TTL 的 localStorage JSON 缓存（与 useOrganization 等共用）
 */

export const LOCAL_STORAGE_SHORT_TTL_MS = 5 * 60 * 1000

export function readTimedJsonCache<T>(key: string, ttlMs = LOCAL_STORAGE_SHORT_TTL_MS): T | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { ts: number; data: T }
    if (!parsed || typeof parsed.ts !== 'number') return null
    if (Date.now() - parsed.ts > ttlMs) return null
    return parsed.data
  } catch {
    return null
  }
}

export function writeTimedJsonCache<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data }))
  } catch {
    // ignore quota / private mode
  }
}
