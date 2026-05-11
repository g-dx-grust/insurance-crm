'use client'

export interface MdrtTargets {
  mdrt: number
  cot: number
  tot: number
}

export function MdrtProgressBar({
  userName,
  performanceValue,
  targets,
}: {
  userName: string
  performanceValue: number
  targets: MdrtTargets
}) {
  const pct = Math.min((performanceValue / targets.tot) * 100, 100)
  const mdrtLinePct = (targets.mdrt / targets.tot) * 100
  const cotLinePct = (targets.cot / targets.tot) * 100

  const level =
    performanceValue >= targets.tot
      ? 'TOT'
      : performanceValue >= targets.cot
        ? 'COT'
        : performanceValue >= targets.mdrt
          ? 'MDRT'
          : '—'

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-sm font-medium text-text-sub">{userName}</span>
        <div className="flex items-center gap-2">
          <span className="text-sm text-text-muted">
            {(performanceValue / 10000).toLocaleString()}万円
          </span>
          {level !== '—' && (
            <span className="rounded-sm border border-border-strong px-1.5 py-0.5 text-xs font-semibold text-[color:var(--color-accent)]">
              {level}
            </span>
          )}
        </div>
      </div>
      <div className="relative h-2 overflow-hidden rounded-sm bg-[color:var(--color-bg-secondary)]">
        <div
          className="absolute h-full rounded-sm bg-[color:var(--color-accent)] transition-all"
          style={{ width: `${pct}%` }}
        />
        <div
          className="absolute top-0 h-full w-px bg-[color:var(--color-border-strong)]"
          style={{ left: `${mdrtLinePct}%` }}
        />
        <div
          className="absolute top-0 h-full w-px bg-[color:var(--color-border-strong)]"
          style={{ left: `${cotLinePct}%` }}
        />
      </div>
      <div className="mt-0.5 flex justify-between text-xs text-text-muted">
        <span>0</span>
        <span>MDRT {(targets.mdrt / 10000).toLocaleString()}万</span>
        <span>COT {(targets.cot / 10000).toLocaleString()}万</span>
        <span>TOT {(targets.tot / 10000).toLocaleString()}万</span>
      </div>
    </div>
  )
}
