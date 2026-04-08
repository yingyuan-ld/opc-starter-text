/**
 * @vitest-environment jsdom
 * QA：人员管理页「组织」筛选/表单选项与组织服务 getViewableOrganizations 联通
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useViewableOrganizations } from '../useViewableOrganizations'
import PersonnelManagementPage from '@/pages/PersonnelManagementPage'
import { renderWithRouter } from '@/test/testUtils'
import type { Organization } from '@/lib/supabase/organizationTypes'
import { uploadableOrgListStorageKey } from '@/lib/organizationUploadableCache'

const mockOrgA: Organization = {
  id: 'org-qa-a',
  name: 'qa_a',
  display_name: 'QA联通组织A',
  parent_id: null,
  path: 'qa_a',
  level: 1,
  description: null,
  created_at: '',
  updated_at: '',
}

const orgServiceMocks = vi.hoisted(() => ({
  getViewableOrganizations: vi.fn(),
}))

vi.mock('@/services/organization', () => ({
  organizationService: {
    getViewableOrganizations: orgServiceMocks.getViewableOrganizations,
  },
}))

vi.mock('@/services/api/personnelService', () => ({
  listMyPersonnel: vi.fn().mockResolvedValue([]),
  createPersonnel: vi.fn(),
  updatePersonnel: vi.fn(),
}))

vi.mock('@/stores/useAuthStore', () => ({
  useAuthStore: () => ({
    user: { id: 'user-qa' },
  }),
}))

describe('人员管理 ↔ 组织数据联通', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    orgServiceMocks.getViewableOrganizations.mockResolvedValue([mockOrgA])
  })

  it('useViewableOrganizations 调用 organizationService.getViewableOrganizations 并返回同一列表', async () => {
    const { result } = renderHook(() => useViewableOrganizations('user-qa'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(orgServiceMocks.getViewableOrganizations).toHaveBeenCalledWith('user-qa')
    expect(result.current.organizations).toHaveLength(1)
    expect(result.current.organizations[0].id).toBe('org-qa-a')
    expect(result.current.organizations[0].display_name).toBe('QA联通组织A')
    expect(result.current.error).toBeNull()
  })

  it('localStorage 缓存键与 useOrganization.loadUploadableOrgs 一致', () => {
    expect(uploadableOrgListStorageKey('user-qa')).toBe('uploadable-orgs:v1:user-qa')
  })

  it('人员管理页搜索区组织树选择包含 getViewableOrganizations 返回的展示名', async () => {
    const user = userEvent.setup()
    renderWithRouter(<PersonnelManagementPage />)

    await waitFor(() => {
      expect(orgServiceMocks.getViewableOrganizations).toHaveBeenCalledWith('user-qa')
    })

    await user.click(screen.getByRole('button', { name: '全部' }))

    await waitFor(() => {
      expect(screen.getByText('QA联通组织A')).toBeInTheDocument()
    })
  })
})
