/**
 * 人员管理 API — 经 Supabase REST，与 profiles / DataService 人员缓存解耦
 */

import { supabase } from '@/lib/supabase/client'
import { authService } from '@/lib/supabase/auth'
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
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
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
  return (data ?? []).map((row) => mapRow(row as PersonnelRow))
}

export async function createPersonnel(input: PersonnelCreateInput): Promise<PersonnelRecord> {
  const user = await authService.getCurrentUser()
  if (!user) throw new Error('未登录')

  const name = input.fullName.trim()
  if (!name) throw new Error('请填写姓名')

  const { data, error } = await supabase
    .from('personnel_records')
    .insert({
      owner_id: user.id,
      full_name: name,
      gender: input.gender,
      phone: input.phone.trim() || null,
      address: input.address.trim() || null,
      remark: input.remark?.trim() || null,
      is_active: true,
    })
    .select()
    .single()

  if (error) throw new Error(error.message || '新增人员失败')
  return mapRow(data as PersonnelRow)
}

export async function updatePersonnel(id: string, input: PersonnelUpdateInput): Promise<PersonnelRecord> {
  const user = await authService.getCurrentUser()
  if (!user) throw new Error('未登录')

  const updates: Record<string, unknown> = {}
  if (input.fullName !== undefined) {
    const n = input.fullName.trim()
    if (!n) throw new Error('姓名不能为空')
    updates.full_name = n
  }
  if (input.gender !== undefined) updates.gender = input.gender
  if (input.phone !== undefined) updates.phone = input.phone.trim() || null
  if (input.address !== undefined) updates.address = input.address.trim() || null
  if (input.remark !== undefined) updates.remark = input.remark?.trim() || null
  if (input.isActive !== undefined) updates.is_active = input.isActive

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
  return mapRow(data as PersonnelRow)
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
  return mapRow(data as PersonnelRow)
}
