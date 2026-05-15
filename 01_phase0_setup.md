# Phase 0 — 環境構築・プロジェクト初期化

> **実装方式**: 直列（このフェーズ完了まで他フェーズ着手不可）
> **所要目安**: 1〜2 時間
> **担当**: 1 名

---

## 目標

Next.js 15 + React 19 + Supabase + Tailwind CSS v4 + shadcn/ui の開発環境を構築し、G-DX デザイントークン（ホワイト / ブラック・フォントスケール）と Lark OAuth 用の env を整える。

---

## Step 1: Next.js プロジェクト作成

```bash
pnpm dlx create-next-app@latest hokena-crm \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --turbopack

cd hokena-crm
```

> Next.js 15 以上（App Router、React 19）が入る。実際に scaffold したリポジトリは **Next.js 16.x** が入る点に注意（`create-next-app@latest` 経由）。`searchParams` / `params` は Promise 化されているため、Server Component で必ず `await` する。
> **Next.js 16 の重要変更**: ファイル規約 `middleware.ts` は **deprecated** となり `proxy.ts`（エクスポート関数名も `proxy`）に置き換わる。本ドキュメントおよび Phase 2 の認証関連記述も `proxy.ts` を採用する。詳細は `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md` を参照。
> **pnpm のビルドスクリプト承認**: `supabase` パッケージは postinstall で CLI バイナリをダウンロードする。pnpm 10 系では明示的承認が必要なため、`package.json` に下記を追加すること。
> ```json
> "pnpm": { "onlyBuiltDependencies": ["supabase", "unrs-resolver"] }
> ```

---

## Step 2: 依存パッケージのインストール

```bash
# Supabase
pnpm add @supabase/supabase-js @supabase/ssr

# UI ユーティリティ
pnpm add class-variance-authority clsx tailwind-merge
pnpm add lucide-react
pnpm add sonner

# フォーム / バリデーション
pnpm add react-hook-form @hookform/resolvers zod

# グラフ
pnpm add recharts

# 日時
pnpm add date-fns

# CSV パース（Phase 7 精算 CSV インポート用、依存ゼロ・Node 標準寄り）
pnpm add csv-parse

# 開発ツール
pnpm add -D supabase @types/node
```

> Zustand / TanStack Query は **不採用（要件で必要になった時のみ追加）**。Server Components / Server Actions を第一選択とする方針（憲法 §3）。
> `@dnd-kit/*` は Phase 5 でカンバン D&D を採用しないため不要。
> `papaparse` は採用しない（依存とバンドルサイズの観点で `csv-parse` を選択）。

---

## Step 3: shadcn/ui のセットアップ

```bash
# shadcn 4.6+ は --defaults で base-nova プリセット (Base UI ベース) を採用。
# 旧 Radix ベースを使いたい場合は -b radix を指定するが、本プロジェクトは Base UI で進める。
pnpm dlx shadcn@latest init --defaults --yes --no-monorepo
```

- テンプレート: `next`
- プリセット: `base-nova`（@base-ui/react ベース。旧 Radix から移行された新標準）
- CSS variables: 自動有効（G-DX トークンを `var(--color-*)` で読むため必須）

初期に入れるコンポーネント:

```bash
# toast は sonner を使うため shadcn の toast はスキップ。
# combobox は単独コンポーネント名がないので popover + command を入れる。
pnpm dlx shadcn@latest add input label select textarea \
  table tabs dialog dropdown-menu badge skeleton \
  checkbox radio-group switch sheet scroll-area popover command --yes
```

---

## Step 4: Supabase プロジェクト作成

1. [Supabase Dashboard](https://supabase.com/dashboard) でプロジェクト作成
2. プロジェクト名: `hokena-crm`、リージョン: `Northeast Asia (Tokyo)`
3. **Settings > API** から URL / Anon Key / Service Role Key を取得

### `.env.local`

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# アプリ
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Lark（App ID / Secret は **env のみ**。DB に保存しない）
LARK_APP_ID=
LARK_APP_SECRET=
LARK_OAUTH_REDIRECT_URI=http://localhost:3000/api/auth/lark/callback
LARK_WEBHOOK_VERIFY_TOKEN=
```

---

## Step 5: Supabase クライアント

### `src/lib/supabase/client.ts`（ブラウザ用）

```typescript
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/types/database.types'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
```

### `src/lib/supabase/server.ts`（サーバー用）

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/types/database.types'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // Server Component から呼ばれた際は cookies を書き換えられないため握りつぶす
          }
        },
      },
    },
  )
}
```

### `src/lib/supabase/admin.ts`（Service Role 用・Server only）

```typescript
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database.types'

// RLS をバイパスする処理（招待・Lark Webhook 受信・notification_logs の状態更新等）でのみ使用
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}
```

### `src/lib/supabase/middleware.ts`

> ファイル名は内部用ヘルパーなので `middleware.ts` のままで OK。Next.js 16 で deprecated になったのは「ルート規約としての `src/middleware.ts`」のみで、任意の場所のヘルパーモジュール名には影響しない。
>
> env 未設定時のために、`updateSession` の冒頭で `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` が未定義なら `NextResponse.next({ request })` をそのまま返す early-return を入れること（Phase 0 段階・CI ビルド・Lark Webhook 受信パス等で env なしで動作する必要があるため）。

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/lib/types/database.types'

const PUBLIC_PATHS = ['/login', '/api/auth']

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isPublic = PUBLIC_PATHS.some((p) => request.nextUrl.pathname.startsWith(p))
  if (!user && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
```

### `src/proxy.ts`（Next.js 16: 旧 `middleware.ts` 規約は deprecated）

```typescript
import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// Next.js 16: ファイル規約は `proxy.ts`、エクスポート関数名も `proxy`。
// 旧 `middleware` 規約は deprecated（@see node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md）。
export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  // 静的アセットと Lark OAuth コールバックは認証チェックから除外
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/auth/lark|api/webhooks|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
```

---

## Step 6: Tailwind CSS v4 + G-DX デザイントークン

### `src/app/globals.css`

> **フォント読み込み方針**: `@import url(...)` ではなく **`next/font/google` を `app/layout.tsx` で読み込む**方式を採用（Next.js のベストプラクティス、CLS 抑制と Tailwind v4 との順序問題回避のため）。`--font-noto-sans-jp` 変数経由で `--font-base` に挿す。
> shadcn 初期化で生成された globals.css には `@import "tw-animate-css"` と `@import "shadcn/tailwind.css"` が含まれているので、それらは保持したうえで G-DX トークンを追記する。

```css
@import 'tailwindcss';
@import 'tw-animate-css';
@import 'shadcn/tailwind.css';

@custom-variant dark (&:is(.dark *));

/* ───────── ホワイトテーマ（基本） ───────── */
:root {
  /* 背景 */
  --color-bg:           #FFFFFF;
  --color-bg-secondary: #F5F5F5;
  --color-bg-sidebar:   #F8F8F8;

  /* テキスト */
  --color-text:          #111111;
  --color-text-sub:      #374151;
  --color-text-muted:    #6B7280;
  --color-text-disabled: #9CA3AF;

  /* 境界線 */
  --color-border:        #E5E5E5;
  --color-border-strong: #D1D5DB;

  /* アクセント（HOKENA 用に 1 色のみ） */
  --color-accent:       #1A56DB;
  --color-accent-hover: #1648C2;
  --color-accent-tint:  rgba(26, 86, 219, 0.08);

  /* ステータス */
  --color-success: #16A34A;
  --color-warning: #CA8A04;
  --color-error:   #DC2626;

  /* 角丸（最大 8px、ピル型禁止） */
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;

  /* フォント（next/font/google が `--font-noto-sans-jp` を注入する） */
  --font-base: var(--font-noto-sans-jp), 'Noto Sans JP', sans-serif;

  /* フォントスケール（ユーザー設定で 0.9 / 1.0 / 1.1） */
  --font-scale: 1;
  --font-xs:  calc(11px * var(--font-scale));
  --font-sm:  calc(12px * var(--font-scale));
  --font-md:  calc(14px * var(--font-scale));
  --font-lg:  calc(16px * var(--font-scale));
  --font-xl:  calc(20px * var(--font-scale));
  --font-2xl: calc(22px * var(--font-scale));
}

/* ───────── ブラックテーマ ───────── */
.dark {
  --color-bg:           #0F172A;
  --color-bg-secondary: #1E293B;
  --color-bg-sidebar:   #1E293B;

  --color-text:          #F8FAFC;
  --color-text-sub:      #CBD5E1;
  --color-text-muted:    #94A3B8;
  --color-text-disabled: #475569;

  --color-border:        #334155;
  --color-border-strong: #475569;

  --color-accent:       #3B82F6;
  --color-accent-hover: #2563EB;
  --color-accent-tint:  rgba(59, 130, 246, 0.12);

  --color-success: #22C55E;
  --color-warning: #EAB308;
  --color-error:   #EF4444;
}

/* ───────── Tailwind v4 テーマブリッジ ───────── */
@theme {
  --font-sans: var(--font-base);

  --color-bg: var(--color-bg);
  --color-bg-secondary: var(--color-bg-secondary);
  --color-bg-sidebar: var(--color-bg-sidebar);
  --color-text: var(--color-text);
  --color-text-sub: var(--color-text-sub);
  --color-text-muted: var(--color-text-muted);
  --color-border: var(--color-border);
  --color-border-strong: var(--color-border-strong);
  --color-accent: var(--color-accent);
  --color-accent-hover: var(--color-accent-hover);
  --color-accent-tint: var(--color-accent-tint);
  --color-success: var(--color-success);
  --color-warning: var(--color-warning);
  --color-error: var(--color-error);

  --radius-sm: var(--radius-sm);
  --radius-md: var(--radius-md);
  --radius-lg: var(--radius-lg);
}

/* ───────── ベース ───────── */
@layer base {
  * { box-sizing: border-box; }

  html, body {
    background-color: var(--color-bg);
    color: var(--color-text);
    font-family: var(--font-base);
    font-size: var(--font-md);
    line-height: 1.6;
  }

  table { border-collapse: collapse; width: 100%; }
  th {
    font-weight: 600;
    font-size: var(--font-sm);
    color: var(--color-text-sub);
    text-align: left;
    padding: 12px 16px;
    border-bottom: 1px solid var(--color-border);
    background-color: var(--color-bg-secondary);
  }
  td {
    font-size: var(--font-md);
    padding: 12px 16px;
    border-bottom: 1px solid var(--color-border);
    color: var(--color-text);
  }
}
```

> **デザイントークン外の HEX / px / フォントサイズの直書きは禁止**（憲法 Design Rules §2）。Tailwind では `bg-bg`, `text-text`, `border-border`, `text-accent`, `rounded-md` 等のトークンクラスを使う。`bg-blue-500` のようなパレット直指定は原則使わない（ステータス色は `bg-success` 等のトークン経由）。

---

## Step 7: テーマ・フォントスケール用の最小ストア（Cookie + LocalStorage）

ユーザー設定を SSR 初期描画時にも反映するため、Cookie と LocalStorage の両方に保存する。

### `src/components/layout/ThemeProvider.tsx`

```tsx
'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark'
type FontScale = 'small' | 'normal' | 'large'

const FONT_SCALE_MAP: Record<FontScale, number> = { small: 0.9, normal: 1.0, large: 1.1 }

const Ctx = createContext<{
  theme: Theme
  setTheme: (t: Theme) => void
  fontScale: FontScale
  setFontScale: (s: FontScale) => void
} | null>(null)

export function ThemeProvider({
  initialTheme = 'light',
  initialFontScale = 'normal',
  children,
}: {
  initialTheme?: Theme
  initialFontScale?: FontScale
  children: React.ReactNode
}) {
  const [theme, setThemeState] = useState<Theme>(initialTheme)
  const [fontScale, setFontScaleState] = useState<FontScale>(initialFontScale)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.cookie = `hokena_theme=${theme}; path=/; max-age=31536000; samesite=lax`
  }, [theme])

  useEffect(() => {
    document.documentElement.style.setProperty('--font-scale', String(FONT_SCALE_MAP[fontScale]))
    document.cookie = `hokena_font_scale=${fontScale}; path=/; max-age=31536000; samesite=lax`
  }, [fontScale])

  return (
    <Ctx.Provider value={{ theme, setTheme: setThemeState, fontScale, setFontScale: setFontScaleState }}>
      {children}
    </Ctx.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider')
  return ctx
}
```

### `src/app/layout.tsx`

```tsx
import type { Metadata } from 'next'
import { Noto_Sans_JP, Geist_Mono } from 'next/font/google'
import { cookies } from 'next/headers'
import { Toaster } from 'sonner'
import { ThemeProvider } from '@/components/layout/ThemeProvider'
import './globals.css'

const notoSansJp = Noto_Sans_JP({
  variable: '--font-noto-sans-jp',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

const FONT_SCALE_MAP = { small: 0.9, normal: 1.0, large: 1.1 } as const
type FontScaleKey = keyof typeof FONT_SCALE_MAP

export const metadata: Metadata = {
  title: 'HOKENA CRM',
  description: '保険代理店向け 保険代理店 CRM',
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies()
  const theme =
    (cookieStore.get('hokena_theme')?.value as 'light' | 'dark' | undefined) ?? 'light'
  const fontScale =
    (cookieStore.get('hokena_font_scale')?.value as FontScaleKey | undefined) ?? 'normal'
  const fontScaleValue = FONT_SCALE_MAP[fontScale]

  return (
    <html
      lang="ja"
      className={`${notoSansJp.variable} ${geistMono.variable} h-full antialiased ${
        theme === 'dark' ? 'dark' : ''
      }`}
      style={{ ['--font-scale' as string]: String(fontScaleValue) }}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider initialTheme={theme} initialFontScale={fontScale}>
          {children}
          <Toaster position="bottom-right" />
        </ThemeProvider>
      </body>
    </html>
  )
}
```

> ThemeToggle と FontScaleControl の UI は Phase 9-C（設定）で実装。

---

## Step 8: Supabase CLI のセットアップ

```bash
pnpm supabase init
pnpm supabase login
pnpm supabase link --project-ref <project_ref>
ls supabase/migrations/
```

---

## Step 9: package.json スクリプト

```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit",
    "db:types": "supabase gen types typescript --linked > src/lib/types/database.types.ts",
    "db:migrate": "supabase db push",
    "db:reset": "supabase db reset"
  }
}
```

---

## 完了チェックリスト

- [ ] `pnpm dev` で http://localhost:3000 が起動し、Noto Sans JP で表示される
- [ ] dev ログに `middleware-to-proxy` 警告が出ていない（`src/proxy.ts` が認識されている）
- [ ] `.env.local` に Supabase + Lark の env が揃っている（Phase 1 開始前までに必須）
- [ ] `src/lib/supabase/{client,server,admin,middleware}.ts` が作成されている
- [ ] `src/proxy.ts` が `/api/auth/lark` を除外している
- [ ] `globals.css` にライト / ダーク両テーマと `--font-scale` 変数が定義されている
- [ ] `<html>` に Cookie 由来の `dark` クラス・`--font-scale` が適用される
- [ ] shadcn/ui コンポーネントが `var(--color-*)` を読んで描画される（アクセント色 `#1A56DB`）
- [ ] `pnpm type-check` がエラーなく完了する
- [ ] `pnpm supabase link` 完了（Supabase プロジェクト作成後）
