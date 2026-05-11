import { PageHeader } from '@/components/ui/PageHeader'
import {
  CalendarClient,
  type CalendarEventRow,
} from '@/components/features/calendar/CalendarClient'
import { createClient } from '@/lib/supabase/server'
import { getCurrentTenantId } from '@/lib/auth/server'

export const metadata = { title: 'カレンダー | N-LIC CRM' }

type SearchParams = Promise<{
  year?: string
  month?: string
  view?: string
}>

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const sp = await searchParams
  const supabase = await createClient()
  const tenantId = await getCurrentTenantId()

  const now = new Date()
  const year = Number(sp.year ?? now.getFullYear())
  const month = Number(sp.month ?? now.getMonth() + 1)

  // 表示月の前後 1 ヶ月分
  const startDate = new Date(year, month - 2, 1).toISOString()
  const endDate = new Date(year, month + 1, 0, 23, 59, 59).toISOString()

  const [{ data: events, error }, { data: customers }, { data: users }] =
    await Promise.all([
      supabase
        .from('calendar_events')
        .select('*')
        .gte('start_at', startDate)
        .lte('start_at', endDate)
        .is('deleted_at', null)
        .order('start_at', { ascending: true }),
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
        title="カレンダー"
        description="活動・社内予定を月/週ビューで管理。Lark Calendar 連携 (準備中)。"
      />
      <CalendarClient
        events={(events ?? []) as CalendarEventRow[]}
        year={year}
        month={month}
        customers={customers ?? []}
        users={users ?? []}
      />
    </div>
  )
}
