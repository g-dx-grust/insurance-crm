'use client'

import { useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { LayoutGrid, List, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StatusBadge, type StatusVariant } from '@/components/ui/StatusBadge'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatTokyoDate } from '@/lib/utils/datetime'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  OPPORTUNITY_STAGES,
  ACTIVE_STAGES,
  type OpportunityStage,
} from '@/lib/constants/opportunity'
import {
  OpportunityModal,
  type OpportunityInitial,
} from './OpportunityModal'
import { StageSelect } from './StageSelect'
import type { CustomerOption } from '@/components/features/customers/CustomerCombobox'

export interface OpportunityListItem {
  id: string
  customer_id: string
  title: string
  stage: string
  estimated_premium: number | null
  expected_close_date: string | null
  updated_at: string
  customers: { id: string; name: string; name_kana: string } | null
  user_profiles: { id: string; name: string } | null
}

interface UserOption {
  id: string
  name: string
}

const VIEW_KEY = 'nlic_opportunities_view'

export function OpportunitiesClient({
  opportunities,
  customers,
  users,
}: {
  opportunities: OpportunityListItem[]
  customers: CustomerOption[]
  users: UserOption[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()

  const [view, setView] = useState<'kanban' | 'list'>(() => {
    if (typeof window === 'undefined') return 'kanban'
    return (localStorage.getItem(VIEW_KEY) as 'kanban' | 'list') ?? 'kanban'
  })
  const setViewPersisted = (v: 'kanban' | 'list') => {
    setView(v)
    localStorage.setItem(VIEW_KEY, v)
  }

  const [modalOpen, setModalOpen] = useState(false)

  const updateParams = (mut: (p: URLSearchParams) => void) => {
    const params = new URLSearchParams(sp.toString())
    mut(params)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-md border border-border bg-bg p-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:flex-1">
          <Select
            value={sp.get('stage') ?? '__all__'}
            onValueChange={(v) =>
              updateParams((p) => {
                if (!v || v === '__all__') p.delete('stage')
                else p.set('stage', v)
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="ステージ: 全て" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">ステージ: 全て</SelectItem>
              {OPPORTUNITY_STAGES.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={sp.get('assigned_to') ?? '__all__'}
            onValueChange={(v) =>
              updateParams((p) => {
                if (!v || v === '__all__') p.delete('assigned_to')
                else p.set('assigned_to', v)
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="担当: 全員" items={users} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">担当: 全員</SelectItem>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-border">
            <button
              type="button"
              onClick={() => setViewPersisted('kanban')}
              className={`rounded-l-sm px-3 py-1.5 text-xs ${
                view === 'kanban'
                  ? 'bg-[color:var(--color-accent-tint)] text-[color:var(--color-accent)] font-medium'
                  : 'text-text-sub hover:bg-[color:var(--color-bg-secondary)]'
              }`}
              aria-pressed={view === 'kanban'}
            >
              <LayoutGrid className="size-3.5 inline mr-1" />
              カンバン
            </button>
            <button
              type="button"
              onClick={() => setViewPersisted('list')}
              className={`rounded-r-sm px-3 py-1.5 text-xs ${
                view === 'list'
                  ? 'bg-[color:var(--color-accent-tint)] text-[color:var(--color-accent)] font-medium'
                  : 'text-text-sub hover:bg-[color:var(--color-bg-secondary)]'
              }`}
              aria-pressed={view === 'list'}
            >
              <List className="size-3.5 inline mr-1" />
              リスト
            </button>
          </div>
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="mr-1 size-4" />
            新規作成
          </Button>
        </div>
      </div>

      {opportunities.length === 0 ? (
        <EmptyState
          title="案件がありません"
          description="「新規作成」ボタンから案件を登録できます。"
        />
      ) : view === 'kanban' ? (
        <KanbanView opportunities={opportunities} router={router} />
      ) : (
        <ListView opportunities={opportunities} router={router} />
      )}

      <OpportunityModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        customers={customers}
        users={users}
        onSaved={(id) => router.push(`/opportunities/${id}`)}
      />
    </div>
  )
}

function KanbanView({
  opportunities,
  router,
}: {
  opportunities: OpportunityListItem[]
  router: ReturnType<typeof useRouter>
}) {
  // ACTIVE_STAGES のみを列として表示。成約・失注は別カラム or 隠し
  const stagesToShow = ACTIVE_STAGES
  const grouped = stagesToShow.reduce<Record<string, OpportunityListItem[]>>(
    (acc, s) => {
      acc[s] = opportunities.filter((o) => o.stage === s)
      return acc
    },
    {},
  )

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {stagesToShow.map((stage) => (
        <div
          key={stage}
          className="rounded-md border border-border bg-[color:var(--color-bg-secondary)] p-2"
        >
          <div className="flex items-center justify-between px-1 py-1.5">
            <span className="text-xs font-medium text-text-sub">{stage}</span>
            <span className="text-xs text-text-muted">
              {grouped[stage]?.length ?? 0}
            </span>
          </div>
          <div className="space-y-2">
            {(grouped[stage] ?? []).map((o) => (
              <KanbanCard key={o.id} opportunity={o} onOpen={() => router.push(`/opportunities/${o.id}`)} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function KanbanCard({
  opportunity,
  onOpen,
}: {
  opportunity: OpportunityListItem
  onOpen: () => void
}) {
  const o = opportunity
  return (
    <div
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onOpen()}
      className="cursor-pointer rounded-md border border-border bg-bg p-2.5 transition-colors hover:border-border-strong"
    >
      <p className="text-sm font-medium text-text line-clamp-2">{o.title}</p>
      <p className="mt-1 text-xs text-text-muted">{o.customers?.name ?? '—'}</p>
      <div className="mt-2 flex items-center justify-between text-xs text-text-muted">
        <span>{o.user_profiles?.name ?? '—'}</span>
        {o.estimated_premium != null && (
          <span>{(o.estimated_premium / 10000).toLocaleString()}万円</span>
        )}
      </div>
      {o.expected_close_date && (
        <p className="mt-1 text-xs text-text-muted">予定: {o.expected_close_date}</p>
      )}
      <div className="mt-2" onClick={(e) => e.stopPropagation()} role="presentation">
        <StageSelect
          opportunityId={o.id}
          current={o.stage as OpportunityStage}
          size="sm"
        />
      </div>
    </div>
  )
}

function ListView({
  opportunities,
  router,
}: {
  opportunities: OpportunityListItem[]
  router: ReturnType<typeof useRouter>
}) {
  return (
    <div className="overflow-hidden rounded-md border border-border bg-bg">
      <table>
        <thead>
          <tr>
            <th>案件タイトル</th>
            <th>顧客</th>
            <th>ステージ</th>
            <th>想定保険料</th>
            <th>予定日</th>
            <th>担当</th>
            <th>更新</th>
          </tr>
        </thead>
        <tbody>
          {opportunities.map((o) => (
            <tr
              key={o.id}
              className="cursor-pointer transition-colors hover:bg-[color:var(--color-bg-secondary)]"
              onClick={() => router.push(`/opportunities/${o.id}`)}
            >
              <td className="font-medium text-text">{o.title}</td>
              <td className="text-text-sub">
                {o.customers ? (
                  <Link
                    href={`/customers/${o.customers.id}`}
                    className="hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {o.customers.name}
                  </Link>
                ) : (
                  '—'
                )}
              </td>
              <td>
                <StatusBadge variant={stageVariant(o.stage)}>{o.stage}</StatusBadge>
              </td>
              <td className="text-text-sub">
                {o.estimated_premium != null
                  ? `${o.estimated_premium.toLocaleString()}円`
                  : '—'}
              </td>
              <td className="text-text-sub">{o.expected_close_date ?? '—'}</td>
              <td className="text-text-sub">{o.user_profiles?.name ?? '—'}</td>
              <td className="text-text-muted">
                {formatTokyoDate(o.updated_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function stageVariant(stage: string): StatusVariant {
  switch (stage) {
    case '成約': return 'success'
    case '失注': return 'danger'
    case 'クロージング': return 'warning'
    case '初回接触': return 'muted'
    default: return 'info'
  }
}
