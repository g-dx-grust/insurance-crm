import type { StatusVariant } from '@/components/ui/StatusBadge'

/**
 * 満期残日数を返す。null や不正な日付は null。
 */
export function calcRemainingDays(expiryDate: string | null): number | null {
  if (!expiryDate) return null
  const expiry = new Date(expiryDate)
  if (Number.isNaN(expiry.getTime())) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diffMs = expiry.getTime() - today.getTime()
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

/** StatusBadge variant にマップ。色は CSS 変数経由 (StatusBadge 側) */
export function getExpiryBadgeVariant(
  expiryDate: string | null,
): StatusVariant {
  const d = calcRemainingDays(expiryDate)
  if (d == null) return 'muted'
  if (d < 0) return 'muted'
  if (d <= 30) return 'danger'
  if (d <= 90) return 'warning'
  return 'default'
}

export function formatRemainingDays(expiryDate: string | null): string {
  const d = calcRemainingDays(expiryDate)
  if (d == null) return '—'
  if (d < 0) return '満期済'
  if (d === 0) return '本日満期'
  return `残 ${d} 日`
}
