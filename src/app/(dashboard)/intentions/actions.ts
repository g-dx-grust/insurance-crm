'use server'

import { randomBytes, randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import {
  getCurrentTenantId,
  getSessionUserOrRedirect,
} from '@/lib/auth/server'
import {
  intentionWizardSchema,
  type IntentionWizardValues,
  unsignedIntentionRecordSchema,
  type UnsignedIntentionRecordValues,
} from '@/lib/validations/intention'
import {
  intentionSignatureRequestSchema,
  type IntentionSignatureRequestValues,
} from '@/lib/validations/intention-signature-request'
import { toTokyoIsoFromDateTimeLocal } from '@/lib/utils/datetime'
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

type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[] | undefined> }

function emptyToNull<T extends Record<string, unknown>>(values: T): T {
  const out: Record<string, unknown> = { ...values }
  for (const k of Object.keys(out)) {
    if (typeof out[k] === 'string' && (out[k] as string).trim() === '') out[k] = null
  }
  return out as T
}

// ─── 新規作成 (4 ステップ完了時) ──────────────────────────────────

export async function createIntentionRecord(
  values: IntentionWizardValues,
): Promise<ActionResult<{ id: string }>> {
  const parsed = intentionWizardSchema.safeParse(emptyToNull(values))
  if (!parsed.success) {
    return {
      ok: false,
      error: '入力内容に誤りがあります。',
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  const supabase = await createClient()
  const tenantId = await getCurrentTenantId()
  const { user } = await getSessionUserOrRedirect()
  const requestHeaders = await headers()

  const v = parsed.data
  const status = v.approver_id ? '承認待' : '実施済'
  const recordId = randomUUID()
  const signedAt = new Date().toISOString()
  const signerName = v.signature_signer_name.trim()
  const initialRecordedAt = toTokyoIsoFromDateTimeLocal(v.initial_recorded_at)
  const finalRecordedAt = toTokyoIsoFromDateTimeLocal(v.final_recorded_at)
  const clientIp = getClientIp(requestHeaders)
  const clientUserAgent = requestHeaders.get('user-agent')?.slice(0, 1000) ?? null

  let signatureBuffer: Buffer
  let sealSecret: string
  try {
    signatureBuffer = decodePngDataUrl(v.signature_data_url)
    sealSecret = requireSignatureSealSecret()
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : '電子サインの検証に失敗しました',
    }
  }

  const signatureStoragePath =
    `${tenantId}/${recordId}/rev-001-signature.png`
  const manifestStoragePath =
    `${tenantId}/${recordId}/rev-001-evidence.json`
  const signatureSha256 = sha256Hex(signatureBuffer)
  const evidenceManifest = buildIntentionSignatureManifest({
    values: { ...v, signature_signer_name: signerName },
    tenantId,
    intentionRecordId: recordId,
    createdBy: user.id,
    status,
    signedAt,
    signatureStoragePath,
    signatureSha256,
    signatureSizeBytes: signatureBuffer.length,
    manifestStoragePath,
    clientIp,
    clientUserAgent,
    initialRecordedAt,
    finalRecordedAt,
  })
  const canonicalManifest = canonicalJson(evidenceManifest)
  const evidenceManifestSha256 = sha256Hex(canonicalManifest)
  const serverSeal = createServerSeal(canonicalManifest, sealSecret)

  const { error: signatureUploadError } = await supabase.storage
    .from(INTENTION_SIGNATURE_BUCKET)
    .upload(signatureStoragePath, signatureBuffer, {
      contentType: 'image/png',
      upsert: false,
    })
  if (signatureUploadError) {
    return { ok: false, error: signatureUploadError.message }
  }

  const { error: manifestUploadError } = await supabase.storage
    .from(INTENTION_SIGNATURE_BUCKET)
    .upload(manifestStoragePath, canonicalManifest, {
      contentType: 'application/json',
      upsert: false,
    })
  if (manifestUploadError) {
    return { ok: false, error: manifestUploadError.message }
  }

  const saved = await insertIntentionSnapshot({
    supabase,
    tenantId,
    recordId,
    createdBy: user.id,
    values: v,
    status,
  })
  if (!saved.ok) return saved
  if (!saved.data) return { ok: false, error: '保存に失敗しました' }
  const record = saved.data

  const { error: evidenceErr } = await supabase
    .from('intention_signature_evidences')
    .insert({
      tenant_id: tenantId,
      intention_record_id: record.id,
      revision: 1,
      signer_name: signerName,
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
      signature_channel: 'onsite',
      client_ip: clientIp,
      client_user_agent: clientUserAgent,
      created_by: user.id,
    })
  if (evidenceErr) return { ok: false, error: evidenceErr.message }

  const admin = createAdminClient()
  await admin.from('audit_logs').insert({
    tenant_id: tenantId,
    actor_id: user.id,
    action: 'CREATE_SIGNATURE_EVIDENCE',
    entity_type: 'intention_record',
    entity_id: record.id,
    metadata: {
      revision: 1,
      signature_sha256: signatureSha256,
      evidence_manifest_sha256: evidenceManifestSha256,
      server_seal_algorithm: INTENTION_SIGNATURE_SEAL_ALGORITHM,
      server_seal_key_id: getSignatureSealKeyId(),
    },
  })

  revalidatePath('/intentions')
  revalidatePath('/financial-checks')
  revalidatePath(`/customers/${v.customer_id}`)
  if (v.contract_id) revalidatePath(`/contracts/${v.contract_id}`)
  redirect(`/intentions/${record.id}`)
}

export async function createPendingSignatureIntentionRecord(
  values: UnsignedIntentionRecordValues,
): Promise<ActionResult<{ id: string }>> {
  const parsed = unsignedIntentionRecordSchema.safeParse(emptyToNull(values))
  if (!parsed.success) {
    return {
      ok: false,
      error: '入力内容に誤りがあります。',
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  const supabase = await createClient()
  const tenantId = await getCurrentTenantId()
  const { user } = await getSessionUserOrRedirect()
  const recordId = randomUUID()
  const v = parsed.data

  const saved = await insertIntentionSnapshot({
    supabase,
    tenantId,
    recordId,
    createdBy: user.id,
    values: v,
    status: '署名待ち',
  })
  if (!saved.ok) return saved
  if (!saved.data) return { ok: false, error: '保存に失敗しました' }

  const admin = createAdminClient()
  await admin.from('audit_logs').insert({
    tenant_id: tenantId,
    actor_id: user.id,
    action: 'CREATE_INTENTION_PENDING_SIGNATURE',
    entity_type: 'intention_record',
    entity_id: saved.data.id,
    metadata: {
      signature_channel: 'remote',
      status: '署名待ち',
    },
  })

  revalidatePath('/intentions')
  revalidatePath('/financial-checks')
  revalidatePath(`/customers/${v.customer_id}`)
  if (v.contract_id) revalidatePath(`/contracts/${v.contract_id}`)
  redirect(`/intentions/${saved.data.id}`)
}

async function insertIntentionSnapshot({
  supabase,
  tenantId,
  recordId,
  createdBy,
  values,
  status,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>
  tenantId: string
  recordId: string
  createdBy: string
  values: UnsignedIntentionRecordValues
  status: string
}): Promise<ActionResult<{ id: string }>> {
  const initialRecordedAt = toTokyoIsoFromDateTimeLocal(values.initial_recorded_at)
  const finalRecordedAt = toTokyoIsoFromDateTimeLocal(values.final_recorded_at)

  const { data: record, error } = await supabase
    .from('intention_records')
    .insert({
      id: recordId,
      tenant_id: tenantId,
      customer_id: values.customer_id,
      contract_id: values.contract_id ?? null,
      initial_intention: values.initial_intention,
      initial_recorded_at: initialRecordedAt,
      comparison_method: values.comparison_method,
      comparison_reason: values.comparison_reason ?? null,
      final_intention: values.final_intention,
      final_recorded_at: finalRecordedAt,
      checklist: { ...values.checklist, _change_note: values.final_change_note ?? null },
      status,
      approver_id: values.approver_id ?? null,
      created_by: createdBy,
    })
    .select('id')
    .single()

  if (error || !record) {
    return { ok: false, error: error?.message ?? '保存に失敗しました' }
  }

  if (values.products.length > 0) {
    const { error: prodErr } = await supabase
      .from('intention_products')
      .insert(
        values.products.map((p, index) => ({
          intention_record_id: record.id,
          tenant_id: tenantId,
          insurance_company: p.insurance_company,
          product_name: p.product_name,
          product_category: p.product_category,
          premium: p.premium,
          is_recommended: p.is_recommended,
          recommendation_reason: p.recommendation_reason ?? null,
          sort_order: index,
        })),
      )
    if (prodErr) return { ok: false, error: prodErr.message }
  }

  if (values.financial_situation) {
    const { error: financialErr } = await supabase
      .from('financial_situation_checks')
      .insert({
        tenant_id: tenantId,
        customer_id: values.customer_id,
        contract_id: values.contract_id ?? null,
        intention_record_id: record.id,
        source: 'intention',
        annual_income: values.financial_situation.annual_income,
        employer_name: values.financial_situation.employer_name,
        investment_experience: values.financial_situation.investment_experience,
        investment_knowledge: values.financial_situation.investment_knowledge,
        note: values.financial_situation.note ?? null,
        recorded_by: createdBy,
      })
    if (financialErr) return { ok: false, error: financialErr.message }
  }

  return { ok: true, data: { id: record.id } }
}

function getClientIp(headersList: Headers): string | null {
  const forwardedFor = headersList.get('x-forwarded-for')?.split(',')[0]?.trim()
  if (forwardedFor) return forwardedFor.slice(0, 100)

  const realIp = headersList.get('x-real-ip')?.trim()
  return realIp ? realIp.slice(0, 100) : null
}

// ─── リモート署名依頼 ─────────────────────────────────────────────

export async function createRemoteSignatureRequest(
  values: IntentionSignatureRequestValues,
): Promise<ActionResult<{ id: string; signingUrl: string }>> {
  const parsed = intentionSignatureRequestSchema.safeParse(values)
  if (!parsed.success) {
    return { ok: false, error: '入力内容に誤りがあります。' }
  }

  const supabase = await createClient()
  const tenantId = await getCurrentTenantId()
  const { user } = await getSessionUserOrRedirect()
  const requestHeaders = await headers()

  const { data: intention, error: intentionError } = await supabase
    .from('intention_records')
    .select('id')
    .eq('id', parsed.data.intention_record_id)
    .single()
  if (intentionError || !intention) {
    return { ok: false, error: intentionError?.message ?? '意向把握記録が見つかりません' }
  }

  const token = randomBytes(32).toString('base64url')
  const tokenHash = sha256Hex(token)
  const expiresAt = new Date(
    Date.now() + parsed.data.expires_in_days * 24 * 60 * 60 * 1000,
  ).toISOString()
  const origin = resolveAppOrigin(requestHeaders)
  const signingUrl = `${origin}/sign/intention/${token}`
  const signerEmail = parsed.data.signer_email ?? null

  const { data: request, error } = await supabase
    .from('intention_signature_requests')
    .insert({
      tenant_id: tenantId,
      intention_record_id: intention.id,
      signer_name: parsed.data.signer_name,
      signer_email: signerEmail,
      token_hash: tokenHash,
      status: 'リンク発行',
      expires_at: expiresAt,
      sent_at: null,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (error || !request) {
    return { ok: false, error: error?.message ?? '署名依頼の作成に失敗しました' }
  }

  const admin = createAdminClient()
  await admin.from('audit_logs').insert({
    tenant_id: tenantId,
    actor_id: user.id,
    action: 'REMOTE_SIGNATURE_LINK_CREATED',
    entity_type: 'intention_record',
    entity_id: intention.id,
    metadata: {
      signature_request_id: request.id,
      signer_name: parsed.data.signer_name,
      signer_email: signerEmail,
      expires_at: expiresAt,
    },
  })

  revalidatePath(`/intentions/${intention.id}`)
  revalidatePath('/intentions')
  return { ok: true, data: { id: request.id, signingUrl } }
}

function resolveAppOrigin(headersList: Headers): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL

  const proto = headersList.get('x-forwarded-proto') ?? 'http'
  const host = headersList.get('x-forwarded-host') ?? headersList.get('host')
  return host ? `${proto}://${host}` : 'http://localhost:3000'
}

// ─── 承認依頼 (Lark Approval キュー登録のモック) ─────────────────────

export async function enqueueIntentionApproval(
  intentionId: string,
  approverId: string,
): Promise<ActionResult> {
  const supabase = await createClient()
  const tenantId = await getCurrentTenantId()

  // 1. 通知キューに積む (Lark Rules §4.2: 非同期処理 + 指数バックオフ)
  // Phase 8 の実 Lark API 接続前段。ここでは pending として記録するのみ。
  const { error: notifErr } = await supabase.from('notification_logs').insert({
    tenant_id: tenantId,
    channel: 'lark_approval',
    target_type: 'user',
    target_value: approverId,
    template_key: 'intention_approval_request',
    payload: { intention_id: intentionId, approver_id: approverId },
    status: 'pending',
  })
  if (notifErr) return { ok: false, error: notifErr.message }

  // 2. 意向把握ステータスを承認待に
  const { error: updErr } = await supabase
    .from('intention_records')
    .update({ status: '承認待', approver_id: approverId })
    .eq('id', intentionId)
  if (updErr) return { ok: false, error: updErr.message }

  revalidatePath(`/intentions/${intentionId}`)
  revalidatePath('/intentions')
  return { ok: true }
}

// ─── 承認 / 差戻 (admin が押す前提。Lark 連携前は手動承認に使う) ─────

export async function approveIntention(
  intentionId: string,
): Promise<ActionResult> {
  const supabase = await createClient()
  const { user } = await getSessionUserOrRedirect()

  const { error } = await supabase
    .from('intention_records')
    .update({
      status: '承認済',
      approved_at: new Date().toISOString(),
      approver_id: user.id,
      rejection_reason: null,
    })
    .eq('id', intentionId)

  if (error) return { ok: false, error: error.message }

  revalidatePath(`/intentions/${intentionId}`)
  revalidatePath('/intentions')
  return { ok: true }
}

export async function rejectIntention(
  intentionId: string,
  reason: string,
): Promise<ActionResult> {
  if (!reason.trim()) return { ok: false, error: '差戻理由を入力してください' }
  const supabase = await createClient()
  const { user } = await getSessionUserOrRedirect()

  const { error } = await supabase
    .from('intention_records')
    .update({
      status: '差戻',
      rejection_reason: reason,
      approver_id: user.id,
    })
    .eq('id', intentionId)

  if (error) return { ok: false, error: error.message }

  revalidatePath(`/intentions/${intentionId}`)
  revalidatePath('/intentions')
  return { ok: true }
}

// ─── 再提出 (差戻後、状態を実施済に戻す) ────────────────────────────

export async function resubmitIntention(
  intentionId: string,
): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('intention_records')
    .update({
      status: '実施済',
      rejection_reason: null,
    })
    .eq('id', intentionId)

  if (error) return { ok: false, error: error.message }

  revalidatePath(`/intentions/${intentionId}`)
  revalidatePath('/intentions')
  return { ok: true }
}

// ※ deleteIntention は実装しない (RLS で DELETE 拒否、保険業法対応)
