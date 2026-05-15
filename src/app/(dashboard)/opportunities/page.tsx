import { PageHeader } from '@/components/ui/PageHeader'
import {
  OpportunitiesClient,
  type OpportunityListItem,
} from '@/components/features/opportunities/OpportunitiesClient'
import { createClient } from '@/lib/supabase/server'
import { getCurrentTenantId } from '@/lib/auth/server'

export const metadata = { title: '案件管理 | HOKENA CRM' }

type SearchParams = Promise<{ stage?: string; assigned_to?: string }>

export default async function OpportunitiesPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const sp = await searchParams
  const supabase = await createClient()
  const tenantId = await getCurrentTenantId()

  let query = supabase
    .from('opportunities')
    .select(
      '*, customers!customer_id(id, name, name_kana), user_profiles!assigned_to(id, name)',
    )
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })

  if (sp.stage) query = query.eq('stage', sp.stage)
  if (sp.assigned_to) query = query.eq('assigned_to', sp.assigned_to)

  const [{ data: opportunities, error }, { data: customers }, { data: users }] =
    await Promise.all([
      query,
      supabase
        .from('customers')
        .select('id, name, name_kana')
        .is('deleted_at', null)
        .order('name_kana'),
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
        title="案件管理"
        description="ステージ別カンバンと一覧で案件を管理します。"
      />
      <OpportunitiesClient
        opportunities={(opportunities ?? []) as unknown as OpportunityListItem[]}
        customers={customers ?? []}
        users={users ?? []}
      />
    </div>
  )
}
