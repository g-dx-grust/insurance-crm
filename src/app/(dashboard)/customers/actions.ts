'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentTenantId, getSessionUserOrRedirect } from '@/lib/auth/server'
import {
  customerSchema,
  type CustomerFormValues,
} from '@/lib/validations/customer'
import {
  contactHistorySchema,
  type ContactHistoryFormValues,
} from '@/lib/validations/contact-history'
import {
  familyMemberSchema,
  type FamilyMemberFormValues,
} from '@/lib/validations/family-member'

type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[] | undefined> }

/** 文字列フィールドの空文字を null に置換 (フォーム→DB の正規化) */
function emptyToNull<T extends Record<string, unknown>>(values: T): T {
  const out: Record<string, unknown> = { ...values }
  for (const k of Object.keys(out)) {
    if (typeof out[k] === 'string' && (out[k] as string).trim() === '') out[k] = null
  }
  return out as T
}

// ─── Customer ───────────────────────────────────────────────────────

export async function createCustomer(
  values: CustomerFormValues,
): Promise<ActionResult<{ id: string }>> {
  const parsed = customerSchema.safeParse(emptyToNull(values))
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
    .from('customers')
    .insert({ ...parsed.data, tenant_id: tenantId })
    .select('id')
    .single()

  if (error || !data) {
    return { ok: false, error: error?.message ?? '登録に失敗しました。' }
  }

  revalidatePath('/customers')
  redirect(`/customers/${data.id}`)
}

export async function updateCustomer(
  id: string,
  values: CustomerFormValues,
): Promise<ActionResult> {
  const parsed = customerSchema.safeParse(emptyToNull(values))
  if (!parsed.success) {
    return {
      ok: false,
      error: '入力内容に誤りがあります。',
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('customers')
    .update(parsed.data)
    .eq('id', id)

  if (error) return { ok: false, error: error.message }

  revalidatePath('/customers')
  revalidatePath(`/customers/${id}`)
  redirect(`/customers/${id}`)
}

export async function deleteCustomer(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('customers')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return { ok: false, error: error.message }

  revalidatePath('/customers')
  redirect('/customers')
}

// ─── Contact History ────────────────────────────────────────────────

export async function addContactHistory(
  values: ContactHistoryFormValues,
): Promise<ActionResult> {
  const parsed = contactHistorySchema.safeParse(emptyToNull(values))
  if (!parsed.success) {
    return {
      ok: false,
      error: '入力内容に誤りがあります。',
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  const supabase = await createClient()
  const { user } = await getSessionUserOrRedirect()
  const tenantId = await getCurrentTenantId()

  const { error } = await supabase.from('contact_histories').insert({
    tenant_id: tenantId,
    customer_id: parsed.data.customer_id,
    type: parsed.data.type,
    content: parsed.data.content,
    contacted_at: parsed.data.contacted_at,
    next_action: parsed.data.next_action ?? null,
    next_action_date: parsed.data.next_action_date ?? null,
    recorded_by: user.id,
  })

  if (error) return { ok: false, error: error.message }

  revalidatePath(`/customers/${parsed.data.customer_id}`)
  return { ok: true }
}

// ─── Family Member ──────────────────────────────────────────────────

export async function upsertFamilyMember(
  values: FamilyMemberFormValues,
  id?: string,
): Promise<ActionResult> {
  const parsed = familyMemberSchema.safeParse(emptyToNull(values))
  if (!parsed.success) {
    return {
      ok: false,
      error: '入力内容に誤りがあります。',
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  const supabase = await createClient()
  const tenantId = await getCurrentTenantId()

  if (id) {
    const { error } = await supabase
      .from('family_members')
      .update({
        name: parsed.data.name,
        name_kana: parsed.data.name_kana ?? null,
        relationship: parsed.data.relationship,
        birth_date: parsed.data.birth_date ?? null,
        gender: parsed.data.gender ?? null,
        is_insured: parsed.data.is_insured,
        is_beneficiary: parsed.data.is_beneficiary,
        note: parsed.data.note ?? null,
      })
      .eq('id', id)
    if (error) return { ok: false, error: error.message }
  } else {
    const { error } = await supabase.from('family_members').insert({
      tenant_id: tenantId,
      customer_id: parsed.data.customer_id,
      name: parsed.data.name,
      name_kana: parsed.data.name_kana ?? null,
      relationship: parsed.data.relationship,
      birth_date: parsed.data.birth_date ?? null,
      gender: parsed.data.gender ?? null,
      is_insured: parsed.data.is_insured,
      is_beneficiary: parsed.data.is_beneficiary,
      note: parsed.data.note ?? null,
    })
    if (error) return { ok: false, error: error.message }
  }

  revalidatePath(`/customers/${parsed.data.customer_id}`)
  return { ok: true }
}

export async function deleteFamilyMember(
  id: string,
  customerId: string,
): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.from('family_members').delete().eq('id', id)
  if (error) return { ok: false, error: error.message }

  revalidatePath(`/customers/${customerId}`)
  return { ok: true }
}
