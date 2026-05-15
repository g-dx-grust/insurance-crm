import { createAdminClient } from '@/lib/supabase/admin'
import { sha256Hex } from '@/lib/security/intention-signature'
import {
  CUSTOMER_CONFIRMATION_CHECKLIST_KEYS,
  INTERNAL_OPERATION_CHECKLIST_KEYS,
  INTENTION_CHECKLIST_ITEMS,
  type ComparisonMethod,
} from '@/lib/constants/intention'
import { RemoteSignatureClient } from './RemoteSignatureClient'

export const metadata = { title: '意向把握 電子サイン | HOKENA CRM' }

export default async function RemoteSignaturePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const admin = createAdminClient()
  const tokenHash = sha256Hex(token)

  const { data: request, error } = await admin
    .from('intention_signature_requests')
    .select(
      'id, signer_name, signer_email, status, expires_at, intention_record_id, intention_records!intention_record_id(id, customer_id, initial_intention, final_intention, comparison_method, checklist, customers!customer_id(name, birth_date, phone))',
    )
    .eq('token_hash', tokenHash)
    .maybeSingle()

  if (error || !request) {
    return <Message title="署名リンクが無効です" description="署名依頼元へ再送を依頼してください。" />
  }

  if (request.status === '署名済') {
    return <Message title="署名済みです" description="この署名リンクは既に使用されています。" />
  }

  if (request.status === '取消') {
    return <Message title="署名依頼が取り消されています" description="署名依頼元へ確認してください。" />
  }

  const intention = Array.isArray(request.intention_records)
    ? request.intention_records[0]
    : request.intention_records
  if (!intention) {
    return <Message title="意向把握記録が見つかりません" description="署名依頼元へ確認してください。" />
  }

  const { data: products } = await admin
    .from('intention_products')
    .select('insurance_company, product_name, product_category, premium, is_recommended')
    .eq('intention_record_id', intention.id)
    .order('sort_order', { ascending: true })

  const customer = Array.isArray(intention.customers)
    ? intention.customers[0]
    : intention.customers

  return (
    <RemoteSignatureClient
      token={token}
      signerName={request.signer_name}
      customerName={customer?.name ?? request.signer_name}
      identityVerification={buildIdentityVerification(customer)}
      initialIntention={intention.initial_intention}
      finalIntention={intention.final_intention}
      checklistGroups={buildChecklistGroups(
        intention.checklist,
        intention.comparison_method as ComparisonMethod,
      )}
      products={products ?? []}
    />
  )
}

function buildChecklistGroups(
  checklist: unknown,
  comparisonMethod: ComparisonMethod,
) {
  const source =
    checklist && typeof checklist === 'object'
      ? checklist as Record<string, unknown>
      : {}
  const customerKeys = new Set<string>(CUSTOMER_CONFIRMATION_CHECKLIST_KEYS)
  const internalKeys = new Set<string>(INTERNAL_OPERATION_CHECKLIST_KEYS)

  const items = INTENTION_CHECKLIST_ITEMS.filter((item) => {
    if ('requiresComparisonMode' in item && item.requiresComparisonMode) {
      return comparisonMethod === item.requiresComparisonMode
    }
    return true
  }).map((item) => ({
    key: item.key,
    label: item.label,
    checked: Boolean(source[item.key]),
  }))

  return {
    customerItems: items.filter((item) => customerKeys.has(item.key)),
    internalOperationItems: items.filter((item) => internalKeys.has(item.key)),
  }
}

function buildIdentityVerification(
  customer: { birth_date?: string | null; phone?: string | null } | null | undefined,
) {
  if (customer?.birth_date) {
    return {
      method: 'birth_date' as const,
      label: '生年月日',
      inputType: 'date' as const,
      inputMode: 'text' as const,
      placeholder: '',
    }
  }

  if (customer?.phone) {
    return {
      method: 'phone_last4' as const,
      label: '電話番号下4桁',
      inputType: 'text' as const,
      inputMode: 'numeric' as const,
      placeholder: '1234',
    }
  }

  return {
    method: 'none' as const,
    label: '本人確認',
    inputType: 'text' as const,
    inputMode: 'text' as const,
    placeholder: '',
  }
}

function Message({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-xl items-center px-4 py-10">
      <div className="w-full rounded-md border border-border bg-bg p-6 text-center">
        <h1 className="text-xl font-semibold text-text">{title}</h1>
        <p className="mt-2 text-sm text-text-muted">{description}</p>
      </div>
    </div>
  )
}
