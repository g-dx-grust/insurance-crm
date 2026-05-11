import { PageHeader } from '@/components/ui/PageHeader'
import {
  CustomerListClient,
  type CustomerListItem,
} from '@/components/features/customers/CustomerListClient'
import { createClient } from '@/lib/supabase/server'
import { getCurrentTenantId } from '@/lib/auth/server'
import { sanitizePostgrestSearch } from '@/lib/utils/escape'

export const metadata = { title: '顧客管理 | N-LIC CRM' }

const PAGE_SIZE = 20

type SearchParams = Promise<{
  q?: string
  status?: string
  assigned_to?: string
  page?: string
}>

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const sp = await searchParams
  const supabase = await createClient()
  const tenantId = await getCurrentTenantId()

  const page = Math.max(1, Number(sp.page ?? 1))
  const offset = (page - 1) * PAGE_SIZE

  let query = supabase
    .from('customers_with_age')
    .select('*, user_profiles!assigned_to(name)', { count: 'exact' })
    .order('updated_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  if (sp.q) {
    const safe = sanitizePostgrestSearch(sp.q)
    if (safe.length > 0) {
      query = query.or(`name.ilike.%${safe}%,name_kana.ilike.%${safe}%`)
    }
  }
  if (sp.status) query = query.eq('status', sp.status)
  if (sp.assigned_to) query = query.eq('assigned_to', sp.assigned_to)

  const [{ data: customers, count, error }, { data: users }] = await Promise.all([
    query,
    supabase
      .from('user_profiles')
      .select('id, name')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('name'),
  ])

  if (error) throw new Error(error.message)

  return (
    <div>
      <PageHeader
        title="顧客管理"
        description="顧客の検索・登録・家族情報の管理を行います。"
      />
      <CustomerListClient
        customers={(customers ?? []) as unknown as CustomerListItem[]}
        total={count ?? 0}
        page={page}
        pageSize={PAGE_SIZE}
        users={users ?? []}
      />
    </div>
  )
}
