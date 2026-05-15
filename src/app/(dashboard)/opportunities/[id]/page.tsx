import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentTenantId } from '@/lib/auth/server'
import {
  OpportunityDetailClient,
  type ActivityRow,
  type OpportunityDetail,
} from '@/components/features/opportunities/OpportunityDetailClient'
import { SUITABILITY_ITEMS, type SuitabilityKey } from '@/lib/constants/suitability'

export const metadata = { title: '案件詳細 | HOKENA CRM' }

const EMPTY_SUITABILITY: Record<SuitabilityKey, boolean> = SUITABILITY_ITEMS.reduce(
  (acc, item) => {
    acc[item.key as SuitabilityKey] = false
    return acc
  },
  {} as Record<SuitabilityKey, boolean>,
)

export default async function OpportunityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const tenantId = await getCurrentTenantId()

  const { data: opportunity, error } = await supabase
    .from('opportunities')
    .select(
      '*, customers!customer_id(id, name, name_kana), user_profiles!assigned_to(id, name)',
    )
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!opportunity) notFound()

  const [
    { data: activities },
    { data: suitabilityRow },
    { data: customers },
    { data: users },
  ] = await Promise.all([
    supabase
      .from('opportunity_activities')
      .select('id, type, content, activity_date, user_profiles!recorded_by(name)')
      .eq('opportunity_id', id)
      .order('activity_date', { ascending: false })
      .limit(50),
    supabase
      .from('opportunity_suitability')
      .select(
        'age_confirmed, income_confirmed, family_confirmed, existing_confirmed, need_confirmed, product_explained, premium_confirmed, comparison_done, consent_obtained',
      )
      .eq('opportunity_id', id)
      .maybeSingle(),
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

  const suitability = suitabilityRow
    ? (suitabilityRow as Record<SuitabilityKey, boolean>)
    : EMPTY_SUITABILITY

  return (
    <OpportunityDetailClient
      opportunity={opportunity as unknown as OpportunityDetail}
      activities={(activities ?? []) as unknown as ActivityRow[]}
      suitability={suitability}
      customers={customers ?? []}
      users={users ?? []}
    />
  )
}
