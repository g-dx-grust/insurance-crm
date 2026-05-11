import { z } from 'zod'

export const contactHistoryTypes = [
  '電話',
  '訪問',
  'メール',
  'LINE',
  'Lark',
  '更改',
  'その他',
] as const

export const contactHistorySchema = z.object({
  customer_id: z.string().uuid(),
  type: z.enum(contactHistoryTypes),
  content: z
    .string()
    .min(1, '対応内容は必須です')
    .max(2000, '2000文字以内で入力してください'),
  contacted_at: z.string().min(1, '対応日時は必須です'),
  next_action: z.string().max(200).nullable().optional(),
  next_action_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '日付の形式が正しくありません')
    .nullable()
    .optional(),
})

export type ContactHistoryFormValues = z.infer<typeof contactHistorySchema>
