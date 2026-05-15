import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  CustomerDetailClient,
  type ContactHistoryRow,
  type ContractRow,
  type CustomerDetail,
  type FamilyRow,
  type MeetingTemplateOption,
  type OpportunityRow,
} from '@/components/features/customers/CustomerDetailClient'

export const metadata = { title: '顧客詳細 | HOKENA CRM' }

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: customer, error: customerError } = await supabase
    .from('customers_with_age')
    .select('*, user_profiles!assigned_to(id, name)')
    .eq('id', id)
    .maybeSingle()

  if (customerError) throw new Error(customerError.message)
  if (!customer) notFound()

  const [
    { data: contracts },
    { data: contactHistories },
    { data: opportunities },
    { data: familyMembers },
    { data: meetingTemplates },
  ] = await Promise.all([
    supabase
      .from('contracts')
      .select('id, policy_number, insurance_company, product_name, product_category, premium, status, expiry_date')
      .eq('customer_id', id)
      .is('deleted_at', null)
      .order('expiry_date', { ascending: true, nullsFirst: false }),
    supabase
      .from('contact_histories')
      .select('id, type, content, contacted_at, next_action, next_action_date, user_profiles!recorded_by(name)')
      .eq('customer_id', id)
      .order('contacted_at', { ascending: false })
      .limit(20),
    supabase
      .from('opportunities')
      .select('id, title, stage, estimated_premium, expected_close_date')
      .eq('customer_id', id)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false }),
    supabase
      .from('family_members')
      .select('id, name, name_kana, relationship, birth_date, gender, is_insured, is_beneficiary, note')
      .eq('customer_id', id)
      .order('created_at', { ascending: true }),
    supabase
      .from('meeting_record_templates')
      .select('id, title, type, content, next_action')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true }),
  ])

  return (
    <CustomerDetailClient
      customer={customer as unknown as CustomerDetail}
      contracts={(contracts ?? []) as ContractRow[]}
      contactHistories={(contactHistories ?? []) as unknown as ContactHistoryRow[]}
      opportunities={(opportunities ?? []) as OpportunityRow[]}
      familyMembers={(familyMembers ?? []) as FamilyRow[]}
      meetingTemplates={(meetingTemplates ?? []) as MeetingTemplateOption[]}
    />
  )
}
