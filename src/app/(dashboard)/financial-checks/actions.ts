'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  getCurrentTenantId,
  getSessionUserOrRedirect,
} from '@/lib/auth/server'
import {
  financialSituationSchema,
  type FinancialSituationFormValues,
} from '@/lib/validations/financial-situation'

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

export async function upsertFinancialSituationCheck(
  values: FinancialSituationFormValues,
  id?: string,
): Promise<ActionResult<{ id: string }>> {
  const parsed = financialSituationSchema.safeParse(emptyToNull(values))
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
  const payload = {
    tenant_id: tenantId,
    customer_id: parsed.data.customer_id,
    contract_id: parsed.data.contract_id ?? null,
    intention_record_id: parsed.data.intention_record_id ?? null,
    source: 'manual',
    annual_income: parsed.data.annual_income,
    employer_name: parsed.data.employer_name ?? null,
    investment_experience: parsed.data.investment_experience,
    investment_knowledge: parsed.data.investment_knowledge,
    note: parsed.data.note ?? null,
    recorded_by: user.id,
    recorded_at: new Date().toISOString(),
  }

  if (id) {
    const { data, error } = await supabase
      .from('financial_situation_checks')
      .update(payload)
      .eq('id', id)
      .select('id')
      .single()
    if (error || !data) return { ok: false, error: error?.message ?? '更新に失敗しました' }
    revalidatePaths(parsed.data.customer_id, parsed.data.contract_id ?? null)
    return { ok: true, data }
  }

  const { data, error } = await supabase
    .from('financial_situation_checks')
    .insert(payload)
    .select('id')
    .single()

  if (error || !data) return { ok: false, error: error?.message ?? '登録に失敗しました' }

  revalidatePaths(parsed.data.customer_id, parsed.data.contract_id ?? null)
  return { ok: true, data }
}

function revalidatePaths(customerId: string, contractId: string | null) {
  revalidatePath('/financial-checks')
  revalidatePath(`/customers/${customerId}`)
  if (contractId) revalidatePath(`/contracts/${contractId}`)
}
