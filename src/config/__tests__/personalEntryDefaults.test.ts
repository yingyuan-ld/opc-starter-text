import { describe, it, expect } from 'vitest'
import {
  PERSONAL_ENTRY_MAX,
  PERSONAL_ENTRY_ALLOWED_PATHS,
  DEFAULT_PERSONAL_ENTRIES,
  getDefaultPersonalEntries,
} from '../personalEntryDefaults'

describe('personalEntryDefaults', () => {
  it('默认列表条数不超过上限', () => {
    expect(DEFAULT_PERSONAL_ENTRIES.length).toBeLessThanOrEqual(PERSONAL_ENTRY_MAX)
    expect(getDefaultPersonalEntries().length).toBeLessThanOrEqual(PERSONAL_ENTRY_MAX)
  })

  it('每条路径均在允许列表内', () => {
    const allowed = new Set<string>(PERSONAL_ENTRY_ALLOWED_PATHS)
    for (const e of getDefaultPersonalEntries()) {
      expect(allowed.has(e.path)).toBe(true)
    }
  })

  it('每条入口具备展示所需字段', () => {
    for (const e of getDefaultPersonalEntries()) {
      expect(e.label.length).toBeGreaterThan(0)
      expect(e.description.length).toBeGreaterThan(0)
      expect(['users', 'user', 'cloud', 'contact']).toContain(e.icon)
    }
  })
})
