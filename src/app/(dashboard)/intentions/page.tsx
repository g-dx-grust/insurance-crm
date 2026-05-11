import { PageHeader } from '@/components/ui/PageHeader'
import {
  IntentionListClient,
  type IntentionListItem,
} from '@/components/features/intentions/IntentionListClient'
import { createClient } from '@/lib/supabase/server'
import { getCurrentTenantId } from '@/lib/auth/server'
import { sanitizePostgrestSearch } from '@/lib/utils/escape'

export const metadata = { title: '意向把握 | N-LIC CRM' }

type SearchParams = Promise<{
  q?: string
  status?: string
  assigned_to?: string
  page?: string
}>

export default async function IntentionsPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const sp = await searchParams
  const supabase = await createClient()
  const tenantId = await getCurrentTenantId()

  let query = supabase
    .from('intention_records')
    .select(
      'id, status, initial_intention, final_intention, comparison_method, created_at, customers!customer_id(id, name, name_kana), user_profiles!created_by(name)',
    )
    .order('created_at', { ascending: false })

  if (sp.status) query = query.eq('status', sp.status)
  if (sp.assigned_to) query = query.eq('created_by', sp.assigned_to)
  if (sp.q) {
    const safe = sanitizePostgrestSearch(sp.q)
    if (safe.length > 0) {
      // 顧客名での検索: customers!inner で結合 + ilike
      query = query
        .select(
          'id, status, initial_intention, final_intention, comparison_method, created_at, customers!customer_id!inner(id, name, name_kana), user_profiles!created_by(name)',
        )
        .ilike('customers.name', `%${safe}%`)
    }
  }

  const [{ data: intentions, error }, { count: waiting }, { data: users }] =
    await Promise.all([
      query,
      supabase
        .from('intention_records')
        .select('id', { count: 'exact', head: true })
        .eq('status', '承認待'),
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
        title="意向把握"
        description="保険業法対応の意向把握記録 (4 ステップウィザードで作成)。物理削除はできません。"
      />
      <IntentionListClient
        intentions={(intentions ?? []) as unknown as IntentionListItem[]}
        approvalWaitingCount={waiting ?? 0}
        users={users ?? []}
      />
    </div>
  )
}
