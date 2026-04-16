/**
 * TeamMembersList - 组织参与人员（人员管理档案）
 * @description 成员以 personnel_records.organization_id 为准，与全系统业务参与人一致
 */
import { UserMinus, UserPlus } from 'lucide-react'
import { Button, Empty, List, Space, Tooltip, Typography } from 'antd'
import type { PersonnelRecord } from '@/types/personnel'

interface TeamMembersListProps {
  personnelMembers: PersonnelRecord[]
  organizationName: string
  currentUserRole: 'admin' | 'manager' | 'member'
  onAddMember?: () => void
  onRemovePersonnel?: (record: PersonnelRecord) => void
  className?: string
}

export function TeamMembersList({
  personnelMembers,
  organizationName,
  currentUserRole,
  onAddMember,
  onRemovePersonnel,
  className,
}: TeamMembersListProps) {
  const canManageMembers = currentUserRole === 'admin'
  const activePersonnel = personnelMembers.filter((p) => p.isActive)

  return (
    <div className={className} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <Typography.Title level={4} style={{ margin: 0 }}>
            {organizationName}
          </Typography.Title>
          <Typography.Text type="secondary">
            参与人员 {activePersonnel.length} 人（来自人员管理）
          </Typography.Text>
        </div>
        {canManageMembers && onAddMember && (
          <Button type="primary" onClick={onAddMember} icon={<UserPlus size={16} />}>
            添加人员
          </Button>
        )}
      </div>

      {activePersonnel.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Empty description="暂无参与人员，请从人员管理添加档案并关联到本组织。" />
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <List
            dataSource={activePersonnel}
            split
            renderItem={(p) => (
              <List.Item
                key={p.id}
                actions={
                  canManageMembers && onRemovePersonnel
                    ? [
                        <Tooltip key="remove" title="从本组织移除（不删除人员主数据）">
                          <Button
                            danger
                            type="text"
                            icon={<UserMinus size={16} />}
                            onClick={() => onRemovePersonnel(p)}
                          />
                        </Tooltip>,
                      ]
                    : undefined
                }
              >
                <Space direction="horizontal" size={12} style={{ width: '100%', justifyContent: 'space-between' }}>
                  <Typography.Text strong ellipsis style={{ maxWidth: 240 }}>
                    {p.fullName}
                  </Typography.Text>
                  <Typography.Text type="secondary">{p.phone || '—'}</Typography.Text>
                </Space>
              </List.Item>
            )}
          />
        </div>
      )}
    </div>
  )
}
