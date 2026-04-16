/**
 * 人员管理 — /personnel（多条件搜索 + 列表操作列：查看 / 编辑 / 禁用·启用）
 * 组织筛选与表单「所属组织」数据源：`useViewableOrganizations` → `organizationService.getViewableOrganizations`（与组织管理同源，PRD FR19/FR28）
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd'
import { createPersonnel, listMyPersonnel, updatePersonnel } from '@/services/api/personnelService'
import { useViewableOrganizations } from '@/hooks/useViewableOrganizations'
import { useAuthStore } from '@/stores/useAuthStore'
import type { Organization } from '@/lib/supabase/organizationTypes'
import type { PersonnelGender, PersonnelRecord } from '@/types/personnel'
import { validateOptionalMainlandMobile } from '@/utils/phoneValidation'
import type { ColumnsType } from 'antd/es/table'
import type { DefaultOptionType } from 'antd/es/select'

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
const FORM_ORG_UNASSIGNED = ''

interface PersonnelFormValues {
  fullName: string
  gender: PersonnelGender
  phone: string
  organizationId: string
  address: string
  remark: string
}

type OrgOptionMeta = {
  org: Organization
  depth: number
}

function flattenOrganizationsForSelect(orgs: Organization[]): OrgOptionMeta[] {
  const byId = new Map(orgs.map((org) => [org.id, org]))
  const childrenMap = new Map<string | null, Organization[]>()

  for (const org of orgs) {
    const parentId = org.parent_id && byId.has(org.parent_id) ? org.parent_id : null
    const list = childrenMap.get(parentId) ?? []
    list.push(org)
    childrenMap.set(parentId, list)
  }

  for (const list of childrenMap.values()) {
    list.sort((a, b) => a.display_name.localeCompare(b.display_name, 'zh-Hans-CN'))
  }

  const result: OrgOptionMeta[] = []
  const visited = new Set<string>()
  const walk = (parentId: string | null, depth: number) => {
    const children = childrenMap.get(parentId) ?? []
    for (const child of children) {
      if (visited.has(child.id)) continue
      visited.add(child.id)
      result.push({ org: child, depth })
      walk(child.id, depth + 1)
    }
  }

  walk(null, 0)

  // 兜底：若出现孤儿节点或异常循环，补充未访问节点
  if (visited.size < orgs.length) {
    for (const org of orgs) {
      if (!visited.has(org.id)) {
        result.push({ org, depth: Math.max(org.level ?? 0, 0) })
      }
    }
  }

  return result
}

function toIndentedOrgOption(item: OrgOptionMeta): DefaultOptionType {
  const indent = item.depth * 16
  return {
    value: item.org.id,
    plainLabel: item.org.display_name,
    label: <span style={{ paddingInlineStart: indent, display: 'inline-block' }}>{item.org.display_name}</span>,
  }
}

function PersonnelManagementPage() {
  const [addForm] = Form.useForm<PersonnelFormValues>()
  const [editForm] = Form.useForm<PersonnelFormValues>()
  const { user } = useAuthStore()
  const userId = user?.id ?? ''

  const {
    organizations: viewableOrgs,
    loading: orgsLoading,
    error: orgsLoadError,
    refetch: refetchViewableOrgs,
  } = useViewableOrganizations(userId)

  const [items, setItems] = useState<PersonnelRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

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

  const [messageApi, contextHolder] = message.useMessage()

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

  const orgOptionsHierarchical = useMemo(
    () => flattenOrganizationsForSelect(viewableOrgs),
    [viewableOrgs]
  )

  const editOrgOptionsHierarchical = useMemo(() => {
    if (
      editTarget?.organizationId &&
      !orgOptionsHierarchical.some((item) => item.org.id === editTarget.organizationId)
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
      return [{ org: extra, depth: 0 }, ...orgOptionsHierarchical]
    }
    return orgOptionsHierarchical
  }, [editTarget, orgOptionsHierarchical])

  const filtersActive =
    searchName.trim() !== '' ||
    searchGender !== GENDER_FILTER_ALL ||
    searchPhone.trim() !== '' ||
    searchOrganization !== ORG_FILTER_ALL

  const orgSearchOptions = useMemo(
    () => [
      { label: '全部', value: ORG_FILTER_ALL, plainLabel: '全部' },
      { label: '未关联组织', value: ORG_FILTER_UNASSIGNED, plainLabel: '未关联组织' },
      ...orgOptionsHierarchical.map(toIndentedOrgOption),
    ],
    [orgOptionsHierarchical]
  )

  const editOrgSelectOptions = useMemo(
    () => [
      { label: '不关联组织', value: FORM_ORG_UNASSIGNED, plainLabel: '不关联组织' },
      ...editOrgOptionsHierarchical.map(toIndentedOrgOption),
    ],
    [editOrgOptionsHierarchical]
  )

  const formOrgSelectOptions = useMemo(
    () => [
      { label: '不关联组织', value: FORM_ORG_UNASSIGNED, plainLabel: '不关联组织' },
      ...orgOptionsHierarchical.map(toIndentedOrgOption),
    ],
    [orgOptionsHierarchical]
  )

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

  const resetAddForm = () => {
    addForm.setFieldsValue({
      fullName: '',
      gender: 'unknown',
      phone: '',
      address: '',
      remark: '',
      organizationId: FORM_ORG_UNASSIGNED,
    })
    setFormError(null)
  }

  const resetEditForm = () => {
    editForm.resetFields()
    setFormError(null)
  }

  const openEdit = (row: PersonnelRecord) => {
    setEditTarget(row)
    editForm.setFieldsValue({
      fullName: row.fullName,
      gender: row.gender,
      phone: row.phone,
      address: row.address,
      remark: row.remark ?? '',
      organizationId: row.organizationId ?? FORM_ORG_UNASSIGNED,
    })
    setFormError(null)
  }

  const handleAddSubmit = async (values: PersonnelFormValues) => {
    setFormError(null)
    setSubmitting(true)
    try {
      await createPersonnel({
        fullName: values.fullName,
        gender: values.gender,
        phone: values.phone,
        address: values.address,
        remark: values.remark,
        organizationId: values.organizationId.trim() || null,
      })
      setAddOpen(false)
      resetAddForm()
      await loadList()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '保存失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditSubmit = async (values: PersonnelFormValues) => {
    if (!editTarget) return
    setFormError(null)
    setSubmitting(true)
    try {
      const updated = await updatePersonnel(editTarget.id, {
        fullName: values.fullName,
        gender: values.gender,
        phone: values.phone,
        address: values.address,
        remark: values.remark.trim() || null,
        organizationId: values.organizationId.trim() ? values.organizationId.trim() : null,
      })
      setEditTarget(null)
      resetEditForm()
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
      messageApi.error(e instanceof Error ? e.message : '操作失败')
    } finally {
      setRowBusyId(null)
    }
  }

  const columns: ColumnsType<PersonnelRecord> = [
    {
      title: '姓名',
      dataIndex: 'fullName',
      key: 'fullName',
      width: 140,
      render: (_, row) => (
        <Typography.Text strong type={row.isActive ? undefined : 'secondary'}>
          {row.fullName}
        </Typography.Text>
      ),
    },
    {
      title: '性别',
      dataIndex: 'gender',
      key: 'gender',
      width: 90,
      render: (gender: PersonnelGender) => <Typography.Text type="secondary">{GENDER_LABEL[gender]}</Typography.Text>,
    },
    {
      title: '电话',
      dataIndex: 'phone',
      key: 'phone',
      width: 180,
      render: (phone: string) => <Typography.Text type="secondary">{phone || '—'}</Typography.Text>,
    },
    {
      title: '所属组织',
      dataIndex: 'organizationDisplayName',
      key: 'organizationDisplayName',
      width: 180,
      ellipsis: true,
      render: (orgName: string | null) => <Typography.Text type="secondary">{orgName ?? '—'}</Typography.Text>,
    },
    {
      title: '住址',
      dataIndex: 'address',
      key: 'address',
      width: 220,
      ellipsis: true,
      render: (address: string) => <Typography.Text type="secondary">{address || '—'}</Typography.Text>,
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 110,
      render: (isActive: boolean) =>
        isActive ? <Tag color="success">启用</Tag> : <Tag>已禁用</Tag>,
    },
    {
      title: '操作',
      key: 'actions',
      fixed: 'right',
      align: 'right',
      width: 220,
      render: (_, row) => (
        <Space wrap size="small" style={{ justifyContent: 'flex-end' }}>
          <Button size="small" onClick={() => setDetail(row)} aria-label={`查看 ${row.fullName}`}>
            查看
          </Button>
          <Button size="small" onClick={() => openEdit(row)} aria-label={`编辑 ${row.fullName}`}>
            编辑
          </Button>
          <Button
            size="small"
            type={row.isActive ? 'default' : 'primary'}
            loading={rowBusyId === row.id}
            onClick={() => void handleToggleActive(row)}
            aria-label={row.isActive ? `禁用 ${row.fullName}` : `启用 ${row.fullName}`}
          >
            {row.isActive ? '禁用' : '启用'}
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <div style={{ minHeight: '100vh' }}>
      {contextHolder}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Space direction="vertical" size={20} style={{ width: '100%' }}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <Typography.Title level={2} style={{ marginBottom: 4 }}>
                人员管理
              </Typography.Title>
              <Typography.Text type="secondary">
                按姓名、组织、性别、手机号组合筛选；列表支持查看、编辑、禁用/启用
              </Typography.Text>
            </div>
            <Button
              type="primary"
              onClick={() => {
                resetAddForm()
                setAddOpen(true)
              }}
            >
              新增人员
            </Button>
          </div>

          <section aria-labelledby="personnel-search-heading">
            <h2 id="personnel-search-heading" className="sr-only">
              搜索区域
            </h2>
            <Card>
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} lg={6}>
                  <Space direction="vertical" size={6} style={{ width: '100%' }}>
                    <Typography.Text>姓名</Typography.Text>
                    <Input
                      id="personnel-search-name"
                      type="search"
                      placeholder="关键字包含匹配…"
                      value={searchName}
                      onChange={(e) => setSearchName(e.target.value)}
                      autoComplete="off"
                    />
                  </Space>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <Space direction="vertical" size={6} style={{ width: '100%' }}>
                    <Typography.Text>性别</Typography.Text>
                    <Select
                      id="personnel-search-gender"
                      value={searchGender}
                      onChange={setSearchGender}
                      style={{ width: '100%' }}
                      options={[
                        { label: '全部', value: GENDER_FILTER_ALL, plainLabel: '全部' },
                        ...(Object.keys(GENDER_LABEL) as PersonnelGender[]).map((g) => ({
                          label: GENDER_LABEL[g],
                          value: g,
                          plainLabel: GENDER_LABEL[g],
                        })),
                      ]}
                      optionFilterProp="plainLabel"
                      optionLabelProp="plainLabel"
                    />
                  </Space>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <Space direction="vertical" size={6} style={{ width: '100%' }}>
                    <Typography.Text>组织</Typography.Text>
                    <Select
                      data-testid="personnel-search-org-select"
                      id="personnel-search-org"
                      value={searchOrganization}
                      onChange={setSearchOrganization}
                      options={orgSearchOptions}
                      loading={orgsLoading}
                      showSearch
                      optionFilterProp="plainLabel"
                      optionLabelProp="plainLabel"
                      style={{ width: '100%' }}
                    />
                  </Space>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <Space direction="vertical" size={6} style={{ width: '100%' }}>
                    <Typography.Text>手机号</Typography.Text>
                    <Input
                      id="personnel-search-phone"
                      type="search"
                      placeholder="号码包含匹配（忽略空格）…"
                      value={searchPhone}
                      onChange={(e) => setSearchPhone(e.target.value)}
                      autoComplete="off"
                    />
                  </Space>
                </Col>
              </Row>
              {(orgsLoading || orgsLoadError) && (
                <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  {orgsLoading && <Typography.Text type="secondary">组织列表加载中…</Typography.Text>}
                  {orgsLoadError && (
                    <>
                      <Typography.Text type="danger">{orgsLoadError}</Typography.Text>
                      <Button type="link" size="small" onClick={() => void refetchViewableOrgs()}>
                        重试
                      </Button>
                    </>
                  )}
                </div>
              )}
            </Card>
          </section>

          <section aria-labelledby="personnel-list-heading">
            <div className="flex items-center justify-between mb-3">
              <Typography.Title id="personnel-list-heading" level={4} style={{ margin: 0 }}>
                人员列表
              </Typography.Title>
              <Typography.Text type="secondary">
                共 {filtered.length} 条{filtersActive ? `（已筛选，全量 ${items.length} 条）` : ''}
              </Typography.Text>
            </div>

            <Card>
              {loadError ? (
                <div style={{ textAlign: 'center', padding: 24 }}>
                  <Typography.Text type="danger">{loadError}</Typography.Text>
                  <br />
                  <Button style={{ marginTop: 12 }} onClick={() => void loadList()}>
                    重试
                  </Button>
                </div>
              ) : (
                <Table<PersonnelRecord>
                  rowKey="id"
                  loading={loading}
                  columns={columns}
                  dataSource={filtered}
                  pagination={{ pageSize: 10, showSizeChanger: true }}
                  scroll={{ x: 1100 }}
                  locale={{
                    emptyText: (
                      <Empty
                        description={
                          items.length === 0
                            ? '暂无人员，点击「新增人员」添加第一条记录。'
                            : '没有符合当前搜索条件的人员。'
                        }
                      />
                    ),
                  }}
                />
              )}
            </Card>
          </section>
        </Space>
      </div>

      <Modal
        title="新增人员"
        open={addOpen}
        okText={submitting ? '保存中…' : '保存'}
        cancelText="取消"
        confirmLoading={submitting}
        onCancel={() => {
          setAddOpen(false)
          resetAddForm()
        }}
        onOk={() => {
          void addForm.submit()
        }}
      >
        <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
          带 * 为必填项；新建默认为启用
        </Typography.Paragraph>
        <Form<PersonnelFormValues> form={addForm} layout="vertical" onFinish={handleAddSubmit}>
          <Form.Item
            name="fullName"
            label="姓名 *"
            rules={[
              { required: true, whitespace: true, message: '请输入姓名' },
              { max: 30, message: '姓名不能超过 30 个字符' },
            ]}
          >
            <Input id="pf-name" autoComplete="name" />
          </Form.Item>
          <Form.Item name="gender" label="性别" initialValue="unknown">
            <Select
              id="pf-gender"
              options={(Object.keys(GENDER_LABEL) as PersonnelGender[]).map((g) => ({
                label: GENDER_LABEL[g],
                value: g,
              }))}
            />
          </Form.Item>
          <Form.Item
            name="phone"
            label="电话"
            rules={[
              {
                validator: (_, value: string) => {
                  const err = validateOptionalMainlandMobile(value ?? '')
                  return err ? Promise.reject(new Error(err)) : Promise.resolve()
                },
              },
            ]}
          >
            <Input
              id="pf-phone"
              type="tel"
              placeholder="11 位手机号，可含 +86 或空格；可留空"
              autoComplete="tel"
            />
          </Form.Item>
          <Form.Item
            name="organizationId"
            label="所属组织"
            initialValue={FORM_ORG_UNASSIGNED}
          >
            <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
              与组织管理保持同一数据源
            </Typography.Text>
            <Select
              id="pf-org"
              options={formOrgSelectOptions}
              loading={orgsLoading}
              showSearch
              optionFilterProp="plainLabel"
              optionLabelProp="plainLabel"
            />
          </Form.Item>
          <Form.Item name="address" label="住址">
            <Input id="pf-address" autoComplete="street-address" />
          </Form.Item>
          <Form.Item name="remark" label="备注" rules={[{ max: 200, message: '备注不能超过 200 个字符' }]}>
            <Input id="pf-remark" />
          </Form.Item>
          {formError && <Typography.Text type="danger">{formError}</Typography.Text>}
        </Form>
      </Modal>

      <Modal
        title="编辑人员"
        open={editTarget !== null}
        okText={submitting ? '保存中…' : '保存'}
        cancelText="取消"
        confirmLoading={submitting}
        onCancel={() => {
          setEditTarget(null)
          resetEditForm()
        }}
        onOk={() => {
          void editForm.submit()
        }}
      >
        <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
          修改后保存；启用状态请使用列表中的禁用/启用
        </Typography.Paragraph>
        <Form<PersonnelFormValues> form={editForm} layout="vertical" onFinish={handleEditSubmit}>
          <Form.Item
            name="fullName"
            label="姓名 *"
            rules={[
              { required: true, whitespace: true, message: '请输入姓名' },
              { max: 30, message: '姓名不能超过 30 个字符' },
            ]}
          >
            <Input id="pf-edit-name" autoComplete="name" />
          </Form.Item>
          <Form.Item name="gender" label="性别">
            <Select
              id="pf-edit-gender"
              options={(Object.keys(GENDER_LABEL) as PersonnelGender[]).map((g) => ({
                label: GENDER_LABEL[g],
                value: g,
              }))}
            />
          </Form.Item>
          <Form.Item
            name="phone"
            label="电话"
            rules={[
              {
                validator: (_, value: string) => {
                  const err = validateOptionalMainlandMobile(value ?? '')
                  return err ? Promise.reject(new Error(err)) : Promise.resolve()
                },
              },
            ]}
          >
            <Input
              id="pf-edit-phone"
              type="tel"
              placeholder="11 位手机号，可含 +86 或空格；可留空"
              autoComplete="tel"
            />
          </Form.Item>
          <Form.Item name="organizationId" label="所属组织">
            <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
              与组织管理保持同一数据源
            </Typography.Text>
            <Select
              id="pf-edit-org"
              options={editOrgSelectOptions}
              loading={orgsLoading}
              showSearch
              optionFilterProp="plainLabel"
              optionLabelProp="plainLabel"
            />
          </Form.Item>
          <Form.Item name="address" label="住址">
            <Input id="pf-edit-address" autoComplete="street-address" />
          </Form.Item>
          <Form.Item name="remark" label="备注" rules={[{ max: 200, message: '备注不能超过 200 个字符' }]}>
            <Input id="pf-edit-remark" />
          </Form.Item>
          {formError && <Typography.Text type="danger">{formError}</Typography.Text>}
        </Form>
      </Modal>

      <Modal title="人员详情" open={detail !== null} footer={null} onCancel={() => setDetail(null)}>
        {detail && (
          <Descriptions column={1} size="small">
            <Descriptions.Item label="状态">{detail.isActive ? '启用' : '已禁用'}</Descriptions.Item>
            <Descriptions.Item label="姓名">{detail.fullName}</Descriptions.Item>
            <Descriptions.Item label="性别">{GENDER_LABEL[detail.gender]}</Descriptions.Item>
            <Descriptions.Item label="电话">{detail.phone || '—'}</Descriptions.Item>
            <Descriptions.Item label="所属组织">{detail.organizationDisplayName ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="住址">{detail.address || '—'}</Descriptions.Item>
            {detail.remark && <Descriptions.Item label="备注">{detail.remark}</Descriptions.Item>}
          </Descriptions>
        )}
      </Modal>
    </div>
  )
}

export default PersonnelManagementPage
