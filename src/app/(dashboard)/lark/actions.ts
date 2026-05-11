'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentTenantId } from '@/lib/auth/server'
import {
  larkApprovalSchema,
  larkBaseSchema,
  larkBotSchema,
  larkCalendarSchema,
  type LarkApprovalValues,
  type LarkBaseValues,
  type LarkBotValues,
  type LarkCalendarValues,
  type LarkSettings,
  DEFAULT_LARK_SETTINGS,
  type NotificationTemplateKey,
} from '@/lib/validations/lark-settings'

type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string }

async function loadCurrentSettings(): Promise<{
  tenantId: string
  current: LarkSettings
  rawSettings: Record<string, unknown>
  templates: Record<string, string>
}> {
  const supabase = await createClient()
  const tenantId = await getCurrentTenantId()
  const { data, error } = await supabase
    .from('tenants')
    .select('settings')
    .eq('id', tenantId)
    .single()

  if (error) throw new Error(error.message)
  const raw = (data?.settings ?? {}) as Record<string, unknown>
  const lark = (raw.lark ?? DEFAULT_LARK_SETTINGS) as LarkSettings
  const templates = ((raw.notification_templates ?? {}) as Record<string, string>)
  return {
    tenantId,
    current: { ...DEFAULT_LARK_SETTINGS, ...lark },
    rawSettings: raw,
    templates,
  }
}

async function saveSettings(
  tenantId: string,
  rawSettings: Record<string, unknown>,
  patch: Partial<{ lark: LarkSettings; notification_templates: Record<string, string> }>,
): Promise<ActionResult> {
  const supabase = await createClient()
  const next = { ...rawSettings, ...patch }
  const { error } = await supabase
    .from('tenants')
    .update({ settings: next })
    .eq('id', tenantId)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/lark')
  return { ok: true }
}

export async function updateLarkBase(
  values: LarkBaseValues,
): Promise<ActionResult> {
  const parsed = larkBaseSchema.safeParse(values)
  if (!parsed.success) return { ok: false, error: '入力内容に誤りがあります' }
  const { tenantId, current, rawSettings } = await loadCurrentSettings()
  return saveSettings(tenantId, rawSettings, {
    lark: { ...current, base: parsed.data },
  })
}

export async function updateLarkCalendar(
  values: LarkCalendarValues,
): Promise<ActionResult> {
  const parsed = larkCalendarSchema.safeParse(values)
  if (!parsed.success) return { ok: false, error: '入力内容に誤りがあります' }
  const { tenantId, current, rawSettings } = await loadCurrentSettings()
  return saveSettings(tenantId, rawSettings, {
    lark: { ...current, calendar: parsed.data },
  })
}

export async function updateLarkApproval(
  values: LarkApprovalValues,
): Promise<ActionResult> {
  const parsed = larkApprovalSchema.safeParse(values)
  if (!parsed.success) return { ok: false, error: '入力内容に誤りがあります' }
  const { tenantId, current, rawSettings } = await loadCurrentSettings()
  return saveSettings(tenantId, rawSettings, {
    lark: { ...current, approval: parsed.data },
  })
}

export async function updateLarkBot(
  values: LarkBotValues,
): Promise<ActionResult> {
  const parsed = larkBotSchema.safeParse(values)
  if (!parsed.success) return { ok: false, error: '入力内容に誤りがあります' }
  const { tenantId, current, rawSettings } = await loadCurrentSettings()
  return saveSettings(tenantId, rawSettings, {
    lark: { ...current, bot: parsed.data },
  })
}

export async function updateNotificationTemplate(
  key: NotificationTemplateKey,
  template: string,
): Promise<ActionResult> {
  const { tenantId, rawSettings, templates } = await loadCurrentSettings()
  const next = { ...templates, [key]: template }
  return saveSettings(tenantId, rawSettings, {
    notification_templates: next,
  })
}

/**
 * 接続テストモック。Phase 8 で実 API 連携時に置き換え。
 * 現状は env が設定されていれば success を返すだけ。
 */
export async function testLarkConnection(
  module: string,
): Promise<ActionResult> {
  const hasEnv = Boolean(
    process.env.LARK_APP_ID && process.env.LARK_APP_SECRET,
  )
  if (!hasEnv) {
    return {
      ok: false,
      error:
        '環境変数 LARK_APP_ID / LARK_APP_SECRET が未設定です。Vercel 等で設定してください。',
    }
  }
  // モック
  void module
  return { ok: true }
}
