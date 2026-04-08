/**
 * 人员管理 API — 经 Supabase REST，与 profiles / DataService 人员缓存解耦
 */

import { supabase } from '@/lib/supabase/client'
import { authService } from '@/lib/supabase/auth'
import { normalizePhoneForStorage, validateOptionalMainlandMobile } from '@/utils/phoneValidation'
import type {
  PersonnelCreateInput,
  PersonnelGender,
  PersonnelRecord,
  PersonnelUpdateInput,
} from '@/types/personnel'

interface PersonnelRow {
  id: string
  owner_id: string
  full_name: string
  gender: string
  phone: string | null
  address: string | null
  remark: string | null
  is_active?: boolean | null
  organization_id?: string | null
  created_at: string
  updated_at: string
}

function toGender(value: string): PersonnelGender {
  if (value === 'male' || value === 'female' || value === 'prefer_not_say' || value === 'unknown') {
    return value
  }
  return 'unknown'
}

function mapRow(row: PersonnelRow): PersonnelRecord {
  return {
    id: row.id,
    ownerId: row.owner_id,
    fullName: row.full_name,
    gender: toGender(row.gender),
    phone: row.phone ?? '',
    address: row.address ?? '',
    remark: row.remark,
    isActive: row.is_active !== false,
    organizationId: row.organization_id ?? null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}

async function enrichOrganizationDisplayNames(rows: PersonnelRecord[]): Promise<PersonnelRecord[]> {
  const ids = [...new Set(rows.map((r) => r.organizationId).filter((x): x is string => Boolean(x)))]
  if (ids.length === 0) return rows

  const { data, error } = await supabase
    .from('organizations')
    .select('id, display_name')
    .in('id', ids)

  if (error || !data?.length) return rows

  const nameById = new Map(data.map((o) => [o.id as string, o.display_name as string]))
  return rows.map((r) =>
    r.organizationId
      ? {
          ...r,
          organizationDisplayName: nameById.get(r.organizationId) ?? null,
        }
      : r
  )
}

export async function listMyPersonnel(): Promise<PersonnelRecord[]> {
  const user = await authService.getCurrentUser()
  if (!user) throw new Error('未登录')

  const { data, error } = await supabase
    .from('personnel_records')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message || '加载人员列表失败')
  const mapped = (data ?? []).map((row) => mapRow(row as PersonnelRow))
  return enrichOrganizationDisplayNames(mapped)
}

export async function createPersonnel(input: PersonnelCreateInput): Promise<PersonnelRecord> {
  const user = await authService.getCurrentUser()
  if (!user) throw new Error('未登录')

  const name = input.fullName.trim()
  if (!name) throw new Error('请填写姓名')

  const phoneErr = validateOptionalMainlandMobile(input.phone)
  if (phoneErr) throw new Error(phoneErr)
  const phoneStored = normalizePhoneForStorage(input.phone)

  const { data, error } = await supabase
    .from('personnel_records')
    .insert({
      owner_id: user.id,
      full_name: name,
      gender: input.gender,
      phone: phoneStored || null,
      address: input.address.trim() || null,
      remark: input.remark?.trim() || null,
      is_active: true,
    })
    .select()
    .single()

  if (error) throw new Error(error.message || '新增人员失败')
  const rec = mapRow(data as PersonnelRow)
  const [enriched] = await enrichOrganizationDisplayNames([rec])
  return enriched
}

export async function updatePersonnel(
  id: string,
  input: PersonnelUpdateInput
): Promise<PersonnelRecord> {
  const user = await authService.getCurrentUser()
  if (!user) throw new Error('未登录')

  const updates: Record<string, unknown> = {}
  if (input.fullName !== undefined) {
    const n = input.fullName.trim()
    if (!n) throw new Error('姓名不能为空')
    updates.full_name = n
  }
  if (input.gender !== undefined) updates.gender = input.gender
  if (input.phone !== undefined) {
    const pe = validateOptionalMainlandMobile(input.phone)
    if (pe) throw new Error(pe)
    updates.phone = normalizePhoneForStorage(input.phone) || null
  }
  if (input.address !== undefined) updates.address = input.address.trim() || null
  if (input.remark !== undefined) updates.remark = input.remark?.trim() || null
  if (input.isActive !== undefined) updates.is_active = input.isActive
  if (input.organizationId !== undefined) updates.organization_id = input.organizationId

  if (Object.keys(updates).length === 0) {
    const existing = await getPersonnelById(id)
    if (!existing) throw new Error('记录不存在')
    return existing
  }

  const { data, error } = await supabase
    .from('personnel_records')
    .update(updates)
    .eq('id', id)
    .eq('owner_id', user.id)
    .select()
    .single()

  if (error) throw new Error(error.message || '更新人员失败')
  const rec = mapRow(data as PersonnelRow)
  const [enriched] = await enrichOrganizationDisplayNames([rec])
  return enriched
}

export async function getPersonnelById(id: string): Promise<PersonnelRecord | null> {
  const user = await authService.getCurrentUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('personnel_records')
    .select('*')
    .eq('id', id)
    .eq('owner_id', user.id)
    .maybeSingle()

  if (error) throw new Error(error.message || '加载人员详情失败')
  if (!data) return null
  const rec = mapRow(data as PersonnelRow)
  const [enriched] = await enrichOrganizationDisplayNames([rec])
  return enriched
}

/** 当前用户名下、可分配至指定组织的人员档案（未归属或已归属其他组织时可再分配，由 UI 约束） */
export async function listPersonnelAssignableToOrganization(
  organizationId: string
): Promise<PersonnelRecord[]> {
  const all = await listMyPersonnel()
  return all.filter((p) => !p.organizationId || p.organizationId !== organizationId)
}
