/**
 * 人员管理等场景：可选组织列表（与组织管理模块 `organizations` 主数据同源）
 * @description 经 `organizationService.getViewableOrganizations`，与 `useOrganization().loadUploadableOrgs`
 * 共用 localStorage 键 `uploadable-orgs:v1:{userId}`，避免与组织页重复拉取。见 PRD FR19/FR28。
 */
import { useCallback, useEffect, useState } from 'react'
import { organizationService } from '@/services/organization'
import type { Organization } from '@/lib/supabase/organizationTypes'
import {
  LOCAL_STORAGE_SHORT_TTL_MS,
  readTimedJsonCache,
  writeTimedJsonCache,
} from '@/lib/localStorageJsonCache'
import { uploadableOrgListStorageKey } from '@/lib/organizationUploadableCache'

export function useViewableOrganizations(userId: string) {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    if (!userId) {
      setOrganizations([])
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const cacheKey = uploadableOrgListStorageKey(userId)
      const cached = readTimedJsonCache<Organization[]>(cacheKey, LOCAL_STORAGE_SHORT_TTL_MS)
      if (cached && cached.length > 0) {
        setOrganizations(cached)
        setLoading(false)
        return
      }

      const orgs = await organizationService.getViewableOrganizations(userId)
      setOrganizations(orgs)
      if (orgs.length > 0) {
        writeTimedJsonCache(cacheKey, orgs)
      }
    } catch (e) {
      setOrganizations([])
      setError(e instanceof Error ? e.message : '加载组织列表失败')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return { organizations, loading, error, refetch }
}
