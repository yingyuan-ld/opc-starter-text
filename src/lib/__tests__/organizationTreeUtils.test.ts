import { describe, expect, it } from 'vitest'
import { findOrgNodeById } from '@/lib/organizationTreeUtils'
import type { OrganizationTreeNode } from '@/lib/supabase/organizationTypes'

function node(
  id: string,
  parent_id: string | null,
  display_name: string,
  children?: OrganizationTreeNode[]
): OrganizationTreeNode {
  return {
    id,
    name: id,
    display_name,
    parent_id,
    path: id,
    level: 0,
    description: null,
    created_at: '',
    updated_at: '',
    children,
  }
}

describe('findOrgNodeById', () => {
  it('finds nested node', () => {
    const child = node('c', 'p', 'Child')
    const tree: OrganizationTreeNode[] = [node('p', null, 'Parent', [child])]
    expect(findOrgNodeById(tree, 'c')).toEqual(child)
  })

  it('returns null when missing', () => {
    const tree: OrganizationTreeNode[] = [node('p', null, 'Parent')]
    expect(findOrgNodeById(tree, 'x')).toBeNull()
  })
})
