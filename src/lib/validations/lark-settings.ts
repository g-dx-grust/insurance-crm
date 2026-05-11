import { z } from 'zod'

/** App ID/Secret は env 管理のため DB スキーマには含めない (Lark Rules §6) */

export const larkBaseSchema = z.object({
  base_id: z.string().max(100).nullable().optional(),
  sync_customers: z.boolean(),
  sync_contracts: z.boolean(),
  sync_opportunities: z.boolean(),
})

export const larkCalendarSchema = z.object({
  calendar_id: z.string().max(100).nullable().optional(),
  sync_events: z.boolean(),
})

export const larkApprovalSchema = z.object({
  intention_flow_id: z.string().max(100).nullable().optional(),
})

export const larkBotSchema = z.object({
  alert_chat_id: z.string().max(100).nullable().optional(),
  expiry_days_before: z.number().int().min(0).max(365),
  notify_approval: z.boolean(),
  notify_settlement: z.boolean(),
})

export const larkSettingsSchema = z.object({
  sso_enabled: z.boolean(),
  base: larkBaseSchema,
  calendar: larkCalendarSchema,
  approval: larkApprovalSchema,
  bot: larkBotSchema,
})

export type LarkSettings = z.infer<typeof larkSettingsSchema>
export type LarkBaseValues = z.infer<typeof larkBaseSchema>
export type LarkCalendarValues = z.infer<typeof larkCalendarSchema>
export type LarkApprovalValues = z.infer<typeof larkApprovalSchema>
export type LarkBotValues = z.infer<typeof larkBotSchema>

export const DEFAULT_LARK_SETTINGS: LarkSettings = {
  sso_enabled: false,
  base: {
    base_id: null,
    sync_customers: false,
    sync_contracts: false,
    sync_opportunities: false,
  },
  calendar: {
    calendar_id: null,
    sync_events: false,
  },
  approval: {
    intention_flow_id: null,
  },
  bot: {
    alert_chat_id: null,
    expiry_days_before: 30,
    notify_approval: true,
    notify_settlement: true,
  },
}

/** 通知テンプレート */
export const DEFAULT_NOTIFICATION_TEMPLATES = {
  expiry_alert:
    '【満期アラート】{{customer_name}}様の{{contract_number}}が{{remaining_days}}日後に満期を迎えます (満期日: {{expiry_date}})。',
  approval_request:
    '【承認依頼】{{customer_name}}様の意向把握記録について承認をお願いします。',
  settlement_completed:
    '【精算完了】{{customer_name}}様の{{contract_number}}の精算が完了しました。',
} as const

export type NotificationTemplateKey = keyof typeof DEFAULT_NOTIFICATION_TEMPLATES
