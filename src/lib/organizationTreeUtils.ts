import type { Organization, OrganizationTreeNode } from '@/lib/supabase/organizationTypes'

/**
 * 将扁平 Organization 列表转为树（与 organizationService 内 buildTree 规则一致，用于人员管理等仅展示层级）
 */
export function buildOrganizationTreeFromFlat(organizations: Organization[]): OrganizationTreeNode[] {
  const orgMap = new Map<string, OrganizationTreeNode>()
  const rootNodes: OrganizationTreeNode[] = []

  organizations.forEach((org) => {
    const node: OrganizationTreeNode = {
      ...org,
      children: [],
      member_count: 0,
    }
    orgMap.set(org.id, node)
  })

  organizations.forEach((org) => {
    const node = orgMap.get(org.id)!
    if (org.parent_id && orgMap.has(org.parent_id)) {
      const parent = orgMap.get(org.parent_id)!
      if (!parent.children) parent.children = []
      parent.children.push(node)
    } else {
      rootNodes.push(node)
    }
  })

  return rootNodes
}

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
