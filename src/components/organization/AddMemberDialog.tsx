/**
 * AddMemberDialog - 从人员管理档案关联到当前组织
 * @description 参与人员以 personnel_records 为准，不通过登录账号搜索入组
 */
import { useState, useEffect } from 'react'
import { FileUser } from 'lucide-react'
import { Avatar, Button, Empty, List, Modal, Space, Tag, Typography, message } from 'antd'
import type { PersonnelRecord } from '@/types/personnel'

interface AddMemberDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  organizationName: string
  listAssignablePersonnel: () => Promise<PersonnelRecord[]>
  onAssignPersonnel: (personnelId: string) => Promise<void>
}

export function AddMemberDialog({
  open,
  onOpenChange,
  organizationName,
  listAssignablePersonnel,
  onAssignPersonnel,
}: AddMemberDialogProps) {
  const [messageApi, contextHolder] = message.useMessage()
  const [personnelOptions, setPersonnelOptions] = useState<PersonnelRecord[]>([])
  const [selectedPersonnel, setSelectedPersonnel] = useState<PersonnelRecord | null>(null)
  const [personnelLoading, setPersonnelLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!open) {
      setPersonnelOptions([])
      setSelectedPersonnel(null)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setPersonnelLoading(true)
    listAssignablePersonnel()
      .then((list) => {
        if (!cancelled) setPersonnelOptions(list)
      })
      .catch(() => {
        if (!cancelled) setPersonnelOptions([])
      })
      .finally(() => {
        if (!cancelled) setPersonnelLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, listAssignablePersonnel])

  const handleAssign = async () => {
    if (!selectedPersonnel) return
    setIsSubmitting(true)
    try {
      await onAssignPersonnel(selectedPersonnel.id)
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to assign personnel:', error)
      messageApi.error(error instanceof Error ? error.message : '关联失败')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      {contextHolder}
      <Modal
        title={`添加人员到 ${organizationName}`}
        open={open}
        onCancel={() => onOpenChange(false)}
        onOk={() => {
          void handleAssign()
        }}
        okText={isSubmitting ? '关联中…' : '关联到本组织'}
        cancelText="取消"
        confirmLoading={isSubmitting}
        okButtonProps={{ disabled: !selectedPersonnel || isSubmitting }}
        destroyOnHidden
      >
        <Typography.Paragraph type="secondary">
          从人员管理中选择档案关联到本组织；人员即业务参与人，与列表「所属组织」一致。
        </Typography.Paragraph>
        <div style={{ minHeight: 220 }}>
          {personnelLoading && <Typography.Text type="secondary">加载人员档案…</Typography.Text>}
          {!personnelLoading && personnelOptions.length === 0 && (
            <Empty description="暂无可关联的档案（请在人员管理中新建，或已全部在本组织）。" />
          )}
          {!personnelLoading && personnelOptions.length > 0 && (
            <List
              size="small"
              style={{ maxHeight: 320, overflowY: 'auto' }}
              bordered
              dataSource={personnelOptions}
              renderItem={(row) => (
                <List.Item
                  key={row.id}
                  style={{
                    cursor: 'pointer',
                    backgroundColor: selectedPersonnel?.id === row.id ? '#e6f4ff' : undefined,
                  }}
                  onClick={() => setSelectedPersonnel(row)}
                >
                  <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                    <Space>
                      <Avatar icon={<FileUser size={14} />} />
                      <div>
                        <Typography.Text strong>{row.fullName}</Typography.Text>
                        <br />
                        <Typography.Text type="secondary">{row.phone || '—'}</Typography.Text>
                      </div>
                    </Space>
                    {row.organizationId && row.organizationDisplayName && (
                      <Tag>原：{row.organizationDisplayName}</Tag>
                    )}
                  </Space>
                </List.Item>
              )}
            />
          )}
        </div>

        {selectedPersonnel && (
          <div
            style={{
              marginTop: 12,
              padding: 12,
              borderRadius: 8,
              border: '1px solid #d9d9d9',
              background: '#fafafa',
            }}
          >
            <Typography.Text strong>将「{selectedPersonnel.fullName}」关联到本组织</Typography.Text>
            <br />
            <Typography.Text type="secondary">人员管理中的「所属组织」将同步更新。</Typography.Text>
          </div>
        )}
      </Modal>
    </>
  )
}
