'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/types/database.types'

type TenantUpdate = Database['public']['Tables']['tenants']['Update']
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentTenantId, getSessionUserOrRedirect } from '@/lib/auth/server'
import {
  complianceSettingsSchema,
  inviteUserSchema,
  notificationSettingsSchema,
  orgInfoSchema,
  type ComplianceSettingsValues,
  type InviteUserValues,
  type NotificationSettingsValues,
  type OrgInfoValues,
} from '@/lib/validations/settings'
import {
  meetingRecordTemplateSchema,
  type MeetingRecordTemplateFormValues,
} from '@/lib/validations/meeting-record-template'

type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string }

function emptyToNull<T extends Record<string, unknown>>(values: T): T {
  const out: Record<string, unknown> = { ...values }
  for (const k of Object.keys(out)) {
    if (typeof out[k] === 'string' && (out[k] as string).trim() === '') out[k] = null
  }
  return out as T
}

async function loadTenantSettings(): Promise<{
  tenantId: string
  raw: Record<string, unknown>
}> {
  const supabase = await createClient()
  const tenantId = await getCurrentTenantId()
  const { data, error } = await supabase
    .from('tenants')
    .select('settings')
    .eq('id', tenantId)
    .single()
  if (error) throw new Error(error.message)
  return { tenantId, raw: (data?.settings ?? {}) as Record<string, unknown> }
}

async function patchTenantSettings(
  tenantId: string,
  raw: Record<string, unknown>,
  patch: Record<string, unknown>,
): Promise<ActionResult> {
  const supabase = await createClient()
  const next = { ...raw, ...patch }
  // tenants.name の同期 (org_info.name と合わせる)
  const update: TenantUpdate = {
    settings: next as TenantUpdate['settings'],
  }
  if (
    typeof patch.org_info === 'object' &&
    patch.org_info &&
    typeof (patch.org_info as { name?: unknown }).name === 'string' &&
    ((patch.org_info as { name: string }).name).length > 0
  ) {
    update.name = (patch.org_info as { name: string }).name
  }
  const { error } = await supabase.from('tenants').update(update).eq('id', tenantId)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/settings')
  return { ok: true }
}

// ─── Org Info ───────────────────────────────────────────────────────

export async function updateOrgInfo(values: OrgInfoValues): Promise<ActionResult> {
  const parsed = orgInfoSchema.safeParse(emptyToNull(values))
  if (!parsed.success) return { ok: false, error: '入力内容に誤りがあります' }
  const { tenantId, raw } = await loadTenantSettings()
  return patchTenantSettings(tenantId, raw, { org_info: parsed.data })
}

// ─── Notification ──────────────────────────────────────────────────

export async function updateNotificationSettings(
  values: NotificationSettingsValues,
): Promise<ActionResult> {
  const parsed = notificationSettingsSchema.safeParse(values)
  if (!parsed.success) return { ok: false, error: '入力内容に誤りがあります' }
  const { tenantId, raw } = await loadTenantSettings()
  return patchTenantSettings(tenantId, raw, { notification: parsed.data })
}

// ─── Compliance ────────────────────────────────────────────────────

export async function updateComplianceSettings(
  values: ComplianceSettingsValues,
): Promise<ActionResult> {
  const parsed = complianceSettingsSchema.safeParse(values)
  if (!parsed.success) return { ok: false, error: '入力内容に誤りがあります' }
  const { tenantId, raw } = await loadTenantSettings()
  // 高齢者閾値は customers_with_age ビューが直接参照する Top レベルの elderly_age_threshold を更新
  return patchTenantSettings(tenantId, raw, {
    compliance: parsed.data,
    elderly_age_threshold: parsed.data.elderly_age_threshold,
  })
}

// ─── Meeting record templates ─────────────────────────────────────

export async function upsertMeetingRecordTemplate(
  values: MeetingRecordTemplateFormValues,
  id?: string,
): Promise<ActionResult<{ id: string }>> {
  const parsed = meetingRecordTemplateSchema.safeParse(emptyToNull(values))
  if (!parsed.success) return { ok: false, error: '入力内容に誤りがあります' }

  const auth = await ensureAdmin()
  if ('error' in auth) return { ok: false, error: auth.error }

  const supabase = await createClient()
  const payload = {
    tenant_id: auth.tenantId,
    title: parsed.data.title,
    type: parsed.data.type,
    content: parsed.data.content,
    next_action: parsed.data.next_action ?? null,
    is_active: parsed.data.is_active,
    sort_order: parsed.data.sort_order,
  }

  if (id) {
    const { data, error } = await supabase
      .from('meeting_record_templates')
      .update(payload)
      .eq('id', id)
      .select('id')
      .single()
    if (error || !data) return { ok: false, error: error?.message ?? '更新に失敗しました' }
    revalidatePath('/settings')
    return { ok: true, data }
  }

  const { data, error } = await supabase
    .from('meeting_record_templates')
    .insert({ ...payload, created_by: auth.userId })
    .select('id')
    .single()

  if (error || !data) return { ok: false, error: error?.message ?? '登録に失敗しました' }

  revalidatePath('/settings')
  return { ok: true, data }
}

export async function deleteMeetingRecordTemplate(id: string): Promise<ActionResult> {
  const auth = await ensureAdmin()
  if ('error' in auth) return { ok: false, error: auth.error }

  const supabase = await createClient()
  const { error } = await supabase
    .from('meeting_record_templates')
    .delete()
    .eq('id', id)
    .eq('tenant_id', auth.tenantId)

  if (error) return { ok: false, error: error.message }

  revalidatePath('/settings')
  return { ok: true }
}

// ─── User management (admin 専用) ──────────────────────────────────

async function ensureAdmin(): Promise<
  { tenantId: string; userId: string } | { error: string }
> {
  const { user, profile } = await getSessionUserOrRedirect()
  if (profile.role !== 'admin') return { error: '管理者のみが操作できます' }
  return { tenantId: profile.tenant_id, userId: user.id }
}

export async function inviteUser(
  values: InviteUserValues,
): Promise<ActionResult> {
  const parsed = inviteUserSchema.safeParse(emptyToNull(values))
  if (!parsed.success) return { ok: false, error: '入力内容に誤りがあります' }

  const auth = await ensureAdmin()
  if ('error' in auth) return { ok: false, error: auth.error }

  const admin = createAdminClient()
  const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/login`

  // 1. 招待メール送信 (auth.users が作成される)
  const { data: created, error: invErr } = await admin.auth.admin.inviteUserByEmail(
    parsed.data.email,
    {
      data: { name: parsed.data.name, source: 'invite' },
      redirectTo,
    },
  )
  if (invErr || !created?.user) {
    return { ok: false, error: invErr?.message ?? '招待に失敗しました' }
  }

  // 2. user_profiles に行を作成
  const { error: profErr } = await admin.from('user_profiles').insert({
    id: created.user.id,
    tenant_id: auth.tenantId,
    name: parsed.data.name,
    email: parsed.data.email,
    role: parsed.data.role,
    is_active: true,
  })
  if (profErr) {
    // ロールバック相当: 作成した auth.users を削除
    await admin.auth.admin.deleteUser(created.user.id)
    return { ok: false, error: profErr.message }
  }

  revalidatePath('/settings')
  return { ok: true }
}

export async function setUserRole(
  userId: string,
  role: 'admin' | 'agent' | 'staff' | 'viewer',
): Promise<ActionResult> {
  const auth = await ensureAdmin()
  if ('error' in auth) return { ok: false, error: auth.error }

  const admin = createAdminClient()
  const { error } = await admin
    .from('user_profiles')
    .update({ role })
    .eq('id', userId)
    .eq('tenant_id', auth.tenantId)
  if (error) return { ok: false, error: error.message }

  revalidatePath('/settings')
  return { ok: true }
}

export async function deactivateUser(userId: string): Promise<ActionResult> {
  const auth = await ensureAdmin()
  if ('error' in auth) return { ok: false, error: auth.error }

  const admin = createAdminClient()
  const { error } = await admin
    .from('user_profiles')
    .update({ is_active: false })
    .eq('id', userId)
    .eq('tenant_id', auth.tenantId)
  if (error) return { ok: false, error: error.message }

  revalidatePath('/settings')
  return { ok: true }
}

export async function activateUser(userId: string): Promise<ActionResult> {
  const auth = await ensureAdmin()
  if ('error' in auth) return { ok: false, error: auth.error }

  const admin = createAdminClient()
  const { error } = await admin
    .from('user_profiles')
    .update({ is_active: true })
    .eq('id', userId)
    .eq('tenant_id', auth.tenantId)
  if (error) return { ok: false, error: error.message }

  revalidatePath('/settings')
  return { ok: true }
}
