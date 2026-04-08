import { describe, expect, it } from 'vitest'
import { generateOrganizationSlug } from '@/lib/organizationSlug'

describe('generateOrganizationSlug', () => {
  it('matches allowed pattern and is unique-ish', () => {
    const a = generateOrganizationSlug()
    const b = generateOrganizationSlug()
    expect(a).toMatch(/^[a-z0-9]+$/)
    expect(b).toMatch(/^[a-z0-9]+$/)
    expect(a).not.toBe(b)
  })
})
