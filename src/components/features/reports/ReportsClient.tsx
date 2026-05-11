'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { EmptyState } from '@/components/ui/EmptyState'

const PERIOD_LABELS: Record<string, string> = {
  this_month: '今月',
  this_quarter: '今四半期',
  this_year: '今年度',
}

const PIE_COLORS = [
  'var(--color-accent)',
  'var(--color-success)',
  'var(--color-warning)',
  'var(--color-text-sub)',
  'var(--color-text-muted)',
]

export interface MonthlyContractDatum {
  month: string
  count: number
  premium_total: number
}

export interface ByUserDatum {
  user_id: string
  name: string
  count: number
  premium_total: number
}

export interface ByCategoryDatum {
  category: string
  count: number
  premium_total: number
}

export interface AgeDistributionDatum {
  bucket: string
  count: number
}

export function ReportsClient({
  monthlyContracts,
  byUser,
  byCategory,
  ageDistribution,
  period,
}: {
  monthlyContracts: MonthlyContractDatum[]
  byUser: ByUserDatum[]
  byCategory: ByCategoryDatum[]
  ageDistribution: AgeDistributionDatum[]
  period: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()

  const setPeriod = (p: string) => {
    const params = new URLSearchParams(sp.toString())
    params.set('period', p)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between rounded-md border border-border bg-bg p-4">
        <span className="text-sm text-text-sub">期間</span>
        <div className="flex rounded-md border border-border">
          {Object.keys(PERIOD_LABELS).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={
                'px-3 py-1.5 text-xs first:rounded-l-sm last:rounded-r-sm ' +
                (p === period
                  ? 'bg-[color:var(--color-accent-tint)] text-[color:var(--color-accent)] font-medium'
                  : 'text-text-sub hover:bg-[color:var(--color-bg-secondary)]')
              }
              aria-pressed={p === period}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="月次新規契約推移 (過去 12 ヶ月)">
          {monthlyContracts.length === 0 ? (
            <EmptyState title="データがありません" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyContracts}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
                  stroke="var(--color-border)"
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
                  stroke="var(--color-border)"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-bg)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 4,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="count" name="件数" fill="var(--color-accent)" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title={`担当者別実績 (${PERIOD_LABELS[period]})`}>
          {byUser.length === 0 ? (
            <EmptyState title="データがありません" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byUser} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
                  stroke="var(--color-border)"
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={80}
                  tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
                  stroke="var(--color-border)"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-bg)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 4,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="count" name="新規契約 (件)" fill="var(--color-accent)" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title={`商品カテゴリ別構成 (${PERIOD_LABELS[period]})`}>
          {byCategory.length === 0 ? (
            <EmptyState title="データがありません" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={byCategory}
                  dataKey="count"
                  nameKey="category"
                  outerRadius={90}
                  label={(entry: { name?: unknown }) => String(entry.name ?? '')}
                >
                  {byCategory.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-bg)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 4,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="顧客年代分布">
          {ageDistribution.length === 0 ? (
            <EmptyState title="データがありません" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ageDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis
                  dataKey="bucket"
                  tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
                  stroke="var(--color-border)"
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
                  stroke="var(--color-border)"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-bg)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 4,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="count" name="顧客数" fill="var(--color-accent)" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>
    </div>
  )
}

function ChartCard({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-md border border-border bg-bg p-4">
      <h3 className="mb-3 text-sm font-semibold text-text-sub">{title}</h3>
      <div className="h-64">{children}</div>
    </div>
  )
}
