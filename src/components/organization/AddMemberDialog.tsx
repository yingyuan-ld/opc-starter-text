/**
 * AddMemberDialog - 从人员管理档案关联到当前组织
 * @description 参与人员以 personnel_records 为准，不通过登录账号搜索入组
 */
import { useState, useEffect } from 'react'
import { FileUser } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
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
      alert(error instanceof Error ? error.message : '关联失败')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>添加人员到 {organizationName}</DialogTitle>
          <DialogDescription>
            从人员管理中选择档案关联到本组织；人员即业务参与人，与列表「所属组织」一致。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {personnelLoading && <p className="text-sm text-muted-foreground">加载人员档案…</p>}
          {!personnelLoading && personnelOptions.length === 0 && (
            <p className="text-sm text-muted-foreground">
              暂无可关联的档案（请在人员管理中新建，或已全部在本组织）。
            </p>
          )}
          {!personnelLoading && personnelOptions.length > 0 && (
            <div className="space-y-2 max-h-[320px] overflow-y-auto border rounded-lg p-2">
              {personnelOptions.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => setSelectedPersonnel(row)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                    selectedPersonnel?.id === row.id
                      ? 'border-primary bg-accent'
                      : 'border-border hover:bg-accent/50'
                  }`}
                >
                  <FileUser className="h-8 w-8 shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{row.fullName}</p>
                    <p className="text-sm text-muted-foreground truncate">{row.phone || '—'}</p>
                  </div>
                  {row.organizationId && row.organizationDisplayName && (
                    <Badge variant="secondary" className="text-xs shrink-0">
                      原：{row.organizationDisplayName}
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          )}

          {selectedPersonnel && (
            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              <p className="font-medium">将「{selectedPersonnel.fullName}」关联到本组织</p>
              <p className="text-muted-foreground mt-1">人员管理中的「所属组织」将同步更新。</p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            取消
          </Button>
          <Button type="button" onClick={() => void handleAssign()} disabled={!selectedPersonnel || isSubmitting}>
            {isSubmitting ? '关联中…' : '关联到本组织'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
