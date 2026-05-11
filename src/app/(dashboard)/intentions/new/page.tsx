import { PageHeader } from '@/components/ui/PageHeader'
import {
  IntentionWizard,
  type ContractOption,
} from '@/components/features/intentions/IntentionWizard'
import { createClient } from '@/lib/supabase/server'
import { getCurrentTenantId } from '@/lib/auth/server'

export const metadata = { title: '意向把握 新規作成 | N-LIC CRM' }

export default async function NewIntentionPage({
  searchParams,
}: {
  searchParams: Promise<{ customer_id?: string; contract_id?: string }>
}) {
  const sp = await searchParams
  const supabase = await createClient()
  const tenantId = await getCurrentTenantId()

  const [{ data: customers }, { data: contracts }, { data: approvers }] =
    await Promise.all([
      supabase
        .from('customers')
        .select('id, name, name_kana')
        .is('deleted_at', null)
        .order('name_kana'),
      supabase
        .from('contracts')
        .select('id, customer_id, policy_number, insurance_company, product_name')
        .is('deleted_at', null)
        .order('policy_number'),
      supabase
        .from('user_profiles')
        .select('id, name')
        .eq('tenant_id', tenantId)
        .eq('role', 'admin')
        .eq('is_active', true)
        .order('name'),
    ])

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="意向把握を新規作成"
        description="4 ステップで完了。記録は保険業法対応のため物理削除できません。"
      />
      <IntentionWizard
        customers={customers ?? []}
        contracts={(contracts ?? []) as ContractOption[]}
        approvers={approvers ?? []}
        defaultCustomerId={sp.customer_id}
        defaultContractId={sp.contract_id}
      />
    </div>
  )
}
