/**
 * EditOrganizationDialog - 编辑组织信息（展示名、标识、描述）
 */
import { useEffect, useState } from 'react'
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
  const [name, setName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open && organization) {
      setName(organization.name)
      setDisplayName(organization.display_name)
      setDescription(organization.description ?? '')
      setError(null)
    }
  }, [open, organization])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!organization || !name.trim() || !displayName.trim()) return

    setIsSubmitting(true)
    setError(null)
    try {
      await onSubmit({
        name: name.trim(),
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined}>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>编辑组织</DialogTitle>
            <DialogDescription>
              {organization ? `修改「${organization.display_name}」` : ''}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-org-name">组织标识 *</Label>
              <Input
                id="edit-org-name"
                placeholder="小写字母、数字、横线"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                pattern="[a-z0-9-]+"
              />
              <p className="text-xs text-muted-foreground">修改标识可能影响路径，请谨慎操作</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-org-display">显示名称 *</Label>
              <Input
                id="edit-org-display"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-org-desc">描述（可选）</Label>
              <Textarea
                id="edit-org-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              取消
            </Button>
            <Button type="submit" disabled={isSubmitting || !name.trim() || !displayName.trim()}>
              {isSubmitting ? '保存中…' : '保存'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
