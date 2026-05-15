'use client'

import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { FontScaleControl } from '@/components/layout/FontScaleControl'
import type { Database } from '@/lib/types/database.types'

type UserProfile = Database['public']['Tables']['user_profiles']['Row']

const PAGE_TITLES: Record<string, string> = {
  '/': 'ダッシュボード',
  '/customers': '顧客管理',
  '/contracts': '契約管理',
  '/opportunities': '案件管理',
  '/calendar': 'カレンダー',
  '/intentions': '意向把握',
  '/financial-checks': '財務状況確認',
  '/carry-out-logs': '持ち出し記録簿',
  '/settlement': '精算・MDRT管理',
  '/reports': 'レポート',
  '/lark': 'Lark 連携設定',
  '/settings': '設定',
}

function resolveTitle(pathname: string): string {
  const matches = Object.entries(PAGE_TITLES)
    .filter(([k]) => (k === '/' ? pathname === '/' : pathname.startsWith(k)))
    .sort((a, b) => b[0].length - a[0].length)
  return matches[0]?.[1] ?? 'HOKENA CRM'
}

export function Header({ userProfile }: { userProfile: UserProfile | null }) {
  const pathname = usePathname()
  const title = resolveTitle(pathname)

  return (
    <header className="sticky top-0 z-10 flex h-[52px] items-center justify-between border-b border-border bg-bg px-6">
      <h1 className="text-base font-semibold text-text">{title}</h1>
      <div className="flex items-center gap-1">
        <FontScaleControl />
        <ThemeToggle />
        <span className="mx-2 h-5 w-px bg-border" aria-hidden />
        <div className="flex items-center gap-2">
          {userProfile?.avatar_url ? (
            <Image
              src={userProfile.avatar_url}
              alt={userProfile.name}
              width={28}
              height={28}
              className="rounded-full"
              unoptimized
            />
          ) : (
            <div className="flex size-7 items-center justify-center rounded-full border border-border bg-[color:var(--color-bg-secondary)] text-xs text-text-muted">
              {userProfile?.name?.slice(0, 1) ?? '?'}
            </div>
          )}
          <span className="text-sm text-text-sub">{userProfile?.name}</span>
          <form action="/api/auth/signout" method="post">
            <button
              type="submit"
              className="ml-2 rounded-sm px-2 py-1 text-xs text-text-muted transition-colors hover:bg-[color:var(--color-bg-secondary)] hover:text-text"
            >
              ログアウト
            </button>
          </form>
        </div>
      </div>
    </header>
  )
}
