import type { OrganizationTreeNode } from '@/lib/supabase/organizationTypes'

/** 在组织树中按 id 查找节点（深度优先） */
export function findOrgNodeById(
  nodes: OrganizationTreeNode[],
  id: string
): OrganizationTreeNode | null {
  for (const n of nodes) {
    if (n.id === id) return n
    if (n.children?.length) {
      const found = findOrgNodeById(n.children, id)
      if (found) return found
    }
  }
  return null
}
