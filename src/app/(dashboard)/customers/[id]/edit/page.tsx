import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/ui/PageHeader'
import { CustomerForm } from '@/components/features/customers/CustomerForm'
import type { CustomerFormValues } from '@/lib/validations/customer'
import { createClient } from '@/lib/supabase/server'
import { getCurrentTenantId } from '@/lib/auth/server'

export const metadata = { title: '顧客編集 | HOKENA CRM' }

export default async function EditCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const tenantId = await getCurrentTenantId()

  const [{ data: customer }, { data: users }] = await Promise.all([
    supabase
      .from('customers')
      .select(
        'name, name_kana, birth_date, gender, postal_code, address, phone, email, status, assigned_to, note',
      )
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle(),
    supabase
      .from('user_profiles')
      .select('id, name')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('name'),
  ])

  if (!customer) notFound()

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={`${customer.name} を編集`}
        description="変更後「更新する」を押してください。"
      />
      <CustomerForm
        mode="edit"
        customerId={id}
        defaultValues={customer as Partial<CustomerFormValues>}
        users={users ?? []}
      />
    </div>
  )
}
