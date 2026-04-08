/**
 * Supabase REST API Mock Handlers
 * 用于拦截 /supabase-proxy/rest/v1/* 和 https://*.supabase.co/rest/v1/* 请求
 */
import { SYSTEM_ORGANIZATION_ROOT_ID } from '@/config/constants'
import { http, HttpResponse, delay } from 'msw'
import { getRandomDelay } from '../data/mockConfig'
import { hydrateMswDataStore, persistMswDataStore } from '../mswDataStorePersistence'

// URL 模式 - 同时支持开发代理和生产环境
const REST_URL_PATTERNS = {
  photos: [
    'http://localhost:5173/supabase-proxy/rest/v1/photos',
    'https://*.supabase.co/rest/v1/photos',
  ],
  albums: [
    'http://localhost:5173/supabase-proxy/rest/v1/albums',
    'https://*.supabase.co/rest/v1/albums',
  ],
  persons: [
    'http://localhost:5173/supabase-proxy/rest/v1/persons',
    'https://*.supabase.co/rest/v1/persons',
  ],
  profiles: [
    'http://localhost:5173/supabase-proxy/rest/v1/profiles',
    'https://*.supabase.co/rest/v1/profiles',
  ],
  organizations: [
    'http://localhost:5173/supabase-proxy/rest/v1/organizations',
    'https://*.supabase.co/rest/v1/organizations',
  ],
  ai_fusion_tasks: [
    'http://localhost:5173/supabase-proxy/rest/v1/ai_fusion_tasks',
    'https://*.supabase.co/rest/v1/ai_fusion_tasks',
  ],
  personnel_records: [
    'http://localhost:5173/supabase-proxy/rest/v1/personnel_records',
    'https://*.supabase.co/rest/v1/personnel_records',
  ],
  rpc_admin_delete_organization: [
    'http://localhost:5173/supabase-proxy/rest/v1/rpc/admin_delete_organization',
    'https://*.supabase.co/rest/v1/rpc/admin_delete_organization',
  ],
  rpc_admin_create_organization: [
    'http://localhost:5173/supabase-proxy/rest/v1/rpc/admin_create_organization',
    'https://*.supabase.co/rest/v1/rpc/admin_create_organization',
  ],
}

// Mock 数据
const MOCK_PHOTOS: Record<string, unknown>[] = [
  {
    id: 'mock-photo-1',
    user_id: 'test-user-id-12345',
    oss_url: 'https://placeholder.com/photo1.jpg',
    oss_key: 'photos/photo1.jpg',
    taken_at: '2024-01-15T10:30:00.000Z',
    created_at: '2024-01-15T10:30:00.000Z',
    updated_at: '2024-01-15T10:30:00.000Z',
    title: '测试照片 1',
    description: '这是一张测试照片',
    tags: ['测试', '示例'],
    participants: [],
    metadata: { width: 1920, height: 1080 },
  },
  {
    id: 'mock-photo-2',
    user_id: 'test-user-id-12345',
    oss_url: 'https://placeholder.com/photo2.jpg',
    oss_key: 'photos/photo2.jpg',
    taken_at: '2024-01-16T14:20:00.000Z',
    created_at: '2024-01-16T14:20:00.000Z',
    updated_at: '2024-01-16T14:20:00.000Z',
    title: '测试照片 2',
    description: '另一张测试照片',
    tags: ['测试'],
    participants: [],
    metadata: { width: 1280, height: 720 },
  },
]

const MOCK_ALBUMS: Record<string, unknown>[] = [
  {
    id: 'mock-album-1',
    user_id: 'test-user-id-12345',
    title: '默认相册',
    description: '系统默认相册',
    cover_photo_id: 'mock-photo-1',
    photo_ids: ['mock-photo-1', 'mock-photo-2'],
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-16T14:20:00.000Z',
  },
]

const MOCK_PERSONS: Record<string, unknown>[] = []

const MOCK_PROFILES: Record<string, unknown>[] = [
  {
    id: 'test-user-id-12345',
    email: 'test@example.com',
    full_name: '测试用户',
    display_name: '测试用户',
    avatar_url: null,
    role: 'admin',
    organization_id: null,
    is_active: true,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  },
]

const MOCK_ORGANIZATIONS: Record<string, unknown>[] = [
  {
    id: SYSTEM_ORGANIZATION_ROOT_ID,
    name: 'opc_system_root',
    display_name: '组织根（系统）',
    short_name: null,
    description: '不可删除的系统主根。',
    parent_id: null,
    path: 'opc_system_root',
    level: 0,
    sort_order: 0,
    is_system_root: true,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
    created_by: null,
  },
]

const MOCK_AI_FUSION_TASKS: Record<string, unknown>[] = []

const MOCK_PERSONNEL_RECORDS: Record<string, unknown>[] = [
  {
    id: 'mock-personnel-1',
    owner_id: 'test-user-id-12345',
    full_name: '演示人员',
    gender: 'male',
    phone: '13800138000',
    address: '上海市示例路 1 号',
    remark: null,
    is_active: true,
    organization_id: null,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  },
]

// 数据存储（dev:test + MSW 下会经 localStorage 恢复，刷新页面后仍保留用户新增/修改）
const dataStore: Record<string, Record<string, unknown>[]> = {
  photos: [...MOCK_PHOTOS],
  albums: [...MOCK_ALBUMS],
  persons: [...MOCK_PERSONS],
  profiles: [...MOCK_PROFILES],
  organizations: [...MOCK_ORGANIZATIONS],
  ai_fusion_tasks: [...MOCK_AI_FUSION_TASKS],
  personnel_records: [...MOCK_PERSONNEL_RECORDS],
}

hydrateMswDataStore(dataStore)

function ensureSystemOrganizationRoot(organizations: Record<string, unknown>[]): void {
  const has = organizations.some(
    (r) => String((r as { id?: string }).id) === SYSTEM_ORGANIZATION_ROOT_ID
  )
  if (!has) {
    organizations.unshift({ ...(MOCK_ORGANIZATIONS[0] as Record<string, unknown>) })
    persistMswDataStore(dataStore)
  }
}

ensureSystemOrganizationRoot(dataStore.organizations)

// 通用 GET 处理器 - 支持 select, order, eq 等查询参数
const handleGet =
  (tableName: string) =>
  async ({ request }: { request: Request }) => {
    await delay(getRandomDelay(100, 300))

    const url = new URL(request.url)
    const data = dataStore[tableName] || []

    console.log(`[MSW REST] GET /${tableName}`, {
      select: url.searchParams.get('select'),
      order: url.searchParams.get('order'),
    })

    // 简单模拟排序
    const result = [...data]
    const order = url.searchParams.get('order')
    if (order) {
      const [field, direction] = order.split('.')
      result.sort((a, b) => {
        const aVal = a[field] as string | number | null
        const bVal = b[field] as string | number | null
        if (aVal === null) return direction === 'desc' ? 1 : -1
        if (bVal === null) return direction === 'desc' ? -1 : 1
        if (direction === 'desc') {
          return aVal < bVal ? 1 : -1
        }
        return aVal > bVal ? 1 : -1
      })
    }

    let filtered = result
    url.searchParams.forEach((value, key) => {
      if (typeof value !== 'string') return
      if (value.startsWith('eq.')) {
        const expected = value.slice(3)
        filtered = filtered.filter(
          (row) => String((row as Record<string, unknown>)[key] ?? '') === expected
        )
      } else if (value.startsWith('like.')) {
        const raw = value.slice(5)
        const prefix = raw.endsWith('%') ? raw.slice(0, -1) : raw
        filtered = filtered.filter((row) =>
          String((row as Record<string, unknown>)[key] ?? '').startsWith(prefix)
        )
      }
    })

    // 处理 count 请求
    const prefer = request.headers.get('Prefer')
    if (prefer?.includes('count=exact')) {
      const len = filtered.length
      return HttpResponse.json(filtered, {
        headers: {
          'Content-Range': len > 0 ? `0-${len - 1}/${len}` : '0-0/0',
        },
      })
    }

    return HttpResponse.json(filtered)
  }

// 通用 POST 处理器 - 插入数据
const handlePost =
  (tableName: string) =>
  async ({ request }: { request: Request }) => {
    await delay(getRandomDelay(100, 300))

    const body = (await request.json()) as Record<string, unknown>
    const newRecord: Record<string, unknown> = {
      id: `mock-${tableName}-${Date.now()}`,
      ...body,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    if (tableName === 'personnel_records' && newRecord.is_active === undefined) {
      newRecord.is_active = true
    }

    dataStore[tableName] = dataStore[tableName] || []
    dataStore[tableName].push(newRecord)
    persistMswDataStore(dataStore)

    console.log(`[MSW REST] POST /${tableName}`, newRecord)

    // 检查是否需要返回数据
    const prefer = request.headers.get('Prefer')
    if (prefer?.includes('return=representation')) {
      return HttpResponse.json([newRecord], { status: 201 })
    }

    return HttpResponse.json(null, { status: 201 })
  }

// 通用 PATCH 处理器 - 更新数据
const handlePatch =
  (tableName: string) =>
  async ({ request }: { request: Request }) => {
    await delay(getRandomDelay(100, 300))

    const url = new URL(request.url)
    const body = (await request.json()) as Record<string, unknown>

    // 解析 eq 过滤条件
    const eqParams: Record<string, string> = {}
    url.searchParams.forEach((value, key) => {
      if (key.startsWith('id')) {
        eqParams['id'] = value.replace('eq.', '')
      }
    })

    const data = dataStore[tableName] || []
    const index = data.findIndex((item) => item.id === eqParams['id'])

    let updatedRow: Record<string, unknown> | null = null
    if (index !== -1) {
      data[index] = {
        ...data[index],
        ...body,
        updated_at: new Date().toISOString(),
      }
      updatedRow = data[index] as Record<string, unknown>
      console.log(`[MSW REST] PATCH /${tableName}`, data[index])
      persistMswDataStore(dataStore)
    }

    const prefer = request.headers.get('Prefer')
    if (prefer?.includes('return=representation') && updatedRow) {
      return HttpResponse.json([updatedRow], { status: 200 })
    }

    return HttpResponse.json(null, { status: 204 })
  }

// 通用 DELETE 处理器
const handleDelete =
  (tableName: string) =>
  async ({ request }: { request: Request }) => {
    await delay(getRandomDelay(100, 300))

    const url = new URL(request.url)

    // 解析 eq 过滤条件
    let idToDelete: string | null = null
    url.searchParams.forEach((value, key) => {
      if (key === 'id') {
        idToDelete = value.replace('eq.', '')
      }
    })

    if (idToDelete) {
      if (tableName === 'organizations' && idToDelete === SYSTEM_ORGANIZATION_ROOT_ID) {
        return HttpResponse.json({ message: '系统根组织不可删除', code: 'P0001' }, { status: 400 })
      }
      const data = dataStore[tableName] || []
      const index = data.findIndex((item) => item.id === idToDelete)
      if (index !== -1) {
        data.splice(index, 1)
        persistMswDataStore(dataStore)
        console.log(`[MSW REST] DELETE /${tableName}/${idToDelete}`)
      }
    }

    return HttpResponse.json(null, { status: 204 })
  }

// 生成所有 handlers
export const supabaseRestHandlers = [
  // Photos
  ...REST_URL_PATTERNS.photos.flatMap((pattern) => [
    http.get(pattern, handleGet('photos')),
    http.post(pattern, handlePost('photos')),
    http.patch(pattern, handlePatch('photos')),
    http.delete(pattern, handleDelete('photos')),
  ]),

  // Albums
  ...REST_URL_PATTERNS.albums.flatMap((pattern) => [
    http.get(pattern, handleGet('albums')),
    http.post(pattern, handlePost('albums')),
    http.patch(pattern, handlePatch('albums')),
    http.delete(pattern, handleDelete('albums')),
  ]),

  // Persons
  ...REST_URL_PATTERNS.persons.flatMap((pattern) => [
    http.get(pattern, handleGet('persons')),
    http.post(pattern, handlePost('persons')),
    http.patch(pattern, handlePatch('persons')),
    http.delete(pattern, handleDelete('persons')),
  ]),

  // Profiles
  ...REST_URL_PATTERNS.profiles.flatMap((pattern) => [
    http.get(pattern, handleGet('profiles')),
    http.post(pattern, handlePost('profiles')),
    http.patch(pattern, handlePatch('profiles')),
    http.delete(pattern, handleDelete('profiles')),
  ]),

  // Organizations
  ...REST_URL_PATTERNS.organizations.flatMap((pattern) => [
    http.get(pattern, handleGet('organizations')),
    http.post(pattern, handlePost('organizations')),
    http.patch(pattern, handlePatch('organizations')),
    http.delete(pattern, handleDelete('organizations')),
  ]),

  // AI Fusion Tasks
  ...REST_URL_PATTERNS.ai_fusion_tasks.flatMap((pattern) => [
    http.get(pattern, handleGet('ai_fusion_tasks')),
    http.post(pattern, handlePost('ai_fusion_tasks')),
    http.patch(pattern, handlePatch('ai_fusion_tasks')),
    http.delete(pattern, handleDelete('ai_fusion_tasks')),
  ]),

  // Personnel records（人员管理）
  ...REST_URL_PATTERNS.personnel_records.flatMap((pattern) => [
    http.get(pattern, handleGet('personnel_records')),
    http.post(pattern, handlePost('personnel_records')),
    http.patch(pattern, handlePatch('personnel_records')),
    http.delete(pattern, handleDelete('personnel_records')),
  ]),

  // RPC：创建组织（与 admin_create_organization 一致，供 MSW 本地联调）
  ...REST_URL_PATTERNS.rpc_admin_create_organization.map((pattern) =>
    http.post(pattern, async ({ request }) => {
      await delay(getRandomDelay(100, 300))
      const body = (await request.json()) as {
        p_name?: string
        p_display_name?: string
        p_description?: string | null
        p_parent_id?: string | null
      }
      const name = body.p_name?.trim()
      const displayName = body.p_display_name?.trim()
      if (!name || !displayName) {
        return HttpResponse.json(
          { message: 'name and display_name required', code: 'P0001' },
          { status: 400 }
        )
      }
      if (!/^[a-z0-9-]+$/.test(name)) {
        return HttpResponse.json(
          { message: 'Invalid organization name', code: 'P0001' },
          { status: 400 }
        )
      }

      const data = dataStore.organizations || []
      if (data.some((row) => String((row as Record<string, unknown>).name) === name)) {
        return HttpResponse.json(
          { message: 'duplicate key value violates unique constraint', code: '23505' },
          { status: 409 }
        )
      }

      const parentId = body.p_parent_id ?? null
      let parent: Record<string, unknown> | undefined
      if (parentId) {
        parent = data.find((row) => String((row as Record<string, unknown>).id) === parentId) as
          | Record<string, unknown>
          | undefined
        if (!parent) {
          return HttpResponse.json(
            { message: 'Parent organization not found', code: 'P0001' },
            { status: 400 }
          )
        }
      }

      const id =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `mock-org-${Date.now()}`
      const parentPath = parent ? String(parent.path ?? '') : ''
      const path = parentPath ? `${parentPath}.${name}` : name
      const level = parent ? Number(parent.level ?? 0) + 1 : 0

      const row: Record<string, unknown> = {
        id,
        name,
        display_name: displayName,
        short_name: null,
        description: body.p_description ?? null,
        parent_id: parentId,
        path,
        level,
        sort_order: 0,
        is_system_root: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: null,
      }
      data.push(row)
      persistMswDataStore(dataStore)
      console.log('[MSW REST] POST rpc/admin_create_organization', row)
      return HttpResponse.json(id)
    })
  ),

  // RPC：删除组织（与 supabase.rpc 一致）
  ...REST_URL_PATTERNS.rpc_admin_delete_organization.map((pattern) =>
    http.post(pattern, async ({ request }) => {
      await delay(getRandomDelay(100, 300))
      const body = (await request.json()) as { p_org_id?: string }
      const id = body.p_org_id
      if (id === SYSTEM_ORGANIZATION_ROOT_ID) {
        return HttpResponse.json(
          {
            message: '系统根组织不可删除',
            code: 'P0001',
            hint: null,
            details: null,
          },
          { status: 400 }
        )
      }
      const data = dataStore.organizations || []
      const index = data.findIndex((item) => item.id === id)
      if (index === -1) {
        return HttpResponse.json(
          { message: 'Organization not found', code: 'P0001' },
          { status: 400 }
        )
      }
      data.splice(index, 1)
      persistMswDataStore(dataStore)
      console.log('[MSW REST] POST rpc/admin_delete_organization', id)
      return HttpResponse.json(null, { status: 204 })
    })
  ),
]
