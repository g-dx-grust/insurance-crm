'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  settlementUpdateSchema,
  type SettlementUpdateValues,
} from '@/lib/validations/settlement'

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

/** 入金確認 → status='完了' */
export async function confirmPayment(
  settlementId: string,
): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('settlements')
    .update({ status: '完了' })
    .eq('id', settlementId)

  if (error) return { ok: false, error: error.message }
  revalidatePath('/settlement')
  return { ok: true }
}

/** 取消 → status='未精算' */
export async function unmatchSettlement(
  settlementId: string,
): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('settlements')
    .update({ status: '未精算', contract_id: null })
    .eq('id', settlementId)

  if (error) return { ok: false, error: error.message }
  revalidatePath('/settlement')
  return { ok: true }
}

/** 既存契約に手動で紐付け → status='照合中' に戻す */
export async function linkSettlementToContract(
  settlementId: string,
  contractId: string,
): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('settlements')
    .update({ contract_id: contractId, status: '照合中' })
    .eq('id', settlementId)

  if (error) return { ok: false, error: error.message }
  revalidatePath('/settlement')
  return { ok: true }
}

/** 精算行を編集 (金額・ステータス等) */
export async function updateSettlement(
  id: string,
  values: SettlementUpdateValues,
): Promise<ActionResult> {
  const parsed = settlementUpdateSchema.safeParse(emptyToNull(values))
  if (!parsed.success) {
    return {
      ok: false,
      error: '入力内容に誤りがあります。',
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }
  const supabase = await createClient()
  const { error } = await supabase
    .from('settlements')
    .update(parsed.data)
    .eq('id', id)

  if (error) return { ok: false, error: error.message }
  revalidatePath('/settlement')
  return { ok: true }
}
