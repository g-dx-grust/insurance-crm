'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  getCurrentTenantId,
  getSessionUserOrRedirect,
} from '@/lib/auth/server'
import {
  intentionWizardSchema,
  type IntentionWizardValues,
} from '@/lib/validations/intention'

type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[] | undefined> }

function emptyToNull<T extends Record<string, unknown>>(values: T): T {
  const out: Record<string, unknown> = { ...values }
  for (const k of Object.keys(out)) {
    if (typeof out[k] === 'string' && (out[k] as string).trim() === '') out[k] = null
  }
  return out as T
}

// ─── 新規作成 (4 ステップ完了時) ──────────────────────────────────

export async function createIntentionRecord(
  values: IntentionWizardValues,
): Promise<ActionResult<{ id: string }>> {
  const parsed = intentionWizardSchema.safeParse(emptyToNull(values))
  if (!parsed.success) {
    return {
      ok: false,
      error: '入力内容に誤りがあります。',
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  const supabase = await createClient()
  const tenantId = await getCurrentTenantId()
  const { user } = await getSessionUserOrRedirect()

  const v = parsed.data
  const status = v.approver_id ? '承認待' : '実施済'

  const { data: record, error } = await supabase
    .from('intention_records')
    .insert({
      tenant_id: tenantId,
      customer_id: v.customer_id,
      contract_id: v.contract_id ?? null,
      initial_intention: v.initial_intention,
      initial_recorded_at: new Date(v.initial_recorded_at).toISOString(),
      comparison_method: v.comparison_method,
      comparison_reason: v.comparison_reason ?? null,
      final_intention: v.final_intention,
      final_recorded_at: new Date(v.final_recorded_at).toISOString(),
      checklist: { ...v.checklist, _change_note: v.final_change_note ?? null },
      status,
      approver_id: v.approver_id ?? null,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (error || !record) {
    return { ok: false, error: error?.message ?? '保存に失敗しました' }
  }

  if (v.products.length > 0) {
    const { error: prodErr } = await supabase
      .from('intention_products')
      .insert(
        v.products.map((p, index) => ({
          intention_record_id: record.id,
          tenant_id: tenantId,
          insurance_company: p.insurance_company,
          product_name: p.product_name,
          product_category: p.product_category,
          premium: p.premium,
          is_recommended: p.is_recommended,
          recommendation_reason: p.recommendation_reason ?? null,
          sort_order: index,
        })),
      )
    if (prodErr) return { ok: false, error: prodErr.message }
  }

  revalidatePath('/intentions')
  revalidatePath(`/customers/${v.customer_id}`)
  if (v.contract_id) revalidatePath(`/contracts/${v.contract_id}`)
  redirect(`/intentions/${record.id}`)
}

// ─── 承認依頼 (Lark Approval キュー登録のモック) ─────────────────────

export async function enqueueIntentionApproval(
  intentionId: string,
  approverId: string,
): Promise<ActionResult> {
  const supabase = await createClient()
  const tenantId = await getCurrentTenantId()

  // 1. 通知キューに積む (Lark Rules §4.2: 非同期処理 + 指数バックオフ)
  // Phase 8 の実 Lark API 接続前段。ここでは pending として記録するのみ。
  const { error: notifErr } = await supabase.from('notification_logs').insert({
    tenant_id: tenantId,
    channel: 'lark_approval',
    target_type: 'user',
    target_value: approverId,
    template_key: 'intention_approval_request',
    payload: { intention_id: intentionId, approver_id: approverId },
    status: 'pending',
  })
  if (notifErr) return { ok: false, error: notifErr.message }

  // 2. 意向把握ステータスを承認待に
  const { error: updErr } = await supabase
    .from('intention_records')
    .update({ status: '承認待', approver_id: approverId })
    .eq('id', intentionId)
  if (updErr) return { ok: false, error: updErr.message }

  revalidatePath(`/intentions/${intentionId}`)
  revalidatePath('/intentions')
  return { ok: true }
}

// ─── 承認 / 差戻 (admin が押す前提。Lark 連携前は手動承認に使う) ─────

export async function approveIntention(
  intentionId: string,
): Promise<ActionResult> {
  const supabase = await createClient()
  const { user } = await getSessionUserOrRedirect()

  const { error } = await supabase
    .from('intention_records')
    .update({
      status: '承認済',
      approved_at: new Date().toISOString(),
      approver_id: user.id,
      rejection_reason: null,
    })
    .eq('id', intentionId)

  if (error) return { ok: false, error: error.message }

  revalidatePath(`/intentions/${intentionId}`)
  revalidatePath('/intentions')
  return { ok: true }
}

export async function rejectIntention(
  intentionId: string,
  reason: string,
): Promise<ActionResult> {
  if (!reason.trim()) return { ok: false, error: '差戻理由を入力してください' }
  const supabase = await createClient()
  const { user } = await getSessionUserOrRedirect()

  const { error } = await supabase
    .from('intention_records')
    .update({
      status: '差戻',
      rejection_reason: reason,
      approver_id: user.id,
    })
    .eq('id', intentionId)

  if (error) return { ok: false, error: error.message }

  revalidatePath(`/intentions/${intentionId}`)
  revalidatePath('/intentions')
  return { ok: true }
}

// ─── 再提出 (差戻後、状態を実施済に戻す) ────────────────────────────

export async function resubmitIntention(
  intentionId: string,
): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('intention_records')
    .update({
      status: '実施済',
      rejection_reason: null,
    })
    .eq('id', intentionId)

  if (error) return { ok: false, error: error.message }

  revalidatePath(`/intentions/${intentionId}`)
  revalidatePath('/intentions')
  return { ok: true }
}

// ※ deleteIntention は実装しない (RLS で DELETE 拒否、保険業法対応)
