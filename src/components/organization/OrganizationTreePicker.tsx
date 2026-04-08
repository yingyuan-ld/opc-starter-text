/**
 * OrganizationTreePicker — 人员管理等场景：按真实层级选择组织（替代扁平下拉）
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { buildOrganizationTreeFromFlat } from '@/lib/organizationTreeUtils'
import type { Organization, OrganizationTreeNode } from '@/lib/supabase/organizationTypes'

const SEARCH_ALL = ''
const SEARCH_UNASSIGNED = '__unassigned__'

export type OrganizationTreePickerMode = 'search' | 'form'

interface OrganizationTreePickerProps {
  mode: OrganizationTreePickerMode
  /** search: '' | __unassigned__ | orgId；form: '' | orgId */
  value: string
  onValueChange: (next: string) => void
  organizations: Organization[]
  disabled?: boolean
  /** search：弹出面板；form：对话框内用内联树，避免与 Dialog 层级冲突 */
  variant: 'popover' | 'inline'
  id?: string
  className?: string
}

function collectExpandableIds(nodes: OrganizationTreeNode[]): Set<string> {
  const s = new Set<string>()
  const walk = (list: OrganizationTreeNode[]) => {
    for (const n of list) {
      if (n.children?.length) {
        s.add(n.id)
        walk(n.children)
      }
    }
  }
  walk(nodes)
  return s
}

function PickerTreeRow({
  node,
  level,
  expandedIds,
  onToggleExpand,
  selectedId,
  onSelectOrg,
}: {
  node: OrganizationTreeNode
  level: number
  expandedIds: Set<string>
  onToggleExpand: (id: string) => void
  selectedId: string | null
  onSelectOrg: (id: string) => void
}) {
  const hasChildren = Boolean(node.children?.length)
  const expanded = expandedIds.has(node.id)
  const isSelected = selectedId === node.id

  return (
    <div>
      <div
        role="treeitem"
        aria-expanded={hasChildren ? expanded : undefined}
        tabIndex={0}
        className={cn(
          'flex items-center gap-1 rounded-md py-1.5 pr-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer min-w-0',
          isSelected ? 'bg-accent font-medium' : 'hover:bg-muted/60'
        )}
        style={{ paddingLeft: 8 + level * 14 }}
        onClick={() => onSelectOrg(node.id)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onSelectOrg(node.id)
          }
        }}
      >
        <span
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-sm"
          onClick={(e) => {
            e.stopPropagation()
            if (hasChildren) onToggleExpand(node.id)
          }}
        >
          {hasChildren ? (
            expanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
            )
          ) : (
            <span className="inline-block w-4" />
          )}
        </span>
        <span className="truncate">{node.display_name}</span>
      </div>
      {hasChildren && expanded && (
        <div role="group">
          {node.children!.map((ch) => (
            <PickerTreeRow
              key={ch.id}
              node={ch}
              level={level + 1}
              expandedIds={expandedIds}
              onToggleExpand={onToggleExpand}
              selectedId={selectedId}
              onSelectOrg={onSelectOrg}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function PickerPanel({
  mode,
  value,
  tree,
  onPick,
}: {
  mode: OrganizationTreePickerMode
  value: string
  tree: OrganizationTreeNode[]
  onPick: (next: string) => void
}) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => collectExpandableIds(tree))

  useEffect(() => {
    setExpandedIds(collectExpandableIds(tree))
  }, [tree])

  const toggle = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const selectedOrgId =
    value === SEARCH_ALL || value === SEARCH_UNASSIGNED || value === '' ? null : value

  return (
    <div className="py-1" role="tree">
      {mode === 'search' && (
        <>
          <button
            type="button"
            className={cn(
              'w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted/60',
              value === SEARCH_ALL && 'bg-accent font-medium'
            )}
            onClick={() => onPick(SEARCH_ALL)}
          >
            全部
          </button>
          <button
            type="button"
            className={cn(
              'w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted/60',
              value === SEARCH_UNASSIGNED && 'bg-accent font-medium'
            )}
            onClick={() => onPick(SEARCH_UNASSIGNED)}
          >
            未关联组织
          </button>
          <div className="my-1 h-px bg-border" />
        </>
      )}
      {mode === 'form' && (
        <>
          <button
            type="button"
            className={cn(
              'w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted/60',
              value === '' && 'bg-accent font-medium'
            )}
            onClick={() => onPick('')}
          >
            不关联组织
          </button>
          <div className="my-1 h-px bg-border" />
        </>
      )}
      {tree.length === 0 ? (
        <p className="px-3 py-2 text-sm text-muted-foreground">暂无可选组织</p>
      ) : (
        tree.map((n) => (
          <PickerTreeRow
            key={n.id}
            node={n}
            level={0}
            expandedIds={expandedIds}
            onToggleExpand={toggle}
            selectedId={selectedOrgId}
            onSelectOrg={(id) => onPick(id)}
          />
        ))
      )}
    </div>
  )
}

export function OrganizationTreePicker({
  mode,
  value,
  onValueChange,
  organizations,
  disabled,
  variant,
  id,
  className,
}: OrganizationTreePickerProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const tree = useMemo(() => buildOrganizationTreeFromFlat(organizations), [organizations])

  const label = useMemo(() => {
    if (mode === 'search') {
      if (value === SEARCH_ALL) return '全部'
      if (value === SEARCH_UNASSIGNED) return '未关联组织'
      const o = organizations.find((x) => x.id === value)
      return o?.display_name ?? '选择组织…'
    }
    if (value === '') return '不关联组织'
    const o = organizations.find((x) => x.id === value)
    return o?.display_name ?? '选择组织…'
  }, [mode, value, organizations])

  useEffect(() => {
    if (!open || variant !== 'popover') return
    const onDoc = (e: MouseEvent) => {
      const el = containerRef.current
      if (el && !el.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open, variant])

  const handlePick = (next: string) => {
    onValueChange(next)
    if (variant === 'popover') setOpen(false)
  }

  const panel = (
    <PickerPanel mode={mode} value={value} tree={tree} onPick={handlePick} />
  )

  if (variant === 'inline') {
    return (
      <div id={id} className={cn('space-y-2', className)}>
        <div
          className="max-h-56 overflow-y-auto rounded-md border border-input bg-background px-1 py-1 text-sm shadow-sm"
          role="group"
          aria-label={mode === 'form' ? '选择所属组织' : '选择组织'}
        >
          {panel}
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <Button
        id={id}
        type="button"
        variant="outline"
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="tree"
        className="h-10 w-full justify-between font-normal"
        onClick={() => !disabled && setOpen((o) => !o)}
      >
        <span className="truncate text-left">{label}</span>
        <ChevronDown className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
      </Button>
      {open && (
        <div
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-y-auto rounded-md border border-border bg-background p-1 text-foreground shadow-md"
          role="presentation"
        >
          {panel}
        </div>
      )}
    </div>
  )
}
