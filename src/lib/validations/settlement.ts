import { z } from 'zod'
import { SETTLEMENT_STATUSES } from '@/lib/constants/settlement'

export const settlementUpdateSchema = z.object({
  customer_name: z.string().min(1, '顧客名は必須です').max(100),
  insurance_company: z.string().min(1, '保険会社は必須です').max(100),
  settlement_month: z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'YYYY-MM 形式で入力してください'),
  invoice_amount: z.number().min(0).max(1_000_000_000),
  payment_amount: z.number().min(0).max(1_000_000_000),
  fee_amount: z.number().min(0).max(1_000_000_000),
  fee_rate: z.number().min(0).max(100).nullable().optional(),
  status: z.enum(SETTLEMENT_STATUSES),
  contract_id: z.string().uuid().nullable().optional(),
  note: z.string().max(1000).nullable().optional(),
})

export type SettlementUpdateValues = z.infer<typeof settlementUpdateSchema>
