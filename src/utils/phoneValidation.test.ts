import { describe, it, expect } from 'vitest'
import {
  validateOptionalMainlandMobile,
  normalizePhoneForStorage,
  normalizePhoneDigits,
} from './phoneValidation'

describe('phoneValidation', () => {
  it('空字符串通过', () => {
    expect(validateOptionalMainlandMobile('')).toBeNull()
    expect(validateOptionalMainlandMobile('   ')).toBeNull()
  })

  it('合法 11 位通过', () => {
    expect(validateOptionalMainlandMobile('13800138000')).toBeNull()
    expect(validateOptionalMainlandMobile('138 0013 8000')).toBeNull()
    expect(validateOptionalMainlandMobile('+8613800138000')).toBeNull()
    expect(validateOptionalMainlandMobile('8613800138000')).toBeNull()
  })

  it('非法号码返回错误', () => {
    expect(validateOptionalMainlandMobile('123')).not.toBeNull()
    expect(validateOptionalMainlandMobile('23800138000')).not.toBeNull()
    expect(validateOptionalMainlandMobile('1380013800')).not.toBeNull()
  })

  it('normalizePhoneForStorage', () => {
    expect(normalizePhoneForStorage('')).toBe('')
    expect(normalizePhoneForStorage('138 0013 8000')).toBe('13800138000')
    expect(normalizePhoneForStorage('+86 138 0013 8000')).toBe('13800138000')
    expect(() => normalizePhoneForStorage('12')).toThrow()
  })

  it('normalizePhoneDigits', () => {
    expect(normalizePhoneDigits(' +86 13800138000 ')).toBe('13800138000')
  })
})
