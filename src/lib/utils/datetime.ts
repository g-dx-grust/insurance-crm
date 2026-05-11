export const APP_TIME_ZONE = 'Asia/Tokyo'

const TOKYO_OFFSET_MS = 9 * 60 * 60 * 1000

const tokyoFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: APP_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})

const dateTimeLocalPattern =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/

export interface TokyoDateTimeParts {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
}

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

export function getTokyoDateTimeParts(
  value: Date | string = new Date(),
): TokyoDateTimeParts {
  const date = typeof value === 'string' ? new Date(value) : value
  const parts = tokyoFormatter.formatToParts(date)
  const map = Object.fromEntries(
    parts
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  )

  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
  }
}

export function createTokyoDate(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
): Date {
  return new Date(
    Date.UTC(year, month - 1, day, hour, minute, second) - TOKYO_OFFSET_MS,
  )
}

export function parseTokyoDateTimeLocal(value: string): Date {
  const match = value.match(dateTimeLocalPattern)
  if (!match) return new Date(value)

  const [, year, month, day, hour, minute, second = '0'] = match
  return createTokyoDate(
    Number(year),
    Number(month),
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
  )
}

export function toTokyoIsoFromDateTimeLocal(value: string): string {
  return parseTokyoDateTimeLocal(value).toISOString()
}

export function formatTokyoDate(value: Date | string): string {
  const p = getTokyoDateTimeParts(value)
  return `${p.year}-${pad2(p.month)}-${pad2(p.day)}`
}

export function formatTokyoTime(value: Date | string): string {
  const p = getTokyoDateTimeParts(value)
  return `${pad2(p.hour)}:${pad2(p.minute)}`
}

export function formatTokyoDateTime(value: Date | string): string {
  return `${formatTokyoDate(value)} ${formatTokyoTime(value)}`
}

export function formatTokyoDateTimeLocal(value: Date | string): string {
  const p = getTokyoDateTimeParts(value)
  return `${p.year}-${pad2(p.month)}-${pad2(p.day)}T${pad2(p.hour)}:${pad2(p.minute)}`
}

export function formatTokyoDateTimeLocalFromParts(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
): string {
  return `${year}-${pad2(month)}-${pad2(day)}T${pad2(hour)}:${pad2(minute)}`
}

export function nowTokyoDateTimeLocal(): string {
  return formatTokyoDateTimeLocal(new Date())
}

export function addMinutesToTokyoDateTimeLocal(
  value: string,
  minutes: number,
): string {
  return formatTokyoDateTimeLocal(
    new Date(parseTokyoDateTimeLocal(value).getTime() + minutes * 60 * 1000),
  )
}

export function shiftTokyoYearMonth(
  year: number,
  month: number,
  deltaMonths: number,
): { year: number; month: number } {
  const index = year * 12 + (month - 1) + deltaMonths
  const shiftedYear = Math.floor(index / 12)
  const shiftedMonth = index - shiftedYear * 12 + 1
  return { year: shiftedYear, month: shiftedMonth }
}

export function currentTokyoYearMonth(): { year: number; month: number } {
  const p = getTokyoDateTimeParts()
  return { year: p.year, month: p.month }
}

export function tokyoMonthRangeIso(year: number, month: number): {
  startDate: string
  endDate: string
} {
  const next = shiftTokyoYearMonth(year, month, 1)
  return {
    startDate: createTokyoDate(year, month, 1).toISOString(),
    endDate: new Date(createTokyoDate(next.year, next.month, 1).getTime() - 1000)
      .toISOString(),
  }
}

export function tokyoDateRangeIso(
  year: number,
  month: number,
  day: number,
): {
  startDate: string
  endDate: string
} {
  return {
    startDate: createTokyoDate(year, month, day).toISOString(),
    endDate: createTokyoDate(year, month, day, 23, 59, 59).toISOString(),
  }
}

export function todayTokyoYmd(): string {
  return formatTokyoDate(new Date())
}

export function ymdAfterTokyo(days: number): string {
  const today = getTokyoDateTimeParts()
  const start = createTokyoDate(today.year, today.month, today.day).getTime()
  return formatTokyoDate(
    new Date(start + days * 24 * 60 * 60 * 1000),
  )
}

export function ymdAfterTokyoMonths(months: number): string {
  const today = getTokyoDateTimeParts()
  return formatTokyoDate(
    createTokyoDate(today.year, today.month + months, today.day),
  )
}

export function formatTokyoMonthKey(value: Date | string): string {
  const p = getTokyoDateTimeParts(value)
  return `${p.year}-${pad2(p.month)}`
}

export function pastTokyoMonthKeys(count = 12): string[] {
  const out: string[] = []
  const now = currentTokyoYearMonth()
  for (let i = count - 1; i >= 0; i--) {
    const p = shiftTokyoYearMonth(now.year, now.month, -i)
    out.push(`${p.year}-${pad2(p.month)}`)
  }
  return out
}
