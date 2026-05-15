'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Pencil, Plus, AlertTriangle, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatTokyoDateTime } from '@/lib/utils/datetime'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { ContactHistoryModal } from './ContactHistoryModal'
import {
  FamilyMemberModal,
  type FamilyMemberInitial,
} from './FamilyMemberModal'
import { DeleteCustomerButton } from './DeleteCustomerButton'
import { DeleteFamilyButton } from './DeleteFamilyButton'

export interface CustomerDetail {
  id: string
  name: string
  name_kana: string
  birth_date: string | null
  age: number | null
  is_elderly: boolean
  gender: string | null
  postal_code: string | null
  address: string | null
  phone: string | null
  email: string | null
  status: string
  note: string | null
  user_profiles: { id: string; name: string } | null
}

export interface ContractRow {
  id: string
  policy_number: string
  insurance_company: string
  product_name: string
  product_category: string
  premium: number
  status: string
  expiry_date: string | null
}

export interface ContactHistoryRow {
  id: string
  type: string
  content: string
  contacted_at: string
  next_action: string | null
  next_action_date: string | null
  user_profiles: { name: string } | null
}

export interface MeetingTemplateOption {
  id: string
  title: string
  type: string
  content: string
  next_action: string | null
}

export interface OpportunityRow {
  id: string
  title: string
  stage: string
  estimated_premium: number | null
  expected_close_date: string | null
}

export type FamilyRow = FamilyMemberInitial

export function CustomerDetailClient({
  customer,
  contracts,
  contactHistories,
  opportunities,
  familyMembers,
  meetingTemplates,
}: {
  customer: CustomerDetail
  contracts: ContractRow[]
  contactHistories: ContactHistoryRow[]
  opportunities: OpportunityRow[]
  familyMembers: FamilyRow[]
  meetingTemplates: MeetingTemplateOption[]
}) {
  const [contactOpen, setContactOpen] = useState(false)
  const [familyModalOpen, setFamilyModalOpen] = useState(false)
  const [editingFamily, setEditingFamily] = useState<FamilyMemberInitial | null>(null)

  const openFamilyNew = () => {
    setEditingFamily(null)
    setFamilyModalOpen(true)
  }
  const openFamilyEdit = (m: FamilyMemberInitial) => {
    setEditingFamily(m)
    setFamilyModalOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-text">{customer.name}</h1>
            <StatusBadge variant={statusVariant(customer.status)}>
              {customer.status}
            </StatusBadge>
          </div>
          <p className="mt-1 text-sm text-text-muted">{customer.name_kana}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            render={<Link href={`/customers/${customer.id}/edit`} />}
          >
            <Pencil className="mr-1 size-4" />
            編集
          </Button>
          <DeleteCustomerButton customerId={customer.id} customerName={customer.name} />
        </div>
      </div>

      {customer.is_elderly && (
        <div className="flex gap-3 rounded-md border border-[color:var(--color-warning)]/30 bg-[color:var(--color-warning)]/10 p-3">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[color:var(--color-warning)]" />
          <div>
            <p className="text-sm font-semibold text-[color:var(--color-warning)]">
              高齢者対応が必要です
            </p>
            <p className="mt-1 text-xs text-text-sub">
              保険業法に基づき、意向把握・高齢者確認フローを実施してください。
              家族同席または録音・録画を推奨します。
            </p>
          </div>
        </div>
      )}

      <Tabs defaultValue="basic">
        <TabsList>
          <TabsTrigger value="basic">基本情報</TabsTrigger>
          <TabsTrigger value="contracts">契約 ({contracts.length})</TabsTrigger>
          <TabsTrigger value="histories">対応履歴 ({contactHistories.length})</TabsTrigger>
          <TabsTrigger value="opportunities">案件 ({opportunities.length})</TabsTrigger>
          <TabsTrigger value="family">家族 ({familyMembers.length})</TabsTrigger>
        </TabsList>

        {/* 基本情報 */}
        <TabsContent value="basic" className="mt-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <InfoCard label="生年月日 / 年齢">
              {customer.birth_date ? (
                <span>
                  {customer.birth_date}
                  {customer.age != null && (
                    <span className="ml-2 text-text-muted">({customer.age}歳)</span>
                  )}
                </span>
              ) : (
                <Empty />
              )}
            </InfoCard>
            <InfoCard label="性別">{customer.gender ?? <Empty />}</InfoCard>
            <InfoCard label="電話番号">{customer.phone ?? <Empty />}</InfoCard>
            <InfoCard label="メールアドレス">{customer.email ?? <Empty />}</InfoCard>
            <InfoCard label="郵便番号">{customer.postal_code ?? <Empty />}</InfoCard>
            <InfoCard label="担当者">{customer.user_profiles?.name ?? <Empty />}</InfoCard>
            <InfoCard label="住所" className="sm:col-span-2">{customer.address ?? <Empty />}</InfoCard>
            <InfoCard label="備考" className="sm:col-span-2">
              {customer.note ? (
                <p className="whitespace-pre-wrap">{customer.note}</p>
              ) : (
                <Empty />
              )}
            </InfoCard>
          </div>
        </TabsContent>

        {/* 契約 */}
        <TabsContent value="contracts" className="mt-4">
          <div className="mb-3 flex justify-end">
            <Button size="sm" render={<Link href={`/contracts/new?customer_id=${customer.id}`} />}>
              <Plus className="mr-1 size-4" />
              新規契約
            </Button>
          </div>
          {contracts.length === 0 ? (
            <EmptyState title="契約がありません" description="「新規契約」ボタンから登録できます (Phase 4 で実装)。" />
          ) : (
            <div className="overflow-hidden rounded-md border border-border bg-bg">
              <table>
                <thead>
                  <tr>
                    <th>証券番号</th>
                    <th>保険会社</th>
                    <th>商品名</th>
                    <th>カテゴリ</th>
                    <th>保険料</th>
                    <th>満期日</th>
                    <th>状態</th>
                  </tr>
                </thead>
                <tbody>
                  {contracts.map((c) => (
                    <tr key={c.id}>
                      <td className="font-mono text-xs">{c.policy_number}</td>
                      <td>{c.insurance_company}</td>
                      <td>{c.product_name}</td>
                      <td className="text-text-sub">{c.product_category}</td>
                      <td className="text-text-sub">{c.premium.toLocaleString()}円</td>
                      <td className="text-text-sub">{c.expiry_date ?? '—'}</td>
                      <td><StatusBadge>{c.status}</StatusBadge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* 対応履歴 */}
        <TabsContent value="histories" className="mt-4">
          <div className="mb-3 flex justify-end">
            <Button size="sm" onClick={() => setContactOpen(true)}>
              <Plus className="mr-1 size-4" />
              対応履歴を登録
            </Button>
          </div>
          {contactHistories.length === 0 ? (
            <EmptyState title="対応履歴がありません" description="顧客とのやり取りを記録すると、ここに履歴が並びます。" />
          ) : (
            <ol className="space-y-3">
              {contactHistories.map((h) => (
                <li
                  key={h.id}
                  className="rounded-md border border-border bg-bg p-4"
                >
                  <div className="flex items-center justify-between text-xs text-text-muted">
                    <div className="flex items-center gap-2">
                      <StatusBadge variant="info">{h.type}</StatusBadge>
                      <span>{formatTokyoDateTime(h.contacted_at)}</span>
                    </div>
                    <span>{h.user_profiles?.name ?? '—'}</span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-text">{h.content}</p>
                  {(h.next_action || h.next_action_date) && (
                    <div className="mt-2 rounded-sm bg-[color:var(--color-bg-secondary)] px-2 py-1.5 text-xs text-text-sub">
                      次回: {h.next_action ?? '(内容未記入)'}
                      {h.next_action_date && (
                        <span className="ml-2 text-text-muted">({h.next_action_date})</span>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ol>
          )}
        </TabsContent>

        {/* 案件 */}
        <TabsContent value="opportunities" className="mt-4">
          <div className="mb-3 flex justify-end">
            <Button size="sm" render={<Link href={`/opportunities/new?customer_id=${customer.id}`} />}>
              <Plus className="mr-1 size-4" />
              新規案件
            </Button>
          </div>
          {opportunities.length === 0 ? (
            <EmptyState title="案件がありません" description="この顧客に関連する商談・提案を案件として管理します (Phase 5)。" />
          ) : (
            <ul className="space-y-2">
              {opportunities.map((o) => (
                <li
                  key={o.id}
                  className="flex items-center justify-between rounded-md border border-border bg-bg p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-text">{o.title}</p>
                    {o.expected_close_date && (
                      <p className="text-xs text-text-muted">予定: {o.expected_close_date}</p>
                    )}
                  </div>
                  <StatusBadge variant="info">{o.stage}</StatusBadge>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        {/* 家族 */}
        <TabsContent value="family" className="mt-4">
          <div className="mb-3 flex items-center justify-between">
            <FamilyCoverageBar members={familyMembers} />
            <Button size="sm" onClick={openFamilyNew}>
              <UserPlus className="mr-1 size-4" />
              家族を追加
            </Button>
          </div>
          {familyMembers.length === 0 ? (
            <EmptyState title="家族情報が登録されていません" description="世帯カバレッジ分析・意向把握の精度向上のため、家族構成を登録できます。" />
          ) : (
            <div className="overflow-hidden rounded-md border border-border bg-bg">
              <table>
                <thead>
                  <tr>
                    <th>続柄</th>
                    <th>氏名</th>
                    <th>生年月日</th>
                    <th>性別</th>
                    <th>被保険者</th>
                    <th>受取人</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {familyMembers.map((m) => (
                    <tr key={m.id}>
                      <td className="text-text-sub">{m.relationship}</td>
                      <td className="font-medium text-text">{m.name}</td>
                      <td className="text-text-sub">{m.birth_date ?? '—'}</td>
                      <td className="text-text-sub">{m.gender ?? '—'}</td>
                      <td>{m.is_insured ? <StatusBadge variant="success">○</StatusBadge> : <span className="text-text-muted">—</span>}</td>
                      <td>{m.is_beneficiary ? <StatusBadge variant="success">○</StatusBadge> : <span className="text-text-muted">—</span>}</td>
                      <td className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openFamilyEdit(m)}
                          className="rounded-sm p-1 text-text-muted hover:bg-[color:var(--color-bg-secondary)] hover:text-text"
                          aria-label="編集"
                          title="編集"
                        >
                          <Pencil className="size-3.5" />
                        </button>
                        <DeleteFamilyButton id={m.id} customerId={customer.id} name={m.name} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <ContactHistoryModal
        open={contactOpen}
        onOpenChange={setContactOpen}
        customerId={customer.id}
        templates={meetingTemplates}
      />
      <FamilyMemberModal
        open={familyModalOpen}
        onOpenChange={(o) => {
          setFamilyModalOpen(o)
          if (!o) setEditingFamily(null)
        }}
        customerId={customer.id}
        initial={editingFamily ?? undefined}
      />
    </div>
  )
}

function InfoCard({
  label,
  children,
  className,
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`rounded-md border border-border bg-bg p-4 ${className ?? ''}`}>
      <p className="text-xs font-medium text-text-muted">{label}</p>
      <div className="mt-1 text-sm text-text">{children}</div>
    </div>
  )
}

function Empty() {
  return <span className="text-text-muted">—</span>
}

function FamilyCoverageBar({ members }: { members: FamilyRow[] }) {
  const total = members.length
  const insured = members.filter((m) => m.is_insured).length
  if (total === 0) return <div />
  const pct = Math.round((insured / total) * 100)
  return (
    <div className="text-xs text-text-muted">
      世帯加入カバレッジ: <span className="font-medium text-text">{insured}/{total}</span> ({pct}%)
    </div>
  )
}

function statusVariant(status: string): 'success' | 'info' | 'muted' | 'default' {
  switch (status) {
    case '既存': return 'success'
    case '見込': return 'info'
    case '休眠': return 'muted'
    default:     return 'default'
  }
}
