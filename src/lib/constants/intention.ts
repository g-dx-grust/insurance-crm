/**
 * 意向把握の単一情報源 (Phase 6 doc)。
 * Phase 1 の intention_records.status / comparison_method の CHECK 制約と必ず同期させること。
 */

export const INTENTION_STATUSES = [
  '未実施',
  '署名待ち',
  '実施済',
  '承認待',
  '承認済',
  '差戻',
] as const

export type IntentionStatus = (typeof INTENTION_STATUSES)[number]

export const COMPARISON_METHODS = ['ロ方式', 'イ方式'] as const
export type ComparisonMethod = (typeof COMPARISON_METHODS)[number]

export const INTENTION_SIGNATURE_CONSENT_VERSION = '2026-05-15-v2'

export const INTENTION_SIGNATURE_CONSENT_TEXT =
  '私は、上記の意向内容および提案商品の内容を確認し、電子サインに同意します。'

/**
 * Phase 6 doc §4ステップウィザード設計 §Step 4 のチェックリスト 9 項目。
 * key は intention_records.checklist (JSONB) のキー、label は UI 表示用。
 * `requiresComparisonMode` が true の項目は、比較方式が「ロ方式」のときのみ必須。
 * `requiresElderly` が true の項目は、対象顧客が高齢者のときのみ必須。
 * 必須でない場合でもチェック自体は可能 (常時表示)。
 */
export const INTENTION_CHECKLIST_ITEMS = [
  { key: 'intention_grasped',     label: '顧客の意向を正確に把握した' },
  { key: 'product_explained',     label: '商品内容を十分に説明した' },
  { key: 'comparison_explained',  label: '比較推奨の説明を行った (ロ方式の場合)', requiresComparisonMode: 'ロ方式' as const },
  { key: 'premium_confirmed',     label: '保険料・保障内容を確認した' },
  { key: 'elderly_handled',       label: '高齢者対応を実施した (対象者のみ)',     requiresElderly: true },
  { key: 'consent_obtained',      label: '顧客の署名・同意を得た' },
  { key: 'document_delivered',    label: '意向把握書を顧客に交付した' },
  { key: 'copy_kept',             label: '控えを保管した' },
  { key: 'next_followup_set',     label: '次回フォロー日程を設定した' },
] as const

export type ChecklistKey = (typeof INTENTION_CHECKLIST_ITEMS)[number]['key']

export const CUSTOMER_CONFIRMATION_CHECKLIST_KEYS = [
  'intention_grasped',
  'product_explained',
  'comparison_explained',
  'premium_confirmed',
  'elderly_handled',
  'consent_obtained',
  'document_delivered',
] as const satisfies readonly ChecklistKey[]

export const INTERNAL_OPERATION_CHECKLIST_KEYS = [
  'copy_kept',
  'next_followup_set',
] as const satisfies readonly ChecklistKey[]
