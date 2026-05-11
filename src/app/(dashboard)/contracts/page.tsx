import { PageHeader } from '@/components/ui/PageHeader'
import {
  ContractListClient,
  type ContractListItem,
} from '@/components/features/contracts/ContractListClient'
import { createClient } from '@/lib/supabase/server'
import { sanitizePostgrestSearch } from '@/lib/utils/escape'
import { ymdAfterTokyoMonths } from '@/lib/utils/datetime'

export const metadata = { title: '契約管理 | N-LIC CRM' }

const PAGE_SIZE = 20

type SearchParams = Promise<{
  q?: string
  status?: string
  category?: string
  expiry_within?: string
  page?: string
}>

export default async function ContractsPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const sp = await searchParams
  const supabase = await createClient()
  const page = Math.max(1, Number(sp.page ?? 1))
  const offset = (page - 1) * PAGE_SIZE

  let query = supabase
    .from('contracts')
    .select(
      '*, customers!customer_id(id, name, name_kana), user_profiles!assigned_to(name)',
      { count: 'exact' },
    )
    .is('deleted_at', null)
    .order('expiry_date', { ascending: true, nullsFirst: false })
    .range(offset, offset + PAGE_SIZE - 1)

  if (sp.q) {
    const safe = sanitizePostgrestSearch(sp.q)
    if (safe.length > 0) {
      query = query.or(
        `policy_number.ilike.%${safe}%,insurance_company.ilike.%${safe}%,product_name.ilike.%${safe}%`,
      )
    }
  }
  if (sp.status) query = query.eq('status', sp.status)
  if (sp.category) query = query.eq('product_category', sp.category)
  if (sp.expiry_within) {
    const months = Number(sp.expiry_within)
    if (Number.isFinite(months) && months > 0) {
      query = query.lte('expiry_date', ymdAfterTokyoMonths(months))
    }
  }

  const { data: contracts, count, error } = await query
  if (error) throw new Error(error.message)

  return (
    <div>
      <PageHeader
        title="契約管理"
        description="契約の検索・登録・特約管理・更改履歴を扱います。"
      />
      <ContractListClient
        contracts={(contracts ?? []) as unknown as ContractListItem[]}
        total={count ?? 0}
        page={page}
        pageSize={PAGE_SIZE}
      />
    </div>
  )
}
