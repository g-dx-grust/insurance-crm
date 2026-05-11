import { z } from 'zod'

/**
 * フォーム入力前提の zod スキーマ。空文字 → null の正規化はフォーム送信時に
 * `normalizeEmptyToNull` で行うため、ここでは単純な nullable().optional() のみ。
 */
export const customerSchema = z.object({
  name: z.string().min(1, '氏名は必須です').max(50, '50文字以内で入力してください'),
  name_kana: z
    .string()
    .min(1, 'フリガナは必須です')
    .regex(/^[ァ-ヶー\s]+$/, 'カタカナで入力してください'),
  birth_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '日付の形式が正しくありません')
    .nullable()
    .optional(),
  gender: z.enum(['男性', '女性', 'その他']).nullable().optional(),
  postal_code: z
    .string()
    .regex(/^\d{3}-?\d{4}$/, '郵便番号の形式が正しくありません (例: 150-0001)')
    .nullable()
    .optional(),
  address: z.string().max(200).nullable().optional(),
  phone: z
    .string()
    .regex(/^[\d\-+()\s]+$/, '電話番号の形式が正しくありません')
    .max(30)
    .nullable()
    .optional(),
  email: z.string().email('メールアドレスの形式が正しくありません').nullable().optional(),
  status: z.enum(['見込', '既存', '休眠']),
  assigned_to: z.string().uuid().nullable().optional(),
  note: z.string().max(1000).nullable().optional(),
})

export type CustomerFormValues = z.infer<typeof customerSchema>

/** フォームから渡ってくる空文字を null に正規化する。 */
export function normalizeCustomerForm(values: CustomerFormValues): CustomerFormValues {
  const out: Record<string, unknown> = { ...values }
  for (const k of Object.keys(out)) {
    if (typeof out[k] === 'string' && (out[k] as string).trim() === '') out[k] = null
  }
  return out as CustomerFormValues
}
