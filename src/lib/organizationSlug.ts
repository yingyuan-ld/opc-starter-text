/**
 * 组织技术标识（name / ltree 段）由系统生成，不暴露给用户编辑。
 * 仅含小写字母与数字，满足 DB 与 MSW 校验。
 */
export function generateOrganizationSlug(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `n${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`
  }
  return `n${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
}
