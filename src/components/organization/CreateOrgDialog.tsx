/**
 * CreateOrgDialog - 创建组织对话框
 * @description 展示名、描述由用户填写；技术标识由系统生成（见 generateOrganizationSlug）
 */
import { useEffect, useState } from 'react'
import { Form, Input, Modal } from 'antd'
import { generateOrganizationSlug } from '@/lib/organizationSlug'
import type { Organization, CreateOrganizationInput } from '@/lib/supabase/organizationTypes'

/** child：在 parentOrg 下；sibling：与 referenceOrg 同级 */
export type CreateOrgIntent = 'child' | 'sibling'

interface CreateOrgDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  parentOrg: Organization | null
  referenceOrg?: Organization | null
  intent?: CreateOrgIntent
  onSubmit: (input: CreateOrganizationInput) => Promise<void>
}
interface CreateOrgFormValues {
  displayName: string
  description?: string
}

function createDescription(
  intent: CreateOrgIntent,
  parentOrg: Organization | null,
  referenceOrg: Organization | null
): string {
  if (intent === 'child' && parentOrg) return `在「${parentOrg.display_name}」下创建子组织`
  if (intent === 'sibling' && referenceOrg) {
    if (parentOrg) {
      return `创建与「${referenceOrg.display_name}」同级的组织（父级：${parentOrg.display_name}）`
    }
    return `创建与「${referenceOrg.display_name}」同级的组织（根层级）`
  }
  return '创建新组织'
}

function createTitle(intent: CreateOrgIntent): string {
  return intent === 'child' ? '创建子组织' : '创建同级组织'
}

export function CreateOrgDialog({
  open,
  onOpenChange,
  parentOrg,
  referenceOrg = null,
  intent = 'child',
  onSubmit,
}: CreateOrgDialogProps) {
  const [form] = Form.useForm<CreateOrgFormValues>()
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!open) {
      form.resetFields()
    }
  }, [open, form])

  const handleSubmit = async (values: CreateOrgFormValues) => {
    setIsSubmitting(true)
    try {
      const parentId =
        intent === 'sibling' ? (referenceOrg?.parent_id ?? null) : (parentOrg?.id ?? null)

      await onSubmit({
        name: generateOrganizationSlug(),
        display_name: values.displayName.trim(),
        parent_id: parentId,
        description: values.description?.trim() || null,
      })
      form.resetFields()
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to create organization:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      title={createTitle(intent)}
      open={open}
      onCancel={() => {
        onOpenChange(false)
      }}
      onOk={() => {
        void form.submit()
      }}
      okText={isSubmitting ? '创建中...' : '创建'}
      cancelText="取消"
      confirmLoading={isSubmitting}
      destroyOnHidden
    >
      <p style={{ marginBottom: 16, color: 'rgba(0, 0, 0, 0.45)' }}>
        {createDescription(intent, parentOrg, referenceOrg)}
      </p>
      <Form<CreateOrgFormValues> form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item
          name="displayName"
          label="显示名称 *"
          rules={[
            { required: true, whitespace: true, message: '请输入显示名称' },
            { max: 50, message: '显示名称不能超过 50 个字符' },
          ]}
        >
          <Input id="displayName" placeholder="例如：北方大区" />
        </Form.Item>

        <Form.Item
          name="description"
          label="描述（可选）"
          rules={[{ max: 200, message: '描述不能超过 200 个字符' }]}
        >
          <Input.TextArea id="description" placeholder="组织简介…" rows={3} />
        </Form.Item>
      </Form>
    </Modal>
  )
}
