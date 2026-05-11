import { z } from 'zod'
import { productCategories } from '@/lib/validations/contract'

export const intentionProductSchema = z.object({
  insurance_company: z.string().min(1, '保険会社は必須です').max(100),
  product_name: z.string().min(1, '商品名は必須です').max(100),
  product_category: z.enum(productCategories, {
    message: '商品カテゴリを選択してください',
  }),
  premium: z.number().min(0).max(100_000_000),
  is_recommended: z.boolean(),
  recommendation_reason: z.string().max(1000).nullable().optional(),
})

export type IntentionProductFormValues = z.infer<typeof intentionProductSchema>
