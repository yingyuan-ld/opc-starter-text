/**
 * CreateOrgDialog - 创建组织对话框
 * @description 展示名、描述由用户填写；技术标识由系统生成（见 generateOrganizationSlug）
 */
import { useState } from 'react'
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
  const [form] = Form.useForm()
  const [displayName, setDisplayName] = useState('')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!displayName.trim()) return

    setIsSubmitting(true)
    try {
      const parentId =
        intent === 'sibling' ? (referenceOrg?.parent_id ?? null) : (parentOrg?.id ?? null)

      await onSubmit({
        name: generateOrganizationSlug(),
        display_name: displayName.trim(),
        parent_id: parentId,
        description: description.trim() || null,
      })
      setDisplayName('')
      setDescription('')
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
      onCancel={() => onOpenChange(false)}
      onOk={() => {
        void handleSubmit()
      }}
      okText={isSubmitting ? '创建中...' : '创建'}
      cancelText="取消"
      confirmLoading={isSubmitting}
      okButtonProps={{ disabled: !displayName.trim() }}
      destroyOnHidden
    >
      <p style={{ marginBottom: 16, color: 'rgba(0, 0, 0, 0.45)' }}>
        {createDescription(intent, parentOrg, referenceOrg)}
      </p>
      <Form form={form} layout="vertical" onFinish={() => void handleSubmit()}>
        <Form.Item label="显示名称 *" required>
          <Input
            id="displayName"
            placeholder="例如：北方大区"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
          />
        </Form.Item>

        <Form.Item label="描述（可选）">
          <Input.TextArea
            id="description"
            placeholder="组织简介…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}
