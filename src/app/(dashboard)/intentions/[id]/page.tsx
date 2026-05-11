import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  getCurrentTenantId,
  getSessionUserOrRedirect,
} from '@/lib/auth/server'
import {
  IntentionDetailClient,
  type IntentionDetail,
  type IntentionProductRow,
} from '@/components/features/intentions/IntentionDetailClient'

export const metadata = { title: '意向把握詳細 | N-LIC CRM' }

export default async function IntentionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const tenantId = await getCurrentTenantId()
  const { user, profile } = await getSessionUserOrRedirect()

  const { data: intention, error } = await supabase
    .from('intention_records')
    .select(
      `*, customers!customer_id(id, name, name_kana), contracts!contract_id(id, policy_number, product_name), approver:user_profiles!approver_id(id, name), creator:user_profiles!created_by(id, name)`,
    )
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!intention) notFound()

  const [{ data: products }, { data: approvers }] = await Promise.all([
    supabase
      .from('intention_products')
      .select(
        'id, insurance_company, product_name, product_category, premium, is_recommended, recommendation_reason, sort_order',
      )
      .eq('intention_record_id', id)
      .order('sort_order', { ascending: true }),
    supabase
      .from('user_profiles')
      .select('id, name')
      .eq('tenant_id', tenantId)
      .eq('role', 'admin')
      .eq('is_active', true)
      .order('name'),
  ])

  return (
    <IntentionDetailClient
      intention={intention as unknown as IntentionDetail}
      products={(products ?? []) as IntentionProductRow[]}
      approvers={approvers ?? []}
      currentUserRole={profile.role}
      currentUserId={user.id}
    />
  )
}
