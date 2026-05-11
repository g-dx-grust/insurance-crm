import { z } from 'zod'
import { OPPORTUNITY_STAGES } from '@/lib/constants/opportunity'

export const opportunitySchema = z.object({
  customer_id: z.string().uuid('顧客を選択してください'),
  title: z.string().min(1, '案件タイトルは必須です').max(100),
  stage: z.enum(OPPORTUNITY_STAGES),
  estimated_premium: z
    .number()
    .min(0, '想定保険料は0以上で入力してください')
    .max(100_000_000)
    .nullable()
    .optional(),
  expected_close_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '日付の形式が正しくありません')
    .nullable()
    .optional(),
  assigned_to: z.string().uuid().nullable().optional(),
  note: z.string().max(1000).nullable().optional(),
  lost_reason: z.string().max(500).nullable().optional(),
})

export type OpportunityFormValues = z.infer<typeof opportunitySchema>
