import { PageHeader } from '@/components/ui/PageHeader'
import {
  ReportsClient,
  type AgeDistributionDatum,
  type ByCategoryDatum,
  type ByUserDatum,
  type MonthlyContractDatum,
} from '@/components/features/reports/ReportsClient'
import { createClient } from '@/lib/supabase/server'
import {
  createTokyoDate,
  formatTokyoMonthKey,
  getTokyoDateTimeParts,
  pastTokyoMonthKeys,
  shiftTokyoYearMonth,
  tokyoMonthRangeIso,
} from '@/lib/utils/datetime'

export const metadata = { title: 'レポート | HOKENA CRM' }

type SearchParams = Promise<{ period?: string }>

function getPeriodRange(period: string): { startDate: string; endDate: string } {
  const now = getTokyoDateTimeParts()
  const end = createTokyoDate(now.year, now.month, now.day, 23, 59, 59)
  let start: Date
  if (period === 'this_month') {
    start = createTokyoDate(now.year, now.month, 1)
  } else if (period === 'this_quarter') {
    const q = Math.floor((now.month - 1) / 3)
    start = createTokyoDate(now.year, q * 3 + 1, 1)
  } else {
    start = createTokyoDate(now.year, 1, 1)
  }
  return {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  }
}

function past12MonthsKeys(): string[] {
  return pastTokyoMonthKeys()
}

function ageBucket(age: number): string {
  if (age < 20) return '〜10代'
  if (age < 30) return '20代'
  if (age < 40) return '30代'
  if (age < 50) return '40代'
  if (age < 60) return '50代'
  if (age < 70) return '60代'
  if (age < 80) return '70代'
  return '80代以上'
}

const AGE_BUCKETS = [
  '〜10代',
  '20代',
  '30代',
  '40代',
  '50代',
  '60代',
  '70代',
  '80代以上',
] as const

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const sp = await searchParams
  const period = sp.period ?? 'this_month'
  const { startDate, endDate } = getPeriodRange(period)
  const supabase = await createClient()

  // 過去 12 ヶ月の境界
  const now = getTokyoDateTimeParts()
  const monthsStartParts = shiftTokyoYearMonth(now.year, now.month, -11)
  const monthsStart = tokyoMonthRangeIso(
    monthsStartParts.year,
    monthsStartParts.month,
  ).startDate

  const [{ data: monthly }, { data: byUser }, { data: byCategory }, { data: ages }] =
    await Promise.all([
      supabase
        .from('contracts')
        .select('created_at, premium')
        .gte('created_at', monthsStart)
        .is('deleted_at', null),
      supabase
        .from('contracts')
        .select('assigned_to, premium, user_profiles!assigned_to(name)')
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .is('deleted_at', null),
      supabase
        .from('contracts')
        .select('product_category, premium')
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .is('deleted_at', null),
      supabase
        .from('customers_with_age')
        .select('age')
        .not('age', 'is', null),
    ])

  // 月次集計
  const monthlyMap = new Map<string, { count: number; premium_total: number }>()
  for (const m of past12MonthsKeys()) monthlyMap.set(m, { count: 0, premium_total: 0 })
  for (const row of monthly ?? []) {
    const r = row as { created_at: string; premium: number | null }
    const key = formatTokyoMonthKey(r.created_at)
    const cur = monthlyMap.get(key)
    if (cur) {
      cur.count++
      cur.premium_total += r.premium ?? 0
    }
  }
  const monthlyContracts: MonthlyContractDatum[] = Array.from(monthlyMap.entries()).map(
    ([month, v]) => ({ month, ...v }),
  )

  // 担当者別
  const userMap = new Map<string, ByUserDatum>()
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
  const byUserResult = Array.from(userMap.values()).sort((a, b) => b.count - a.count)

  // カテゴリ別
  const catMap = new Map<string, ByCategoryDatum>()
  for (const row of byCategory ?? []) {
    const r = row as { product_category: string; premium: number | null }
    const cur = catMap.get(r.product_category) ?? {
      category: r.product_category,
      count: 0,
      premium_total: 0,
    }
    cur.count++
    cur.premium_total += r.premium ?? 0
    catMap.set(r.product_category, cur)
  }
  const byCategoryResult = Array.from(catMap.values())

  // 年代分布
  const bucketMap = new Map<string, number>()
  for (const b of AGE_BUCKETS) bucketMap.set(b, 0)
  for (const row of ages ?? []) {
    const r = row as { age: number | null }
    if (r.age == null) continue
    const b = ageBucket(r.age)
    bucketMap.set(b, (bucketMap.get(b) ?? 0) + 1)
  }
  const ageDistribution: AgeDistributionDatum[] = Array.from(bucketMap.entries()).map(
    ([bucket, count]) => ({ bucket, count }),
  )

  return (
    <div>
      <PageHeader
        title="レポート"
        description="月次新規契約・担当者別実績・商品カテゴリ別構成・顧客年代分布。"
      />
      <ReportsClient
        monthlyContracts={monthlyContracts}
        byUser={byUserResult}
        byCategory={byCategoryResult}
        ageDistribution={ageDistribution}
        period={period}
      />
    </div>
  )
}
