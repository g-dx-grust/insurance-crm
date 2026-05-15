# Phase 2 — 認証（Lark + ID/PW）・レイアウト・共通 UI

> **実装方式**: 直列（Phase 1 完了後、全ページの前提）
> **所要目安**: 4〜5 時間
> **担当**: 1 名

---

## 目標

- ログイン画面で **Lark OAuth 2.0（主）** と **ID + パスワード（副）** を併用
- Lark ログイン時に `open_id` / `avatar_url` / 氏名を `user_profiles` に同期（Lark Rules §2）
- ホワイト / ブラック切替・フォントスケール変更が効くレイアウトを構築
- サイドバー（200/56）+ ヘッダー（52）+ 共通 UI コンポーネント

---

## Step 1: ログインページ（2 パターン併用）

### `src/app/(auth)/login/page.tsx`

```tsx
import { LoginPanel } from '@/components/features/auth/LoginPanel'

export default function LoginPage() {
  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-[55%_45%] bg-bg">
      {/* 左: ブランドビジュアル */}
      <div className="relative hidden md:block bg-bg-secondary">
        <div className="absolute inset-0 bg-[color:var(--color-accent)]/15" />
        <div className="relative flex h-full items-end p-10">
          <p className="text-sm text-text-sub leading-relaxed">
            HOKENA CRM<br />
            保険代理店業務を、現場の手で止めずに回す。
          </p>
        </div>
      </div>

      {/* 右: フォーム */}
      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[360px]">
          <h1 className="text-xl font-semibold mb-1">ログイン</h1>
          <p className="text-sm text-text-muted mb-6">
            Lark アカウント、または ID / パスワードでログインしてください。
          </p>
          <LoginPanel />
        </div>
      </div>
    </div>
  )
}
```

### `src/components/features/auth/LoginPanel.tsx`

```tsx
'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export function LoginPanel() {
  const router = useRouter()
  const search = useSearchParams()
  const next = search.get('next') ?? '/'

  const handleLark = () => {
    // OAuth 開始は Server 側で state 発行・Cookie 設定するため API ルートに飛ばす
    window.location.href = `/api/auth/lark/start?next=${encodeURIComponent(next)}`
  }

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)

    if (error) {
      toast.error('ログインに失敗しました。メールアドレスとパスワードをご確認ください。')
      return
    }
    router.replace(next)
    router.refresh()
  }

  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={handleLark}
        className="w-full h-9 rounded-sm bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors"
      >
        Lark アカウントでログイン
      </button>

      <div className="flex items-center gap-3 text-xs text-text-muted">
        <span className="flex-1 h-px bg-border" />
        または
        <span className="flex-1 h-px bg-border" />
      </div>

      <form onSubmit={handlePassword} className="space-y-3">
        <div>
          <label className="block text-sm font-medium mb-1">メールアドレス</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full h-9 rounded-sm border border-border-strong px-3 text-sm bg-bg focus:outline-none focus:border-2 focus:border-accent"
            placeholder="example@company.co.jp"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">パスワード</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full h-9 rounded-sm border border-border-strong px-3 text-sm bg-bg focus:outline-none focus:border-2 focus:border-accent"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full h-9 rounded-sm border border-border bg-bg text-text text-sm font-medium hover:bg-bg-secondary disabled:opacity-50 transition-colors"
        >
          {loading ? 'ログイン中...' : 'ID / パスワードでログイン'}
        </button>
        <a href="/login/reset" className="block text-xs text-accent hover:underline">
          パスワードを忘れた場合
        </a>
      </form>
    </div>
  )
}
```

---

## Step 2: Lark OAuth フロー

### `src/lib/lark/oauth.ts`

```typescript
import 'server-only'
import { randomBytes } from 'crypto'

const LARK_AUTH_URL = 'https://open.larksuite.com/open-apis/authen/v1/index'
const LARK_TOKEN_URL = 'https://open.larksuite.com/open-apis/authen/v1/access_token'
const LARK_USERINFO_URL = 'https://open.larksuite.com/open-apis/authen/v1/user_info'

export function generateState(): string {
  return randomBytes(16).toString('hex')
}

export function buildAuthorizeUrl(state: string) {
  const params = new URLSearchParams({
    app_id: process.env.LARK_APP_ID!,
    redirect_uri: process.env.LARK_OAUTH_REDIRECT_URI!,
    state,
  })
  return `${LARK_AUTH_URL}?${params.toString()}`
}

export async function exchangeCodeForUser(code: string) {
  // 1. app_access_token を取得（簡略化のため直接交換 API を使う）
  const tokenRes = await fetch(LARK_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code,
      app_id: process.env.LARK_APP_ID,
      app_secret: process.env.LARK_APP_SECRET,
    }),
    cache: 'no-store',
  })
  const tokenJson = await tokenRes.json()
  if (!tokenJson?.data?.access_token) {
    throw new Error(`Lark token exchange failed: ${tokenJson?.msg ?? 'unknown'}`)
  }
  const userToken = tokenJson.data.access_token as string

  // 2. user_info（avatar 系も含む）
  const userRes = await fetch(LARK_USERINFO_URL, {
    headers: { Authorization: `Bearer ${userToken}` },
    cache: 'no-store',
  })
  const userJson = await userRes.json()
  const u = userJson?.data
  if (!u?.open_id) throw new Error('Lark user_info missing open_id')

  return {
    open_id:    u.open_id as string,
    union_id:   u.union_id as string | undefined,
    user_id:    u.user_id as string | undefined,
    name:       (u.name ?? u.en_name ?? 'Lark User') as string,
    email:      u.email as string | undefined,
    avatar_url: (u.avatar_big || u.avatar_middle || u.avatar_thumb || u.avatar_url || null) as string | null,
  }
}
```

### `src/app/api/auth/lark/start/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { buildAuthorizeUrl, generateState } from '@/lib/lark/oauth'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const next = url.searchParams.get('next') ?? '/'
  const state = generateState()

  const cookieStore = await cookies()
  cookieStore.set('lark_oauth_state', state, {
    httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 600,
  })
  cookieStore.set('lark_oauth_next', next, {
    httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 600,
  })

  return NextResponse.redirect(buildAuthorizeUrl(state))
}
```

### `src/app/api/auth/lark/callback/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { exchangeCodeForUser } from '@/lib/lark/oauth'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient as createSupabaseServerClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')

  const cookieStore = await cookies()
  const expected = cookieStore.get('lark_oauth_state')?.value
  const next = cookieStore.get('lark_oauth_next')?.value ?? '/'

  if (!code || !state || !expected || state !== expected) {
    return NextResponse.redirect(new URL('/login?error=invalid_state', url))
  }

  const lark = await exchangeCodeForUser(code)
  const admin = createAdminClient()

  // 1. open_id で既存プロファイル検索
  const { data: existing } = await admin
    .from('user_profiles')
    .select('id, email, tenant_id')
    .eq('lark_open_id', lark.open_id)
    .maybeSingle()

  let userId = existing?.id ?? null

  // 2. 未登録なら Supabase Auth ユーザーを作成（招待制 or サインアップ可否はテナント設定で制御）
  if (!userId) {
    if (!lark.email) {
      return NextResponse.redirect(new URL('/login?error=email_required', url))
    }
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: lark.email,
      email_confirm: true,
      user_metadata: { source: 'lark', open_id: lark.open_id },
    })
    if (createErr || !created.user) {
      return NextResponse.redirect(new URL('/login?error=signup_failed', url))
    }
    userId = created.user.id
    // 注意: tenant_id は事前招待で決まっている前提。未招待なら拒否してユーザーへ通知する運用にする
    return NextResponse.redirect(new URL('/login?error=not_invited', url))
  }

  // 3. プロファイルに Lark 情報を upsert
  await admin.from('user_profiles').update({
    lark_open_id: lark.open_id,
    lark_union_id: lark.union_id ?? null,
    lark_user_id: lark.user_id ?? null,
    avatar_url: lark.avatar_url,
    name: lark.name,
  }).eq('id', userId)

  // 4. Supabase Auth セッション発行（magic link を 1 度だけ使う方式）
  const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: existing!.email,
  })
  if (linkErr || !link?.properties?.action_link) {
    return NextResponse.redirect(new URL('/login?error=session_failed', url))
  }

  // 5. action_link を踏ませてセッション Cookie を確立
  return NextResponse.redirect(link.properties.action_link.replace(
    /redirect_to=[^&]+/,
    `redirect_to=${encodeURIComponent(new URL(next, url).toString())}`,
  ))
}
```

> セッション発行を magic link 経由にすることで、Supabase Auth のセッション Cookie 管理に乗せる。実装簡略化のため `link.properties.action_link` を直接 redirect している。本番では state や PKCE を強化すること。

---

## Step 3: 認証取得ヘルパー（Server / Client 両対応）

### `src/lib/auth/server.ts`

```typescript
import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function getSessionUserOrRedirect() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login?error=no_profile')
  return { user, profile }
}

export async function getCurrentTenantId() {
  const { profile } = await getSessionUserOrRedirect()
  return profile.tenant_id
}
```

### `src/hooks/useUser.ts`（クライアント側補助）

```tsx
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database.types'

type UserProfile = Database['public']['Tables']['user_profiles']['Row']

export function useUser() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    let mounted = true

    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!mounted) return
      setUser(user)
      if (user) {
        const { data } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        if (mounted) setProfile(data)
      }
      setLoading(false)
    })()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_evt, session) => {
      setUser(session?.user ?? null)
      if (!session?.user) setProfile(null)
    })

    return () => { mounted = false; subscription.unsubscribe() }
  }, [])

  return { user, profile, loading }
}
```

---

## Step 4: ダッシュボードレイアウト

### `src/app/(dashboard)/layout.tsx`

```tsx
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { getSessionUserOrRedirect } from '@/lib/auth/server'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await getSessionUserOrRedirect()

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      <Sidebar userProfile={profile} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header userProfile={profile} />
        <main className="flex-1 overflow-y-auto bg-bg-secondary p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
```

---

## Step 5: サイドバー（憲法 §6 §7 準拠：200/56）

### `src/components/layout/Sidebar.tsx`

仕様（憲法 Design Rules §7 を厳守）:

- 展開時 **200px** / 折りたたみ時 **56px**
- 折りたたみ状態は `localStorage('hokena_sidebar_collapsed')` に保存
- 折りたたみ時はホバーでツールチップ（背景 `bg-gray-900`、白テキスト）
- アクティブ項目の背景は `var(--color-accent-tint)`、テキストは `var(--color-accent)`
- アイコンは Lucide React のみ
- `transition-all duration-200`

### ナビゲーション構成

```typescript
import {
  LayoutDashboard, Users, FileText, TrendingUp, CheckSquare,
  Calendar, ClipboardList, BarChart2, PieChart, Link2, Settings,
} from 'lucide-react'

export const NAV_GROUPS = [
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
      { label: 'タスク管理', path: '/tasks', icon: CheckSquare },
      { label: 'カレンダー', path: '/calendar', icon: Calendar },
    ],
  },
  {
    label: '保険業法対応',
    items: [{ label: '意向把握', path: '/intentions', icon: ClipboardList }],
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
] as const
```

> ロゴは菱形 SVG モチーフを 28×28 で配置。色は `var(--color-accent)` のみを使用。テーマで自動追従するように `currentColor` 指定を推奨。

---

## Step 6: ヘッダー（憲法 §6: 高さ 52〜56px）

### `src/components/layout/Header.tsx`

```tsx
'use client'

import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/types/database.types'

type UserProfile = Database['public']['Tables']['user_profiles']['Row']

const PAGE_TITLES: Record<string, string> = {
  '/': 'ダッシュボード',
  '/customers': '顧客管理',
  '/contracts': '契約管理',
  '/opportunities': '案件管理',
  '/tasks': 'タスク管理',
  '/calendar': 'カレンダー',
  '/intentions': '意向把握',
  '/settlement': '精算・MDRT管理',
  '/reports': 'レポート',
  '/lark': 'Lark 連携設定',
  '/settings': '設定',
}

export function Header({ userProfile }: { userProfile: UserProfile | null }) {
  const pathname = usePathname()
  const router = useRouter()

  const title = Object.entries(PAGE_TITLES)
    .filter(([k]) => pathname.startsWith(k))
    .sort((a, b) => b[0].length - a[0].length)[0]?.[1] ?? 'HOKENA CRM'

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <header className="h-[52px] flex items-center justify-between border-b border-border bg-bg px-6 sticky top-0">
      <h1 className="text-base font-semibold text-text">{title}</h1>
      <div className="flex items-center gap-3">
        {userProfile?.avatar_url ? (
          <Image
            src={userProfile.avatar_url}
            alt={userProfile.name}
            width={28} height={28}
            className="rounded-full"
            unoptimized
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-bg-secondary border border-border flex items-center justify-center text-xs text-text-muted">
            {userProfile?.name?.slice(0, 1) ?? '?'}
          </div>
        )}
        <span className="text-sm text-text-sub">{userProfile?.name}</span>
        <button
          onClick={handleLogout}
          className="text-xs text-text-muted hover:text-text transition-colors"
        >
          ログアウト
        </button>
      </div>
    </header>
  )
}
```

> アバターは Lark から同期した `avatar_url` を表示（Lark Rules §2.1）。フォールバックは氏名イニシャル。

---

## Step 7: 共通 UI コンポーネント

shadcn/ui のコンポーネントを基本利用しつつ、本プロジェクト固有のパターンを `src/components/ui/` に薄くラップする。**色・角丸・フォントサイズは必ず CSS 変数 / Tailwind トークン経由**。

### 必要コンポーネント

| 名前 | 役割 |
|---|---|
| `StatusBadge` | `default / success / warning / danger / info / muted` のステータスバッジ。`rounded-sm` 固定（ピル型禁止）。色は `bg-success/10 text-success` 系のトークン |
| `PageHeader` | ページタイトル + 説明 + アクションボタン |
| `DataTable` | shadcn `table` ベース。ソート / ページネーション / スケルトンローディング |
| `SearchInput` | 300ms debounce |
| `ConfirmDialog` | 破壊的操作の確認モーダル（憲法 Design Rules §9.4） |
| `EmptyState` | 0 件時の表示 |
| `Skeleton` | shimmer はトークン色のみ使用 |
| `ThemeToggle` | ライト / ダーク切替（Phase 9-C 設定画面で使用） |
| `FontScaleControl` | small / normal / large 切替（Phase 9-C 設定画面で使用） |

> StatusBadge / Skeleton 等は `var(--color-success)` など **CSS 変数経由**で表示色を決め、ダークテーマでも自動追従させること。

---

## Step 8: 共通フック / ユーティリティ

### `src/lib/utils/escape.ts`

PostgREST の `or()` フィルタやテキスト検索でユーザー入力をそのまま埋め込むと、`,` や `)` で構文を壊される（簡易的なフィルタインジェクション）。一覧画面の検索クエリは必ずエスケープする。

```typescript
// PostgREST の or() で安全に使えるよう、`,` `(` `)` `*` `%` `:` を除去 / 置換
export function sanitizePostgrestSearch(input: string): string {
  return input
    .replace(/[%_]/g, ' ')        // ilike のワイルドカードを無効化
    .replace(/[,()*:]/g, ' ')     // or() の構文文字を除去
    .trim()
    .slice(0, 100)
}
```

### `src/hooks/usePagination.ts`

```typescript
'use client'

import { useMemo } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'

export function usePagination(totalCount: number, pageSize = 20) {
  const sp = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const page = Math.max(1, Number(sp.get('page') ?? 1))

  const meta = useMemo(() => {
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
    return {
      page,
      totalPages,
      hasPrev: page > 1,
      hasNext: page < totalPages,
      offset: (page - 1) * pageSize,
    }
  }, [page, totalCount, pageSize])

  const go = (next: number) => {
    const params = new URLSearchParams(sp.toString())
    params.set('page', String(next))
    router.push(`${pathname}?${params.toString()}`)
  }

  return { ...meta, go }
}
```

---

## 完了チェックリスト

- [ ] `/login` で「Lark アカウントでログイン」ボタンと ID/PW フォームが両方表示される
- [ ] Lark OAuth 経由でログインすると `user_profiles` に `lark_open_id` / `avatar_url` / `name` が同期される
- [ ] ID/PW でもログイン・ログアウトができる
- [ ] 未認証で `/` にアクセスすると `/login` にリダイレクトされる
- [ ] サイドバーが 200/56 で開閉できる（localStorage に保存）
- [ ] 折りたたみ時にホバーで Lucide アイコン横にツールチップ
- [ ] ヘッダー高さ 52px、ユーザーアバター（Lark 由来）と氏名が表示される
- [ ] ライトテーマ / ダークテーマで全色が自動追従する
- [ ] フォントスケール切替でフォントサイズが変わる
- [ ] 共通コンポーネント（StatusBadge / PageHeader / DataTable / SearchInput / ConfirmDialog / EmptyState / Skeleton）が CSS 変数経由で実装されている
