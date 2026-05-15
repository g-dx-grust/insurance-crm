import { PageHeader } from '@/components/ui/PageHeader'
import {
  FinancialChecksClient,
  type FinancialCheckRow,
  type FinancialContractOption,
} from '@/components/features/financial-checks/FinancialChecksClient'
import type { CustomerOption } from '@/components/features/customers/CustomerCombobox'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: '財務状況確認 | HOKENA CRM' }

export default async function FinancialChecksPage() {
  const supabase = await createClient()

  const [{ data: checks, error }, { data: customers }, { data: contracts }] =
    await Promise.all([
      supabase
        .from('financial_situation_checks')
        .select(
          'id, customer_id, contract_id, intention_record_id, source, annual_income, employer_name, investment_experience, investment_knowledge, note, recorded_at, customers!customer_id(id, name, name_kana), contracts!contract_id(id, policy_number, product_name, product_category), user_profiles!recorded_by(name)',
        )
        .order('recorded_at', { ascending: false })
        .limit(100),
      supabase
        .from('customers')
        .select('id, name, name_kana')
        .is('deleted_at', null)
        .order('name_kana'),
      supabase
        .from('contracts')
        .select(
          'id, customer_id, policy_number, insurance_company, product_name, product_category',
        )
        .is('deleted_at', null)
        .order('policy_number'),
    ])

  if (error) throw new Error(error.message)

  return (
    <div>
      <PageHeader
        title="財務状況確認"
        description="積立系商品の提案・契約時に、年収・勤務先・投資経験・投資知識を記録します。"
      />
      <FinancialChecksClient
        checks={(checks ?? []) as unknown as FinancialCheckRow[]}
        customers={(customers ?? []) as CustomerOption[]}
        contracts={(contracts ?? []) as FinancialContractOption[]}
      />
    </div>
  )
}
