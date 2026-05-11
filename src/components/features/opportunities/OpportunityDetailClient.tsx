'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Pencil, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StatusBadge, type StatusVariant } from '@/components/ui/StatusBadge'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatTokyoDateTime } from '@/lib/utils/datetime'
import { StageProgressBar } from './StageProgressBar'
import { ActivityModal } from './ActivityModal'
import {
  SuitabilityChecklist,
  type SuitabilityValues,
} from './SuitabilityChecklist'
import { LostDialog } from './LostDialog'
import { DeleteOpportunityButton } from './DeleteOpportunityButton'
import {
  OpportunityModal,
  type OpportunityInitial,
} from './OpportunityModal'
import type { OpportunityStage } from '@/lib/constants/opportunity'
import type { CustomerOption } from '@/components/features/customers/CustomerCombobox'

export interface OpportunityDetail {
  id: string
  customer_id: string
  title: string
  stage: string
  estimated_premium: number | null
  expected_close_date: string | null
  note: string | null
  lost_reason: string | null
  customers: { id: string; name: string; name_kana: string } | null
  user_profiles: { id: string; name: string } | null
}

export interface ActivityRow {
  id: string
  type: string
  content: string
  activity_date: string
  user_profiles: { name: string } | null
}

interface UserOption {
  id: string
  name: string
}

export function OpportunityDetailClient({
  opportunity,
  activities,
  suitability,
  customers,
  users,
}: {
  opportunity: OpportunityDetail
  activities: ActivityRow[]
  suitability: SuitabilityValues
  customers: CustomerOption[]
  users: UserOption[]
}) {
  const [activityOpen, setActivityOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)

  const isLost = opportunity.stage === '失注'
  const initial: OpportunityInitial = {
    id: opportunity.id,
    customer_id: opportunity.customer_id,
    title: opportunity.title,
    stage: opportunity.stage,
    estimated_premium: opportunity.estimated_premium,
    expected_close_date: opportunity.expected_close_date,
    assigned_to: opportunity.user_profiles?.id ?? null,
    note: opportunity.note,
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-text">{opportunity.title}</h1>
            <StatusBadge variant={stageVariant(opportunity.stage)}>
              {opportunity.stage}
            </StatusBadge>
          </div>
          {opportunity.customers && (
            <p className="mt-1 text-sm text-text-muted">
              <Link
                href={`/customers/${opportunity.customers.id}`}
                className="hover:underline"
              >
                {opportunity.customers.name}
              </Link>
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="mr-1 size-4" />
            編集
          </Button>
          {!isLost && opportunity.stage !== '成約' && (
            <LostDialog opportunityId={opportunity.id} />
          )}
          <DeleteOpportunityButton
            opportunityId={opportunity.id}
            customerId={opportunity.customer_id}
            title={opportunity.title}
          />
        </div>
      </div>

      {/* ステージバー */}
      <div className="rounded-md border border-border bg-bg p-4">
        <StageProgressBar
          opportunityId={opportunity.id}
          currentStage={opportunity.stage as OpportunityStage}
        />
      </div>

      {isLost && opportunity.lost_reason && (
        <div className="rounded-md border border-[color:var(--color-error)]/30 bg-[color:var(--color-error)]/10 p-3">
          <p className="text-sm font-semibold text-[color:var(--color-error)]">
            失注理由
          </p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-text-sub">
            {opportunity.lost_reason}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        {/* 左: 活動履歴 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text-sub">活動履歴</h2>
            <Button size="sm" onClick={() => setActivityOpen(true)}>
              <Plus className="mr-1 size-4" />
              活動を記録
            </Button>
          </div>
          {activities.length === 0 ? (
            <EmptyState
              title="活動履歴がありません"
              description="案件に関する電話・訪問・提案書送付などを記録できます。"
            />
          ) : (
            <ol className="space-y-3">
              {activities.map((a) => (
                <li key={a.id} className="rounded-md border border-border bg-bg p-3">
                  <div className="flex items-center justify-between text-xs text-text-muted">
                    <div className="flex items-center gap-2">
                      <StatusBadge variant="info">{a.type}</StatusBadge>
                      <span>{formatTokyoDateTime(a.activity_date)}</span>
                    </div>
                    <span>{a.user_profiles?.name ?? '—'}</span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-text">{a.content}</p>
                </li>
              ))}
            </ol>
          )}
        </div>

        {/* 右: 案件情報 + 適合性 */}
        <aside className="space-y-4">
          <div className="rounded-md border border-border bg-bg p-4">
            <p className="text-xs font-medium text-text-muted">想定保険料</p>
            <p className="mt-1 text-sm text-text">
              {opportunity.estimated_premium != null
                ? `${opportunity.estimated_premium.toLocaleString()}円`
                : '—'}
            </p>
          </div>
          <div className="rounded-md border border-border bg-bg p-4">
            <p className="text-xs font-medium text-text-muted">成約予定日</p>
            <p className="mt-1 text-sm text-text">{opportunity.expected_close_date ?? '—'}</p>
          </div>
          <div className="rounded-md border border-border bg-bg p-4">
            <p className="text-xs font-medium text-text-muted">担当者</p>
            <p className="mt-1 text-sm text-text">{opportunity.user_profiles?.name ?? '—'}</p>
          </div>
          {opportunity.note && (
            <div className="rounded-md border border-border bg-bg p-4">
              <p className="text-xs font-medium text-text-muted">メモ</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-text">{opportunity.note}</p>
            </div>
          )}

          <div className="rounded-md border border-border bg-bg p-4">
            <p className="mb-3 text-sm font-semibold text-text-sub">
              特定保険適合性確認
            </p>
            <SuitabilityChecklist
              opportunityId={opportunity.id}
              initial={suitability}
            />
          </div>
        </aside>
      </div>

      <ActivityModal
        open={activityOpen}
        onOpenChange={setActivityOpen}
        opportunityId={opportunity.id}
      />
      <OpportunityModal
        open={editOpen}
        onOpenChange={setEditOpen}
        customers={customers}
        users={users}
        initial={initial}
      />
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
