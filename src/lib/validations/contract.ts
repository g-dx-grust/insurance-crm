import { z } from 'zod'

export const productCategories = [
  '生命保険',
  '損害保険',
  '医療保険',
  '介護保険',
  '年金保険',
  '積立保険',
] as const

export const contractStatuses = ['有効', '満期', '解約', '更改中'] as const
export const renewalStatuses = [
  '未対応',
  '対応中',
  '更改中',
  '完了',
  '辞退',
] as const

export const contractSchema = z
  .object({
    customer_id: z.string().uuid('顧客を選択してください'),
    policy_number: z.string().min(1, '証券番号は必須です').max(50),
    insurance_company: z.string().min(1, '保険会社は必須です').max(100),
    product_name: z.string().min(1, '商品名は必須です').max(100),
    product_category: z.enum(productCategories, {
      message: '商品カテゴリを選択してください',
    }),
    premium: z
      .number({ message: '保険料は数値で入力してください' })
      .min(0, '保険料は0以上で入力してください')
      .max(100_000_000, '保険料の値が大きすぎます'),
    start_date: z
      .string()
      .min(1, '契約開始日は必須です')
      .regex(/^\d{4}-\d{2}-\d{2}$/, '日付の形式が正しくありません'),
    expiry_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, '日付の形式が正しくありません')
      .nullable()
      .optional(),
    status: z.enum(contractStatuses),
    renewal_status: z.enum(renewalStatuses),
    assigned_to: z.string().uuid().nullable().optional(),
    note: z.string().max(1000).nullable().optional(),
  })
  .refine(
    (data) => {
      if (!data.expiry_date) return true
      return new Date(data.expiry_date) > new Date(data.start_date)
    },
    {
      message: '満期日は契約開始日より後の日付を入力してください',
      path: ['expiry_date'],
    },
  )

export type ContractFormValues = z.infer<typeof contractSchema>
