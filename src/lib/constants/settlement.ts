/**
 * 精算ステータス。Phase 1 §13 の settlements.status CHECK 制約と完全一致。
 */
export const SETTLEMENT_STATUSES = [
  '未精算',
  '照合中',
  '完了',
  '差異あり',
] as const

export type SettlementStatus = (typeof SETTLEMENT_STATUSES)[number]

/** YYYY-MM 形式 (今月) */
export function currentMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** 過去 12 ヶ月 (今月含む) を YYYY-MM の昇順配列で返す */
export function past12Months(): string[] {
  const out: string[] = []
  const now = new Date()
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return out
}

/** 12 ヶ月前の YYYY-MM (検索の境界用) */
export function past12MonthsStart(): string {
  return past12Months()[0]
}
