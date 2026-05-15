import { PageHeader } from '@/components/ui/PageHeader'
import {
  CalendarClient,
  type CalendarEventRow,
} from '@/components/features/calendar/CalendarClient'
import { createClient } from '@/lib/supabase/server'
import { getCurrentTenantId } from '@/lib/auth/server'
import {
  currentTokyoYearMonth,
  shiftTokyoYearMonth,
  tokyoMonthRangeIso,
} from '@/lib/utils/datetime'

export const metadata = { title: 'カレンダー | HOKENA CRM' }

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

  const now = currentTokyoYearMonth()
  const year = Number(sp.year ?? now.year)
  const month = Number(sp.month ?? now.month)

  // 表示月の前後 1 ヶ月分
  const rangeStart = shiftTokyoYearMonth(year, month, -1)
  const rangeEnd = shiftTokyoYearMonth(year, month, 1)
  const startDate = tokyoMonthRangeIso(rangeStart.year, rangeStart.month).startDate
  const endDate = tokyoMonthRangeIso(rangeEnd.year, rangeEnd.month).endDate

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
