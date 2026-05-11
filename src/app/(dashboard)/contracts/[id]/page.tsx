import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentTenantId } from '@/lib/auth/server'
import {
  ContractDetailClient,
  type ContractDetail,
  type IntentionRow,
  type RenewalHistoryRow,
  type RiderRow,
} from '@/components/features/contracts/ContractDetailClient'

export const metadata = { title: '契約詳細 | N-LIC CRM' }

export default async function ContractDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const tenantId = await getCurrentTenantId()

  const { data: contract, error: contractError } = await supabase
    .from('contracts')
    .select(
      '*, customers!customer_id(id, name, name_kana, birth_date), user_profiles!assigned_to(id, name)',
    )
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()

  if (contractError) throw new Error(contractError.message)
  if (!contract) notFound()

  const customerId = (contract as unknown as { customer_id: string }).customer_id

  const [
    { data: riders },
    { data: intentions },
    { data: renewalHistories },
    { data: users },
  ] = await Promise.all([
    supabase
      .from('contract_riders')
      .select('id, name, coverage, premium, expiry_date, is_active')
      .eq('contract_id', id)
      .order('created_at', { ascending: true }),
    supabase
      .from('intention_records')
      .select(
        'id, status, initial_intention, final_intention, created_at, user_profiles!created_by(name)',
      )
      .eq('contract_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('contact_histories')
      .select('id, content, contacted_at, user_profiles!recorded_by(name)')
      .eq('customer_id', customerId)
      .eq('type', '更改')
      .order('contacted_at', { ascending: false })
      .limit(50),
    supabase
      .from('user_profiles')
      .select('id, name')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('name'),
  ])

  return (
    <ContractDetailClient
      contract={contract as unknown as ContractDetail}
      riders={(riders ?? []) as RiderRow[]}
      intentions={(intentions ?? []) as unknown as IntentionRow[]}
      renewalHistories={(renewalHistories ?? []) as unknown as RenewalHistoryRow[]}
      users={users ?? []}
    />
  )
}
