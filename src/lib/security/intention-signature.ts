import { createHash, createHmac } from 'node:crypto'
import {
  INTENTION_SIGNATURE_CONSENT_TEXT,
  INTENTION_SIGNATURE_CONSENT_VERSION,
} from '@/lib/constants/intention'
import type { IntentionWizardValues } from '@/lib/validations/intention'

export {
  INTENTION_SIGNATURE_CONSENT_TEXT,
  INTENTION_SIGNATURE_CONSENT_VERSION,
} from '@/lib/constants/intention'

export const INTENTION_SIGNATURE_BUCKET = 'intention-signatures'
export const INTENTION_SIGNATURE_SEAL_ALGORITHM = 'HMAC-SHA256'
export const MAX_SIGNATURE_BYTES = 512 * 1024

interface BuildManifestParams {
  values: IntentionWizardValues
  tenantId: string
  intentionRecordId: string
  createdBy: string
  status: string
  signedAt: string
  signatureStoragePath: string
  signatureSha256: string
  signatureSizeBytes: number
  manifestStoragePath: string
  clientIp: string | null
  clientUserAgent: string | null
  initialRecordedAt: string | null
  finalRecordedAt: string | null
}

export function decodePngDataUrl(dataUrl: string): Buffer {
  const match = dataUrl.match(/^data:image\/png;base64,([A-Za-z0-9+/=]+)$/)
  if (!match) throw new Error('署名データの形式が不正です')

  const buffer = Buffer.from(match[1], 'base64')
  if (buffer.length === 0) throw new Error('署名データが空です')
  if (buffer.length > MAX_SIGNATURE_BYTES) {
    throw new Error('署名データが大きすぎます。サインをクリアして再入力してください')
  }

  return buffer
}

export function sha256Hex(input: Buffer | string): string {
  return createHash('sha256').update(input).digest('hex')
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(normalizeForJson(value))
}

export function buildIntentionSignatureManifest({
  values,
  tenantId,
  intentionRecordId,
  createdBy,
  status,
  signedAt,
  signatureStoragePath,
  signatureSha256,
  signatureSizeBytes,
  manifestStoragePath,
  clientIp,
  clientUserAgent,
  initialRecordedAt,
  finalRecordedAt,
}: BuildManifestParams) {
  return {
    version: 1,
    purpose: 'intention_signature_evidence',
    sealed_at: signedAt,
    tenant_id: tenantId,
    intention_record_id: intentionRecordId,
    customer_id: values.customer_id,
    contract_id: values.contract_id ?? null,
    status,
    created_by: createdBy,
    signer: {
      name: values.signature_signer_name,
      signed_at: signedAt,
    },
    consent: {
      version: INTENTION_SIGNATURE_CONSENT_VERSION,
      text: INTENTION_SIGNATURE_CONSENT_TEXT,
      confirmed: values.signature_consent_confirmed,
    },
    request: {
      ip: clientIp,
      user_agent: clientUserAgent,
    },
    signature_image: {
      storage_path: signatureStoragePath,
      sha256: signatureSha256,
      mime_type: 'image/png',
      size_bytes: signatureSizeBytes,
    },
    manifest: {
      storage_path: manifestStoragePath,
    },
    intention_snapshot: {
      initial_intention: values.initial_intention,
      initial_recorded_at: initialRecordedAt,
      comparison_method: values.comparison_method,
      comparison_reason: values.comparison_reason ?? null,
      financial_situation: values.financial_situation ?? null,
      final_intention: values.final_intention,
      final_change_note: values.final_change_note ?? null,
      final_recorded_at: finalRecordedAt,
      checklist: values.checklist,
    },
    products: values.products.map((product, index) => ({
      sort_order: index,
      insurance_company: product.insurance_company,
      product_name: product.product_name,
      product_category: product.product_category,
      premium: product.premium,
      is_recommended: product.is_recommended,
      recommendation_reason: product.recommendation_reason ?? null,
    })),
  }
}

export function requireSignatureSealSecret(): string {
  const secret = process.env.INTENTION_SIGNATURE_SEAL_SECRET
  if (!secret || secret.length < 32) {
    throw new Error('電子サイン封印キーが未設定です。INTENTION_SIGNATURE_SEAL_SECRET を32文字以上で設定してください。')
  }
  return secret
}

export function getSignatureSealKeyId(): string {
  return process.env.INTENTION_SIGNATURE_SEAL_KEY_ID || 'local-v1'
}

export function createServerSeal(canonicalManifest: string, secret: string): string {
  return createHmac('sha256', secret).update(canonicalManifest).digest('hex')
}

export function verifyServerSeal(
  manifest: unknown,
  expectedManifestSha256: string,
  expectedServerSeal: string,
): boolean | null {
  const secret = process.env.INTENTION_SIGNATURE_SEAL_SECRET
  if (!secret || secret.length < 32) return null

  const canonicalManifest = canonicalJson(manifest)
  const manifestSha256 = sha256Hex(canonicalManifest)
  if (manifestSha256 !== expectedManifestSha256) return false

  return createServerSeal(canonicalManifest, secret) === expectedServerSeal
}

function normalizeForJson(value: unknown): unknown {
  if (value === null) return null
  if (Array.isArray(value)) return value.map((item) => normalizeForJson(item))
  if (typeof value !== 'object') return value

  const source = value as Record<string, unknown>
  const normalized: Record<string, unknown> = {}
  for (const key of Object.keys(source).sort()) {
    const item = source[key]
    if (typeof item !== 'undefined') normalized[key] = normalizeForJson(item)
  }
  return normalized
}
