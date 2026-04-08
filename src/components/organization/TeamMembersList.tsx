/**
 * TeamMembersList - 组织参与人员（人员管理档案）
 * @description 成员以 personnel_records.organization_id 为准，与全系统业务参与人一致
 */
import { UserMinus, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
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
    <div className={cn('flex flex-col h-full', className)}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold">{organizationName}</h2>
          <p className="text-sm text-muted-foreground">参与人员 {activePersonnel.length} 人（来自人员管理）</p>
        </div>
        {canManageMembers && onAddMember && (
          <Button onClick={onAddMember} size="sm">
            <UserPlus className="h-4 w-4 mr-2" />
            添加人员
          </Button>
        )}
      </div>

      {activePersonnel.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <p className="text-sm">暂无参与人员，请从人员管理添加档案并关联到本组织。</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-2">
            {activePersonnel.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <p className="font-medium truncate">{p.fullName}</p>
                    <span className="text-sm text-muted-foreground tabular-nums shrink-0">
                      {p.phone || '—'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {canManageMembers && onRemovePersonnel && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemovePersonnel(p)}
                      title="从本组织移除（不删除人员主数据）"
                    >
                      <UserMinus className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
