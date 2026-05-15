import { z } from 'zod'
import {
  annualIncomeOptions,
  investmentExperienceOptions,
  investmentKnowledgeOptions,
} from '@/lib/constants/financial-situation'

export const financialSituationSchema = z.object({
  customer_id: z.string().uuid('顧客を選択してください'),
  contract_id: z.string().uuid().nullable().optional(),
  intention_record_id: z.string().uuid().nullable().optional(),
  annual_income: z.enum(annualIncomeOptions, {
    message: '年収を選択してください',
  }),
  employer_name: z.string().max(100, '100文字以内で入力してください').nullable().optional(),
  investment_experience: z.enum(investmentExperienceOptions, {
    message: '投資経験を選択してください',
  }),
  investment_knowledge: z.enum(investmentKnowledgeOptions, {
    message: '投資知識を選択してください',
  }),
  note: z.string().max(1000, '1000文字以内で入力してください').nullable().optional(),
})

export type FinancialSituationFormValues = z.infer<typeof financialSituationSchema>
