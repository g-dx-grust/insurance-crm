'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  getCurrentTenantId,
  getSessionUserOrRedirect,
} from '@/lib/auth/server'
import {
  documentCarryOutSchema,
  type DocumentCarryOutFormValues,
} from '@/lib/validations/document-carry-out'
import { toTokyoIsoFromDateTimeLocal } from '@/lib/utils/datetime'

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

export async function upsertCarryOutLog(
  values: DocumentCarryOutFormValues,
  id?: string,
): Promise<ActionResult<{ id: string }>> {
  const parsed = documentCarryOutSchema.safeParse(emptyToNull(values))
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
  const now = new Date().toISOString()
  const lossReportedAt = parsed.data.status === '紛失' ? now : null
  const payload = {
    tenant_id: tenantId,
    customer_id: parsed.data.customer_id ?? null,
    document_title: parsed.data.document_title,
    document_type: parsed.data.document_type,
    purpose: parsed.data.purpose,
    destination: parsed.data.destination ?? null,
    carried_out_by: parsed.data.carried_out_by,
    carried_out_at: toTokyoIsoFromDateTimeLocal(parsed.data.carried_out_at),
    expected_return_at: parsed.data.expected_return_at
      ? toTokyoIsoFromDateTimeLocal(parsed.data.expected_return_at)
      : null,
    returned_at: parsed.data.returned_at
      ? toTokyoIsoFromDateTimeLocal(parsed.data.returned_at)
      : null,
    status: parsed.data.status,
    loss_reported_at: lossReportedAt,
    note: parsed.data.note ?? null,
  }

  if (id) {
    const { data, error } = await supabase
      .from('document_carry_out_logs')
      .update(payload)
      .eq('id', id)
      .select('id')
      .single()
    if (error || !data) return { ok: false, error: error?.message ?? '更新に失敗しました' }
    revalidatePath('/carry-out-logs')
    return { ok: true, data }
  }

  const { data, error } = await supabase
    .from('document_carry_out_logs')
    .insert({ ...payload, created_by: user.id })
    .select('id')
    .single()

  if (error || !data) return { ok: false, error: error?.message ?? '登録に失敗しました' }

  revalidatePath('/carry-out-logs')
  return { ok: true, data }
}
