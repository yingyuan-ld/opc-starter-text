/**
 * EditOrganizationDialog - 编辑组织（展示名、描述；技术标识不暴露）
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
  const [displayName, setDisplayName] = useState('')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open && organization) {
      setDisplayName(organization.display_name)
      setDescription(organization.description ?? '')
      setError(null)
    }
  }, [open, organization])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
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
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              取消
            </Button>
            <Button type="submit" disabled={isSubmitting || !displayName.trim()}>
              {isSubmitting ? '保存中…' : '保存'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
