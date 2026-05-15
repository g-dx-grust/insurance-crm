'use server'

import { z } from 'zod'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  buildIntentionSignatureManifest,
  canonicalJson,
  createServerSeal,
  decodePngDataUrl,
  getSignatureSealKeyId,
  INTENTION_SIGNATURE_BUCKET,
  INTENTION_SIGNATURE_CONSENT_TEXT,
  INTENTION_SIGNATURE_CONSENT_VERSION,
  INTENTION_SIGNATURE_SEAL_ALGORITHM,
  requireSignatureSealSecret,
  sha256Hex,
} from '@/lib/security/intention-signature'
import type { IntentionWizardValues } from '@/lib/validations/intention'
import type { ComparisonMethod } from '@/lib/constants/intention'

type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string }

const remoteSignatureSubmitSchema = z.object({
  token: z.string().min(20),
  signer_name: z.string().trim().min(1, '署名者名を入力してください').max(100),
  signature_data_url: z
    .string()
    .min(1, '電子サインを入力してください')
    .max(800_000, '署名データが大きすぎます。サインをクリアして再入力してください')
    .regex(/^data:image\/png;base64,[A-Za-z0-9+/=]+$/, '署名データの形式が不正です'),
  consent_confirmed: z.boolean().refine((value) => value, '同意文言の確認が必要です'),
})

export async function submitRemoteIntentionSignature(
  values: z.infer<typeof remoteSignatureSubmitSchema>,
): Promise<ActionResult> {
  const parsed = remoteSignatureSubmitSchema.safeParse(values)
  if (!parsed.success) return { ok: false, error: '入力内容に誤りがあります。' }

  const admin = createAdminClient()
  const tokenHash = sha256Hex(parsed.data.token)
  const { data: request, error: requestError } = await admin
    .from('intention_signature_requests')
    .select('*')
    .eq('token_hash', tokenHash)
    .maybeSingle()

  if (requestError) return { ok: false, error: requestError.message }
  if (!request) return { ok: false, error: '署名リンクが無効です。' }
  if (request.status === '署名済') return { ok: false, error: 'この署名リンクは既に使用されています。' }
  if (request.status === '取消') return { ok: false, error: 'この署名依頼は取り消されています。' }
  if (new Date(request.expires_at).getTime() < Date.now()) {
    await admin
      .from('intention_signature_requests')
      .update({ status: '期限切れ' })
      .eq('id', request.id)
    return { ok: false, error: '署名リンクの有効期限が切れています。' }
  }

  const { data: intention, error: intentionError } = await admin
    .from('intention_records')
    .select('*')
    .eq('id', request.intention_record_id)
    .single()
  if (intentionError || !intention) {
    return { ok: false, error: intentionError?.message ?? '意向把握記録が見つかりません。' }
  }

  const [{ data: products }, { data: latestEvidence }, { data: financialChecks }] =
    await Promise.all([
      admin
        .from('intention_products')
        .select(
          'insurance_company, product_name, product_category, premium, is_recommended, recommendation_reason, sort_order',
        )
        .eq('intention_record_id', intention.id)
        .order('sort_order', { ascending: true }),
      admin
        .from('intention_signature_evidences')
        .select('revision')
        .eq('intention_record_id', intention.id)
        .order('revision', { ascending: false })
        .limit(1)
        .maybeSingle(),
      admin
        .from('financial_situation_checks')
        .select('annual_income, employer_name, investment_experience, investment_knowledge, note')
        .eq('intention_record_id', intention.id)
        .order('recorded_at', { ascending: false })
        .limit(1),
    ])

  let signatureBuffer: Buffer
  let sealSecret: string
  try {
    signatureBuffer = decodePngDataUrl(parsed.data.signature_data_url)
    sealSecret = requireSignatureSealSecret()
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : '電子サインの検証に失敗しました',
    }
  }

  const revision = Number(latestEvidence?.revision ?? 0) + 1
  const revisionLabel = String(revision).padStart(3, '0')
  const signedAt = new Date().toISOString()
  const requestHeaders = await headers()
  const clientIp = getClientIp(requestHeaders)
  const clientUserAgent = requestHeaders.get('user-agent')?.slice(0, 1000) ?? null
  const signatureStoragePath =
    `${request.tenant_id}/${intention.id}/rev-${revisionLabel}-remote-signature.png`
  const manifestStoragePath =
    `${request.tenant_id}/${intention.id}/rev-${revisionLabel}-remote-evidence.json`
  const signatureSha256 = sha256Hex(signatureBuffer)
  const rawChecklist = normalizeChecklistSource(intention.checklist)
  const checklist = pickBooleanChecklist(rawChecklist)
  const financial = financialChecks?.[0]

  const manifestValues: IntentionWizardValues = {
    customer_id: intention.customer_id,
    contract_id: intention.contract_id,
    initial_intention: intention.initial_intention,
    initial_recorded_at: intention.initial_recorded_at ?? '',
    comparison_method: intention.comparison_method as ComparisonMethod,
    comparison_reason: intention.comparison_reason,
    products: (products ?? []).map((product) => ({
      insurance_company: product.insurance_company,
      product_name: product.product_name,
      product_category: product.product_category as IntentionWizardValues['products'][number]['product_category'],
      premium: product.premium ?? 0,
      is_recommended: product.is_recommended,
      recommendation_reason: product.recommendation_reason,
    })),
    financial_situation: financial
      ? {
          annual_income: financial.annual_income as NonNullable<IntentionWizardValues['financial_situation']>['annual_income'],
          employer_name: financial.employer_name ?? '',
          investment_experience:
            financial.investment_experience as NonNullable<IntentionWizardValues['financial_situation']>['investment_experience'],
          investment_knowledge:
            financial.investment_knowledge as NonNullable<IntentionWizardValues['financial_situation']>['investment_knowledge'],
          note: financial.note,
        }
      : null,
    final_intention: intention.final_intention ?? '',
    final_change_note:
      typeof rawChecklist._change_note === 'string' ? rawChecklist._change_note : null,
    final_recorded_at: intention.final_recorded_at ?? '',
    checklist,
    approver_id: intention.approver_id,
    signature_signer_name: parsed.data.signer_name,
    signature_data_url: parsed.data.signature_data_url,
    signature_consent_confirmed: parsed.data.consent_confirmed,
  }

  const evidenceManifest = buildIntentionSignatureManifest({
    values: manifestValues,
    tenantId: request.tenant_id,
    intentionRecordId: intention.id,
    createdBy: request.created_by,
    status: intention.status,
    signedAt,
    signatureStoragePath,
    signatureSha256,
    signatureSizeBytes: signatureBuffer.length,
    manifestStoragePath,
    clientIp,
    clientUserAgent,
    initialRecordedAt: intention.initial_recorded_at,
    finalRecordedAt: intention.final_recorded_at,
  })
  const canonicalManifest = canonicalJson(evidenceManifest)
  const evidenceManifestSha256 = sha256Hex(canonicalManifest)
  const serverSeal = createServerSeal(canonicalManifest, sealSecret)

  const { error: signatureUploadError } = await admin.storage
    .from(INTENTION_SIGNATURE_BUCKET)
    .upload(signatureStoragePath, signatureBuffer, {
      contentType: 'image/png',
      upsert: false,
    })
  if (signatureUploadError) return { ok: false, error: signatureUploadError.message }

  const { error: manifestUploadError } = await admin.storage
    .from(INTENTION_SIGNATURE_BUCKET)
    .upload(manifestStoragePath, canonicalManifest, {
      contentType: 'application/json',
      upsert: false,
    })
  if (manifestUploadError) return { ok: false, error: manifestUploadError.message }

  const { error: evidenceError } = await admin
    .from('intention_signature_evidences')
    .insert({
      tenant_id: request.tenant_id,
      intention_record_id: intention.id,
      revision,
      signer_name: parsed.data.signer_name,
      signer_email: request.signer_email,
      consent_text: INTENTION_SIGNATURE_CONSENT_TEXT,
      consent_version: INTENTION_SIGNATURE_CONSENT_VERSION,
      signed_at: signedAt,
      signature_storage_path: signatureStoragePath,
      signature_sha256: signatureSha256,
      signature_mime_type: 'image/png',
      signature_size_bytes: signatureBuffer.length,
      manifest_storage_path: manifestStoragePath,
      evidence_manifest: evidenceManifest,
      evidence_manifest_sha256: evidenceManifestSha256,
      server_seal_algorithm: INTENTION_SIGNATURE_SEAL_ALGORITHM,
      server_seal_key_id: getSignatureSealKeyId(),
      server_seal: serverSeal,
      signature_channel: 'remote',
      signature_request_id: request.id,
      client_ip: clientIp,
      client_user_agent: clientUserAgent,
      created_by: request.created_by,
    })
  if (evidenceError) return { ok: false, error: evidenceError.message }

  await admin
    .from('intention_signature_requests')
    .update({ status: '署名済', signed_at: signedAt })
    .eq('id', request.id)

  await admin.from('audit_logs').insert({
    tenant_id: request.tenant_id,
    actor_id: request.created_by,
    action: 'REMOTE_SIGNATURE_COMPLETED',
    entity_type: 'intention_record',
    entity_id: intention.id,
    metadata: {
      signature_request_id: request.id,
      revision,
      signer_email: request.signer_email,
      signature_sha256: signatureSha256,
      evidence_manifest_sha256: evidenceManifestSha256,
      server_seal_algorithm: INTENTION_SIGNATURE_SEAL_ALGORITHM,
      server_seal_key_id: getSignatureSealKeyId(),
    },
  })

  revalidatePath(`/intentions/${intention.id}`)
  revalidatePath('/intentions')
  return { ok: true }
}

function getClientIp(headersList: Headers): string | null {
  const forwardedFor = headersList.get('x-forwarded-for')?.split(',')[0]?.trim()
  if (forwardedFor) return forwardedFor.slice(0, 100)

  const realIp = headersList.get('x-real-ip')?.trim()
  return realIp ? realIp.slice(0, 100) : null
}

function normalizeChecklistSource(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

function pickBooleanChecklist(value: Record<string, unknown>): Record<string, boolean> {
  const out: Record<string, boolean> = {}
  for (const [key, item] of Object.entries(value)) {
    if (typeof item === 'boolean') out[key] = item
  }
  return out
}
