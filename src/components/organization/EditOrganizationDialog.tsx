/**
 * EditOrganizationDialog - 编辑组织（展示名、描述；技术标识不暴露）
 */
import { useEffect, useState } from 'react'
import { Form, Input, Modal, Typography } from 'antd'
import type { Organization, UpdateOrganizationInput } from '@/lib/supabase/organizationTypes'

interface EditOrganizationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  organization: Organization | null
  onSubmit: (input: UpdateOrganizationInput) => Promise<void>
}

export function EditOrganizationDialog({
  open,
  onOpenChange,
  organization,
  onSubmit,
}: EditOrganizationDialogProps) {
  const [form] = Form.useForm()
  const [displayName, setDisplayName] = useState('')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open && organization) {
      setDisplayName(organization.display_name)
      setDescription(organization.description ?? '')
      setError(null)
      form.setFieldsValue({
        displayName: organization.display_name,
        description: organization.description ?? '',
      })
    }
  }, [open, organization, form])

  const handleSubmit = async () => {
    if (!organization || !displayName.trim()) return

    setIsSubmitting(true)
    setError(null)
    try {
      await onSubmit({
        display_name: displayName.trim(),
        description: description.trim() || null,
      })
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      title="编辑组织"
      open={open}
      onCancel={() => onOpenChange(false)}
      onOk={() => {
        void handleSubmit()
      }}
      okText={isSubmitting ? '保存中…' : '保存'}
      cancelText="取消"
      confirmLoading={isSubmitting}
      okButtonProps={{ disabled: !displayName.trim() }}
      destroyOnHidden
    >
      <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
        {organization ? `修改「${organization.display_name}」` : ''}
      </Typography.Paragraph>
      <Form form={form} layout="vertical" onFinish={() => void handleSubmit()}>
        <Form.Item label="显示名称 *" required>
          <Input
            id="edit-org-display"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
          />
        </Form.Item>

        <Form.Item label="描述（可选）">
          <Input.TextArea
            id="edit-org-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </Form.Item>
      </Form>
      {error && <Typography.Text type="danger">{error}</Typography.Text>}
    </Modal>
  )
}
