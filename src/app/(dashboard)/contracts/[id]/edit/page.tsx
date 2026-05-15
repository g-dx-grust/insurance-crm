import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/ui/PageHeader'
import { ContractForm } from '@/components/features/contracts/ContractForm'
import { createClient } from '@/lib/supabase/server'
import { getCurrentTenantId } from '@/lib/auth/server'
import type { ContractFormValues } from '@/lib/validations/contract'

export const metadata = { title: '契約編集 | HOKENA CRM' }

export default async function EditContractPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const tenantId = await getCurrentTenantId()

  const [{ data: contract }, { data: customers }, { data: users }] =
    await Promise.all([
      supabase
        .from('contracts')
        .select(
          'customer_id, policy_number, insurance_company, product_name, product_category, premium, start_date, expiry_date, status, renewal_status, assigned_to, note',
        )
        .eq('id', id)
        .is('deleted_at', null)
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

  if (!contract) notFound()

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="契約を編集" />
      <ContractForm
        mode="edit"
        contractId={id}
        defaultValues={contract as Partial<ContractFormValues>}
        customers={customers ?? []}
        users={users ?? []}
      />
    </div>
  )
}
