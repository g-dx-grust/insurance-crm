import { Skeleton } from '@/components/ui/skeleton'

export default function DashboardLoading() {
  return (
    <div className="space-y-6" aria-label="読み込み中">
      <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-48 rounded-sm" />
          <Skeleton className="h-4 w-80 max-w-full rounded-sm" />
        </div>
        <Skeleton className="h-8 w-28 rounded-sm" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-md border border-border bg-bg p-4">
            <Skeleton className="h-4 w-24 rounded-sm" />
            <Skeleton className="mt-4 h-7 w-20 rounded-sm" />
            <Skeleton className="mt-3 h-3 w-32 rounded-sm" />
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="rounded-md border border-border bg-bg p-4">
          <Skeleton className="h-4 w-32 rounded-sm" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 7 }).map((_, index) => (
              <Skeleton key={index} className="h-9 rounded-sm" />
            ))}
          </div>
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="rounded-md border border-border bg-bg p-4">
              <Skeleton className="h-4 w-28 rounded-sm" />
              <Skeleton className="mt-4 h-14 rounded-sm" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
