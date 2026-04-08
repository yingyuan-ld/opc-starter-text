/**
 * QA：人员管理使用的 getViewableOrganizations 与组织管理 loadUploadableOrgs 底层同源（均走 getUploadableOrganizations）
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { OrganizationQueries } from '../organizationQueries'

describe('OrganizationQueries — 可关联组织 API（人员/组织管理联通）', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('getViewableOrganizations 委托 getUploadableOrganizations，userId 原样传递', async () => {
    const queries = new OrganizationQueries()
    const spy = vi.spyOn(queries, 'getUploadableOrganizations').mockResolvedValue([])

    await queries.getViewableOrganizations('user-qa-1')

    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenCalledWith('user-qa-1')
  })
})
