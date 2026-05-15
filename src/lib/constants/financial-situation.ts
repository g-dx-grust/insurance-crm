export const SAVINGS_PRODUCT_CATEGORIES = ['年金保険', '積立保険'] as const

export const annualIncomeOptions = [
  '未確認',
  '300万円未満',
  '300〜500万円',
  '500〜1000万円',
  '1000万円以上',
] as const

export const investmentExperienceOptions = [
  '未確認',
  'なし',
  '1年未満',
  '1〜3年',
  '3年以上',
] as const

export const investmentKnowledgeOptions = [
  '未確認',
  '低い',
  '標準',
  '高い',
] as const

export function isSavingsProductCategory(category: string | null | undefined): boolean {
  return SAVINGS_PRODUCT_CATEGORIES.includes(
    category as (typeof SAVINGS_PRODUCT_CATEGORIES)[number],
  )
}
