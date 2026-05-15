'use client'

import { useEffect, useState } from 'react'
import Link, { useLinkStatus } from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BarChart2,
  Calendar,
  ChevronsLeft,
  ChevronsRight,
  ClipboardList,
  FileText,
  LayoutDashboard,
  Link2,
  PieChart,
  Settings,
  TrendingUp,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type NavItem = {
  label: string
  path: string
  icon: LucideIcon
}

type NavGroup = {
  label: string
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'ホーム',
    items: [{ label: 'ダッシュボード', path: '/', icon: LayoutDashboard }],
  },
  {
    label: '顧客・契約',
    items: [
      { label: '顧客管理', path: '/customers', icon: Users },
      { label: '契約管理', path: '/contracts', icon: FileText },
    ],
  },
  {
    label: '案件・活動',
    items: [
      { label: '案件管理', path: '/opportunities', icon: TrendingUp },
      { label: 'カレンダー', path: '/calendar', icon: Calendar },
    ],
  },
  {
    label: '保険業法対応',
    items: [
      { label: '意向把握', path: '/intentions', icon: ClipboardList },
      { label: '財務状況確認', path: '/financial-checks', icon: ClipboardList },
      { label: '持ち出し記録簿', path: '/carry-out-logs', icon: FileText },
    ],
  },
  {
    label: '精算・成績',
    items: [{ label: '精算・MDRT管理', path: '/settlement', icon: BarChart2 }],
  },
  {
    label: '分析・設定',
    items: [
      { label: 'レポート', path: '/reports', icon: PieChart },
      { label: 'Lark 連携', path: '/lark', icon: Link2 },
      { label: '設定', path: '/settings', icon: Settings },
    ],
  },
]

const STORAGE_KEY = 'hokena_sidebar_collapsed'

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    queueMicrotask(() => {
      if (stored === 'true') setCollapsed(true)
      setHydrated(true)
    })
  }, [])

  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, String(collapsed))
  }, [collapsed, hydrated])

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/'
    return pathname === path || pathname.startsWith(`${path}/`)
  }

  return (
    <aside
      className={cn(
        'flex shrink-0 flex-col border-r border-border bg-[color:var(--color-bg-sidebar)] transition-all duration-200',
        collapsed ? 'w-[56px]' : 'w-[200px]',
      )}
    >
      {/* ロゴ + 折りたたみボタン */}
      <div className="flex h-[52px] items-center justify-between gap-2 border-b border-border px-3">
        {!collapsed && (
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-semibold text-text"
            aria-label="ダッシュボードへ"
          >
            <LogoMark />
            <span>HOKENA CRM</span>
          </Link>
        )}
        {collapsed && (
          <Link href="/" className="mx-auto" aria-label="ダッシュボードへ">
            <LogoMark />
          </Link>
        )}
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="rounded-sm p-1 text-text-muted transition-colors hover:bg-[color:var(--color-bg-secondary)] hover:text-text"
          aria-label={collapsed ? 'サイドバーを開く' : 'サイドバーを折りたたむ'}
          title={collapsed ? '開く' : '折りたたむ'}
        >
          {collapsed ? (
            <ChevronsRight className="size-4" />
          ) : (
            <ChevronsLeft className="size-4" />
          )}
        </button>
      </div>

      {/* ナビ */}
      <nav className="flex-1 overflow-y-auto py-2">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-2">
            {!collapsed && (
              <p className="px-3 py-1 text-[10.5px] font-medium uppercase tracking-wider text-text-muted">
                {group.label}
              </p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item.path)
                const Icon = item.icon
                return (
                  <li key={item.path}>
                    <Link
                      href={item.path}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        'group flex items-center gap-2.5 rounded-sm px-3 py-1.5 text-[14.5px] transition-colors',
                        active
                          ? 'bg-[color:var(--color-accent-tint)] text-[color:var(--color-accent)] font-medium'
                          : 'text-text-sub hover:bg-[color:var(--color-bg-secondary)] hover:text-text',
                        collapsed && 'justify-center px-2',
                      )}
                    >
                      <NavPendingBar />
                      <Icon className="size-4 shrink-0" />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  )
}

function NavPendingBar() {
  const { pending } = useLinkStatus()

  return (
    <span
      aria-hidden
      className={cn(
        'fixed left-0 top-0 z-50 h-[2px] w-full bg-[color:var(--color-accent)] opacity-0 transition-opacity duration-150',
        pending && 'opacity-100',
      )}
    />
  )
}

function LogoMark() {
  // 菱形 (28×28)。currentColor でテーマに追従
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      style={{ color: 'var(--color-accent)' }}
    >
      <path
        d="M12 2 L22 12 L12 22 L2 12 Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        fill="currentColor"
        fillOpacity="0.15"
      />
    </svg>
  )
}
