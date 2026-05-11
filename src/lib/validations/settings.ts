import { z } from 'zod'

export const orgInfoSchema = z.object({
  name: z.string().min(1, '代理店名は必須です').max(100),
  representative: z.string().max(50).nullable().optional(),
  address: z.string().max(200).nullable().optional(),
  phone: z
    .string()
    .regex(/^[\d\-+()\s]+$/, '電話番号の形式が正しくありません')
    .max(30)
    .nullable()
    .optional(),
  email: z.string().email('メールアドレスの形式が正しくありません').nullable().optional(),
  registration_number: z.string().max(50).nullable().optional(),
  logo_url: z.string().url('URL の形式が正しくありません').nullable().optional(),
})

export type OrgInfoValues = z.infer<typeof orgInfoSchema>

export const notificationSettingsSchema = z.object({
  expiry_alert_days: z
    .array(z.number().int().min(0).max(365))
    .min(1, '通知日を1つ以上設定してください')
    .max(5, '通知日は5つまで'),
  channel_email: z.boolean(),
  channel_lark: z.boolean(),
  notify_admin: z.boolean(),
})

export type NotificationSettingsValues = z.infer<typeof notificationSettingsSchema>

export const complianceSettingsSchema = z.object({
  elderly_age_threshold: z.number().int().min(50).max(100),
  intention_required_on_new_contract: z.boolean(),
  approval_required_on_intention: z.boolean(),
  data_retention_years: z.number().int().min(1).max(30),
})

export type ComplianceSettingsValues = z.infer<typeof complianceSettingsSchema>

export const inviteUserSchema = z.object({
  email: z.string().email('メールアドレスの形式が正しくありません'),
  name: z.string().min(1, '氏名は必須です').max(50),
  role: z.enum(['admin', 'agent', 'staff']),
})

export type InviteUserValues = z.infer<typeof inviteUserSchema>

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettingsValues = {
  expiry_alert_days: [90, 60, 30],
  channel_email: true,
  channel_lark: false,
  notify_admin: false,
}

export const DEFAULT_COMPLIANCE_SETTINGS: ComplianceSettingsValues = {
  elderly_age_threshold: 70,
  intention_required_on_new_contract: true,
  approval_required_on_intention: true,
  data_retention_years: 10,
}

export const DEFAULT_ORG_INFO: OrgInfoValues = {
  name: '',
  representative: null,
  address: null,
  phone: null,
  email: null,
  registration_number: null,
  logo_url: null,
}
