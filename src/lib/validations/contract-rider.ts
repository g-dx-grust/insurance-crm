import { z } from 'zod'

export const contractRiderSchema = z.object({
  contract_id: z.string().uuid(),
  name: z.string().min(1, '特約名は必須です').max(100),
  coverage: z.string().max(500).nullable().optional(),
  premium: z
    .number({ message: '保険料は数値で入力してください' })
    .min(0, '保険料は0以上で入力してください')
    .max(100_000_000)
    .nullable()
    .optional(),
  expiry_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '日付の形式が正しくありません')
    .nullable()
    .optional(),
  is_active: z.boolean(),
})

export type ContractRiderFormValues = z.infer<typeof contractRiderSchema>
