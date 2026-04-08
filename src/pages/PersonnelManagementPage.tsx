/**
 * 人员管理 — /personnel（多条件搜索 + 列表操作列：查看 / 编辑 / 禁用·启用）
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { createPersonnel, listMyPersonnel, updatePersonnel } from '@/services/api/personnelService'
import { organizationService } from '@/services/organization'
import { useAuthStore } from '@/stores/useAuthStore'
import type { Organization } from '@/lib/supabase/organizationTypes'
import type { PersonnelGender, PersonnelRecord } from '@/types/personnel'
import { cn } from '@/lib/utils'

const GENDER_LABEL: Record<PersonnelGender, string> = {
  unknown: '未知',
  male: '男',
  female: '女',
  prefer_not_say: '不愿透露',
}

const GENDER_FILTER_ALL = ''
/** 搜索：不按组织过滤 */
const ORG_FILTER_ALL = ''
/** 搜索：仅未关联组织的人员 */
const ORG_FILTER_UNASSIGNED = '__unassigned__'

function PersonnelManagementPage() {
  const { user } = useAuthStore()
  const userId = user?.id ?? ''

  const [items, setItems] = useState<PersonnelRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [viewableOrgs, setViewableOrgs] = useState<Organization[]>([])

  const [searchName, setSearchName] = useState('')
  const [searchGender, setSearchGender] = useState<string>(GENDER_FILTER_ALL)
  const [searchPhone, setSearchPhone] = useState('')
  const [searchOrganization, setSearchOrganization] = useState(ORG_FILTER_ALL)

  const [addOpen, setAddOpen] = useState(false)
  const [detail, setDetail] = useState<PersonnelRecord | null>(null)
  const [editTarget, setEditTarget] = useState<PersonnelRecord | null>(null)

  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [rowBusyId, setRowBusyId] = useState<string | null>(null)

  const [formName, setFormName] = useState('')
  const [formGender, setFormGender] = useState<PersonnelGender>('unknown')
  const [formPhone, setFormPhone] = useState('')
  const [formAddress, setFormAddress] = useState('')
  const [formRemark, setFormRemark] = useState('')
  /** 表单内组织：空字符串表示不关联 */
  const [formOrganizationId, setFormOrganizationId] = useState('')

  const loadList = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const list = await listMyPersonnel()
      setItems(list)
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadList()
  }, [loadList])

  useEffect(() => {
    if (!userId) {
      setViewableOrgs([])
      return
    }
    let cancelled = false
    organizationService
      .getViewableOrganizations(userId)
      .then((orgs) => {
        if (!cancelled) setViewableOrgs(orgs)
      })
      .catch(() => {
        if (!cancelled) setViewableOrgs([])
      })
    return () => {
      cancelled = true
    }
  }, [userId])

  const orgOptionsSorted = useMemo(
    () =>
      [...viewableOrgs].sort((a, b) =>
        a.display_name.localeCompare(b.display_name, 'zh-Hans-CN')
      ),
    [viewableOrgs]
  )

  const editOrgOptions = useMemo(() => {
    if (
      editTarget?.organizationId &&
      !orgOptionsSorted.some((o) => o.id === editTarget.organizationId)
    ) {
      const extra: Organization = {
        id: editTarget.organizationId,
        name: '',
        display_name: editTarget.organizationDisplayName ?? editTarget.organizationId,
        parent_id: null,
        path: '',
        level: 0,
        description: null,
        created_at: '',
        updated_at: '',
      }
      return [extra, ...orgOptionsSorted]
    }
    return orgOptionsSorted
  }, [editTarget, orgOptionsSorted])

  const filtersActive =
    searchName.trim() !== '' ||
    searchGender !== GENDER_FILTER_ALL ||
    searchPhone.trim() !== '' ||
    searchOrganization !== ORG_FILTER_ALL

  const filtered = useMemo(() => {
    const nq = searchName.trim().toLowerCase()
    const pq = searchPhone.trim().toLowerCase().replace(/\s/g, '')

    return items.filter((p) => {
      const nameNorm = p.fullName.trim().toLowerCase()
      if (nq && !nameNorm.includes(nq)) return false
      if (searchGender !== GENDER_FILTER_ALL && p.gender !== searchGender) return false
      if (pq) {
        const phoneNorm = p.phone.replace(/\s/g, '').toLowerCase()
        if (!phoneNorm.includes(pq)) return false
      }
      if (searchOrganization === ORG_FILTER_UNASSIGNED) {
        if (p.organizationId) return false
      } else if (searchOrganization !== ORG_FILTER_ALL) {
        if (p.organizationId !== searchOrganization) return false
      }
      return true
    })
  }, [items, searchName, searchGender, searchPhone, searchOrganization])

  const resetForm = () => {
    setFormName('')
    setFormGender('unknown')
    setFormPhone('')
    setFormAddress('')
    setFormRemark('')
    setFormOrganizationId('')
    setFormError(null)
  }

  const openEdit = (row: PersonnelRecord) => {
    setEditTarget(row)
    setFormName(row.fullName)
    setFormGender(row.gender)
    setFormPhone(row.phone)
    setFormAddress(row.address)
    setFormRemark(row.remark ?? '')
    setFormOrganizationId(row.organizationId ?? '')
    setFormError(null)
  }

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setSubmitting(true)
    try {
      await createPersonnel({
        fullName: formName,
        gender: formGender,
        phone: formPhone,
        address: formAddress,
        remark: formRemark,
        organizationId: formOrganizationId.trim() || null,
      })
      setAddOpen(false)
      resetForm()
      await loadList()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '保存失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editTarget) return
    setFormError(null)
    setSubmitting(true)
    try {
      const updated = await updatePersonnel(editTarget.id, {
        fullName: formName,
        gender: formGender,
        phone: formPhone,
        address: formAddress,
        remark: formRemark.trim() || null,
        organizationId: formOrganizationId.trim() ? formOrganizationId.trim() : null,
      })
      setEditTarget(null)
      resetForm()
      await loadList()
      setDetail((d) => (d && d.id === updated.id ? updated : d))
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '保存失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleActive = async (row: PersonnelRecord) => {
    const next = !row.isActive
    setRowBusyId(row.id)
    try {
      await updatePersonnel(row.id, { isActive: next })
      await loadList()
      setDetail((d) => (d && d.id === row.id ? { ...d, isActive: next } : d))
    } catch (e) {
      alert(e instanceof Error ? e.message : '操作失败')
    } finally {
      setRowBusyId(null)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">人员管理</h1>
            <p className="text-sm text-muted-foreground mt-1">
              按姓名、组织、性别、手机号组合筛选；列表支持查看、编辑、禁用/启用
            </p>
          </div>
          <Button
            onClick={() => {
              resetForm()
              setAddOpen(true)
            }}
            className="shrink-0"
          >
            <Plus className="w-4 h-4 mr-2" aria-hidden />
            新增人员
          </Button>
        </div>

        <section className="mb-6" aria-labelledby="personnel-search-heading">
          <h2 id="personnel-search-heading" className="sr-only">
            搜索区域
          </h2>
          <Card className="p-4">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="personnel-search-name" className="text-sm font-medium">
                  姓名
                </Label>
                <div className="relative">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none"
                    aria-hidden
                  />
                  <Input
                    id="personnel-search-name"
                    type="search"
                    placeholder="关键字包含匹配…"
                    value={searchName}
                    onChange={(e) => setSearchName(e.target.value)}
                    className="pl-9"
                    autoComplete="off"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="personnel-search-gender" className="text-sm font-medium">
                  性别
                </Label>
                <select
                  id="personnel-search-gender"
                  value={searchGender}
                  onChange={(e) => setSearchGender(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value={GENDER_FILTER_ALL}>全部</option>
                  {(Object.keys(GENDER_LABEL) as PersonnelGender[]).map((g) => (
                    <option key={g} value={g}>
                      {GENDER_LABEL[g]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="personnel-search-org" className="text-sm font-medium">
                  组织
                </Label>
                <select
                  id="personnel-search-org"
                  value={searchOrganization}
                  onChange={(e) => setSearchOrganization(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value={ORG_FILTER_ALL}>全部</option>
                  <option value={ORG_FILTER_UNASSIGNED}>未关联组织</option>
                  {orgOptionsSorted.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.display_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="personnel-search-phone" className="text-sm font-medium">
                  手机号
                </Label>
                <Input
                  id="personnel-search-phone"
                  type="search"
                  placeholder="号码包含匹配（忽略空格）…"
                  value={searchPhone}
                  onChange={(e) => setSearchPhone(e.target.value)}
                  autoComplete="off"
                />
              </div>
            </div>
          </Card>
        </section>

        <section aria-labelledby="personnel-list-heading">
          <div className="flex items-center justify-between mb-3">
            <h2 id="personnel-list-heading" className="text-lg font-medium text-foreground">
              人员列表
            </h2>
            <span className="text-sm text-muted-foreground">
              共 {filtered.length} 条{filtersActive ? `（已筛选，全量 ${items.length} 条）` : ''}
            </span>
          </div>

          <Card className="overflow-hidden">
            {loadError && (
              <div className="p-6 text-center text-destructive text-sm">
                <p>{loadError}</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => loadList()}>
                  重试
                </Button>
              </div>
            )}

            {!loadError && loading && (
              <p className="p-8 text-center text-muted-foreground text-sm">加载中…</p>
            )}

            {!loadError && !loading && filtered.length === 0 && (
              <p className="p-8 text-center text-muted-foreground text-sm">
                {items.length === 0
                  ? '暂无人员，点击「新增人员」添加第一条记录。'
                  : '没有符合当前搜索条件的人员。'}
              </p>
            )}

            {!loadError && !loading && filtered.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-left">
                      <th scope="col" className="px-3 py-3 font-medium text-foreground">
                        姓名
                      </th>
                      <th scope="col" className="px-3 py-3 font-medium text-foreground">
                        性别
                      </th>
                      <th scope="col" className="px-3 py-3 font-medium text-foreground">
                        电话
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3 font-medium text-foreground min-w-[100px]"
                      >
                        所属组织
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3 font-medium text-foreground min-w-[120px]"
                      >
                        住址
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3 font-medium text-foreground whitespace-nowrap"
                      >
                        状态
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3 font-medium text-foreground text-right whitespace-nowrap"
                      >
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((row) => (
                      <tr
                        key={row.id}
                        className={cn(
                          'border-b border-border last:border-0 transition-colors',
                          row.isActive
                            ? 'hover:bg-muted/30'
                            : 'bg-muted/20 opacity-90 hover:bg-muted/25'
                        )}
                      >
                        <td
                          className={cn(
                            'px-3 py-3 font-medium',
                            row.isActive ? 'text-foreground' : 'text-muted-foreground'
                          )}
                        >
                          {row.fullName}
                        </td>
                        <td className="px-3 py-3 text-muted-foreground">
                          {GENDER_LABEL[row.gender]}
                        </td>
                        <td className="px-3 py-3 text-muted-foreground whitespace-nowrap">
                          {row.phone || '—'}
                        </td>
                        <td
                          className="px-3 py-3 text-muted-foreground max-w-[140px] truncate"
                          title={row.organizationDisplayName ?? undefined}
                        >
                          {row.organizationDisplayName ?? '—'}
                        </td>
                        <td className="px-3 py-3 text-muted-foreground max-w-[160px] truncate">
                          {row.address || '—'}
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={cn(
                              'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                              row.isActive
                                ? 'bg-green-500/15 text-green-700 dark:text-green-400'
                                : 'bg-muted text-muted-foreground'
                            )}
                          >
                            {row.isActive ? '启用' : '已禁用'}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <div className="flex flex-wrap justify-end gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8"
                              onClick={() => setDetail(row)}
                              aria-label={`查看 ${row.fullName}`}
                            >
                              查看
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8"
                              onClick={() => openEdit(row)}
                              aria-label={`编辑 ${row.fullName}`}
                            >
                              编辑
                            </Button>
                            <Button
                              type="button"
                              variant={row.isActive ? 'secondary' : 'default'}
                              size="sm"
                              className="h-8"
                              disabled={rowBusyId === row.id}
                              onClick={() => handleToggleActive(row)}
                              aria-label={
                                row.isActive ? `禁用 ${row.fullName}` : `启用 ${row.fullName}`
                              }
                            >
                              {rowBusyId === row.id ? '…' : row.isActive ? '禁用' : '启用'}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </section>
      </div>

      <Dialog
        open={addOpen}
        onOpenChange={(o) => {
          setAddOpen(o)
          if (!o) resetForm()
        }}
      >
        <DialogContent className="max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>新增人员</DialogTitle>
            <DialogDescription>带 * 为必填项；新建默认为启用</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pf-name">姓名 *</Label>
              <Input
                id="pf-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                required
                autoComplete="name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pf-gender">性别</Label>
              <select
                id="pf-gender"
                value={formGender}
                onChange={(e) => setFormGender(e.target.value as PersonnelGender)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {(Object.keys(GENDER_LABEL) as PersonnelGender[]).map((g) => (
                  <option key={g} value={g}>
                    {GENDER_LABEL[g]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pf-phone">电话</Label>
              <Input
                id="pf-phone"
                type="tel"
                placeholder="11 位手机号，可含 +86 或空格；可留空"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                autoComplete="tel"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pf-org">所属组织</Label>
              <select
                id="pf-org"
                value={formOrganizationId}
                onChange={(e) => setFormOrganizationId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">不关联组织</option>
                {orgOptionsSorted.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.display_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pf-address">住址</Label>
              <Input
                id="pf-address"
                value={formAddress}
                onChange={(e) => setFormAddress(e.target.value)}
                autoComplete="street-address"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pf-remark">备注</Label>
              <Input
                id="pf-remark"
                value={formRemark}
                onChange={(e) => setFormRemark(e.target.value)}
              />
            </div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                取消
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? '保存中…' : '保存'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editTarget !== null}
        onOpenChange={(o) => {
          if (!o) {
            setEditTarget(null)
            resetForm()
          }
        }}
      >
        <DialogContent className="max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>编辑人员</DialogTitle>
            <DialogDescription>修改后保存；启用状态请使用列表中的禁用/启用</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pf-edit-name">姓名 *</Label>
              <Input
                id="pf-edit-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                required
                autoComplete="name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pf-edit-gender">性别</Label>
              <select
                id="pf-edit-gender"
                value={formGender}
                onChange={(e) => setFormGender(e.target.value as PersonnelGender)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {(Object.keys(GENDER_LABEL) as PersonnelGender[]).map((g) => (
                  <option key={g} value={g}>
                    {GENDER_LABEL[g]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pf-edit-phone">电话</Label>
              <Input
                id="pf-edit-phone"
                type="tel"
                placeholder="11 位手机号，可含 +86 或空格；可留空"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                autoComplete="tel"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pf-edit-org">所属组织</Label>
              <select
                id="pf-edit-org"
                value={formOrganizationId}
                onChange={(e) => setFormOrganizationId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">不关联组织</option>
                {editOrgOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.display_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pf-edit-address">住址</Label>
              <Input
                id="pf-edit-address"
                value={formAddress}
                onChange={(e) => setFormAddress(e.target.value)}
                autoComplete="street-address"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pf-edit-remark">备注</Label>
              <Input
                id="pf-edit-remark"
                value={formRemark}
                onChange={(e) => setFormRemark(e.target.value)}
              />
            </div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditTarget(null)
                  resetForm()
                }}
              >
                取消
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? '保存中…' : '保存'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={detail !== null}
        onOpenChange={(o) => {
          if (!o) setDetail(null)
        }}
      >
        <DialogContent className="max-w-md" aria-describedby={undefined}>
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle>人员详情</DialogTitle>
                <DialogDescription>{detail.fullName}</DialogDescription>
              </DialogHeader>
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-muted-foreground">状态</dt>
                  <dd className="text-foreground">{detail.isActive ? '启用' : '已禁用'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">姓名</dt>
                  <dd className="font-medium text-foreground">{detail.fullName}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">性别</dt>
                  <dd className="text-foreground">{GENDER_LABEL[detail.gender]}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">电话</dt>
                  <dd className="text-foreground">{detail.phone || '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">所属组织</dt>
                  <dd className="text-foreground">{detail.organizationDisplayName ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">住址</dt>
                  <dd className="text-foreground whitespace-pre-wrap">{detail.address || '—'}</dd>
                </div>
                {detail.remark && (
                  <div>
                    <dt className="text-muted-foreground">备注</dt>
                    <dd className="text-foreground whitespace-pre-wrap">{detail.remark}</dd>
                  </div>
                )}
              </dl>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDetail(null)}>
                  关闭
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default PersonnelManagementPage
