import { PageHeader } from '@/components/ui/PageHeader'
import {
  CarryOutLogsClient,
  type CarryOutLogRow,
} from '@/components/features/carry-out-logs/CarryOutLogsClient'
import type { CustomerOption } from '@/components/features/customers/CustomerCombobox'
import { createClient } from '@/lib/supabase/server'
import {
  getCurrentTenantId,
  getSessionUserOrRedirect,
} from '@/lib/auth/server'

export const metadata = { title: '持ち出し記録簿 | HOKENA CRM' }

export default async function CarryOutLogsPage() {
  const supabase = await createClient()
  const tenantId = await getCurrentTenantId()
  const { user } = await getSessionUserOrRedirect()

  const [{ data: logs, error }, { data: customers }, { data: users }] =
    await Promise.all([
      supabase
        .from('document_carry_out_logs')
        .select(
          'id, customer_id, document_title, document_type, purpose, destination, carried_out_by, carried_out_at, expected_return_at, returned_at, status, loss_reported_at, note, customers!customer_id(id, name, name_kana), carried_user:user_profiles!carried_out_by(id, name), creator:user_profiles!created_by(name)',
        )
        .order('carried_out_at', { ascending: false })
        .limit(100),
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
        title="持ち出し記録簿"
        description="個人情報が含まれる書類の持ち出し・返却・紛失時の追跡を記録します。"
      />
      <CarryOutLogsClient
        logs={(logs ?? []) as unknown as CarryOutLogRow[]}
        customers={(customers ?? []) as CustomerOption[]}
        users={users ?? []}
        currentUserId={user.id}
      />
    </div>
  )
}
