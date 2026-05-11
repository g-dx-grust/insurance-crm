/**
 * ダッシュボード・レポート共通の期間範囲計算。
 * 今年度 (this_year) は **保険業界の慣習で 4 月始まり** とする。
 */
export type PeriodKey = 'this_month' | 'this_quarter' | 'this_year'

export const PERIOD_LABELS: Record<PeriodKey, string> = {
  this_month: '今月',
  this_quarter: '今四半期',
  this_year: '今年度',
}

export function getPeriodRange(period: PeriodKey | string): {
  startDate: string
  endDate: string
} {
  const now = new Date()
  switch (period) {
    case 'this_month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
      return { startDate: start.toISOString(), endDate: end.toISOString() }
    }
    case 'this_quarter': {
      const q = Math.floor(now.getMonth() / 3)
      const start = new Date(now.getFullYear(), q * 3, 1)
      const end = new Date(now.getFullYear(), q * 3 + 3, 0, 23, 59, 59)
      return { startDate: start.toISOString(), endDate: end.toISOString() }
    }
    case 'this_year': {
      // 保険業界の年度は 4 月始まり
      const fy = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1
      return {
        startDate: new Date(fy, 3, 1).toISOString(),
        endDate: new Date(fy + 1, 2, 31, 23, 59, 59).toISOString(),
      }
    }
    default:
      return getPeriodRange('this_month')
  }
}

export function past12MonthKeys(): string[] {
  const out: string[] = []
  const now = new Date()
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return out
}
