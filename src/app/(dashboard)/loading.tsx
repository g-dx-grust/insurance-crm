import { Skeleton } from '@/components/ui/skeleton'

export default function DashboardLoading() {
  return (
    <div className="space-y-6" aria-label="読み込み中">
      <div className="mb-6 flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48 max-w-full" />
          <Skeleton className="h-5 w-80 max-w-full" />
        </div>
        <Skeleton className="h-control w-32" />
      </div>

      <div className="rounded-md border border-border bg-bg p-4">
        <div className="grid gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="space-y-1.5">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-control w-full" />
            </div>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-md border border-border bg-bg">
        <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr_120px] gap-4 border-b border-border bg-bg-secondary px-4 py-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-4 w-full" />
          ))}
        </div>
        <div className="divide-y divide-border">
          {Array.from({ length: 7 }).map((_, index) => (
            <div
              key={index}
              className="grid min-h-16 grid-cols-[1.4fr_1fr_1fr_1fr_120px] items-center gap-4 px-4 py-3"
            >
              <div className="space-y-2">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-control w-20 justify-self-end" />
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="min-h-28 rounded-md border border-border bg-bg p-4">
            <Skeleton className="h-5 w-32" />
            <div className="mt-4 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
