/**
 * 首页「个人常用入口」默认配置（本地静态，与 routes.tsx 路径对齐）
 */

export const PERSONAL_ENTRY_MAX = 8

/** 允许的 SPA 路径（后续导航白名单 Story 可扩展） */
export const PERSONAL_ENTRY_ALLOWED_PATHS = [
  '/persons',
  '/personnel',
  '/profile',
  '/settings/cloud-storage',
  '/settings',
] as const

export type PersonalEntryPath = (typeof PERSONAL_ENTRY_ALLOWED_PATHS)[number]

export type PersonalEntryIconId = 'users' | 'user' | 'cloud' | 'contact'

export type PersonalEntryDefinition = {
  path: PersonalEntryPath
  label: string
  description: string
  icon: PersonalEntryIconId
}

/**
 * 默认推荐入口（条数须 ≤ PERSONAL_ENTRY_MAX）
 */
export const DEFAULT_PERSONAL_ENTRIES: readonly PersonalEntryDefinition[] = [
  {
    path: '/persons',
    label: '组织管理',
    description: '管理团队成员和组织架构',
    icon: 'users',
  },
  {
    path: '/personnel',
    label: '人员管理',
    description: '搜索、新增与查看人员信息',
    icon: 'contact',
  },
  {
    path: '/profile',
    label: '个人中心',
    description: '更新个人信息和头像',
    icon: 'user',
  },
  {
    path: '/settings/cloud-storage',
    label: '云存储设置',
    description: '管理存储和同步设置',
    icon: 'cloud',
  },
] as const

function isPersonalEntryPath(p: string): p is PersonalEntryPath {
  return (PERSONAL_ENTRY_ALLOWED_PATHS as readonly string[]).includes(p)
}

/** 首页展示用：截断至最大条数，并校验路径在白名单内 */
export function getDefaultPersonalEntries(): PersonalEntryDefinition[] {
  return DEFAULT_PERSONAL_ENTRIES.filter((e) => isPersonalEntryPath(e.path)).slice(
    0,
    PERSONAL_ENTRY_MAX
  )
}
