/**
 * 当前选中组织在右侧面板上的结构编辑入口（MSW / 本地联调）
 */
import { GitBranch, Pencil, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Organization } from '@/lib/supabase/organizationTypes'

export interface OrganizationNodeToolbarProps {
  organization: Organization
  isAdmin: boolean
  onEditName: () => void
  onAddSibling: () => void
  onAddChild: () => void
}

export function OrganizationNodeToolbar({
  organization,
  isAdmin,
  onEditName,
  onAddSibling,
  onAddChild,
}: OrganizationNodeToolbarProps) {
  if (!isAdmin) return null

  return (
    <div className="rounded-lg border bg-muted/30 p-4 mb-4 space-y-3">
      <div className="flex flex-col gap-0.5">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          当前组织
        </p>
        <p className="text-base font-semibold truncate" title={organization.display_name}>
          {organization.display_name}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={onEditName}>
          <Pencil className="h-4 w-4 mr-1.5" />
          编辑名称
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onAddSibling}>
          <GitBranch className="h-4 w-4 mr-1.5" />
          新增同级
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onAddChild}>
          <Plus className="h-4 w-4 mr-1.5" />
          新增子节点
        </Button>
      </div>
    </div>
  )
}
