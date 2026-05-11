/**
 * ダッシュボード・レポート共通の期間範囲計算。
 * 今年度 (this_year) は **保険業界の慣習で 4 月始まり** とする。
 */
import {
  currentTokyoYearMonth,
  pastTokyoMonthKeys,
  shiftTokyoYearMonth,
  tokyoMonthRangeIso,
} from '@/lib/utils/datetime'

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
  const now = currentTokyoYearMonth()
  switch (period) {
    case 'this_month': {
      return tokyoMonthRangeIso(now.year, now.month)
    }
    case 'this_quarter': {
      const q = Math.floor((now.month - 1) / 3)
      const start = { year: now.year, month: q * 3 + 1 }
      const end = shiftTokyoYearMonth(start.year, start.month, 2)
      return {
        startDate: tokyoMonthRangeIso(start.year, start.month).startDate,
        endDate: tokyoMonthRangeIso(end.year, end.month).endDate,
      }
    }
    case 'this_year': {
      // 保険業界の年度は 4 月始まり
      const fy = now.month >= 4 ? now.year : now.year - 1
      return {
        startDate: tokyoMonthRangeIso(fy, 4).startDate,
        endDate: tokyoMonthRangeIso(fy + 1, 3).endDate,
      }
    }
    default:
      return getPeriodRange('this_month')
  }
}

export function past12MonthKeys(): string[] {
  return pastTokyoMonthKeys()
}
