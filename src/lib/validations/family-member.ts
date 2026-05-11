import { z } from 'zod'

export const familyRelationships = [
  '配偶者',
  '長男',
  '長女',
  '次男',
  '次女',
  '三男',
  '三女',
  '父',
  '母',
  'その他',
] as const

export const familyMemberSchema = z.object({
  customer_id: z.string().uuid(),
  name: z.string().min(1, '氏名は必須です').max(50),
  name_kana: z
    .string()
    .regex(/^[ァ-ヶー\s]+$/, 'カタカナで入力してください')
    .max(50)
    .nullable()
    .optional(),
  relationship: z.enum(familyRelationships),
  birth_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '日付の形式が正しくありません')
    .nullable()
    .optional(),
  gender: z.enum(['男性', '女性', 'その他']).nullable().optional(),
  is_insured: z.boolean(),
  is_beneficiary: z.boolean(),
  note: z.string().max(500).nullable().optional(),
})

export type FamilyMemberFormValues = z.infer<typeof familyMemberSchema>
