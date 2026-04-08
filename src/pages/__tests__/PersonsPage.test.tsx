/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PersonsPage from '../PersonsPage'
import { renderWithRouter } from '@/test/testUtils'
import { SYSTEM_ORGANIZATION_ROOT_ID } from '@/config/constants'

let mockUser: { id: string } | null = { id: 'test-user-id' }

vi.mock('@/stores/useAuthStore', () => ({
  useAuthStore: () => ({
    user: mockUser,
  }),
}))

const mockLoadTree = vi.fn()
const mockSelectOrganization = vi.fn()
const mockCreateOrganization = vi.fn()
const mockUpdateOrganization = vi.fn()
const mockDeleteOrganization = vi.fn()
const mockGetUserOrgInfo = vi.fn()
const mockListMyPersonnel = vi.fn()

let mockTree: {
  id: string
  display_name: string
  is_system_root?: boolean
  parent_id?: string | null
}[] = []
let mockSelectedOrg: {
  id: string
  display_name: string
  name?: string
  parent_id?: string | null
  path?: string
  level?: number
  description?: string | null
  created_at?: string
  updated_at?: string
  is_system_root?: boolean
} | null = null
let mockUserOrgInfo: { role: string } | null = { role: 'member' }
let mockIsLoading = false
let mockError: string | null = null

vi.mock('@/hooks/useOrganization', () => ({
  useOrganization: () => ({
    tree: mockTree,
    selectedOrg: mockSelectedOrg,
    userOrgInfo: mockUserOrgInfo,
    isLoading: mockIsLoading,
    error: mockError,
    loadTree: mockLoadTree,
    selectOrganization: mockSelectOrganization,
    createOrganization: mockCreateOrganization,
    updateOrganization: mockUpdateOrganization,
    deleteOrganization: mockDeleteOrganization,
    getUserOrgInfo: mockGetUserOrgInfo,
  }),
}))

vi.mock('@/services/api/personnelService', () => ({
  listMyPersonnel: () => mockListMyPersonnel(),
  listPersonnelAssignableToOrganization: vi.fn().mockResolvedValue([]),
  updatePersonnel: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/components/organization/OrgTree', () => ({
  OrgTree: ({
    tree,
    onSelect,
    selectedId,
    isAdmin,
    onEditNode,
    onAddSibling,
    onAddChild,
    onDeleteNode,
    systemRootId,
  }: {
    tree: {
      id: string
      display_name: string
      is_system_root?: boolean
      parent_id?: string | null
    }[]
    onSelect: (node: unknown) => void
    selectedId: string | null
    isAdmin?: boolean
    onEditNode?: () => void
    onAddSibling?: () => void
    onAddChild?: () => void
    onDeleteNode?: () => void
    systemRootId: string
  }) => (
    <div data-testid="org-tree">
      {tree.map((node) => {
        const isRoot = node.is_system_root === true || node.id === systemRootId
        return (
          <div key={node.id} data-testid={`org-row-${node.id}`}>
            <button
              type="button"
              data-testid={`org-node-${node.id}`}
              onClick={() =>
                onSelect({
                  id: node.id,
                  display_name: node.display_name,
                  parent_id: node.parent_id ?? null,
                  name: node.id,
                  path: node.id,
                  level: 0,
                  description: null,
                  created_at: '',
                  updated_at: '',
                  is_system_root: node.is_system_root,
                })
              }
            >
              {node.display_name}
            </button>
            {isAdmin && selectedId === node.id && (
              <div data-testid={`org-actions-${node.id}`}>
                <button type="button" aria-label="编辑名称" onClick={() => onEditNode?.()}>
                  编辑
                </button>
                {!isRoot && (
                  <button type="button" aria-label="新增同级" onClick={() => onAddSibling?.()}>
                    同级
                  </button>
                )}
                <button type="button" aria-label="新增子节点" onClick={() => onAddChild?.()}>
                  子节点
                </button>
                {!isRoot && (
                  <button type="button" aria-label="删除组织" onClick={() => onDeleteNode?.()}>
                    删除
                  </button>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  ),
}))

vi.mock('@/components/organization/TeamMembersList', () => ({
  TeamMembersList: ({ organizationName }: { organizationName: string }) => (
    <div data-testid="team-members-list">{organizationName}</div>
  ),
}))

vi.mock('@/components/organization/CreateOrgDialog', () => ({
  CreateOrgDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="create-org-dialog">CreateOrgDialog</div> : null,
}))

vi.mock('@/components/organization/AddMemberDialog', () => ({
  AddMemberDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="add-member-dialog">AddMemberDialog</div> : null,
}))

vi.mock('@/components/organization/EditOrganizationDialog', () => ({
  EditOrganizationDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="edit-org-dialog">EditOrganizationDialog</div> : null,
}))

describe('PersonsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUser = { id: 'test-user-id' }
    mockTree = []
    mockSelectedOrg = null
    mockUserOrgInfo = { role: 'member' }
    mockIsLoading = false
    mockError = null
    mockListMyPersonnel.mockResolvedValue([])
  })

  it('未登录时应该显示登录提示', async () => {
    mockUser = null

    renderWithRouter(<PersonsPage />)

    expect(screen.getByText('请先登录')).toBeInTheDocument()
  })

  it('应该渲染页面标题', async () => {
    renderWithRouter(<PersonsPage />)

    expect(screen.getByText('组织架构与人员管理')).toBeInTheDocument()
    expect(screen.getByText(/管理团队组织结构和成员信息/)).toBeInTheDocument()
  })

  it('应该显示组织树区域', async () => {
    renderWithRouter(<PersonsPage />)

    expect(screen.getByText('组织树')).toBeInTheDocument()
    expect(screen.getByTestId('org-tree')).toBeInTheDocument()
  })

  it('加载时应该显示加载状态', async () => {
    mockIsLoading = true
    mockTree = []

    renderWithRouter(<PersonsPage />)

    expect(screen.getByText('加载中...')).toBeInTheDocument()
  })

  it('有错误时应该显示错误信息', async () => {
    mockError = '加载组织信息失败'

    renderWithRouter(<PersonsPage />)

    expect(screen.getByText('加载组织信息失败')).toBeInTheDocument()
  })

  it('有组织树时应该显示组织节点', async () => {
    mockTree = [
      { id: 'org1', display_name: '研发部' },
      { id: 'org2', display_name: '产品部' },
    ]

    renderWithRouter(<PersonsPage />)

    await waitFor(() => {
      expect(screen.getByTestId('org-node-org1')).toBeInTheDocument()
      expect(screen.getByTestId('org-node-org2')).toBeInTheDocument()
    })
  })

  it('未选择组织时应该显示提示', async () => {
    mockSelectedOrg = null

    renderWithRouter(<PersonsPage />)

    expect(screen.getByText('请从左侧选择一个组织查看成员')).toBeInTheDocument()
  })

  it('选择组织后应该显示成员列表', async () => {
    mockSelectedOrg = { id: 'org1', display_name: '研发部' }

    renderWithRouter(<PersonsPage />)

    expect(screen.getByTestId('team-members-list')).toBeInTheDocument()
    expect(screen.getByText('研发部')).toBeInTheDocument()
  })

  it('页头不应再提供「创建根组织」', async () => {
    mockUserOrgInfo = { role: 'admin' }

    renderWithRouter(<PersonsPage />)

    expect(screen.queryByRole('button', { name: /创建根组织/ })).not.toBeInTheDocument()
  })

  it('非管理员不在树行内展示结构操作', async () => {
    mockUserOrgInfo = { role: 'member' }
    mockTree = [{ id: 'org1', display_name: '研发部' }]
    mockSelectedOrg = {
      id: 'org1',
      display_name: '研发部',
      name: 'org1',
      parent_id: null,
      path: 'org1',
      level: 0,
      description: null,
      created_at: '',
      updated_at: '',
    }

    renderWithRouter(<PersonsPage />)

    expect(screen.queryByTestId('org-actions-org1')).not.toBeInTheDocument()
  })

  it('管理员选中节点后树行内展示编辑/同级/子节点/删除', async () => {
    mockUserOrgInfo = { role: 'admin' }
    mockTree = [{ id: 'org1', display_name: '北方大区', parent_id: SYSTEM_ORGANIZATION_ROOT_ID }]
    mockSelectedOrg = {
      id: 'org1',
      display_name: '北方大区',
      name: 'north',
      parent_id: SYSTEM_ORGANIZATION_ROOT_ID,
      path: 'root.north',
      level: 1,
      description: null,
      created_at: '',
      updated_at: '',
    }

    renderWithRouter(<PersonsPage />)

    expect(screen.getByTestId('org-actions-org1')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /编辑名称/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /新增同级/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /新增子节点/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /删除组织/ })).toBeInTheDocument()
  })

  it('系统主根选中时不展示同级与删除', async () => {
    mockUserOrgInfo = { role: 'admin' }
    mockTree = [
      { id: SYSTEM_ORGANIZATION_ROOT_ID, display_name: '组织根（系统）', is_system_root: true },
    ]
    mockSelectedOrg = {
      id: SYSTEM_ORGANIZATION_ROOT_ID,
      display_name: '组织根（系统）',
      name: 'opc_system_root',
      parent_id: null,
      path: 'opc_system_root',
      level: 0,
      description: null,
      created_at: '',
      updated_at: '',
      is_system_root: true,
    }

    renderWithRouter(<PersonsPage />)

    const actions = screen.getByTestId(`org-actions-${SYSTEM_ORGANIZATION_ROOT_ID}`)
    expect(actions).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /编辑名称/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /新增子节点/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /新增同级/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /删除组织/ })).not.toBeInTheDocument()
  })

  it('树行内编辑应打开编辑对话框', async () => {
    const user = userEvent.setup()
    mockUserOrgInfo = { role: 'admin' }
    mockTree = [{ id: 'org1', display_name: '北方大区', parent_id: SYSTEM_ORGANIZATION_ROOT_ID }]
    mockSelectedOrg = {
      id: 'org1',
      display_name: '北方大区',
      name: 'north',
      parent_id: SYSTEM_ORGANIZATION_ROOT_ID,
      path: 'root.north',
      level: 1,
      description: null,
      created_at: '',
      updated_at: '',
    }

    renderWithRouter(<PersonsPage />)

    await user.click(screen.getByRole('button', { name: /编辑名称/ }))
    expect(screen.getByTestId('edit-org-dialog')).toBeInTheDocument()
  })

  it('初始化时应该调用 loadTree 和 getUserOrgInfo', async () => {
    renderWithRouter(<PersonsPage />)

    await waitFor(() => {
      expect(mockLoadTree).toHaveBeenCalled()
      expect(mockGetUserOrgInfo).toHaveBeenCalledWith('test-user-id')
    })
  })
})
