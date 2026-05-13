'use client'

import Link from 'next/link'
import { ShieldCheck } from 'lucide-react'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ApprovalSection } from './ApprovalSection'
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
  customers: { id: string; name: string; name_kana: string } | null
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

interface UserOption {
  id: string
  name: string
}

export function IntentionDetailClient({
  intention,
  products,
  signatureEvidences,
  approvers,
  currentUserRole,
  currentUserId,
}: {
  intention: IntentionDetail
  products: IntentionProductRow[]
  signatureEvidences: IntentionSignatureEvidence[]
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

      <aside>
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
      </aside>
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

function EvidenceField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-medium text-text-muted">{label}</p>
      <p className="mt-0.5 break-all text-text-sub">{value}</p>
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
