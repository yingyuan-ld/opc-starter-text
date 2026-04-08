/**
 * useOrganization Hook - 组织架构数据管理
 * @description 提供组织树加载、CRUD 操作和成员管理等功能，集成乐观更新
 */
import { useState, useCallback, useEffect } from 'react'
import { organizationService } from '@/services/organization'
import {
  LOCAL_STORAGE_SHORT_TTL_MS,
  readTimedJsonCache,
  writeTimedJsonCache,
} from '@/lib/localStorageJsonCache'
import { clearUploadableOrganizationListCache, uploadableOrgListStorageKey } from '@/lib/organizationUploadableCache'
import type {
  Organization,
  OrganizationTreeNode,
  Profile,
  CreateOrganizationInput,
  UpdateOrganizationInput,
  UserOrganizationInfo,
} from '@/lib/supabase/organizationTypes'

export interface UseOrganizationResult {
  tree: OrganizationTreeNode[]
  selectedOrg: Organization | null
  members: Profile[]
  userOrgInfo: UserOrganizationInfo | null
  uploadableOrgs: Organization[]
  isLoading: boolean
  error: string | null
  loadTree: (rootId?: string, options?: { skipCache?: boolean }) => Promise<void>
  selectOrganization: (org: Organization) => void
  loadMembers: (orgId: string) => Promise<void>
  createOrganization: (input: CreateOrganizationInput) => Promise<Organization>
  updateOrganization: (id: string, input: UpdateOrganizationInput) => Promise<Organization>
  deleteOrganization: (id: string) => Promise<void>
  updateUserOrganization: (userId: string, organizationId: string | null) => Promise<void>
  getMemberNames: (orgId: string) => Promise<string[]>
  getUserOrgInfo: (userId: string) => Promise<void>
  addMember: (userId: string, orgId: string, role: 'manager' | 'member') => Promise<void>
  removeMember: (userId: string) => Promise<void>
  changeRole: (userId: string, newRole: 'manager' | 'member') => Promise<void>
  getAllUsers: () => Promise<Profile[]>
  searchUsers: (query: string) => Promise<Profile[]>
  loadUploadableOrgs: () => Promise<void>
}

const ORG_TREE_CACHE_KEY = 'org-tree:v1'

export type UseOrganizationOptions = {
  /** 为 false 时不按 profiles 拉取组织「账号成员」（组织页仅以人员档案为准时使用） */
  loadProfileMembers?: boolean
}

export function useOrganization(
  userId: string,
  options?: UseOrganizationOptions
): UseOrganizationResult {
  const loadProfileMembers = options?.loadProfileMembers !== false
  const [tree, setTree] = useState<OrganizationTreeNode[]>([])
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null)
  const [members, setMembers] = useState<Profile[]>([])
  const [userOrgInfo, setUserOrgInfo] = useState<UserOrganizationInfo | null>(null)
  const [uploadableOrgs, setUploadableOrgs] = useState<Organization[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadTree = useCallback(async (rootId?: string, options?: { skipCache?: boolean }) => {
    try {
      setIsLoading(true)
      setError(null)
      if (!rootId && options?.skipCache) {
        try {
          localStorage.removeItem(ORG_TREE_CACHE_KEY)
        } catch {
          /* ignore */
        }
      }
      // 仅缓存完整树（无 rootId）；变更后须 skipCache 拉最新
      if (!rootId && !options?.skipCache) {
        const cachedTree = readTimedJsonCache<OrganizationTreeNode[]>(
          ORG_TREE_CACHE_KEY,
          LOCAL_STORAGE_SHORT_TTL_MS
        )
        if (cachedTree && cachedTree.length > 0) {
          setTree(cachedTree)
          setIsLoading(false)
          return
        }
      }

      const treeData = await organizationService.getOrganizationTree(rootId)
      setTree(treeData)

      if (!rootId && treeData.length > 0) {
        writeTimedJsonCache(ORG_TREE_CACHE_KEY, treeData)
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load organization tree'
      setError(errorMsg)
      console.error('Failed to load tree:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const selectOrganization = useCallback((org: Organization) => {
    setSelectedOrg(org)
  }, [])

  const loadMembers = useCallback(async (orgId: string) => {
    try {
      setIsLoading(true)
      setError(null)
      const membersData = await organizationService.getOrganizationMembers(orgId)
      setMembers(membersData)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load members'
      setError(errorMsg)
      console.error('Failed to load members:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const createOrganization = useCallback(
    async (input: CreateOrganizationInput): Promise<Organization> => {
      try {
        setIsLoading(true)
        setError(null)
        const org = await organizationService.createOrganization(input, userId)
        clearUploadableOrganizationListCache(userId)
        await loadTree(undefined, { skipCache: true })
        return org
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to create organization'
        setError(errorMsg)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [userId, loadTree]
  )

  const updateOrganization = useCallback(
    async (id: string, input: UpdateOrganizationInput): Promise<Organization> => {
      try {
        setIsLoading(true)
        setError(null)
        const org = await organizationService.updateOrganization(id, input, userId)
        clearUploadableOrganizationListCache(userId)
        await loadTree(undefined, { skipCache: true })
        return org
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to update organization'
        setError(errorMsg)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [userId, loadTree]
  )

  const deleteOrganization = useCallback(
    async (id: string): Promise<void> => {
      try {
        setIsLoading(true)
        setError(null)
        await organizationService.deleteOrganization(id, userId)
        clearUploadableOrganizationListCache(userId)
        await loadTree(undefined, { skipCache: true })
        if (selectedOrg?.id === id) {
          setSelectedOrg(null)
          setMembers([])
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to delete organization'
        setError(errorMsg)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [userId, loadTree, selectedOrg]
  )

  const updateUserOrganization = useCallback(
    async (targetUserId: string, organizationId: string | null): Promise<void> => {
      try {
        setIsLoading(true)
        setError(null)
        await organizationService.updateUserOrganization(targetUserId, organizationId, userId)
        if (selectedOrg) {
          await loadMembers(selectedOrg.id)
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to update user organization'
        setError(errorMsg)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [userId, selectedOrg, loadMembers]
  )

  const getMemberNames = useCallback(async (orgId: string): Promise<string[]> => {
    try {
      return await organizationService.getOrganizationMemberNames(orgId)
    } catch (err) {
      console.error('Failed to get member names:', err)
      return []
    }
  }, [])

  const getUserOrgInfo = useCallback(async (targetUserId: string): Promise<void> => {
    try {
      setIsLoading(true)
      setError(null)
      const info = await organizationService.getUserOrganizationInfo(targetUserId)
      setUserOrgInfo(info)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get user org info'
      setError(errorMsg)
      console.error('Failed to get user org info:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const addMember = useCallback(
    async (targetUserId: string, orgId: string, role: 'manager' | 'member'): Promise<void> => {
      try {
        setIsLoading(true)
        setError(null)
        await organizationService.addMemberToOrganization(targetUserId, orgId, role, userId)
        if (selectedOrg?.id === orgId) {
          await loadMembers(orgId)
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to add member'
        setError(errorMsg)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [userId, selectedOrg, loadMembers]
  )

  const removeMember = useCallback(
    async (targetUserId: string): Promise<void> => {
      try {
        setIsLoading(true)
        setError(null)
        await organizationService.removeMemberFromOrganization(targetUserId, userId)
        if (selectedOrg) {
          await loadMembers(selectedOrg.id)
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to remove member'
        setError(errorMsg)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [userId, selectedOrg, loadMembers]
  )

  const changeRole = useCallback(
    async (targetUserId: string, newRole: 'manager' | 'member'): Promise<void> => {
      try {
        setIsLoading(true)
        setError(null)
        await organizationService.updateUserRole(targetUserId, newRole, userId)
        if (selectedOrg) {
          await loadMembers(selectedOrg.id)
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to change role'
        setError(errorMsg)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [userId, selectedOrg, loadMembers]
  )

  const getAllUsers = useCallback(async (): Promise<Profile[]> => {
    try {
      return await organizationService.getAllUsers()
    } catch (err) {
      console.error('Failed to get all users:', err)
      return []
    }
  }, [])

  const searchUsers = useCallback(async (query: string): Promise<Profile[]> => {
    try {
      return await organizationService.searchUsers(query)
    } catch (err) {
      console.error('Failed to search users:', err)
      return []
    }
  }, [])

  const loadUploadableOrgs = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true)
      setError(null)
      const cacheKey = uploadableOrgListStorageKey(userId)
      const cached = readTimedJsonCache<Organization[]>(cacheKey, LOCAL_STORAGE_SHORT_TTL_MS)
      if (cached && cached.length > 0) {
        setUploadableOrgs(cached)
        setIsLoading(false)
        return
      }

      const orgs = await organizationService.getUploadableOrganizations(userId)
      setUploadableOrgs(orgs)

      if (orgs.length > 0) {
        writeTimedJsonCache(cacheKey, orgs)
      }
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : 'Failed to load uploadable organizations'
      setError(errorMsg)
      console.error('Failed to load uploadable organizations:', err)
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  useEffect(() => {
    if (!loadProfileMembers) {
      setMembers([])
      return
    }
    if (selectedOrg) {
      loadMembers(selectedOrg.id)
    }
  }, [selectedOrg, loadMembers, loadProfileMembers])

  return {
    tree,
    selectedOrg,
    members,
    userOrgInfo,
    uploadableOrgs,
    isLoading,
    error,
    loadTree,
    selectOrganization,
    loadMembers,
    createOrganization,
    updateOrganization,
    deleteOrganization,
    updateUserOrganization,
    getMemberNames,
    getUserOrgInfo,
    addMember,
    removeMember,
    changeRole,
    getAllUsers,
    searchUsers,
    loadUploadableOrgs,
  }
}
