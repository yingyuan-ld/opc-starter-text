/**
 * 中国大陆手机号可选校验（人员管理 FR27）
 * 空字符串视为不校验；非空须为 11 位 1 开头，可含 +86/86 前缀与空格。
 */

const CN_MOBILE = /^1[3-9]\d{9}$/

/** 去掉空格后尝试去掉国家码，得到待匹配的 11 位串 */
export function normalizePhoneDigits(input: string): string {
  let s = input.replace(/\s/g, '').trim()
  if (s.startsWith('+86')) s = s.slice(3)
  else if (s.startsWith('86') && s.length >= 13) s = s.slice(2)
  return s
}

/**
 * @returns 错误文案；`null` 表示通过（含空值）
 */
export function validateOptionalMainlandMobile(phone: string): string | null {
  if (phone.trim() === '') return null
  const digits = normalizePhoneDigits(phone)
  if (!CN_MOBILE.test(digits)) {
    return '请输入有效的中国大陆 11 位手机号，或留空；可含 +86 与空格。'
  }
  return null
}

/** 校验通过后返回仅存数字的 11 位手机号；空输入返回空串 */
export function normalizePhoneForStorage(phone: string): string {
  if (phone.trim() === '') return ''
  const err = validateOptionalMainlandMobile(phone)
  if (err) throw new Error(err)
  return normalizePhoneDigits(phone)
}
