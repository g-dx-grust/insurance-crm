import { Inbox } from 'lucide-react'
import { cn } from '@/lib/utils'

export function EmptyState({
  title = 'データがありません',
  description,
  icon: Icon = Inbox,
  action,
  className,
}: {
  title?: string
  description?: string
  icon?: React.ComponentType<{ className?: string }>
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-md border border-dashed border-border bg-bg px-6 py-12 text-center',
        className,
      )}
    >
      <Icon className="size-8 text-text-muted" aria-hidden />
      <p className="mt-3 text-sm font-medium text-text">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-xs text-text-muted">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
