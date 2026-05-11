/**
 * 特定保険適合性確認チェックリスト (保険業法対応)。
 * Phase 1 の opportunity_suitability テーブル列名と完全一致させること。
 */
export const SUITABILITY_ITEMS = [
  { key: 'age_confirmed',      label: '年齢・健康状態を確認した' },
  { key: 'income_confirmed',   label: '収入・資産状況を確認した' },
  { key: 'family_confirmed',   label: '家族構成・扶養状況を確認した' },
  { key: 'existing_confirmed', label: '既存契約の内容を確認した' },
  { key: 'need_confirmed',     label: '保険ニーズを確認した' },
  { key: 'product_explained',  label: '商品内容・特約を説明した' },
  { key: 'premium_confirmed',  label: '保険料の支払い能力を確認した' },
  { key: 'comparison_done',    label: '複数商品の比較説明を行った' },
  { key: 'consent_obtained',   label: '顧客の同意を得た' },
] as const

export type SuitabilityKey = (typeof SUITABILITY_ITEMS)[number]['key']
