/**
 * 「可关联组织」列表的 localStorage 键（与 useOrganization.loadUploadableOrgs、useViewableOrganizations 共用）
 */
export const UPLOADABLE_ORG_LS_KEY_PREFIX = 'uploadable-orgs:v1:'

export function uploadableOrgListStorageKey(userId: string): string {
  return `${UPLOADABLE_ORG_LS_KEY_PREFIX}${userId}`
}

/** 组织增删改后调用，避免人员管理等页下拉仍用旧缓存 */
export function clearUploadableOrganizationListCache(userId: string): void {
  try {
    localStorage.removeItem(uploadableOrgListStorageKey(userId))
  } catch {
    /* ignore */
  }
}
