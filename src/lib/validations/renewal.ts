import { z } from 'zod'
import { renewalStatuses } from '@/lib/validations/contract'

export const renewalRecordSchema = z.object({
  contract_id: z.string().uuid(),
  customer_id: z.string().uuid(),
  renewal_date: z
    .string()
    .min(1, '更改日は必須です')
    .regex(/^\d{4}-\d{2}-\d{2}$/, '日付の形式が正しくありません'),
  content: z
    .string()
    .min(1, '更改内容は必須です')
    .max(2000, '2000文字以内で入力してください'),
  new_premium: z
    .number()
    .min(0)
    .max(100_000_000)
    .nullable()
    .optional(),
  assigned_to: z.string().uuid().nullable().optional(),
  lark_approval_id: z.string().max(100).nullable().optional(),
  next_renewal_status: z.enum(renewalStatuses),
})

export type RenewalRecordFormValues = z.infer<typeof renewalRecordSchema>
