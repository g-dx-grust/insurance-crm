'use client'

import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { past12Months } from '@/lib/constants/settlement'

type Period = 'month' | 'quarter' | 'year'

const PERIOD_LABELS: Record<Period, string> = {
  month: '今月',
  quarter: '今四半期',
  year: '今年度',
}

export interface MonthlyDatum {
  settlement_month: string
  fee_amount: number
  status: string
}

export function MonthlyFeeChart({ data }: { data: MonthlyDatum[] }) {
  const [period, setPeriod] = useState<Period>('year')

  const chartData = useMemo(() => {
    const monthsAll = past12Months()
    const months = filterMonths(monthsAll, period)
    return months.map((m) => {
      const rows = data.filter((d) => d.settlement_month === m)
      const completed = rows
        .filter((d) => d.status === '完了')
        .reduce((s, d) => s + (d.fee_amount ?? 0), 0)
      const pending = rows
        .filter((d) => d.status !== '完了')
        .reduce((s, d) => s + (d.fee_amount ?? 0), 0)
      return {
        month: m,
        完了: completed / 10000,
        未精算: pending / 10000,
      }
    })
  }, [data, period])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-sub">月次手数料推移 (万円)</h3>
        <div className="flex rounded-md border border-border">
          {(['month', 'quarter', 'year'] as Period[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={
                'px-3 py-1 text-xs first:rounded-l-sm last:rounded-r-sm ' +
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
      <div className="h-72 rounded-md border border-border bg-bg p-3">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
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
              formatter={(value) =>
                typeof value === 'number'
                  ? `${value.toLocaleString()}万円`
                  : String(value)
              }
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="完了" stackId="a" fill="var(--color-accent)" />
            <Bar dataKey="未精算" stackId="a" fill="var(--color-border-strong)" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function filterMonths(months: string[], period: Period): string[] {
  const now = new Date()
  const cy = now.getFullYear()
  const cm = now.getMonth() + 1
  const cq = Math.floor((cm - 1) / 3) // 0-3

  if (period === 'month') {
    return [`${cy}-${String(cm).padStart(2, '0')}`]
  }
  if (period === 'quarter') {
    const startMonth = cq * 3 + 1
    return Array.from({ length: 3 }, (_, i) => {
      const m = startMonth + i
      return `${cy}-${String(m).padStart(2, '0')}`
    })
  }
  return months // 今年度 = 過去 12 ヶ月
}
