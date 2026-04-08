/**
 * 人员管理模块（与组织「成员」profiles 区分的主数据记录）
 */

export type PersonnelGender = 'unknown' | 'male' | 'female' | 'prefer_not_say'

export interface PersonnelRecord {
  id: string
  ownerId: string
  fullName: string
  gender: PersonnelGender
  phone: string
  address: string
  remark: string | null
  /** 软禁用：false 时列表可辨识为已禁用 */
  isActive: boolean
  /** 关联组织（人员管理与组织成员打通） */
  organizationId: string | null
  /** 列表展示用，由 organizations 解析 */
  organizationDisplayName?: string | null
  createdAt: Date
  updatedAt: Date
}

export interface PersonnelCreateInput {
  fullName: string
  gender: PersonnelGender
  phone: string
  address: string
  remark?: string
}

export type PersonnelUpdateInput = Partial<{
  fullName: string
  gender: PersonnelGender
  phone: string
  address: string
  remark: string | null
  isActive: boolean
  /** 设为 null 表示从组织移除（仅档案侧） */
  organizationId: string | null
}>
