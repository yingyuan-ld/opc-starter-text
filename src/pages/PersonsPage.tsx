/**
 * PersonsPage - 人员/组织管理页面
 * @description 展示组织树、参与人员（人员管理档案）；组织结构操作在树节点行内（管理员）
 */
import { useEffect, useState, useRef, useCallback } from 'react'
import { OrgTree } from '@/components/organization/OrgTree'
import { TeamMembersList } from '@/components/organization/TeamMembersList'
import { CreateOrgDialog, type CreateOrgIntent } from '@/components/organization/CreateOrgDialog'
import { EditOrganizationDialog } from '@/components/organization/EditOrganizationDialog'
import { AddMemberDialog } from '@/components/organization/AddMemberDialog'
import { SYSTEM_ORGANIZATION_ROOT_ID } from '@/config/constants'
import { useOrganization } from '@/hooks/useOrganization'
import { useAuthStore } from '@/stores/useAuthStore'
import { findOrgNodeById } from '@/lib/organizationTreeUtils'
import type { Organization, OrganizationTreeNode } from '@/lib/supabase/organizationTypes'
import {
  listMyPersonnel,
  listPersonnelAssignableToOrganization,
  updatePersonnel,
} from '@/services/api/personnelService'
import type { PersonnelRecord } from '@/types/personnel'

function PersonsPage() {
  const { user } = useAuthStore()
  const userId = user?.id || ''
  const initializedRef = useRef(false)

  const {
    tree,
    selectedOrg,
    userOrgInfo,
    isLoading,
    error,
    loadTree,
    selectOrganization,
    createOrganization,
    updateOrganization,
    deleteOrganization,
    getUserOrgInfo,
  } = useOrganization(userId, { loadProfileMembers: false })

  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [createIntent, setCreateIntent] = useState<CreateOrgIntent>('child')
  const [createReferenceOrg, setCreateReferenceOrg] = useState<Organization | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [parentOrgForCreate, setParentOrgForCreate] = useState<OrganizationTreeNode | null>(null)
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false)
  const [personnelInOrg, setPersonnelInOrg] = useState<PersonnelRecord[]>([])

  const refreshPersonnelInOrg = useCallback(async () => {
    if (!selectedOrg) {
      setPersonnelInOrg([])
      return
    }
    try {
      const all = await listMyPersonnel()
      setPersonnelInOrg(all.filter((p) => p.organizationId === selectedOrg.id))
    } catch {
      setPersonnelInOrg([])
    }
  }, [selectedOrg])

  useEffect(() => {
    if (!userId || initializedRef.current) return
    initializedRef.current = true

    loadTree()
    getUserOrgInfo(userId)
  }, [userId, loadTree, getUserOrgInfo])

  useEffect(() => {
    void refreshPersonnelInOrg()
  }, [refreshPersonnelInOrg])

  const handleSelectOrg = (node: OrganizationTreeNode) => {
    selectOrganization(node)
  }

  const openCreateChild = () => {
    if (!selectedOrg) return
    setCreateIntent('child')
    setParentOrgForCreate(selectedOrg as OrganizationTreeNode)
    setCreateReferenceOrg(null)
    setCreateDialogOpen(true)
  }

  const openCreateSibling = () => {
    if (!selectedOrg) return
    const pid = selectedOrg.parent_id
    const parentNode = pid ? findOrgNodeById(tree, pid) : null
    setCreateIntent('sibling')
    setParentOrgForCreate(parentNode)
    setCreateReferenceOrg(selectedOrg)
    setCreateDialogOpen(true)
  }

  const handleDeleteOrg = async () => {
    if (!selectedOrg) return

    if (!confirm(`确定要删除组织 "${selectedOrg.display_name}" 吗？此操作不可撤销。`)) {
      return
    }

    try {
      await deleteOrganization(selectedOrg.id)
    } catch (err) {
      alert(err instanceof Error ? err.message : '删除失败')
    }
  }

  const handleAddMember = () => {
    setAddMemberDialogOpen(true)
  }

  const handleAssignPersonnel = async (personnelId: string) => {
    if (!selectedOrg) return
    await updatePersonnel(personnelId, { organizationId: selectedOrg.id })
    await refreshPersonnelInOrg()
  }

  const handleRemovePersonnel = async (record: PersonnelRecord) => {
    if (!confirm(`确定将「${record.fullName}」从本组织移除？`)) return
    try {
      await updatePersonnel(record.id, { organizationId: null })
      await refreshPersonnelInOrg()
    } catch (err) {
      alert(err instanceof Error ? err.message : '操作失败')
    }
  }

  const currentUserRole = userOrgInfo?.role || 'member'
  const isAdmin = currentUserRole === 'admin'

  if (!userId) {
    return (
      <div className="max-w-7xl mx-auto p-4">
        <p className="text-muted-foreground">请先登录</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-4 h-[calc(100vh-4rem)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-3xl font-bold">组织架构与人员管理</h1>
          <p className="text-sm text-muted-foreground mt-1">管理团队组织结构和成员信息</p>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-md mb-4">
          <p className="text-sm">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(300px,420px)_1fr] gap-4 h-[calc(100%-5rem)]">
        <div className="border rounded-lg p-4 overflow-y-auto bg-card">
          <h2 className="text-lg font-semibold mb-3">组织树</h2>
          {isLoading && !tree.length ? (
            <p className="text-sm text-muted-foreground">加载中...</p>
          ) : (
            <OrgTree
              tree={tree}
              selectedId={selectedOrg?.id || null}
              onSelect={handleSelectOrg}
              systemRootId={SYSTEM_ORGANIZATION_ROOT_ID}
              isAdmin={isAdmin}
              onEditNode={isAdmin ? () => setEditDialogOpen(true) : undefined}
              onAddSibling={isAdmin ? openCreateSibling : undefined}
              onAddChild={isAdmin ? openCreateChild : undefined}
              onDeleteNode={isAdmin ? handleDeleteOrg : undefined}
            />
          )}
        </div>

        <div className="border rounded-lg p-4 overflow-hidden bg-card flex flex-col min-h-0">
          {selectedOrg ? (
            <div className="min-h-0 flex-1 overflow-y-auto">
              <TeamMembersList
                personnelMembers={personnelInOrg}
                organizationName={selectedOrg.display_name}
                currentUserRole={currentUserRole}
                onAddMember={handleAddMember}
                onRemovePersonnel={currentUserRole === 'admin' ? handleRemovePersonnel : undefined}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <p className="text-sm">请从左侧选择一个组织查看成员</p>
            </div>
          )}
        </div>
      </div>

      <CreateOrgDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        intent={createIntent}
        parentOrg={parentOrgForCreate}
        referenceOrg={createReferenceOrg}
        onSubmit={async (input) => {
          await createOrganization(input)
        }}
      />

      <EditOrganizationDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        organization={selectedOrg}
        onSubmit={async (input) => {
          if (!selectedOrg) return
          const org = await updateOrganization(selectedOrg.id, input)
          selectOrganization(org)
        }}
      />

      {selectedOrg && (
        <AddMemberDialog
          open={addMemberDialogOpen}
          onOpenChange={setAddMemberDialogOpen}
          organizationName={selectedOrg.display_name}
          listAssignablePersonnel={() =>
            listPersonnelAssignableToOrganization(selectedOrg.id)
          }
          onAssignPersonnel={handleAssignPersonnel}
        />
      )}
    </div>
  )
}

export default PersonsPage
