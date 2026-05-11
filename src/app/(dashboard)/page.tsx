import { PageHeader } from '@/components/ui/PageHeader'
import {
  DashboardClient,
  type ExpiringContract,
  type MonthlyDatum,
  type UserPerformanceDatum,
} from '@/components/features/dashboard/DashboardClient'
import { createClient } from '@/lib/supabase/server'
import {
  PERIOD_LABELS,
  getPeriodRange,
  past12MonthKeys,
  type PeriodKey,
} from '@/lib/utils/period'
import {
  currentTokyoYearMonth,
  formatTokyoMonthKey,
  shiftTokyoYearMonth,
  todayTokyoYmd,
  tokyoMonthRangeIso,
  ymdAfterTokyo,
} from '@/lib/utils/datetime'

export const metadata = { title: 'ダッシュボード | N-LIC CRM' }

type SearchParams = Promise<{ period?: string }>

const VALID_PERIODS = Object.keys(PERIOD_LABELS) as PeriodKey[]

function ymdAfter(days: number): string {
  return ymdAfterTokyo(days)
}

function todayYmd(): string {
  return todayTokyoYmd()
}

function thisMonthRange(): { start: string; end: string } {
  const now = currentTokyoYearMonth()
  const range = tokyoMonthRangeIso(now.year, now.month)
  return { start: range.startDate, end: range.endDate }
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const sp = await searchParams
  const period: PeriodKey =
    VALID_PERIODS.includes(sp.period as PeriodKey)
      ? (sp.period as PeriodKey)
      : 'this_month'

  const supabase = await createClient()
  const { startDate, endDate } = getPeriodRange(period)
  const now = currentTokyoYearMonth()
  const monthsStartParts = shiftTokyoYearMonth(now.year, now.month, -11)
  const monthsStart = tokyoMonthRangeIso(
    monthsStartParts.year,
    monthsStartParts.month,
  ).startDate
  const tm = thisMonthRange()

  const [
    { count: totalCustomers },
    { count: activeContracts },
    { count: newContractsThisMonth },
    { count: pendingIntentions },
    { data: expiring },
    { data: monthlyContracts },
    { data: byUser },
  ] = await Promise.all([
    supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null),
    supabase
      .from('contracts')
      .select('*', { count: 'exact', head: true })
      .eq('status', '有効')
      .is('deleted_at', null),
    supabase
      .from('contracts')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', tm.start)
      .lte('created_at', tm.end)
      .is('deleted_at', null),
    supabase
      .from('intention_records')
      .select('*', { count: 'exact', head: true })
      .eq('status', '承認待'),
    supabase
      .from('contracts')
      .select(
        'id, policy_number, insurance_company, expiry_date, renewal_status, customers!customer_id(id, name), user_profiles!assigned_to(name)',
      )
      .eq('status', '有効')
      .lte('expiry_date', ymdAfter(60))
      .gte('expiry_date', todayYmd())
      .is('deleted_at', null)
      .order('expiry_date', { ascending: true })
      .limit(10),
    // 月次新規契約 (過去 12 ヶ月)
    supabase
      .from('contracts')
      .select('created_at, premium')
      .gte('created_at', monthsStart)
      .is('deleted_at', null),
    // 担当者別 (期間内)
    supabase
      .from('contracts')
      .select('assigned_to, premium, user_profiles!assigned_to(name)')
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .is('deleted_at', null),
  ])

  // 月次集計
  const monthlyMap = new Map<string, { count: number; premium_total: number }>()
  for (const m of past12MonthKeys()) monthlyMap.set(m, { count: 0, premium_total: 0 })
  for (const row of monthlyContracts ?? []) {
    const r = row as { created_at: string; premium: number | null }
    const key = formatTokyoMonthKey(r.created_at)
    const cur = monthlyMap.get(key)
    if (cur) {
      cur.count++
      cur.premium_total += r.premium ?? 0
    }
  }
  const monthlyData: MonthlyDatum[] = Array.from(monthlyMap.entries()).map(
    ([month, v]) => ({ month, ...v }),
  )

  // 担当者別
  const userMap = new Map<string, UserPerformanceDatum>()
  for (const row of byUser ?? []) {
    const r = row as {
      assigned_to: string | null
      premium: number | null
      user_profiles: { name: string } | null
    }
    const id = r.assigned_to ?? '__unassigned__'
    const name = r.user_profiles?.name ?? '未割当'
    const cur = userMap.get(id) ?? {
      user_id: id,
      name,
      count: 0,
      premium_total: 0,
    }
    cur.count++
    cur.premium_total += r.premium ?? 0
    userMap.set(id, cur)
  }
  const userPerformance = Array.from(userMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  return (
    <div>
      <PageHeader
        title="ダッシュボード"
        description="今月の活動状況・注意が必要な顧客を一望できます。"
      />
      <DashboardClient
        totalCustomers={totalCustomers ?? 0}
        activeContracts={activeContracts ?? 0}
        newContractsThisMonth={newContractsThisMonth ?? 0}
        pendingIntentions={pendingIntentions ?? 0}
        expiringContracts={(expiring ?? []) as unknown as ExpiringContract[]}
        monthlyData={monthlyData}
        userPerformance={userPerformance}
        period={period}
      />
    </div>
  )
}
