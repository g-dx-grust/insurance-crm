import { PageHeader } from '@/components/ui/PageHeader'
import {
  SettingsClient,
  type MeetingRecordTemplateRow,
  type UserRow,
} from '@/components/features/settings/SettingsClient'
import { createClient } from '@/lib/supabase/server'
import {
  getCurrentTenantId,
  getSessionUserOrRedirect,
} from '@/lib/auth/server'
import {
  DEFAULT_COMPLIANCE_SETTINGS,
  DEFAULT_NOTIFICATION_SETTINGS,
  DEFAULT_ORG_INFO,
  type ComplianceSettingsValues,
  type NotificationSettingsValues,
  type OrgInfoValues,
} from '@/lib/validations/settings'

export const metadata = { title: '設定 | HOKENA CRM' }

export default async function SettingsPage() {
  const supabase = await createClient()
  const tenantId = await getCurrentTenantId()
  const { profile } = await getSessionUserOrRedirect()

  const [{ data: tenant }, { data: users }, { data: templates }] = await Promise.all([
    supabase
      .from('tenants')
      .select('name, settings')
      .eq('id', tenantId)
      .single(),
    supabase
      .from('user_profiles')
      .select('id, name, email, role, department, is_active')
      .eq('tenant_id', tenantId)
      .order('name'),
    supabase
      .from('meeting_record_templates')
      .select('id, title, type, content, next_action, is_active, sort_order')
      .eq('tenant_id', tenantId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true }),
  ])

  const raw = (tenant?.settings ?? {}) as Record<string, unknown>
  const orgRaw = (raw.org_info ?? {}) as Partial<OrgInfoValues>
  const orgInfo: OrgInfoValues = {
    ...DEFAULT_ORG_INFO,
    ...orgRaw,
    name: orgRaw.name ?? tenant?.name ?? '',
  }

  const notification: NotificationSettingsValues = {
    ...DEFAULT_NOTIFICATION_SETTINGS,
    ...((raw.notification ?? {}) as Partial<NotificationSettingsValues>),
  }

  const complianceRaw = (raw.compliance ?? {}) as Partial<ComplianceSettingsValues>
  const compliance: ComplianceSettingsValues = {
    ...DEFAULT_COMPLIANCE_SETTINGS,
    ...complianceRaw,
    elderly_age_threshold:
      (raw.elderly_age_threshold as number | undefined) ??
      complianceRaw.elderly_age_threshold ??
      DEFAULT_COMPLIANCE_SETTINGS.elderly_age_threshold,
  }

  return (
    <div>
      <PageHeader
        title="設定"
        description="代理店情報・ユーザー管理・通知・コンプライアンス設定。管理者のみ編集可能。"
      />
      <SettingsClient
        orgInfo={orgInfo}
        notification={notification}
        compliance={compliance}
        templates={(templates ?? []) as MeetingRecordTemplateRow[]}
        users={(users ?? []) as UserRow[]}
        isAdmin={profile.role === 'admin'}
      />
    </div>
  )
}
