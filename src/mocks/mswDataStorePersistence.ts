/**
 * MSW 内存数据与 localStorage 同步，便于 dev:test 下模拟「刷新后仍在」的真实联调体验。
 * Key 含版本号；变更数据结构时可 bump 版本使旧缓存失效。
 */
export const MSW_DATASTORE_STORAGE_KEY = 'opc-starter-msw-datastore-v1'

const PERSISTED_TABLES = [
  'photos',
  'albums',
  'persons',
  'profiles',
  'organizations',
  'ai_fusion_tasks',
  'personnel_records',
] as const

export function hydrateMswDataStore(dataStore: Record<string, Record<string, unknown>[]>): void {
  if (typeof localStorage === 'undefined') return
  try {
    const raw = localStorage.getItem(MSW_DATASTORE_STORAGE_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw) as Record<string, unknown>
    for (const key of PERSISTED_TABLES) {
      const rows = parsed[key]
      if (Array.isArray(rows)) {
        dataStore[key] = rows as Record<string, unknown>[]
      }
    }
  } catch (e) {
    console.warn('[MSW] hydrateMswDataStore failed, using seed data', e)
  }
}

export function persistMswDataStore(dataStore: Record<string, Record<string, unknown>[]>): void {
  if (typeof localStorage === 'undefined') return
  try {
    const snapshot: Record<string, Record<string, unknown>[]> = {}
    for (const key of PERSISTED_TABLES) {
      snapshot[key] = Array.isArray(dataStore[key]) ? [...dataStore[key]] : []
    }
    localStorage.setItem(MSW_DATASTORE_STORAGE_KEY, JSON.stringify(snapshot))
  } catch (e) {
    console.warn('[MSW] persistMswDataStore failed', e)
  }
}
