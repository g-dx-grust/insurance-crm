'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentTenantId, getSessionUserOrRedirect } from '@/lib/auth/server'
import {
  contractSchema,
  type ContractFormValues,
} from '@/lib/validations/contract'
import {
  contractRiderSchema,
  type ContractRiderFormValues,
} from '@/lib/validations/contract-rider'
import {
  renewalRecordSchema,
  type RenewalRecordFormValues,
} from '@/lib/validations/renewal'
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

// ─── Contract ──────────────────────────────────────────────────────

export async function createContract(
  values: ContractFormValues,
): Promise<ActionResult<{ id: string }>> {
  const parsed = contractSchema.safeParse(emptyToNull(values))
  if (!parsed.success) {
    return {
      ok: false,
      error: '入力内容に誤りがあります。',
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  const supabase = await createClient()
  const tenantId = await getCurrentTenantId()

  const { data, error } = await supabase
    .from('contracts')
    .insert({ ...parsed.data, tenant_id: tenantId })
    .select('id')
    .single()

  if (error || !data) {
    return { ok: false, error: error?.message ?? '登録に失敗しました。' }
  }

  revalidatePath('/contracts')
  revalidatePath(`/customers/${parsed.data.customer_id}`)
  redirect(`/contracts/${data.id}`)
}

export async function updateContract(
  id: string,
  values: ContractFormValues,
): Promise<ActionResult> {
  const parsed = contractSchema.safeParse(emptyToNull(values))
  if (!parsed.success) {
    return {
      ok: false,
      error: '入力内容に誤りがあります。',
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('contracts')
    .update(parsed.data)
    .eq('id', id)

  if (error) return { ok: false, error: error.message }

  revalidatePath('/contracts')
  revalidatePath(`/contracts/${id}`)
  revalidatePath(`/customers/${parsed.data.customer_id}`)
  redirect(`/contracts/${id}`)
}

export async function deleteContract(
  id: string,
  customerId: string,
): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('contracts')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return { ok: false, error: error.message }

  revalidatePath('/contracts')
  revalidatePath(`/customers/${customerId}`)
  redirect('/contracts')
}

// ─── Contract Rider ────────────────────────────────────────────────

export async function upsertRider(
  values: ContractRiderFormValues,
  riderId?: string,
): Promise<ActionResult> {
  const parsed = contractRiderSchema.safeParse(emptyToNull(values))
  if (!parsed.success) {
    return {
      ok: false,
      error: '入力内容に誤りがあります。',
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  const supabase = await createClient()
  const tenantId = await getCurrentTenantId()

  if (riderId) {
    const { error } = await supabase
      .from('contract_riders')
      .update({
        name: parsed.data.name,
        coverage: parsed.data.coverage ?? null,
        premium: parsed.data.premium ?? 0,
        expiry_date: parsed.data.expiry_date ?? null,
        is_active: parsed.data.is_active,
      })
      .eq('id', riderId)
    if (error) return { ok: false, error: error.message }
  } else {
    const { error } = await supabase.from('contract_riders').insert({
      tenant_id: tenantId,
      contract_id: parsed.data.contract_id,
      name: parsed.data.name,
      coverage: parsed.data.coverage ?? null,
      premium: parsed.data.premium ?? 0,
      expiry_date: parsed.data.expiry_date ?? null,
      is_active: parsed.data.is_active,
    })
    if (error) return { ok: false, error: error.message }
  }

  revalidatePath(`/contracts/${parsed.data.contract_id}`)
  return { ok: true }
}

export async function deleteRider(
  riderId: string,
  contractId: string,
): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('contract_riders')
    .delete()
    .eq('id', riderId)
  if (error) return { ok: false, error: error.message }

  revalidatePath(`/contracts/${contractId}`)
  return { ok: true }
}

// ─── Renewal Record ────────────────────────────────────────────────
// 更改履歴を contact_histories に type='更改' で記録 + contracts.renewal_status を更新する。

export async function addRenewalRecord(
  values: RenewalRecordFormValues,
): Promise<ActionResult> {
  const parsed = renewalRecordSchema.safeParse(emptyToNull(values))
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

  const lines = [
    `更改日: ${parsed.data.renewal_date}`,
    parsed.data.new_premium != null ? `更改後保険料: ${parsed.data.new_premium.toLocaleString()}円` : null,
    parsed.data.lark_approval_id ? `Lark Approval: ${parsed.data.lark_approval_id}` : null,
    '',
    parsed.data.content,
  ]
    .filter(Boolean)
    .join('\n')

  const { error: histErr } = await supabase.from('contact_histories').insert({
    tenant_id: tenantId,
    customer_id: parsed.data.customer_id,
    type: '更改',
    content: lines,
    contacted_at: toTokyoIsoFromDateTimeLocal(`${parsed.data.renewal_date}T00:00`),
    recorded_by: parsed.data.assigned_to ?? user.id,
  })
  if (histErr) return { ok: false, error: histErr.message }

  // 契約側の更改ステータスと (任意で) 保険料を更新
  const update: {
    renewal_status: string
    premium?: number
    status?: string
  } = { renewal_status: parsed.data.next_renewal_status }
  if (parsed.data.new_premium != null) update.premium = parsed.data.new_premium
  if (parsed.data.next_renewal_status === '完了') update.status = '有効'

  const { error: updErr } = await supabase
    .from('contracts')
    .update(update)
    .eq('id', parsed.data.contract_id)
  if (updErr) return { ok: false, error: updErr.message }

  revalidatePath(`/contracts/${parsed.data.contract_id}`)
  revalidatePath(`/customers/${parsed.data.customer_id}`)
  return { ok: true }
}
