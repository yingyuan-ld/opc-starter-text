/**
 * OrgTree - 组织架构树组件
 * @description 递归渲染组织层级树；管理员在选中行右侧展示编辑/新增/删除
 */
import { useState } from 'react'
import {
  ChevronRight,
  ChevronDown,
  Users,
  Pencil,
  GitBranch,
  Plus,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { OrganizationTreeNode } from '@/lib/supabase/organizationTypes'

export interface OrgTreeProps {
  tree: OrganizationTreeNode[]
  selectedId: string | null
  onSelect: (node: OrganizationTreeNode) => void
  /** 与 constants 中系统根 id 一致，用于禁用根级「同级/删除」 */
  systemRootId: string
  isAdmin?: boolean
  onEditNode?: () => void
  onAddSibling?: () => void
  onAddChild?: () => void
  onDeleteNode?: () => void
  className?: string
}

interface OrgTreeNodeProps {
  node: OrganizationTreeNode
  level: number
  selectedId: string | null
  onSelect: (node: OrganizationTreeNode) => void
  expandedIds: Set<string>
  onToggleExpand: (id: string) => void
  systemRootId: string
  isAdmin?: boolean
  onEditNode?: () => void
  onAddSibling?: () => void
  onAddChild?: () => void
  onDeleteNode?: () => void
}

function OrgTreeNodeComponent({
  node,
  level,
  selectedId,
  onSelect,
  expandedIds,
  onToggleExpand,
  systemRootId,
  isAdmin,
  onEditNode,
  onAddSibling,
  onAddChild,
  onDeleteNode,
}: OrgTreeNodeProps) {
  const isExpanded = expandedIds.has(node.id)
  const isSelected = selectedId === node.id
  const hasChildren = node.children && node.children.length > 0
  const isSystemRoot = node.is_system_root === true || node.id === systemRootId
  const showActions = Boolean(
    isAdmin && isSelected && (onEditNode || onAddSibling || onAddChild || onDeleteNode)
  )

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

  const stopRowActivate = (e: React.MouseEvent) => {
    e.stopPropagation()
  }

  return (
    <div>
      <div
        id={treeItemDomId}
        role="treeitem"
        aria-expanded={hasChildren ? isExpanded : undefined}
        tabIndex={0}
        className={cn(
          'flex items-center gap-1 py-2 px-2 cursor-pointer rounded-md hover:bg-accent transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring min-w-0',
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

        <span className="min-w-0 flex-1 text-sm truncate">{node.display_name}</span>

        {node.member_count !== undefined && node.member_count > 0 && (
          <div className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
            <Users className="h-3 w-3" />
            <span>{node.member_count}</span>
          </div>
        )}

        {showActions && (
          <div
            className="flex shrink-0 items-center gap-0.5 border-l border-border/60 pl-1 ml-0.5"
            onClick={stopRowActivate}
            onKeyDown={(e) => e.stopPropagation()}
            role="toolbar"
            aria-label={`「${node.display_name}」操作`}
          >
            {onEditNode && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                aria-label="编辑名称"
                onClick={(e) => {
                  e.stopPropagation()
                  onEditNode()
                }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            {!isSystemRoot && onAddSibling && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                aria-label="新增同级"
                title="新增同级"
                onClick={(e) => {
                  e.stopPropagation()
                  onAddSibling()
                }}
              >
                <GitBranch className="h-4 w-4" />
              </Button>
            )}
            {onAddChild && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                aria-label="新增子节点"
                title="新增子节点"
                onClick={(e) => {
                  e.stopPropagation()
                  onAddChild()
                }}
              >
                <Plus className="h-4 w-4" />
              </Button>
            )}
            {!isSystemRoot && onDeleteNode && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                aria-label="删除组织"
                title="删除组织"
                onClick={(e) => {
                  e.stopPropagation()
                  onDeleteNode()
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
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
              systemRootId={systemRootId}
              isAdmin={isAdmin}
              onEditNode={onEditNode}
              onAddSibling={onAddSibling}
              onAddChild={onAddChild}
              onDeleteNode={onDeleteNode}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function OrgTree({
  tree,
  selectedId,
  onSelect,
  systemRootId,
  isAdmin,
  onEditNode,
  onAddSibling,
  onAddChild,
  onDeleteNode,
  className,
}: OrgTreeProps) {
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
          systemRootId={systemRootId}
          isAdmin={isAdmin}
          onEditNode={onEditNode}
          onAddSibling={onAddSibling}
          onAddChild={onAddChild}
          onDeleteNode={onDeleteNode}
        />
      ))}
    </div>
  )
}
