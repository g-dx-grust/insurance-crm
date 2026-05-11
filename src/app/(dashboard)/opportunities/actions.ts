'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  getCurrentTenantId,
  getSessionUserOrRedirect,
} from '@/lib/auth/server'
import {
  opportunitySchema,
  type OpportunityFormValues,
} from '@/lib/validations/opportunity'
import {
  opportunityActivitySchema,
  type OpportunityActivityFormValues,
} from '@/lib/validations/opportunity-activity'
import {
  OPPORTUNITY_STAGES,
  type OpportunityStage,
} from '@/lib/constants/opportunity'
import type { SuitabilityKey } from '@/lib/constants/suitability'

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

// ─── Opportunity ───────────────────────────────────────────────────

export async function createOpportunity(
  values: OpportunityFormValues,
): Promise<ActionResult<{ id: string }>> {
  const parsed = opportunitySchema.safeParse(emptyToNull(values))
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
    .from('opportunities')
    .insert({ ...parsed.data, tenant_id: tenantId })
    .select('id')
    .single()

  if (error || !data) return { ok: false, error: error?.message ?? '登録に失敗しました' }

  revalidatePath('/opportunities')
  revalidatePath(`/customers/${parsed.data.customer_id}`)
  return { ok: true, data: { id: data.id } }
}

export async function updateOpportunity(
  id: string,
  values: OpportunityFormValues,
): Promise<ActionResult> {
  const parsed = opportunitySchema.safeParse(emptyToNull(values))
  if (!parsed.success) {
    return {
      ok: false,
      error: '入力内容に誤りがあります。',
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('opportunities')
    .update(parsed.data)
    .eq('id', id)

  if (error) return { ok: false, error: error.message }

  revalidatePath('/opportunities')
  revalidatePath(`/opportunities/${id}`)
  revalidatePath(`/customers/${parsed.data.customer_id}`)
  return { ok: true }
}

export async function updateOpportunityStage(
  id: string,
  stage: OpportunityStage,
): Promise<ActionResult> {
  if (!OPPORTUNITY_STAGES.includes(stage)) {
    return { ok: false, error: '不正なステージです' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('opportunities')
    .update({ stage })
    .eq('id', id)

  if (error) return { ok: false, error: error.message }

  revalidatePath('/opportunities')
  revalidatePath(`/opportunities/${id}`)
  return { ok: true }
}

export async function recordLost(
  id: string,
  reason: string,
): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('opportunities')
    .update({ stage: '失注', lost_reason: reason })
    .eq('id', id)

  if (error) return { ok: false, error: error.message }

  revalidatePath('/opportunities')
  revalidatePath(`/opportunities/${id}`)
  return { ok: true }
}

export async function deleteOpportunity(
  id: string,
  customerId: string | null,
): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('opportunities')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return { ok: false, error: error.message }

  revalidatePath('/opportunities')
  if (customerId) revalidatePath(`/customers/${customerId}`)
  redirect('/opportunities')
}

// ─── Activity ──────────────────────────────────────────────────────

export async function addOpportunityActivity(
  values: OpportunityActivityFormValues,
): Promise<ActionResult> {
  const parsed = opportunityActivitySchema.safeParse(emptyToNull(values))
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

  const { error } = await supabase.from('opportunity_activities').insert({
    tenant_id: tenantId,
    opportunity_id: parsed.data.opportunity_id,
    type: parsed.data.type,
    content: parsed.data.content,
    activity_date: new Date(parsed.data.activity_date).toISOString(),
    recorded_by: user.id,
  })

  if (error) return { ok: false, error: error.message }

  revalidatePath(`/opportunities/${parsed.data.opportunity_id}`)
  return { ok: true }
}

// ─── Suitability ───────────────────────────────────────────────────

export async function saveSuitability(
  opportunityId: string,
  values: Record<SuitabilityKey, boolean>,
): Promise<ActionResult> {
  const supabase = await createClient()
  const tenantId = await getCurrentTenantId()
  const { user } = await getSessionUserOrRedirect()

  const { error } = await supabase
    .from('opportunity_suitability')
    .upsert(
      {
        opportunity_id: opportunityId,
        tenant_id: tenantId,
        age_confirmed: values.age_confirmed ?? false,
        income_confirmed: values.income_confirmed ?? false,
        family_confirmed: values.family_confirmed ?? false,
        existing_confirmed: values.existing_confirmed ?? false,
        need_confirmed: values.need_confirmed ?? false,
        product_explained: values.product_explained ?? false,
        premium_confirmed: values.premium_confirmed ?? false,
        comparison_done: values.comparison_done ?? false,
        consent_obtained: values.consent_obtained ?? false,
        recorded_by: user.id,
        recorded_at: new Date().toISOString(),
      },
      { onConflict: 'opportunity_id' },
    )

  if (error) return { ok: false, error: error.message }

  revalidatePath(`/opportunities/${opportunityId}`)
  return { ok: true }
}
