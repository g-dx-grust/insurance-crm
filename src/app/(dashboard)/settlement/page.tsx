import { PageHeader } from '@/components/ui/PageHeader'
import {
  SettlementClient,
  type MdrtPerformanceRow,
  type SettlementRow,
} from '@/components/features/settlement/SettlementClient'
import type { MonthlyDatum } from '@/components/features/settlement/MonthlyFeeChart'
import { createClient } from '@/lib/supabase/server'
import { currentMonth, past12MonthsStart } from '@/lib/constants/settlement'
import { CSV_TEMPLATES } from '@/lib/settlement/csvTemplates'

export const metadata = { title: '精算・MDRT管理 | N-LIC CRM' }

type SearchParams = Promise<{
  month?: string
  status?: string
  company?: string
}>

export default async function SettlementPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const sp = await searchParams
  const supabase = await createClient()

  const targetMonth = sp.month ?? currentMonth()
  const currentYear = new Date().getFullYear()

  let listQuery = supabase
    .from('settlements')
    .select('*', { count: 'exact' })
    .eq('settlement_month', targetMonth)
    .order('created_at', { ascending: false })

  if (sp.status) listQuery = listQuery.eq('status', sp.status)
  if (sp.company) listQuery = listQuery.eq('insurance_company', sp.company)

  const [
    { data: settlements, count, error },
    { data: mdrtPerformances },
    { data: mdrtTarget },
    { data: monthlyData },
  ] = await Promise.all([
    listQuery,
    supabase
      .from('mdrt_performances')
      .select('id, user_id, performance_value, user_profiles!user_id(id, name)')
      .eq('year', currentYear),
    supabase
      .from('mdrt_targets')
      .select('mdrt_target, cot_target, tot_target')
      .eq('year', currentYear)
      .maybeSingle(),
    supabase
      .from('settlements')
      .select('settlement_month, fee_amount, status')
      .gte('settlement_month', past12MonthsStart())
      .order('settlement_month', { ascending: true }),
  ])

  if (error) throw new Error(error.message)

  const targets = {
    mdrt: Number(mdrtTarget?.mdrt_target ?? 6_000_000),
    cot: Number(mdrtTarget?.cot_target ?? 12_000_000),
    tot: Number(mdrtTarget?.tot_target ?? 18_000_000),
  }

  return (
    <div>
      <PageHeader
        title="精算・MDRT管理"
        description="月次精算の確認・MDRT 進捗・CSV インポートを行います。"
      />
      <SettlementClient
        settlements={(settlements ?? []) as SettlementRow[]}
        total={count ?? 0}
        mdrtPerformances={(mdrtPerformances ?? []) as unknown as MdrtPerformanceRow[]}
        mdrtTargets={targets}
        monthlyData={(monthlyData ?? []) as MonthlyDatum[]}
        targetMonth={targetMonth}
        insuranceCompanies={CSV_TEMPLATES.map((t) => t.insurance_company)}
      />
    </div>
  )
}
