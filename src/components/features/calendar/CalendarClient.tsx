'use client'

import { Fragment, useMemo, useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EVENT_CATEGORY_STYLE, type EventCategory } from '@/lib/constants/calendar'
import { EventSidePanel, type EventInitial } from './EventSidePanel'
import type { CustomerOption } from '@/components/features/customers/CustomerCombobox'

export interface CalendarEventRow {
  id: string
  title: string
  type: string
  start_at: string
  end_at: string
  all_day: boolean
  related_customer_id: string | null
  assigned_to: string | null
  location: string | null
  note: string | null
}

interface UserOption {
  id: string
  name: string
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'] as const
const HOURS = Array.from({ length: 24 }, (_, i) => i)

export function CalendarClient({
  events,
  year,
  month,
  customers,
  users,
}: {
  events: CalendarEventRow[]
  year: number
  month: number // 1-12
  customers: CustomerOption[]
  users: UserOption[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()
  const view = (sp.get('view') ?? 'month') as 'month' | 'week'

  const [panelOpen, setPanelOpen] = useState(false)
  const [editing, setEditing] = useState<EventInitial | null>(null)
  const [defaultStart, setDefaultStart] = useState<Date | undefined>(undefined)

  const navigate = (deltaMonth: number) => {
    const d = new Date(year, month - 1 + deltaMonth, 1)
    const params = new URLSearchParams(sp.toString())
    params.set('year', String(d.getFullYear()))
    params.set('month', String(d.getMonth() + 1))
    router.push(`${pathname}?${params.toString()}`)
  }

  const setView = (v: 'month' | 'week') => {
    const params = new URLSearchParams(sp.toString())
    params.set('view', v)
    router.push(`${pathname}?${params.toString()}`)
  }

  const openNew = (start?: Date) => {
    setEditing(null)
    setDefaultStart(start)
    setPanelOpen(true)
  }

  const openEdit = (e: CalendarEventRow) => {
    setEditing({
      id: e.id,
      title: e.title,
      type: e.type,
      start_at: e.start_at,
      end_at: e.end_at,
      all_day: e.all_day,
      related_customer_id: e.related_customer_id,
      assigned_to: e.assigned_to,
      location: e.location,
      note: e.note,
    })
    setDefaultStart(undefined)
    setPanelOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-md border border-border bg-bg p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => navigate(-1)}
            aria-label="前月"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="min-w-[100px] text-center text-sm font-medium text-text">
            {year}年 {month}月
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => navigate(1)}
            aria-label="次月"
          >
            <ChevronRight className="size-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const now = new Date()
              const params = new URLSearchParams(sp.toString())
              params.set('year', String(now.getFullYear()))
              params.set('month', String(now.getMonth() + 1))
              router.push(`${pathname}?${params.toString()}`)
            }}
          >
            今月
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-border">
            <button
              type="button"
              onClick={() => setView('month')}
              className={`rounded-l-sm px-3 py-1.5 text-xs ${
                view === 'month'
                  ? 'bg-[color:var(--color-accent-tint)] text-[color:var(--color-accent)] font-medium'
                  : 'text-text-sub hover:bg-[color:var(--color-bg-secondary)]'
              }`}
              aria-pressed={view === 'month'}
            >
              月
            </button>
            <button
              type="button"
              onClick={() => setView('week')}
              className={`rounded-r-sm px-3 py-1.5 text-xs ${
                view === 'week'
                  ? 'bg-[color:var(--color-accent-tint)] text-[color:var(--color-accent)] font-medium'
                  : 'text-text-sub hover:bg-[color:var(--color-bg-secondary)]'
              }`}
              aria-pressed={view === 'week'}
            >
              週
            </button>
          </div>
          <Button onClick={() => openNew()}>
            <Plus className="mr-1 size-4" />
            予定追加
          </Button>
        </div>
      </div>

      {view === 'month' ? (
        <MonthView
          year={year}
          month={month}
          events={events}
          onEventClick={openEdit}
          onDayClick={openNew}
        />
      ) : (
        <WeekView
          year={year}
          month={month}
          events={events}
          onEventClick={openEdit}
          onSlotClick={openNew}
        />
      )}

      <EventSidePanel
        open={panelOpen}
        onOpenChange={(o) => {
          setPanelOpen(o)
          if (!o) {
            setEditing(null)
            setDefaultStart(undefined)
          }
        }}
        initial={editing}
        defaultStart={defaultStart}
        customers={customers}
        users={users}
      />
    </div>
  )
}

// ─── Month View (42 マス) ────────────────────────────────────────────

function MonthView({
  year,
  month,
  events,
  onEventClick,
  onDayClick,
}: {
  year: number
  month: number
  events: CalendarEventRow[]
  onEventClick: (e: CalendarEventRow) => void
  onDayClick: (start: Date) => void
}) {
  const cells = useMemo(() => buildMonthCells(year, month), [year, month])
  const eventsByDay = useMemo(() => groupEventsByDay(events), [events])
  const today = todayKey()

  return (
    <div className="overflow-hidden rounded-md border border-border bg-bg">
      <div className="grid grid-cols-7 border-b border-border bg-[color:var(--color-bg-secondary)]">
        {WEEKDAYS.map((w, i) => (
          <div
            key={w}
            className={`p-2 text-center text-xs font-medium ${
              i === 0
                ? 'text-[color:var(--color-error)]'
                : i === 6
                  ? 'text-[color:var(--color-accent)]'
                  : 'text-text-sub'
            }`}
          >
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((cell) => {
          const key = dateKey(cell.date)
          const dayEvents = eventsByDay.get(key) ?? []
          const isToday = key === today
          return (
            <button
              key={key}
              type="button"
              onClick={() => onDayClick(new Date(cell.date.getFullYear(), cell.date.getMonth(), cell.date.getDate(), 9, 0))}
              className={`min-h-24 border-r border-b border-border p-1.5 text-left transition-colors hover:bg-[color:var(--color-bg-secondary)] ${
                cell.inCurrentMonth ? 'bg-bg' : 'bg-[color:var(--color-bg-secondary)]'
              }`}
            >
              <div
                className={`mb-1 inline-flex size-6 items-center justify-center rounded-full text-xs ${
                  isToday
                    ? 'bg-[color:var(--color-accent)] text-white font-semibold'
                    : cell.inCurrentMonth
                      ? 'text-text'
                      : 'text-text-muted'
                }`}
              >
                {cell.date.getDate()}
              </div>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map((e) => {
                  const style = EVENT_CATEGORY_STYLE[e.type as EventCategory] ?? EVENT_CATEGORY_STYLE['その他']
                  return (
                    <div
                      key={e.id}
                      onClick={(ev) => {
                        ev.stopPropagation()
                        onEventClick(e)
                      }}
                      role="button"
                      tabIndex={0}
                      className="truncate rounded-sm border px-1 py-0.5 text-[10px] leading-tight cursor-pointer"
                      style={{
                        backgroundColor: style.bg,
                        color: style.text,
                        borderColor: style.border,
                      }}
                    >
                      {!e.all_day && (
                        <span className="mr-0.5 font-mono opacity-70">
                          {formatHM(e.start_at)}
                        </span>
                      )}
                      {e.title}
                    </div>
                  )
                })}
                {dayEvents.length > 3 && (
                  <div className="text-[10px] text-text-muted">
                    +{dayEvents.length - 3}件
                  </div>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Week View ───────────────────────────────────────────────────────

function WeekView({
  year,
  month,
  events,
  onEventClick,
  onSlotClick,
}: {
  year: number
  month: number
  events: CalendarEventRow[]
  onEventClick: (e: CalendarEventRow) => void
  onSlotClick: (start: Date) => void
}) {
  // 表示週: 当月の 1 日を含む週 (今月でなければ 1 日基準)
  const weekDates = useMemo(() => {
    const base = new Date(year, month - 1, 1)
    const dow = base.getDay()
    const start = new Date(base.getFullYear(), base.getMonth(), base.getDate() - dow)
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      return d
    })
  }, [year, month])

  const eventsByDay = useMemo(() => groupEventsByDay(events), [events])
  const today = todayKey()

  return (
    <div className="overflow-hidden rounded-md border border-border bg-bg">
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border bg-[color:var(--color-bg-secondary)]">
        <div className="p-2 text-center text-xs text-text-muted">時刻</div>
        {weekDates.map((d, i) => {
          const k = dateKey(d)
          return (
            <div
              key={k}
              className={`p-2 text-center text-xs ${
                i === 0
                  ? 'text-[color:var(--color-error)]'
                  : i === 6
                    ? 'text-[color:var(--color-accent)]'
                    : 'text-text-sub'
              }`}
            >
              <div className="font-medium">{WEEKDAYS[i]}</div>
              <div
                className={`mx-auto mt-0.5 inline-flex size-6 items-center justify-center rounded-full ${
                  k === today
                    ? 'bg-[color:var(--color-accent)] text-white font-semibold'
                    : ''
                }`}
              >
                {d.getDate()}
              </div>
            </div>
          )
        })}
      </div>
      <div className="grid grid-cols-[60px_repeat(7,1fr)] max-h-[600px] overflow-y-auto">
        {HOURS.map((hour) => (
          <Fragment key={hour}>
            <div className="border-b border-r border-border p-1 text-right text-[10px] text-text-muted">
              {String(hour).padStart(2, '0')}:00
            </div>
            {weekDates.map((d) => {
              const k = dateKey(d)
              const slotEvents = (eventsByDay.get(k) ?? []).filter((e) => {
                if (e.all_day) return hour === 0
                return new Date(e.start_at).getHours() === hour
              })
              return (
                <button
                  key={`${k}-${hour}`}
                  type="button"
                  onClick={() =>
                    onSlotClick(new Date(d.getFullYear(), d.getMonth(), d.getDate(), hour, 0))
                  }
                  className="relative min-h-12 border-b border-r border-border p-1 transition-colors hover:bg-[color:var(--color-bg-secondary)]"
                >
                  {slotEvents.map((e) => {
                    const style = EVENT_CATEGORY_STYLE[e.type as EventCategory] ?? EVENT_CATEGORY_STYLE['その他']
                    return (
                      <div
                        key={e.id}
                        onClick={(ev) => {
                          ev.stopPropagation()
                          onEventClick(e)
                        }}
                        role="button"
                        tabIndex={0}
                        className="mb-0.5 truncate rounded-sm border px-1 py-0.5 text-[10px] leading-tight"
                        style={{
                          backgroundColor: style.bg,
                          color: style.text,
                          borderColor: style.border,
                        }}
                      >
                        {!e.all_day && (
                          <span className="mr-0.5 font-mono opacity-70">
                            {formatHM(e.start_at)}
                          </span>
                        )}
                        {e.title}
                      </div>
                    )
                  })}
                </button>
              )
            })}
          </Fragment>
        ))}
      </div>
    </div>
  )
}

// ─── helpers ────────────────────────────────────────────────────────

interface MonthCell {
  date: Date
  inCurrentMonth: boolean
}

function buildMonthCells(year: number, month: number): MonthCell[] {
  const first = new Date(year, month - 1, 1)
  const startDow = first.getDay() // 0=日
  const start = new Date(year, month - 1, 1 - startDow)
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return { date: d, inCurrentMonth: d.getMonth() === month - 1 }
  })
}

function groupEventsByDay(
  events: CalendarEventRow[],
): Map<string, CalendarEventRow[]> {
  const map = new Map<string, CalendarEventRow[]>()
  for (const e of events) {
    const k = dateKey(new Date(e.start_at))
    const arr = map.get(k) ?? []
    arr.push(e)
    map.set(k, arr)
  }
  for (const arr of map.values()) {
    arr.sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
  }
  return map
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function todayKey(): string {
  return dateKey(new Date())
}

function formatHM(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
