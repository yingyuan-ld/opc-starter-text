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
interface EditOrgFormValues {
  displayName: string
  description?: string
}

export function EditOrganizationDialog({
  open,
  onOpenChange,
  organization,
  onSubmit,
}: EditOrganizationDialogProps) {
  const [form] = Form.useForm<EditOrgFormValues>()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open && organization) {
      setError(null)
      form.setFieldsValue({
        displayName: organization.display_name,
        description: organization.description ?? '',
      })
    }
    if (!open) {
      form.resetFields()
      setError(null)
    }
  }, [open, organization, form])

  const handleSubmit = async (values: EditOrgFormValues) => {
    if (!organization) return
    setIsSubmitting(true)
    setError(null)
    try {
      await onSubmit({
        display_name: values.displayName.trim(),
        description: values.description?.trim() || null,
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
        void form.submit()
      }}
      okText={isSubmitting ? '保存中…' : '保存'}
      cancelText="取消"
      confirmLoading={isSubmitting}
      destroyOnHidden
    >
      <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
        {organization ? `修改「${organization.display_name}」` : ''}
      </Typography.Paragraph>
      <Form<EditOrgFormValues> form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item
          name="displayName"
          label="显示名称 *"
          rules={[
            { required: true, whitespace: true, message: '请输入显示名称' },
            { max: 50, message: '显示名称不能超过 50 个字符' },
          ]}
        >
          <Input id="edit-org-display" />
        </Form.Item>

        <Form.Item
          name="description"
          label="描述（可选）"
          rules={[{ max: 200, message: '描述不能超过 200 个字符' }]}
        >
          <Input.TextArea id="edit-org-desc" rows={3} />
        </Form.Item>
      </Form>
      {error && <Typography.Text type="danger">{error}</Typography.Text>}
    </Modal>
  )
}
