import { z } from 'zod'
import { COMPARISON_METHODS } from '@/lib/constants/intention'
import { intentionProductSchema } from '@/lib/validations/intention-product'

/**
 * ウィザード全体スキーマ。Step 単位のバリデーションは IntentionWizard 内で
 * pick して使う (例: Step1 では initial_intention のみ必須化)。
 */
export const intentionWizardSchema = z
  .object({
    // Step 1
    customer_id: z.string().uuid('顧客を選択してください'),
    contract_id: z.string().uuid().nullable().optional(),
    initial_intention: z
      .string()
      .min(1, '当初意向は必須です')
      .max(2000, '2000文字以内で入力してください'),
    initial_recorded_at: z.string().min(1, '記録日時は必須です'),

    // Step 2
    comparison_method: z.enum(COMPARISON_METHODS, {
      message: '比較方式を選択してください',
    }),
    comparison_reason: z
      .string()
      .max(2000)
      .nullable()
      .optional(),
    products: z
      .array(intentionProductSchema)
      .min(1, '提案商品を1件以上追加してください'),

    // Step 3
    final_intention: z
      .string()
      .min(1, '最終意向は必須です')
      .max(2000),
    final_change_note: z.string().max(1000).nullable().optional(),
    final_recorded_at: z.string().min(1, '記録日時は必須です'),

    // Step 4
    checklist: z.record(z.string(), z.boolean()),
    approver_id: z.string().uuid().nullable().optional(),
    signature_signer_name: z
      .string()
      .trim()
      .min(1, '署名者名を入力してください')
      .max(100, '100文字以内で入力してください'),
    signature_data_url: z
      .string()
      .min(1, '電子サインを入力してください')
      .max(800_000, '署名データが大きすぎます。サインをクリアして再入力してください')
      .regex(/^data:image\/png;base64,[A-Za-z0-9+/=]+$/, '署名データの形式が不正です'),
    signature_consent_confirmed: z
      .boolean()
      .refine((v) => v, '同意文言の確認が必要です'),
  })
  .refine(
    (d) => {
      // ロ方式は推奨商品を1件以上指定 + 推奨理由必須
      if (d.comparison_method !== 'ロ方式') return true
      const recs = d.products.filter((p) => p.is_recommended)
      if (recs.length === 0) return false
      return recs.every((p) => (p.recommendation_reason ?? '').trim().length > 0)
    },
    {
      message: 'ロ方式では推奨商品を1件以上選び、推奨理由を必ず入力してください',
      path: ['products'],
    },
  )
  .refine(
    (d) => {
      // イ方式は商品 1 件のみ + 推奨理由必須
      if (d.comparison_method !== 'イ方式') return true
      if (d.products.length !== 1) return false
      return (d.products[0].recommendation_reason ?? '').trim().length > 0
    },
    {
      message: 'イ方式では商品を1件のみ提案し、推奨理由を必ず入力してください',
      path: ['products'],
    },
  )

export type IntentionWizardValues = z.infer<typeof intentionWizardSchema>
