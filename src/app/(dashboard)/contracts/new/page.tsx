import { PageHeader } from '@/components/ui/PageHeader'
import { ContractForm } from '@/components/features/contracts/ContractForm'
import { createClient } from '@/lib/supabase/server'
import { getCurrentTenantId } from '@/lib/auth/server'

export const metadata = { title: '契約新規登録 | N-LIC CRM' }

export default async function NewContractPage({
  searchParams,
}: {
  searchParams: Promise<{ customer_id?: string }>
}) {
  const sp = await searchParams
  const supabase = await createClient()
  const tenantId = await getCurrentTenantId()

  const [{ data: customers }, { data: users }] = await Promise.all([
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

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="契約を新規登録"
        description="証券番号は保険会社ごとに一意になるように入力してください。"
      />
      <ContractForm
        mode="create"
        customers={customers ?? []}
        users={users ?? []}
        defaultValues={{ customer_id: sp.customer_id }}
      />
    </div>
  )
}
