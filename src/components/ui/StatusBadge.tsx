import { cn } from '@/lib/utils'

export type StatusVariant =
  | 'default'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'muted'

const VARIANT_STYLE: Record<StatusVariant, string> = {
  // 色は CSS 変数経由のみ。HEX / 生 Tailwind パレット禁止 (Design Rules §2 §4)。
  default: 'bg-[color:var(--color-bg-secondary)] text-[color:var(--color-text-sub)] border-[color:var(--color-border)]',
  success: 'bg-[color:var(--color-success)]/10 text-[color:var(--color-success)] border-[color:var(--color-success)]/30',
  warning: 'bg-[color:var(--color-warning)]/10 text-[color:var(--color-warning)] border-[color:var(--color-warning)]/30',
  danger:  'bg-[color:var(--color-error)]/10 text-[color:var(--color-error)] border-[color:var(--color-error)]/30',
  info:    'bg-[color:var(--color-accent-tint)] text-[color:var(--color-accent)] border-[color:var(--color-accent)]/30',
  muted:   'bg-[color:var(--color-bg-secondary)] text-[color:var(--color-text-muted)] border-[color:var(--color-border)]',
}

export function StatusBadge({
  variant = 'default',
  children,
  className,
}: {
  variant?: StatusVariant
  children: React.ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 text-xs font-medium leading-none whitespace-nowrap',
        VARIANT_STYLE[variant],
        className,
      )}
    >
      {children}
    </span>
  )
}
