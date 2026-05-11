import { z } from 'zod'

export const opportunityActivityTypes = [
  '電話',
  '訪問',
  'メール',
  'Lark',
  '提案書送付',
  'その他',
] as const

export const opportunityActivitySchema = z.object({
  opportunity_id: z.string().uuid(),
  type: z.enum(opportunityActivityTypes),
  content: z.string().min(1, '活動内容は必須です').max(2000),
  activity_date: z.string().min(1, '活動日時は必須です'),
})

export type OpportunityActivityFormValues = z.infer<
  typeof opportunityActivitySchema
>
