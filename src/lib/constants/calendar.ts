/**
 * カレンダーイベント種別。Phase 1 §15 calendar_events.type の CHECK 制約と完全一致。
 * カラーは G-DX トークン経由のみ (Design Rules §2: bg-blue-100 等の生 Tailwind パレット禁止)。
 * 「アクセントは1色のみ」のルールに沿うため、種別はトークンのトーン違いで識別する。
 */
export const EVENT_CATEGORIES = [
  '訪問',
  '電話',
  'Web会議',
  '書類作業',
  '社内会議',
  '研修',
  'その他',
] as const

export type EventCategory = (typeof EVENT_CATEGORIES)[number]

/** バッジ・カードの色 (CSS 変数経由) */
export const EVENT_CATEGORY_STYLE: Record<
  EventCategory,
  { bg: string; text: string; border: string }
> = {
  '訪問': {
    bg: 'color-mix(in oklab, var(--color-accent) 12%, transparent)',
    text: 'var(--color-accent)',
    border: 'color-mix(in oklab, var(--color-accent) 30%, transparent)',
  },
  '電話': {
    bg: 'color-mix(in oklab, var(--color-success) 12%, transparent)',
    text: 'var(--color-success)',
    border: 'color-mix(in oklab, var(--color-success) 30%, transparent)',
  },
  'Web会議': {
    bg: 'color-mix(in oklab, var(--color-accent) 18%, transparent)',
    text: 'var(--color-accent)',
    border: 'color-mix(in oklab, var(--color-accent) 40%, transparent)',
  },
  '書類作業': {
    bg: 'color-mix(in oklab, var(--color-warning) 12%, transparent)',
    text: 'var(--color-warning)',
    border: 'color-mix(in oklab, var(--color-warning) 30%, transparent)',
  },
  '社内会議': {
    bg: 'var(--color-bg-secondary)',
    text: 'var(--color-text-sub)',
    border: 'var(--color-border)',
  },
  '研修': {
    bg: 'var(--color-bg-secondary)',
    text: 'var(--color-text-muted)',
    border: 'var(--color-border-strong)',
  },
  'その他': {
    bg: 'var(--color-bg-secondary)',
    text: 'var(--color-text-muted)',
    border: 'var(--color-border)',
  },
}
