import { PageHeader } from '@/components/ui/PageHeader'
import { LarkSettingsClient } from '@/components/features/lark/LarkSettingsClient'
import { createClient } from '@/lib/supabase/server'
import { getCurrentTenantId } from '@/lib/auth/server'
import {
  DEFAULT_LARK_SETTINGS,
  type LarkSettings,
} from '@/lib/validations/lark-settings'

export const metadata = { title: 'Lark 連携設定 | N-LIC CRM' }

export default async function LarkPage() {
  const supabase = await createClient()
  const tenantId = await getCurrentTenantId()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('settings')
    .eq('id', tenantId)
    .single()

  const raw = (tenant?.settings ?? {}) as Record<string, unknown>
  const lark = (raw.lark ?? {}) as Partial<LarkSettings>
  const settings: LarkSettings = {
    sso_enabled: lark.sso_enabled ?? DEFAULT_LARK_SETTINGS.sso_enabled,
    base: { ...DEFAULT_LARK_SETTINGS.base, ...(lark.base ?? {}) },
    calendar: { ...DEFAULT_LARK_SETTINGS.calendar, ...(lark.calendar ?? {}) },
    approval: { ...DEFAULT_LARK_SETTINGS.approval, ...(lark.approval ?? {}) },
    bot: { ...DEFAULT_LARK_SETTINGS.bot, ...(lark.bot ?? {}) },
  }
  const templates = (raw.notification_templates ?? {}) as Record<string, string>

  const envStatus = {
    appIdSet: Boolean(process.env.LARK_APP_ID),
    appSecretSet: Boolean(process.env.LARK_APP_SECRET),
    webhookTokenSet: Boolean(process.env.LARK_WEBHOOK_VERIFY_TOKEN),
  }
  const redirectUri =
    process.env.LARK_OAUTH_REDIRECT_URI ??
    `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/api/auth/lark/callback`

  return (
    <div>
      <PageHeader
        title="Lark 連携設定"
        description="SSO・Base・Calendar・Approval・Bot の設定。実 API 連携は今後実装。"
      />
      <LarkSettingsClient
        settings={settings}
        templates={templates}
        envStatus={envStatus}
        redirectUri={redirectUri}
      />
    </div>
  )
}
