/**
 * OrgTree - 组织架构树组件
 * @description 递归渲染组织层级树，支持节点展开/折叠和选中交互
 */
import { useState } from 'react'
import { ChevronRight, ChevronDown, FolderClosed, FolderOpen, Building2, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { OrganizationTreeNode } from '@/lib/supabase/organizationTypes'

interface OrgTreeProps {
  tree: OrganizationTreeNode[]
  selectedId: string | null
  onSelect: (node: OrganizationTreeNode) => void
  className?: string
}

interface OrgTreeNodeProps {
  node: OrganizationTreeNode
  level: number
  selectedId: string | null
  onSelect: (node: OrganizationTreeNode) => void
  expandedIds: Set<string>
  onToggleExpand: (id: string) => void
}

function OrgTreeNodeComponent({
  node,
  level,
  selectedId,
  onSelect,
  expandedIds,
  onToggleExpand,
}: OrgTreeNodeProps) {
  const isExpanded = expandedIds.has(node.id)
  const isSelected = selectedId === node.id
  const hasChildren = node.children && node.children.length > 0

  const handleSelect = () => {
    onSelect(node)
  }

  const treeItemDomId = `org-treeitem-${node.id}`

  const toggleExpandMouse = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (hasChildren) onToggleExpand(node.id)
  }

  const handleRowKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleSelect()
      return
    }
    if (hasChildren && e.key === 'ArrowRight' && !isExpanded) {
      e.preventDefault()
      onToggleExpand(node.id)
      return
    }
    if (hasChildren && e.key === 'ArrowLeft' && isExpanded) {
      e.preventDefault()
      onToggleExpand(node.id)
    }
  }

  const expandLabel = isExpanded
    ? `折叠「${node.display_name}」下的子组织`
    : `展开「${node.display_name}」下的子组织`

  return (
    <div>
      <div
        id={treeItemDomId}
        role="treeitem"
        aria-expanded={hasChildren ? isExpanded : undefined}
        tabIndex={0}
        className={cn(
          'flex items-center gap-1 py-2 px-2 cursor-pointer rounded-md hover:bg-accent transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
          isSelected && 'bg-accent font-medium',
          'group'
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={handleSelect}
        onKeyDown={handleRowKeyDown}
      >
        {hasChildren ? (
          <button
            type="button"
            tabIndex={-1}
            aria-expanded={isExpanded}
            aria-label={expandLabel}
            className={cn(
              'flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-md',
              'text-muted-foreground hover:bg-secondary hover:text-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
            )}
            onClick={toggleExpandMouse}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                e.stopPropagation()
                onToggleExpand(node.id)
              }
            }}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" aria-hidden />
            ) : (
              <ChevronRight className="h-4 w-4" aria-hidden />
            )}
          </button>
        ) : (
          <span className="inline-flex h-8 w-8 shrink-0" aria-hidden />
        )}

        <div className="flex-shrink-0">
          {hasChildren ? (
            isExpanded ? (
              <FolderOpen className="h-4 w-4 text-amber-600" />
            ) : (
              <FolderClosed className="h-4 w-4 text-amber-600" />
            )
          ) : (
            <Building2 className="h-4 w-4 text-primary" />
          )}
        </div>

        <span className="flex-1 text-sm truncate">{node.display_name}</span>

        {node.member_count !== undefined && node.member_count > 0 && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="h-3 w-3" />
            <span>{node.member_count}</span>
          </div>
        )}
      </div>

      {hasChildren && isExpanded && (
        <div role="group" aria-labelledby={treeItemDomId}>
          {node.children!.map((child) => (
            <OrgTreeNodeComponent
              key={child.id}
              node={child}
              level={level + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              expandedIds={expandedIds}
              onToggleExpand={onToggleExpand}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function OrgTree({ tree, selectedId, onSelect, className }: OrgTreeProps) {
  // 默认展开所有根节点
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    const rootIds = new Set<string>()
    tree.forEach((node) => {
      if (node.level === 0) {
        rootIds.add(node.id)
      }
    })
    return rootIds
  })

  const handleToggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  if (tree.length === 0) {
    return (
      <div className={cn('flex items-center justify-center py-8 text-muted-foreground', className)}>
        <p className="text-sm">暂无组织架构数据</p>
      </div>
    )
  }

  return (
    <div className={cn('py-2', className)} role="tree" aria-label="组织架构">
      {tree.map((node) => (
        <OrgTreeNodeComponent
          key={node.id}
          node={node}
          level={0}
          selectedId={selectedId}
          onSelect={onSelect}
          expandedIds={expandedIds}
          onToggleExpand={handleToggleExpand}
        />
      ))}
    </div>
  )
}
