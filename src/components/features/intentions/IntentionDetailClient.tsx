'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Copy, Link2, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ApprovalSection } from './ApprovalSection'
import { createRemoteSignatureRequest } from '@/app/(dashboard)/intentions/actions'
import { INTENTION_CHECKLIST_ITEMS } from '@/lib/constants/intention'
import { formatTokyoDateTime } from '@/lib/utils/datetime'

export interface IntentionDetail {
  id: string
  status: string
  initial_intention: string
  initial_recorded_at: string | null
  comparison_method: string | null
  comparison_reason: string | null
  final_intention: string | null
  final_recorded_at: string | null
  checklist: Record<string, unknown>
  approver_id: string | null
  approved_at: string | null
  rejection_reason: string | null
  lark_approval_id: string | null
  created_at: string
  customers: { id: string; name: string; name_kana: string; email: string | null } | null
  contracts: { id: string; policy_number: string; product_name: string } | null
  approver: { id: string; name: string } | null
  creator: { id: string; name: string } | null
}

export interface IntentionProductRow {
  id: string
  insurance_company: string
  product_name: string
  product_category: string
  premium: number
  is_recommended: boolean
  recommendation_reason: string | null
  sort_order: number
}

export interface IntentionSignatureEvidence {
  id: string
  revision: number
  signer_name: string
  consent_text: string
  consent_version: string
  signed_at: string
  signature_storage_path: string
  signature_sha256: string
  signature_mime_type: string
  signature_size_bytes: number
  manifest_storage_path: string
  evidence_manifest_sha256: string
  server_seal_algorithm: string
  server_seal_key_id: string
  server_seal: string
  trusted_timestamp_provider: string | null
  trusted_timestamped_at: string | null
  client_ip: string | null
  client_user_agent: string | null
  created_at: string
  signed_url: string | null
  seal_valid: boolean | null
  signature_hash_valid: boolean | null
}

export interface FinancialCheckDetail {
  id: string
  annual_income: string
  employer_name: string | null
  investment_experience: string
  investment_knowledge: string
  note: string | null
  recorded_at: string
  user_profiles: { name: string } | null
}

export interface IntentionSignatureRequestRow {
  id: string
  signer_name: string
  signer_email: string | null
  status: string
  expires_at: string
  sent_at: string | null
  signed_at: string | null
  created_at: string
}

interface UserOption {
  id: string
  name: string
}

export function IntentionDetailClient({
  intention,
  products,
  financialChecks,
  signatureEvidences,
  signatureRequests,
  approvers,
  currentUserRole,
  currentUserId,
}: {
  intention: IntentionDetail
  products: IntentionProductRow[]
  financialChecks: FinancialCheckDetail[]
  signatureEvidences: IntentionSignatureEvidence[]
  signatureRequests: IntentionSignatureRequestRow[]
  approvers: UserOption[]
  currentUserRole: string
  currentUserId: string
}) {
  const checklist = (intention.checklist ?? {}) as Record<string, boolean | string | null>
  const changeNote = (checklist._change_note as string | null) ?? null

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        {/* ヘッダー */}
        <div className="flex flex-col gap-2 border-b border-border pb-4">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-text">意向把握記録</h1>
            <StatusBadge variant={statusVariant(intention.status)}>
              {intention.status}
            </StatusBadge>
          </div>
          <p className="text-sm text-text-muted">
            {intention.customers ? (
              <Link href={`/customers/${intention.customers.id}`} className="hover:underline">
                {intention.customers.name}
              </Link>
            ) : (
              '—'
            )}
            {intention.contracts && (
              <>
                <span className="mx-1">/</span>
                <Link
                  href={`/contracts/${intention.contracts.id}`}
                  className="font-mono hover:underline"
                >
                  {intention.contracts.policy_number}
                </Link>
                <span className="ml-1">({intention.contracts.product_name})</span>
              </>
            )}
            <span className="ml-2 text-text-muted">
              作成: {formatTokyoDateTime(intention.created_at)} (
              {intention.creator?.name ?? '—'})
            </span>
          </p>
        </div>

        {/* Step 1 */}
        <section className="rounded-md border border-border bg-bg p-5 space-y-2">
          <h2 className="text-sm font-semibold text-text-sub">当初意向</h2>
          <p className="whitespace-pre-wrap text-sm text-text">{intention.initial_intention}</p>
          {intention.initial_recorded_at && (
            <p className="text-xs text-text-muted">
              記録: {formatTokyoDateTime(intention.initial_recorded_at)}
            </p>
          )}
        </section>

        {/* Step 2 */}
        <section className="rounded-md border border-border bg-bg p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text-sub">提案・比較推奨</h2>
            {intention.comparison_method && (
              <StatusBadge variant="info">{intention.comparison_method}</StatusBadge>
            )}
          </div>
          {products.length === 0 ? (
            <p className="text-sm text-text-muted">商品の登録がありません</p>
          ) : (
            <div className="overflow-hidden rounded-md border border-border">
              <table>
                <thead>
                  <tr>
                    <th>保険会社</th>
                    <th>商品名</th>
                    <th>カテゴリ</th>
                    <th>年間保険料</th>
                    <th>推奨</th>
                    <th>推奨理由</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id}>
                      <td>{p.insurance_company}</td>
                      <td className="font-medium text-text">{p.product_name}</td>
                      <td className="text-text-sub">{p.product_category}</td>
                      <td className="text-text-sub">{p.premium.toLocaleString()}円</td>
                      <td>
                        {p.is_recommended ? (
                          <StatusBadge variant="success">推奨</StatusBadge>
                        ) : (
                          <span className="text-text-muted">—</span>
                        )}
                      </td>
                      <td className="max-w-xs whitespace-pre-wrap text-xs text-text-sub">
                        {p.recommendation_reason ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {intention.comparison_reason && (
            <div>
              <p className="text-xs font-medium text-text-sub">比較推奨理由 (全体)</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-text">
                {intention.comparison_reason}
              </p>
            </div>
          )}
        </section>

        {financialChecks.length > 0 && (
          <section className="rounded-md border border-border bg-bg p-5 space-y-3">
            <h2 className="text-sm font-semibold text-text-sub">積立系商品の財務状況確認</h2>
            {financialChecks.map((check) => (
              <div key={check.id} className="grid gap-3 text-sm sm:grid-cols-2">
                <DetailField label="年収" value={check.annual_income} />
                <DetailField label="勤務先" value={check.employer_name ?? '—'} />
                <DetailField label="投資経験" value={check.investment_experience} />
                <DetailField label="投資知識" value={check.investment_knowledge} />
                {check.note && (
                  <div className="sm:col-span-2">
                    <p className="text-xs font-medium text-text-muted">補足</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-text">{check.note}</p>
                  </div>
                )}
                <p className="sm:col-span-2 text-xs text-text-muted">
                  記録: {formatTokyoDateTime(check.recorded_at)}
                  {check.user_profiles?.name && ` / ${check.user_profiles.name}`}
                </p>
              </div>
            ))}
          </section>
        )}

        {/* Step 3 */}
        <section className="rounded-md border border-border bg-bg p-5 space-y-2">
          <h2 className="text-sm font-semibold text-text-sub">最終意向</h2>
          {intention.final_intention ? (
            <>
              <p className="whitespace-pre-wrap text-sm text-text">{intention.final_intention}</p>
              {intention.final_recorded_at && (
                <p className="text-xs text-text-muted">
                  記録: {formatTokyoDateTime(intention.final_recorded_at)}
                </p>
              )}
              {changeNote && (
                <div className="mt-2 rounded-sm bg-[color:var(--color-bg-secondary)] p-2">
                  <p className="text-xs font-medium text-text-sub">当初意向との変化点</p>
                  <p className="mt-1 whitespace-pre-wrap text-xs text-text-sub">{changeNote}</p>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-text-muted">未入力</p>
          )}
        </section>

        {/* Step 4 */}
        <section className="rounded-md border border-border bg-bg p-5 space-y-2">
          <h2 className="text-sm font-semibold text-text-sub">確認事項</h2>
          <ul className="space-y-1">
            {INTENTION_CHECKLIST_ITEMS.map((item) => {
              const done = Boolean(checklist[item.key])
              return (
                <li key={item.key} className="flex items-center gap-2 text-sm">
                  <span
                    className={
                      done
                        ? 'text-[color:var(--color-success)]'
                        : 'text-text-muted'
                    }
                  >
                    {done ? '☑' : '☐'}
                  </span>
                  <span className={done ? 'text-text' : 'text-text-muted'}>
                    {item.label}
                  </span>
                </li>
              )
            })}
          </ul>
        </section>

        {/* 電子サイン証跡 */}
        <section className="rounded-md border border-border bg-bg p-5 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-text-sub">電子サイン証跡</h2>
            {signatureEvidences[0] && (
              <StatusBadge variant={evidenceVariant(signatureEvidences[0])}>
                {evidenceLabel(signatureEvidences[0])}
              </StatusBadge>
            )}
          </div>
          {signatureEvidences.length === 0 ? (
            <p className="text-sm text-text-muted">電子サイン証跡は登録されていません</p>
          ) : (
            <div className="space-y-4">
              {signatureEvidences.map((evidence) => (
                <div key={evidence.id} className="rounded-md border border-border p-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-sm font-medium text-text">
                        Rev.{evidence.revision} / {evidence.signer_name}
                      </p>
                      <p className="mt-1 text-xs text-text-muted">
                        署名: {formatTokyoDateTime(evidence.signed_at)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge variant={hashVariant(evidence.signature_hash_valid)}>
                        画像 {hashLabel(evidence.signature_hash_valid)}
                      </StatusBadge>
                      <StatusBadge variant={hashVariant(evidence.seal_valid)}>
                        封印 {hashLabel(evidence.seal_valid)}
                      </StatusBadge>
                    </div>
                  </div>

                  {evidence.signed_url && (
                    <div className="mt-3 rounded-sm border border-border bg-[color:var(--color-bg-secondary)] p-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={evidence.signed_url}
                        alt={`${evidence.signer_name} 様の電子サイン`}
                        className="max-h-44 w-full object-contain"
                      />
                    </div>
                  )}

                  <div className="mt-3 grid gap-2 text-xs text-text-sub md:grid-cols-2">
                    <EvidenceField label="同意文言" value={evidence.consent_text} />
                    <EvidenceField label="同意文言版" value={evidence.consent_version} />
                    <EvidenceField label="署名画像SHA-256" value={shortHash(evidence.signature_sha256)} />
                    <EvidenceField label="証跡SHA-256" value={shortHash(evidence.evidence_manifest_sha256)} />
                    <EvidenceField label="封印方式" value={`${evidence.server_seal_algorithm} / ${evidence.server_seal_key_id}`} />
                    <EvidenceField label="タイムスタンプ" value={evidence.trusted_timestamp_provider ?? '未連携'} />
                  </div>

                  <div className="mt-3 flex items-start gap-2 rounded-sm bg-[color:var(--color-bg-secondary)] p-2 text-xs text-text-muted">
                    <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
                    <p>
                      署名画像、入力内容、確認事項、提案商品を証跡manifestとして固定し、サーバー封印値を保存しています。
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <aside className="space-y-4">
        <ApprovalSection
          intentionId={intention.id}
          status={intention.status}
          approverId={intention.approver_id}
          approverName={intention.approver?.name ?? null}
          approvedAt={intention.approved_at}
          rejectionReason={intention.rejection_reason}
          larkApprovalId={intention.lark_approval_id}
          approvers={approvers}
          currentUserRole={currentUserRole}
          currentUserId={currentUserId}
        />
        <RemoteSignatureRequestPanel
          intentionId={intention.id}
          defaultSignerName={intention.customers?.name ?? ''}
          requests={signatureRequests}
        />
      </aside>
    </div>
  )
}

function RemoteSignatureRequestPanel({
  intentionId,
  defaultSignerName,
  requests,
}: {
  intentionId: string
  defaultSignerName: string
  requests: IntentionSignatureRequestRow[]
}) {
  const [signerName, setSignerName] = useState(defaultSignerName)
  const [expiresInDays, setExpiresInDays] = useState(7)
  const [latestUrl, setLatestUrl] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const submit = () => {
    startTransition(async () => {
      const result = await createRemoteSignatureRequest({
        intention_record_id: intentionId,
        signer_name: signerName,
        signer_email: null,
        expires_in_days: expiresInDays,
      })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setLatestUrl(result.data?.signingUrl ?? null)
      toast.success('署名リンクを発行しました')
    })
  }

  const copyLatestUrl = async () => {
    if (!latestUrl) return
    await navigator.clipboard.writeText(latestUrl)
    toast.success('署名リンクをコピーしました')
  }

  return (
    <section className="rounded-md border border-border bg-bg p-4">
      <div className="flex items-center gap-2">
        <Link2 className="size-4 text-text-muted" />
        <h2 className="text-sm font-semibold text-text-sub">リモート署名</h2>
      </div>
      <p className="mt-2 text-xs text-text-muted">
        発行したリンクを任意の連絡手段で共有してください。リンクは発行時のみ表示されます。
      </p>
      <div className="mt-3 space-y-3">
        <FieldInline label="署名者名">
          <Input
            value={signerName}
            onChange={(event) => setSignerName(event.target.value)}
          />
        </FieldInline>
        <FieldInline label="有効期限(日)">
          <Input
            type="number"
            inputMode="numeric"
            value={expiresInDays}
            onChange={(event) => setExpiresInDays(Number(event.target.value) || 7)}
          />
        </FieldInline>
        <Button
          className="w-full"
          onClick={submit}
          disabled={pending || !signerName.trim()}
        >
          {pending ? '発行中…' : '署名リンクを発行'}
        </Button>
      </div>

      {latestUrl && (
        <div className="mt-3 rounded-sm border border-border bg-[color:var(--color-bg-secondary)] p-2">
          <p className="break-all text-xs text-text-sub">{latestUrl}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2 w-full"
            onClick={copyLatestUrl}
          >
            <Copy className="size-3.5" />
            リンクをコピー
          </Button>
        </div>
      )}

      {requests.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-medium text-text-muted">依頼履歴</p>
          {requests.map((request) => (
            <div
              key={request.id}
              className="rounded-sm border border-border bg-[color:var(--color-bg-secondary)] p-2"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-xs font-medium text-text">
                  {request.signer_name}
                </p>
                <StatusBadge variant={signatureRequestVariant(request.status)}>
                  {request.status}
                </StatusBadge>
              </div>
              <p className="mt-1 break-all text-xs text-text-muted">
                {formatTokyoDateTime(request.created_at)} 発行
              </p>
              <p className="mt-1 text-xs text-text-muted">
                期限: {formatTokyoDateTime(request.expires_at)}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function FieldInline({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <Label className="mb-1 block text-xs font-medium text-text-sub">{label}</Label>
      {children}
    </div>
  )
}

function statusVariant(status: string) {
  switch (status) {
    case '承認済': return 'success' as const
    case '差戻':   return 'danger' as const
    case '承認待': return 'warning' as const
    case '実施済': return 'info' as const
    case '未実施': return 'muted' as const
    default:       return 'default' as const
  }
}

function signatureRequestVariant(status: string) {
  switch (status) {
    case '署名済': return 'success' as const
    case '期限切れ': return 'danger' as const
    case '取消': return 'muted' as const
    case 'リンク発行': return 'info' as const
    default: return 'warning' as const
  }
}

function EvidenceField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-medium text-text-muted">{label}</p>
      <p className="mt-0.5 break-all text-text-sub">{value}</p>
    </div>
  )
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-text-muted">{label}</p>
      <p className="mt-1 text-sm text-text">{value}</p>
    </div>
  )
}

function shortHash(hash: string) {
  if (hash.length <= 24) return hash
  return `${hash.slice(0, 12)}...${hash.slice(-12)}`
}

function hashVariant(value: boolean | null) {
  if (value === true) return 'success' as const
  if (value === false) return 'danger' as const
  return 'muted' as const
}

function hashLabel(value: boolean | null) {
  if (value === true) return '検証済'
  if (value === false) return '不一致'
  return '未検証'
}

function evidenceVariant(evidence: IntentionSignatureEvidence) {
  if (evidence.signature_hash_valid === false || evidence.seal_valid === false) {
    return 'danger' as const
  }
  if (evidence.signature_hash_valid && evidence.seal_valid) return 'success' as const
  return 'warning' as const
}

function evidenceLabel(evidence: IntentionSignatureEvidence) {
  if (evidence.signature_hash_valid === false || evidence.seal_valid === false) {
    return '証跡不一致'
  }
  if (evidence.signature_hash_valid && evidence.seal_valid) return '証跡検証済'
  return '証跡一部未検証'
}
