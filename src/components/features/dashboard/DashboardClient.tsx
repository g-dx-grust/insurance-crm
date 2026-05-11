'use client'

import Link from 'next/link'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
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
import {
  AlertTriangle,
  ClipboardList,
  FileText,
  Users,
  CheckCircle,
} from 'lucide-react'
import { StatusBadge, type StatusVariant } from '@/components/ui/StatusBadge'
import { EmptyState } from '@/components/ui/EmptyState'
import {
  formatRemainingDays,
  getExpiryBadgeVariant,
} from '@/lib/utils/contract'
import {
  PERIOD_LABELS,
  type PeriodKey,
} from '@/lib/utils/period'

export interface ExpiringContract {
  id: string
  policy_number: string
  insurance_company: string
  expiry_date: string | null
  renewal_status: string
  customers: { id: string; name: string } | null
  user_profiles: { name: string } | null
}

export interface MonthlyDatum {
  month: string
  count: number
  premium_total: number
}

export interface UserPerformanceDatum {
  user_id: string
  name: string
  count: number
  premium_total: number
}

export function DashboardClient({
  totalCustomers,
  activeContracts,
  newContractsThisMonth,
  pendingIntentions,
  expiringContracts,
  monthlyData,
  userPerformance,
  period,
}: {
  totalCustomers: number
  activeContracts: number
  newContractsThisMonth: number
  pendingIntentions: number
  expiringContracts: ExpiringContract[]
  monthlyData: MonthlyDatum[]
  userPerformance: UserPerformanceDatum[]
  period: PeriodKey
}) {
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()

  const setPeriod = (p: PeriodKey) => {
    const params = new URLSearchParams(sp.toString())
    params.set('period', p)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="space-y-6">
      {/* KPI カード */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="総顧客数"
          value={totalCustomers}
          icon={Users}
          href="/customers"
        />
        <KpiCard
          label="有効契約数"
          value={activeContracts}
          icon={FileText}
          href="/contracts?status=有効"
        />
        <KpiCard
          label="今月新規契約"
          value={newContractsThisMonth}
          icon={CheckCircle}
          href="/contracts"
        />
        <KpiCard
          label="承認待ち意向把握"
          value={pendingIntentions}
          icon={ClipboardList}
          href="/intentions?status=承認待"
          tone={pendingIntentions > 0 ? 'warning' : 'default'}
        />
      </div>

      {/* 期間フィルター */}
      <div className="flex items-center justify-between rounded-md border border-border bg-bg p-4">
        <span className="text-sm text-text-sub">
          月次推移・担当者別の集計期間
        </span>
        <div className="flex rounded-md border border-border">
          {(Object.keys(PERIOD_LABELS) as PeriodKey[]).map((p) => (
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
        <Card title="月次新規契約推移 (過去 12 ヶ月、件数)">
          {monthlyData.length === 0 || monthlyData.every((m) => m.count === 0) ? (
            <EmptyState title="データがありません" />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
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
            </div>
          )}
        </Card>

        <Card title={`担当者別実績 (${PERIOD_LABELS[period]})`}>
          {userPerformance.length === 0 ? (
            <EmptyState title="データがありません" />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={userPerformance} layout="vertical">
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
            </div>
          )}
        </Card>
      </div>

      {/* 満期アラート */}
      <Card title="満期アラート (60 日以内)">
        {expiringContracts.length === 0 ? (
          <EmptyState
            title="満期が近い契約はありません"
            description="60 日以内に満期を迎える「有効」契約はありません。"
          />
        ) : (
          <div className="overflow-hidden rounded-md border border-border bg-bg">
            <table>
              <thead>
                <tr>
                  <th>顧客</th>
                  <th>証券番号</th>
                  <th>保険会社</th>
                  <th>満期日</th>
                  <th>残日数</th>
                  <th>更改状況</th>
                  <th>担当</th>
                </tr>
              </thead>
              <tbody>
                {expiringContracts.map((c) => (
                  <tr
                    key={c.id}
                    className="cursor-pointer transition-colors hover:bg-[color:var(--color-bg-secondary)]"
                    onClick={() => router.push(`/contracts/${c.id}`)}
                  >
                    <td className="font-medium text-text">{c.customers?.name ?? '—'}</td>
                    <td className="font-mono text-xs">{c.policy_number}</td>
                    <td className="text-text-sub">{c.insurance_company}</td>
                    <td className="text-text-sub">{c.expiry_date ?? '—'}</td>
                    <td>
                      <StatusBadge variant={getExpiryBadgeVariant(c.expiry_date)}>
                        {formatRemainingDays(c.expiry_date)}
                      </StatusBadge>
                    </td>
                    <td>
                      <StatusBadge variant={renewalVariant(c.renewal_status)}>
                        {c.renewal_status}
                      </StatusBadge>
                    </td>
                    <td className="text-text-sub">{c.user_profiles?.name ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

    </div>
  )
}

// ─── Sub components ────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  icon: Icon,
  href,
  tone = 'default',
}: {
  label: string
  value: number
  icon: React.ComponentType<{ className?: string }>
  href?: string
  tone?: 'default' | 'warning'
}) {
  const card = (
    <div
      className={
        'flex items-center justify-between rounded-md border bg-bg p-5 transition-colors ' +
        (tone === 'warning'
          ? 'border-[color:var(--color-warning)]/30 hover:bg-[color:var(--color-warning)]/5'
          : 'border-border hover:bg-[color:var(--color-bg-secondary)]')
      }
    >
      <div>
        <p className="text-xs font-medium text-text-muted">{label}</p>
        <p
          className={
            'mt-1 text-2xl font-semibold ' +
            (tone === 'warning' ? 'text-[color:var(--color-warning)]' : 'text-text')
          }
        >
          {value.toLocaleString()}
        </p>
      </div>
      <Icon
        className={
          'size-6 ' +
          (tone === 'warning'
            ? 'text-[color:var(--color-warning)]'
            : 'text-text-muted')
        }
      />
    </div>
  )
  if (href) {
    return (
      <Link href={href} className="block">
        {card}
      </Link>
    )
  }
  return card
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-md border border-border bg-bg p-5">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-text-sub">
        {title === '満期アラート (60 日以内)' && (
          <AlertTriangle className="size-4 text-[color:var(--color-warning)]" />
        )}
        {title}
      </h2>
      {children}
    </section>
  )
}

function renewalVariant(status: string): StatusVariant {
  switch (status) {
    case '完了':   return 'success'
    case '対応中':
    case '更改中': return 'warning'
    case '辞退':   return 'muted'
    default:       return 'default'
  }
}
