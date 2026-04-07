/**
 * CreateOrgDialog - 创建组织/团队对话框
 * @description 提供表单创建新组织或子团队，支持设置名称和显示名称
 */
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { Organization, CreateOrganizationInput } from '@/lib/supabase/organizationTypes'

/** root：无父级；child：在 parentOrg 下；sibling：与 referenceOrg 同级（父级为 parentOrg，根级时 parentOrg 为 null） */
export type CreateOrgIntent = 'root' | 'child' | 'sibling'

interface CreateOrgDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  parentOrg: Organization | null
  /** 创建同级时的参考节点（用于文案） */
  referenceOrg?: Organization | null
  intent?: CreateOrgIntent
  onSubmit: (input: CreateOrganizationInput) => Promise<void>
}

function createDescription(
  intent: CreateOrgIntent,
  parentOrg: Organization | null,
  referenceOrg: Organization | null
): string {
  if (intent === 'root') return '在根层级创建新组织（与系统根同级）'
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
  if (intent === 'root') return '创建根组织'
  if (intent === 'child') return '创建子组织'
  return '创建同级组织'
}

export function CreateOrgDialog({
  open,
  onOpenChange,
  parentOrg,
  referenceOrg = null,
  intent = 'root',
  onSubmit,
}: CreateOrgDialogProps) {
  const [name, setName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !displayName.trim()) return

    setIsSubmitting(true)
    try {
      const parentId =
        intent === 'sibling'
          ? (referenceOrg?.parent_id ?? null)
          : intent === 'child'
            ? (parentOrg?.id ?? null)
            : null

      await onSubmit({
        name: name.trim(),
        display_name: displayName.trim(),
        parent_id: parentId,
        description: description.trim() || null,
      })
      setName('')
      setDisplayName('')
      setDescription('')
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to create organization:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{createTitle(intent)}</DialogTitle>
            <DialogDescription>
              {createDescription(intent, parentOrg, referenceOrg)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">组织标识 *</Label>
              <Input
                id="name"
                placeholder="例如: mysql-team (用于路径，仅英文、数字、横线)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                pattern="[a-z0-9-]+"
              />
              <p className="text-xs text-muted-foreground">仅支持小写字母、数字和横线</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayName">显示名称 *</Label>
              <Input
                id="displayName"
                placeholder="例如: MySQL 团队"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">描述（可选）</Label>
              <Textarea
                id="description"
                placeholder="组织简介..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              取消
            </Button>
            <Button type="submit" disabled={isSubmitting || !name.trim() || !displayName.trim()}>
              {isSubmitting ? '创建中...' : '创建'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
