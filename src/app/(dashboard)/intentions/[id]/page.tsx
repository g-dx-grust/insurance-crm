import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  getCurrentTenantId,
  getSessionUserOrRedirect,
} from '@/lib/auth/server'
import {
  IntentionDetailClient,
  type IntentionDetail,
  type IntentionProductRow,
  type IntentionSignatureEvidence,
} from '@/components/features/intentions/IntentionDetailClient'
import {
  INTENTION_SIGNATURE_BUCKET,
  sha256Hex,
  verifyServerSeal,
} from '@/lib/security/intention-signature'

export const metadata = { title: '意向把握詳細 | N-LIC CRM' }

export default async function IntentionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const tenantId = await getCurrentTenantId()
  const { user, profile } = await getSessionUserOrRedirect()

  const { data: intention, error } = await supabase
    .from('intention_records')
    .select(
      `*, customers!customer_id(id, name, name_kana), contracts!contract_id(id, policy_number, product_name), approver:user_profiles!approver_id(id, name), creator:user_profiles!created_by(id, name)`,
    )
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!intention) notFound()

  const [{ data: products }, { data: approvers }, { data: signatureRows }] = await Promise.all([
    supabase
      .from('intention_products')
      .select(
        'id, insurance_company, product_name, product_category, premium, is_recommended, recommendation_reason, sort_order',
      )
      .eq('intention_record_id', id)
      .order('sort_order', { ascending: true }),
    supabase
      .from('user_profiles')
      .select('id, name')
      .eq('tenant_id', tenantId)
      .eq('role', 'admin')
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('intention_signature_evidences')
      .select(
        'id, revision, signer_name, consent_text, consent_version, signed_at, signature_storage_path, signature_sha256, signature_mime_type, signature_size_bytes, manifest_storage_path, evidence_manifest, evidence_manifest_sha256, server_seal_algorithm, server_seal_key_id, server_seal, trusted_timestamp_provider, trusted_timestamped_at, client_ip, client_user_agent, created_at',
      )
      .eq('intention_record_id', id)
      .order('revision', { ascending: false }),
  ])

  const signatureEvidences = await buildSignatureEvidences(
    supabase,
    signatureRows ?? [],
  )

  return (
    <IntentionDetailClient
      intention={intention as unknown as IntentionDetail}
      products={(products ?? []) as IntentionProductRow[]}
      signatureEvidences={signatureEvidences}
      approvers={approvers ?? []}
      currentUserRole={profile.role}
      currentUserId={user.id}
    />
  )
}

async function buildSignatureEvidences(
  supabase: Awaited<ReturnType<typeof createClient>>,
  rows: Array<Record<string, unknown>>,
): Promise<IntentionSignatureEvidence[]> {
  if (rows.length === 0) return []

  const paths = rows.map((row) => String(row.signature_storage_path))
  const { data: signedUrls } = await supabase.storage
    .from(INTENTION_SIGNATURE_BUCKET)
    .createSignedUrls(paths, 600)
  const signedUrlByPath = new Map(
    (signedUrls ?? []).map((item) => [item.path, item.signedUrl]),
  )

  return Promise.all(
    rows.map(async (row) => {
      const path = String(row.signature_storage_path)
      const { data: imageBlob } = await supabase.storage
        .from(INTENTION_SIGNATURE_BUCKET)
        .download(path)

      let signatureHashValid: boolean | null = null
      if (imageBlob) {
        const buffer = Buffer.from(await imageBlob.arrayBuffer())
        signatureHashValid = sha256Hex(buffer) === row.signature_sha256
      }

      return {
        id: String(row.id),
        revision: Number(row.revision),
        signer_name: String(row.signer_name),
        consent_text: String(row.consent_text),
        consent_version: String(row.consent_version),
        signed_at: String(row.signed_at),
        signature_storage_path: path,
        signature_sha256: String(row.signature_sha256),
        signature_mime_type: String(row.signature_mime_type),
        signature_size_bytes: Number(row.signature_size_bytes),
        manifest_storage_path: String(row.manifest_storage_path),
        evidence_manifest_sha256: String(row.evidence_manifest_sha256),
        server_seal_algorithm: String(row.server_seal_algorithm),
        server_seal_key_id: String(row.server_seal_key_id),
        server_seal: String(row.server_seal),
        trusted_timestamp_provider:
          typeof row.trusted_timestamp_provider === 'string'
            ? row.trusted_timestamp_provider
            : null,
        trusted_timestamped_at:
          typeof row.trusted_timestamped_at === 'string'
            ? row.trusted_timestamped_at
            : null,
        client_ip: typeof row.client_ip === 'string' ? row.client_ip : null,
        client_user_agent:
          typeof row.client_user_agent === 'string' ? row.client_user_agent : null,
        created_at: String(row.created_at),
        signed_url: signedUrlByPath.get(path) ?? null,
        seal_valid: verifyServerSeal(
          row.evidence_manifest,
          String(row.evidence_manifest_sha256),
          String(row.server_seal),
        ),
        signature_hash_valid: signatureHashValid,
      }
    }),
  )
}
