import { z } from 'zod'

export const documentTypes = [
  '設計書',
  '申込書',
  '本人確認書類',
  '意向把握書',
  'その他',
] as const

export const carryOutStatuses = ['持出中', '返却済', '紛失', '取消'] as const

export const documentCarryOutSchema = z.object({
  customer_id: z.string().uuid().nullable().optional(),
  document_title: z.string().min(1, '書類名は必須です').max(100),
  document_type: z.enum(documentTypes, {
    message: '書類種別を選択してください',
  }),
  purpose: z.string().min(1, '持ち出し目的は必須です').max(300),
  destination: z.string().max(100).nullable().optional(),
  carried_out_by: z.string().uuid('持ち出し者を選択してください'),
  carried_out_at: z.string().min(1, '持ち出し日時は必須です'),
  expected_return_at: z.string().nullable().optional(),
  returned_at: z.string().nullable().optional(),
  status: z.enum(carryOutStatuses),
  note: z.string().max(1000).nullable().optional(),
})

export type DocumentCarryOutFormValues = z.infer<typeof documentCarryOutSchema>
