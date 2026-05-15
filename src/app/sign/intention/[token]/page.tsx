import { createAdminClient } from '@/lib/supabase/admin'
import { sha256Hex } from '@/lib/security/intention-signature'
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
      'id, signer_name, signer_email, status, expires_at, intention_record_id, intention_records!intention_record_id(id, customer_id, initial_intention, final_intention, customers!customer_id(name))',
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
      initialIntention={intention.initial_intention}
      finalIntention={intention.final_intention}
      products={products ?? []}
    />
  )
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
