'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Pencil, Plus, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StatusBadge, type StatusVariant } from '@/components/ui/StatusBadge'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatTokyoDate } from '@/lib/utils/datetime'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  formatRemainingDays,
  getExpiryBadgeVariant,
} from '@/lib/utils/contract'
import { isSavingsProductCategory } from '@/lib/constants/financial-situation'
import { RiderModal, type RiderInitial } from './RiderModal'
import { RenewalHistoryModal } from './RenewalHistoryModal'
import { DeleteContractButton } from './DeleteContractButton'
import { DeleteRiderButton } from './DeleteRiderButton'

export interface ContractDetail {
  id: string
  customer_id: string
  policy_number: string
  insurance_company: string
  product_name: string
  product_category: string
  premium: number
  start_date: string
  expiry_date: string | null
  status: string
  renewal_status: string
  note: string | null
  customers: {
    id: string
    name: string
    name_kana: string
    birth_date: string | null
  } | null
  user_profiles: { id: string; name: string } | null
}

export type RiderRow = RiderInitial

export interface IntentionRow {
  id: string
  status: string
  initial_intention: string
  final_intention: string | null
  created_at: string
  user_profiles: { name: string } | null
}

export interface RenewalHistoryRow {
  id: string
  content: string
  contacted_at: string
  user_profiles: { name: string } | null
}

export interface FinancialCheckSummary {
  id: string
  annual_income: string
  employer_name: string | null
  investment_experience: string
  investment_knowledge: string
  recorded_at: string
  user_profiles: { name: string } | null
}

interface UserOption {
  id: string
  name: string
}

export function ContractDetailClient({
  contract,
  riders,
  intentions,
  renewalHistories,
  financialChecks,
  users,
}: {
  contract: ContractDetail
  riders: RiderRow[]
  intentions: IntentionRow[]
  renewalHistories: RenewalHistoryRow[]
  financialChecks: FinancialCheckSummary[]
  users: UserOption[]
}) {
  const [riderModalOpen, setRiderModalOpen] = useState(false)
  const [editingRider, setEditingRider] = useState<RiderInitial | null>(null)
  const [renewalOpen, setRenewalOpen] = useState(false)

  const ridersPremiumTotal = riders
    .filter((r) => r.is_active)
    .reduce((sum, r) => sum + (r.premium ?? 0), 0)
  const totalPremium = contract.premium + ridersPremiumTotal
  const isSavingsProduct = isSavingsProductCategory(contract.product_category)
  const latestFinancialCheck = financialChecks[0] ?? null

  const openRiderNew = () => {
    setEditingRider(null)
    setRiderModalOpen(true)
  }
  const openRiderEdit = (r: RiderInitial) => {
    setEditingRider(r)
    setRiderModalOpen(true)
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
      {/* メイン */}
      <div className="space-y-6">
        <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-text">{contract.product_name}</h1>
              <StatusBadge variant={contractStatusVariant(contract.status)}>
                {contract.status}
              </StatusBadge>
            </div>
            <p className="mt-1 text-sm text-text-muted">
              {contract.insurance_company} ・ 証券番号{' '}
              <span className="font-mono">{contract.policy_number}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              render={<Link href={`/contracts/${contract.id}/edit`} />}
            >
              <Pencil className="mr-1 size-4" />
              編集
            </Button>
            <DeleteContractButton
              contractId={contract.id}
              customerId={contract.customer_id}
              policyNumber={contract.policy_number}
            />
          </div>
        </div>

        <Tabs defaultValue="riders">
          <TabsList>
            <TabsTrigger value="riders">特約 ({riders.length})</TabsTrigger>
            <TabsTrigger value="premium">保険料内訳</TabsTrigger>
            <TabsTrigger value="renewals">更改履歴 ({renewalHistories.length})</TabsTrigger>
            <TabsTrigger value="intentions">関連意向把握書 ({intentions.length})</TabsTrigger>
          </TabsList>

          {/* 特約 */}
          <TabsContent value="riders" className="mt-4">
            <div className="mb-3 flex justify-end">
              <Button size="sm" onClick={openRiderNew}>
                <Plus className="mr-1 size-4" />
                特約を追加
              </Button>
            </div>
            {riders.length === 0 ? (
              <EmptyState title="特約が登録されていません" description="主契約に付帯する特約を登録できます。" />
            ) : (
              <div className="overflow-hidden rounded-md border border-border bg-bg">
                <table>
                  <thead>
                    <tr>
                      <th>特約名</th>
                      <th>保障内容</th>
                      <th>保険料</th>
                      <th>有効期限</th>
                      <th>状態</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {riders.map((r) => (
                      <tr key={r.id}>
                        <td className="font-medium text-text">{r.name}</td>
                        <td className="text-text-sub max-w-md truncate">{r.coverage ?? '—'}</td>
                        <td className="text-text-sub">{(r.premium ?? 0).toLocaleString()}円</td>
                        <td className="text-text-sub">{r.expiry_date ?? '—'}</td>
                        <td>
                          {r.is_active ? (
                            <StatusBadge variant="success">有効</StatusBadge>
                          ) : (
                            <StatusBadge variant="muted">無効</StatusBadge>
                          )}
                        </td>
                        <td className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openRiderEdit(r)}
                            className="inline-flex size-control items-center justify-center rounded-sm text-text-muted hover:bg-[color:var(--color-bg-secondary)] hover:text-text"
                            aria-label="編集"
                            title="編集"
                          >
                            <Pencil className="size-4" />
                          </button>
                          <DeleteRiderButton
                            riderId={r.id}
                            contractId={contract.id}
                            name={r.name}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          {/* 保険料内訳 */}
          <TabsContent value="premium" className="mt-4">
            <div className="overflow-hidden rounded-md border border-border bg-bg">
              <table>
                <thead>
                  <tr>
                    <th>項目</th>
                    <th className="text-right">金額</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="text-text-sub">主契約 ({contract.product_name})</td>
                    <td className="text-right">{contract.premium.toLocaleString()}円</td>
                  </tr>
                  {riders
                    .filter((r) => r.is_active)
                    .map((r) => (
                      <tr key={r.id}>
                        <td className="text-text-sub">特約: {r.name}</td>
                        <td className="text-right">{(r.premium ?? 0).toLocaleString()}円</td>
                      </tr>
                    ))}
                  <tr className="bg-[color:var(--color-bg-secondary)]">
                    <td className="font-semibold text-text">合計</td>
                    <td className="text-right font-semibold text-text">
                      {totalPremium.toLocaleString()}円
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* 更改履歴 */}
          <TabsContent value="renewals" className="mt-4">
            <div className="mb-3 flex justify-end">
              <Button size="sm" onClick={() => setRenewalOpen(true)}>
                <RefreshCw className="mr-1 size-4" />
                更改記録を追加
              </Button>
            </div>
            {renewalHistories.length === 0 ? (
              <EmptyState
                title="更改履歴がありません"
                description="更改の経緯を時系列で記録できます (対応履歴に「更改」種別で保存されます)。"
              />
            ) : (
              <ol className="space-y-3">
                {renewalHistories.map((h) => (
                  <li key={h.id} className="rounded-md border border-border bg-bg p-4">
                    <div className="flex items-center justify-between text-xs text-text-muted">
                      <div className="flex items-center gap-2">
                        <StatusBadge variant="info">更改</StatusBadge>
                        <span>{formatTokyoDate(h.contacted_at)}</span>
                      </div>
                      <span>{h.user_profiles?.name ?? '—'}</span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-text">{h.content}</p>
                  </li>
                ))}
              </ol>
            )}
          </TabsContent>

          {/* 関連意向把握書 */}
          <TabsContent value="intentions" className="mt-4">
            {intentions.length === 0 ? (
              <EmptyState
                title="意向把握記録がありません"
                description="この契約に紐づく意向把握はまだ作成されていません (Phase 6 で実装予定)。"
              />
            ) : (
              <ul className="space-y-2">
                {intentions.map((i) => (
                  <li key={i.id} className="rounded-md border border-border bg-bg p-3">
                    <Link
                      href={`/intentions/${i.id}`}
                      className="flex items-center justify-between"
                    >
                      <div>
                        <p className="text-sm text-text">{i.initial_intention}</p>
                        <p className="mt-1 text-xs text-text-muted">
                          作成: {formatTokyoDate(i.created_at)}
                          {i.user_profiles?.name && ` ・ ${i.user_profiles.name}`}
                        </p>
                      </div>
                      <StatusBadge variant={intentionVariant(i.status)}>{i.status}</StatusBadge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* 右サイド: 概要 */}
      <aside className="space-y-4">
        {isSavingsProduct && (
          <SidePanel title="財務状況確認">
            {latestFinancialCheck ? (
              <div className="space-y-2 text-xs text-text-sub">
                <p>
                  年収: <span className="font-medium text-text">{latestFinancialCheck.annual_income}</span>
                </p>
                <p>
                  勤務先: <span className="font-medium text-text">{latestFinancialCheck.employer_name ?? '—'}</span>
                </p>
                <p>
                  投資経験: <span className="font-medium text-text">{latestFinancialCheck.investment_experience}</span>
                </p>
                <p>
                  投資知識: <span className="font-medium text-text">{latestFinancialCheck.investment_knowledge}</span>
                </p>
                <p className="text-text-muted">
                  記録: {formatTokyoDate(latestFinancialCheck.recorded_at)}
                  {latestFinancialCheck.user_profiles?.name && ` / ${latestFinancialCheck.user_profiles.name}`}
                </p>
              </div>
            ) : (
              <p className="text-xs text-[color:var(--color-warning)]">
                積立系商品のため、財務状況確認が必要です。
              </p>
            )}
            <Button
              size="sm"
              variant="outline"
              className="mt-3 w-full"
              render={<Link href="/financial-checks" />}
            >
              確認画面を開く
            </Button>
          </SidePanel>
        )}

        <SidePanel title="契約者">
          {contract.customers ? (
            <Link
              href={`/customers/${contract.customers.id}`}
              className="text-sm font-medium text-accent hover:underline"
            >
              {contract.customers.name}
            </Link>
          ) : (
            <span className="text-text-muted">—</span>
          )}
          {contract.customers?.name_kana && (
            <p className="mt-0.5 text-xs text-text-muted">{contract.customers.name_kana}</p>
          )}
          {contract.customers?.birth_date && (
            <p className="mt-0.5 text-xs text-text-muted">生年月日: {contract.customers.birth_date}</p>
          )}
        </SidePanel>

        <SidePanel title="期間">
          <p className="text-sm text-text">
            {contract.start_date}
            {contract.expiry_date && (
              <>
                {' 〜 '}
                {contract.expiry_date}
              </>
            )}
          </p>
          <div className="mt-2">
            <StatusBadge variant={getExpiryBadgeVariant(contract.expiry_date)}>
              {formatRemainingDays(contract.expiry_date)}
            </StatusBadge>
          </div>
        </SidePanel>

        <SidePanel title="更改状況">
          <StatusBadge variant={renewalStatusVariant(contract.renewal_status)}>
            {contract.renewal_status}
          </StatusBadge>
        </SidePanel>

        <SidePanel title="担当者">
          <p className="text-sm text-text">{contract.user_profiles?.name ?? '—'}</p>
        </SidePanel>

        <SidePanel title="Lark 連携">
          <p className="text-xs text-text-muted">
            Approval ID は更改履歴に記録します。Lark API 接続後に自動連携されます。
          </p>
        </SidePanel>

        {contract.note && (
          <SidePanel title="備考">
            <p className="whitespace-pre-wrap text-sm text-text">{contract.note}</p>
          </SidePanel>
        )}
      </aside>

      <RiderModal
        open={riderModalOpen}
        onOpenChange={(o) => {
          setRiderModalOpen(o)
          if (!o) setEditingRider(null)
        }}
        contractId={contract.id}
        initial={editingRider ?? undefined}
      />
      <RenewalHistoryModal
        open={renewalOpen}
        onOpenChange={setRenewalOpen}
        contractId={contract.id}
        customerId={contract.customer_id}
        currentRenewalStatus={contract.renewal_status}
        users={users}
      />
    </div>
  )
}

function SidePanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-bg p-4">
      <p className="text-xs font-medium text-text-muted">{title}</p>
      <div className="mt-2">{children}</div>
    </div>
  )
}

function contractStatusVariant(status: string): StatusVariant {
  switch (status) {
    case '有効':   return 'success'
    case '更改中': return 'warning'
    case '満期':   return 'muted'
    case '解約':   return 'danger'
    default:       return 'default'
  }
}

function renewalStatusVariant(status: string): StatusVariant {
  switch (status) {
    case '完了':  return 'success'
    case '対応中':
    case '更改中': return 'warning'
    case '辞退':  return 'muted'
    default:      return 'default'
  }
}

function intentionVariant(status: string): StatusVariant {
  switch (status) {
    case '承認済': return 'success'
    case '差戻':   return 'danger'
    case '承認待': return 'warning'
    case '署名待ち': return 'warning'
    case '実施済': return 'info'
    default:       return 'default'
  }
}
