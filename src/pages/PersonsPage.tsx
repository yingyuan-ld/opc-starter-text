/**
 * PersonsPage - 人员/组织管理页面
 * @description 展示组织树、参与人员（人员管理档案）；组织结构操作在树节点行内（管理员）
 */
import { useEffect, useState, useRef, useCallback } from 'react'
import { Alert, Card, Empty, Modal, Spin, Typography, message } from 'antd'
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
  const [messageApi, contextHolder] = message.useMessage()
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

  const handleDeleteOrg = () => {
    if (!selectedOrg) return

    Modal.confirm({
      title: '确认删除组织',
      content: `确定要删除组织 "${selectedOrg.display_name}" 吗？此操作不可撤销。`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await deleteOrganization(selectedOrg.id)
        } catch (err) {
          messageApi.error(err instanceof Error ? err.message : '删除失败')
        }
      },
    })
  }

  const handleAddMember = () => {
    setAddMemberDialogOpen(true)
  }

  const handleAssignPersonnel = async (personnelId: string) => {
    if (!selectedOrg) return
    await updatePersonnel(personnelId, { organizationId: selectedOrg.id })
    await refreshPersonnelInOrg()
  }

  const handleRemovePersonnel = (record: PersonnelRecord) => {
    Modal.confirm({
      title: '确认移除人员',
      content: `确定将「${record.fullName}」从本组织移除？`,
      okText: '移除',
      cancelText: '取消',
      onOk: async () => {
        try {
          await updatePersonnel(record.id, { organizationId: null })
          await refreshPersonnelInOrg()
        } catch (err) {
          messageApi.error(err instanceof Error ? err.message : '操作失败')
        }
      },
    })
  }

  const currentUserRole = userOrgInfo?.role || 'member'
  const isAdmin = currentUserRole === 'admin'

  if (!userId) {
    return (
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: 16 }}>
        {contextHolder}
        <Typography.Text type="secondary">请先登录</Typography.Text>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 1120, margin: '0 auto', padding: 16, height: 'calc(100vh - 4rem)' }}>
      {contextHolder}
      <div style={{ marginBottom: 16 }}>
        <Typography.Title level={2} style={{ marginBottom: 4 }}>
          组织架构与人员管理
        </Typography.Title>
        <Typography.Text type="secondary">管理团队组织结构和成员信息</Typography.Text>
      </div>

      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(300px,420px)_1fr] gap-4 h-[calc(100%-5rem)]">
        <Card title="组织树" styles={{ body: { height: '100%', overflowY: 'auto' } }}>
          {isLoading && !tree.length ? (
            <Spin tip="加载中..." />
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
        </Card>

        <Card styles={{ body: { height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' } }}>
          {selectedOrg ? (
            <div style={{ minHeight: 0, flex: 1, overflowY: 'auto' }}>
              <TeamMembersList
                personnelMembers={personnelInOrg}
                organizationName={selectedOrg.display_name}
                currentUserRole={currentUserRole}
                onAddMember={handleAddMember}
                onRemovePersonnel={currentUserRole === 'admin' ? handleRemovePersonnel : undefined}
              />
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <Empty description="请从左侧选择一个组织查看成员" />
            </div>
          )}
        </Card>
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
