'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentTenantId } from '@/lib/auth/server'
import {
  calendarEventSchema,
  type CalendarEventFormValues,
} from '@/lib/validations/calendar-event'

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

export async function createCalendarEvent(
  values: CalendarEventFormValues,
): Promise<ActionResult<{ id: string }>> {
  const parsed = calendarEventSchema.safeParse(emptyToNull(values))
  if (!parsed.success) {
    return {
      ok: false,
      error: '入力内容に誤りがあります',
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  const supabase = await createClient()
  const tenantId = await getCurrentTenantId()
  const v = parsed.data

  const { data, error } = await supabase
    .from('calendar_events')
    .insert({
      tenant_id: tenantId,
      title: v.title,
      type: v.type,
      start_at: new Date(v.start_at).toISOString(),
      end_at: new Date(v.end_at).toISOString(),
      all_day: v.all_day,
      related_customer_id: v.related_customer_id ?? null,
      related_opportunity_id: v.related_opportunity_id ?? null,
      assigned_to: v.assigned_to ?? null,
      location: v.location ?? null,
      note: v.note ?? null,
    })
    .select('id')
    .single()

  if (error || !data) return { ok: false, error: error?.message ?? '登録に失敗しました' }

  revalidatePath('/calendar')
  return { ok: true, data: { id: data.id } }
}

export async function updateCalendarEvent(
  id: string,
  values: CalendarEventFormValues,
): Promise<ActionResult> {
  const parsed = calendarEventSchema.safeParse(emptyToNull(values))
  if (!parsed.success) {
    return {
      ok: false,
      error: '入力内容に誤りがあります',
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }
  const supabase = await createClient()
  const v = parsed.data
  const { error } = await supabase
    .from('calendar_events')
    .update({
      title: v.title,
      type: v.type,
      start_at: new Date(v.start_at).toISOString(),
      end_at: new Date(v.end_at).toISOString(),
      all_day: v.all_day,
      related_customer_id: v.related_customer_id ?? null,
      related_opportunity_id: v.related_opportunity_id ?? null,
      assigned_to: v.assigned_to ?? null,
      location: v.location ?? null,
      note: v.note ?? null,
    })
    .eq('id', id)

  if (error) return { ok: false, error: error.message }

  revalidatePath('/calendar')
  return { ok: true }
}

export async function deleteCalendarEvent(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('calendar_events')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return { ok: false, error: error.message }

  revalidatePath('/calendar')
  return { ok: true }
}
