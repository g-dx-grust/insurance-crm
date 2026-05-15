import { PageHeader } from '@/components/ui/PageHeader'
import { CustomerForm } from '@/components/features/customers/CustomerForm'
import { createClient } from '@/lib/supabase/server'
import { getCurrentTenantId } from '@/lib/auth/server'

export const metadata = { title: '顧客新規登録 | HOKENA CRM' }

export default async function NewCustomerPage() {
  const supabase = await createClient()
  const tenantId = await getCurrentTenantId()

  const { data: users } = await supabase
    .from('user_profiles')
    .select('id, name')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .order('name')

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="顧客を新規登録"
        description="保険業法に基づく必要事項を入力してください。"
      />
      <CustomerForm mode="create" users={users ?? []} />
    </div>
  )
}
