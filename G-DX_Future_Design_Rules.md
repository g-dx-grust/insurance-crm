# G-DX 開発・デザインルール（Future Edition）

**株式会社グラスト｜DX Solutions Division**
Version 2.0.0 ／ 最終更新: 2026-05-03

---

> 本ドキュメントは、株式会社グラストが開発するG-DXシステム群における**今後の新規開発および既存システム改修時に適用される最上位の開発・デザインルール**です。既存の「G-DX Design System」「ClaudeCodeルール」「G-PO CLAUDE.md」を踏まえ、ユーザーの追加要件（ホワイト/ブラックテーマ、2パターン認証、サイドバー開閉、フォントサイズ調整、UX重視ローディング、Supabase標準化）を統合した改訂版として策定しています。

---

## 目次

1. [最重要テーマと設計思想](#1-最重要テーマと設計思想)
2. [絶対禁止事項](#2-絶対禁止事項)
3. [技術スタック](#3-技術スタック)
4. [カラーシステム（ホワイト / ブラック）](#4-カラーシステムホワイト--ブラック)
5. [タイポグラフィ](#5-タイポグラフィ)
6. [レイアウト構造](#6-レイアウト構造)
7. [サイドバー仕様](#7-サイドバー仕様)
8. [ログイン画面（2パターン認証）](#8-ログイン画面2パターン認証)
9. [ローディング・UX設計](#9-ローディングux設計)
10. [コンポーネント仕様](#10-コンポーネント仕様)
11. [ファイル構成の基本例](#11-ファイル構成の基本例)
12. [コーディング規約](#12-コーディング規約)
13. [セキュリティ共通方針](#13-セキュリティ共通方針)
14. [ライティングルール](#14-ライティングルール)
15. [変更履歴](#15-変更履歴)

---

## 1. 最重要テーマと設計思想

### 「生成AI感のないプロフェッショナルな業務UI」

G-DXのUIは、**日本のSaaSデザインを意識した、落ち着いた業務システム**として設計します。見た目の新奇性よりも、実務で使いやすいこと、情報が素直に読めること、画面全体に統一感があることを最優先とします。

**AI感の定義**: 以下の要素が「生成AI感」「チープ感」を生む原因として明確に定義されています。

| AI感の要因 | 具体例 |
|---|---|
| 過剰なシャドウ | 強いドロップシャドウ、`box-shadow` の多用 |
| 大きすぎる角丸 | `border-radius: 10px` 以上のボタン・カード |
| グラデーション | 背景・ボタン・装飾への使用 |
| パステルカラー | 淡い青・ピンク・紫系の配色 |
| 過剰なアニメーション | ホバーで跳ねる、spring アニメーション |
| ガラス風表現 | `backdrop-blur`、半透明レイヤーの多用 |
| 複数アクセントカラー | 1画面に3色以上のアクセント |
| 巨大ヒーロー | ページ全幅の巨大イラスト・バナー |
| 絵文字 | UIへの絵文字配置 |

G-DXはこれらの要素を排除し、**信頼感・可読性・整然さ**を体現するUIを追求します。

---

## 2. 絶対禁止事項

以下は新規構築・既存改修のいずれにおいても**厳守**します。

| 禁止事項 | 内容 |
|---|---|
| 大きすぎる角丸 | `border-radius: 10px` 以上のボタン・カード・入力欄は禁止。基準 4px、最大でも 8px |
| ピル型バッジ | `border-radius: 9999px` のバッジは禁止 |
| パステルカラー | 全面禁止 |
| グラデーション | 背景・ボタン・装飾を含め全面禁止 |
| 複数アクセントカラー | アクセントは **1色のみ**（システムごとに指定） |
| フォント違反 | **Noto Sans JP 以外のフォントは禁止**（游ゴシック・メイリオ・system-ui との混在も不可） |
| 既成UIテーマ流用 | Material UI / Ant Design のデフォルトテーマ直用は禁止 |
| 強い影 | 強いドロップシャドウ・過度な `box-shadow` 多用は禁止 |
| 過剰演出 | 派手なアニメーション・エフェクトは禁止 |
| 絵文字 | UIへの絵文字配置は禁止 |
| デザイントークン外の値 | HEX・px・フォントサイズの直書きは禁止。必ずCSS変数またはTailwindクラスを使用 |

---

## 3. 技術スタック

新規システムは以下を**標準スタック**とします。逸脱する場合は事前にユーザー承認が必要です。

| レイヤー | 採用技術 |
|---|---|
| フレームワーク | **Next.js 15（App Router）** 最優先、代替: Vite + React |
| 言語 | **TypeScript**（strict mode、`any` 原則禁止） |
| UI | React 19 |
| スタイリング | **Tailwind CSS v4**（G-DXテーマを適用） |
| UIコンポーネント | shadcn/ui（G-DXトークンでカスタマイズ） |
| フォント | **Noto Sans JP**（Google Fonts）のみ |
| **データベース** | **Supabase（PostgreSQL）** を標準とする。軽量なデータ管理にはLark Baseで代替可（ユーザー指示に従う） |
| **認証** | **Lark OAuth 2.0** または **ID + パスワード**（2パターン対応） |
| アイコン | **Lucide React** のみ（他アイコンライブラリの混在禁止） |
| データ取得 | Server Components / Server Actions を第一選択、必要時のみ TanStack Query |
| フォーム | react-hook-form + zod |
| 日時 | date-fns（dayjs / moment 禁止） |
| ホスティング | Vercel または Cloudflare Pages |
| テスト | Vitest + Playwright |
| リンタ | ESLint（next/core-web-vitals）/ Prettier |

---

## 4. カラーシステム（ホワイト / ブラック）

G-DXは設定からユーザーが**ホワイトバージョン（ライトモード）**と**ブラックバージョン（ダークモード）**を切り替えられるように設計します。テーマの切り替えはCSS変数の差し替えで実現し、コンポーネント側はテーマを意識せず変数を参照するだけで動作します。

### 4.1 ホワイトバージョン（基本）

白を基調とした落ち着いたニュートラルカラーが土台です。

```css
:root {
  /* 背景 */
  --color-bg:           #FFFFFF;
  --color-bg-secondary: #F5F5F5;
  --color-bg-sidebar:   #F8F8F8;

  /* テキスト */
  --color-text:         #111111;
  --color-text-sub:     #374151;
  --color-text-muted:   #6B7280;
  --color-text-disabled:#9CA3AF;

  /* 境界線 */
  --color-border:       #E5E5E5;
  --color-border-strong:#D1D5DB;

  /* アクセント（システムごとに1色のみ指定） */
  --color-accent:       #1A56DB;
  --color-accent-hover: #1648C2;
  --color-accent-tint:  rgba(26, 86, 219, 0.08);

  /* ステータス（控えめな彩度で使用） */
  --color-success:      #16A34A;
  --color-warning:      #CA8A04;
  --color-error:        #DC2626;

  /* 角丸 */
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;

  /* フォント */
  --font-base: 'Noto Sans JP', sans-serif;

  /* フォントサイズスケール（ユーザー調整可） */
  --font-scale: 1;
  --font-xs:  calc(11px * var(--font-scale));
  --font-sm:  calc(12px * var(--font-scale));
  --font-md:  calc(14px * var(--font-scale));
  --font-lg:  calc(16px * var(--font-scale));
  --font-xl:  calc(20px * var(--font-scale));
  --font-2xl: calc(22px * var(--font-scale));
}
```

| 用途 | カラー |
|---|---|
| 背景 | `#FFFFFF` |
| セカンダリ背景 | `#F5F5F5` |
| サイドバー背景 | `#F8F8F8` |
| 本文 | `#111111` |
| 補助テキスト | `#374151` |
| ミュートテキスト | `#6B7280` |
| 境界線 | `#E5E5E5` |
| 強調境界線 | `#D1D5DB` |
| アクセント（例） | `#1A56DB` |
| 成功 | `#16A34A` |
| 警告 | `#CA8A04` |
| エラー | `#DC2626` |

### 4.2 ブラックバージョン

業務で長時間画面を見るユーザーの目の負担を軽減する、コントラストを抑えたダークカラーです。

```css
.dark {
  /* 背景 */
  --color-bg:           #0F172A;
  --color-bg-secondary: #1E293B;
  --color-bg-sidebar:   #1E293B;

  /* テキスト */
  --color-text:         #F8FAFC;
  --color-text-sub:     #CBD5E1;
  --color-text-muted:   #94A3B8;
  --color-text-disabled:#475569;

  /* 境界線 */
  --color-border:       #334155;
  --color-border-strong:#475569;

  /* アクセント（ライトモードと同系色、視認性を調整） */
  --color-accent:       #3B82F6;
  --color-accent-hover: #2563EB;
  --color-accent-tint:  rgba(59, 130, 246, 0.12);

  /* ステータス */
  --color-success:      #22C55E;
  --color-warning:      #EAB308;
  --color-error:        #EF4444;
}
```

| 用途 | カラー |
|---|---|
| 背景 | `#0F172A` |
| セカンダリ背景 | `#1E293B` |
| サイドバー背景 | `#1E293B` |
| 本文 | `#F8FAFC` |
| 補助テキスト | `#CBD5E1` |
| ミュートテキスト | `#94A3B8` |
| 境界線 | `#334155` |
| アクセント（例） | `#3B82F6` |

### 4.3 テーマ切り替えの実装方針

- `<html>` タグに `.dark` クラスを付与することでテーマを切り替えます。
- ユーザーの選択はLocalStorageに保存し、次回アクセス時にも維持します。
- システム設定（OS）のダークモード設定（`prefers-color-scheme`）をデフォルト値として参照することを推奨します。

---

## 5. タイポグラフィ

フォントは**Noto Sans JPのみ**を使用します。他フォントとの混在は一切禁止です。

```css
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;600&display=swap');

body {
  font-family: 'Noto Sans JP', sans-serif;
  font-size: var(--font-md); /* 14px × スケール */
}
```

| 用途 | サイズ（標準時） | ウェイト |
|---|---|---|
| ページタイトル | 20〜22px（`--font-xl` / `--font-2xl`） | 600 |
| セクションタイトル | 16px（`--font-lg`） | 600 |
| 本文・ラベル | 14px（`--font-md`） | 400 |
| ボタンテキスト | 14px（`--font-md`） | 500 |
| サブテキスト・テーブルヘッダー | 12px（`--font-sm`） | 400 / 600 |
| キャプション・バッジ | 11〜12px（`--font-xs` / `--font-sm`） | 400 / 500 |

### フォントサイズの微調整

ユーザーが設定画面からシステム全体のフォントサイズを調整できる機能を実装します。

```typescript
// フォントスケールの選択肢
type FontScale = 'small' | 'normal' | 'large'

const FONT_SCALE_MAP: Record<FontScale, number> = {
  small:  0.9,
  normal: 1.0,
  large:  1.1,
}

// 適用例
document.documentElement.style.setProperty(
  '--font-scale',
  String(FONT_SCALE_MAP[userSetting])
)
```

---

## 6. レイアウト構造

| 領域 | 仕様 |
|---|---|
| ヘッダー | 高さ 52〜56px / `sticky top: 0` / 背景 `var(--color-bg)` / 下線 `1px solid var(--color-border)` |
| サイドバー | 展開時 200px / 折りたたみ時 56px / 背景 `var(--color-bg-sidebar)` |
| コンテンツエリア | 最大幅 1200px / セクション間余白 24px 以上 |
| モバイル時 | サイドバーはドロワー形式 |

---

## 7. サイドバー仕様

サイドバーはユーザーが任意のタイミングで開閉できるトグル機能を実装します。

### 7.1 展開・折りたたみ

| 状態 | 幅 | 表示内容 |
|---|---|---|
| 展開時 | 200px | アイコン + ラベルテキスト + グループラベル |
| 折りたたみ時 | 56px | アイコンのみ（ホバーでツールチップ表示） |

### 7.2 実装ルール

- 開閉状態は `localStorage` に保存し、次回アクセス時に復元します。
- トグルボタンは `ChevronLeft` / `ChevronRight` アイコンを使用します（Lucide React）。
- トランジションは `transition-all duration-200` 程度の控えめなアニメーションとします。
- 折りたたみ時のツールチップは、ダークな背景（`bg-gray-900`）に白テキストで表示します。

```tsx
// サイドバー開閉の基本実装パターン
const STORAGE_KEY = '{system-id}_sidebar_collapsed'

const [isCollapsed, setIsCollapsed] = useState(false)

useEffect(() => {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved === 'true') setIsCollapsed(true)
}, [])

function toggle() {
  setIsCollapsed((prev) => {
    localStorage.setItem(STORAGE_KEY, String(!prev))
    return !prev
  })
}
```

### 7.3 ナビゲーション項目のスタイル

| 状態 | 背景 | テキスト |
|---|---|---|
| 通常 | 透明 | `var(--color-text-sub)` |
| ホバー | `var(--color-accent-tint)` | `var(--color-accent)` |
| アクティブ | `var(--color-accent-tint)` | `var(--color-accent)` / ウェイト 500 |

---

## 8. ログイン画面（2パターン認証）

ログイン画面は、**Larkアカウント認証**と**ID + パスワード認証**の2パターンをサポートします。どちらを使用するかはシステムの要件（対象ユーザー）に応じて決定します。

### 8.1 画面レイアウト（共通）

2カラム構成を基本とします。

| 領域 | 仕様 |
|---|---|
| 左側（55%） | 業界を象徴する画像 / `object-fit: cover` / `rgba(0,0,0,0.3)` オーバーレイ / ブランドカラー背景 |
| 右側（45%） | 白背景 / フォームエリア最大幅 360px / 中央寄せ |
| サービス名 | `var(--color-text)` / SemiBold / 22px |

### 8.2 パターン1: Larkアカウント認証（社内向け標準）

Larkアカウントを持つ社内ユーザー向けの認証方式です。

- ログインボタンは **「Larkアカウントでログイン」** の1つのみ表示します。
- OAuth 2.0 のコールバックを `/api/auth/lark/callback` で受け取ります。
- エラーはインラインで日本語メッセージを表示します（モーダル禁止）。

### 8.3 パターン2: ID + パスワード認証（外部ユーザー向け）

Larkアカウントを持たない外部ユーザー向けの認証方式です。

- Supabase Auth（Email + Password）を使用します。
- フォームは react-hook-form + zod でバリデーションを実装します。
- パスワードリセット機能を必ず実装します。
- 「パスワードを忘れた場合」のリンクをフォーム下部に配置します。

### 8.4 2パターン併用時のUI

同一システムで両方の認証を提供する場合は、以下のルールに従います。

- **Larkアカウントでログイン** ボタンを上部に配置し、プライマリボタンとして扱います。
- セパレーター（`または`）を挟み、下部にID + パスワードのフォームを配置します。
- Larkアカウント認証を「推奨」として視覚的に強調します。

---

## 9. ローディング・UX設計

ローディング体験はUXの根幹です。G-DXでは**ユーザーに安心感を与えるローディング**を実装します。

### 9.1 ローディングの使い分け

| シーン | 使用するローディング表現 |
|---|---|
| 初回ページロード・一覧データ取得 | **スケルトンスクリーン**（レイアウトの枠組みを先に表示） |
| ボタン操作（保存・送信・API通信） | **インラインスピナー**（ボタン内にスピナーを表示し、ボタンを無効化） |
| ページ遷移 | **プログレスバー**（画面上部に細いバーを表示） |
| 重い処理（エクスポート等） | **スピナー + テキスト**（「処理中...」などのメッセージを添える） |

### 9.2 スケルトンスクリーン

初回ロード時は、実際のコンテンツが表示される前にスケルトンを表示します。

```css
.skeleton {
  background: linear-gradient(
    90deg,
    var(--color-bg-secondary) 25%,
    var(--color-border) 50%,
    var(--color-bg-secondary) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: var(--radius-sm);
}

@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

### 9.3 スピナー

スピナーはシンプルな円形のものを使用します。過剰なアニメーションは禁止です。

```css
.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-accent);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

### 9.4 エラー表示とToast通知

| 種別 | 表示方法 |
|---|---|
| フォームエラー | 入力欄直下に赤テキスト（`var(--color-error)`）でインライン表示 |
| ページレベルエラー | ページ上部にエラーバナーを表示 |
| 成功通知 | 右下にToast通知（3〜5秒で自動消去） |
| 破壊的操作の確認 | 確認ダイアログ（モーダル）を使用 |

---

## 10. コンポーネント仕様

すべてのコンポーネントは、控えめな角丸、抑制された色使い、弱い陰影で統一します。

### 10.1 ボタン

| バリアント | 背景色 | テキスト色 | 用途 |
|---|---|---|---|
| Primary | `var(--color-accent)` | `#FFFFFF` | メインアクション（1画面に1つ推奨） |
| Secondary | `var(--color-bg)` + border | `var(--color-text)` | サブアクション |
| Danger | `var(--color-error)` | `#FFFFFF` | 削除・破壊的アクション |
| Ghost | 透明 | `var(--color-accent)` | テキストリンク的なアクション |

```css
/* 共通 */
.btn {
  height: 36px;
  padding: 0 16px;
  border-radius: var(--radius-sm); /* 4px */
  font-size: var(--font-md);       /* 14px */
  font-weight: 500;
  font-family: var(--font-base);
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.btn-primary {
  background-color: var(--color-accent);
  color: #FFFFFF;
  border: none;
}
.btn-primary:hover { background-color: var(--color-accent-hover); }

.btn-secondary {
  background-color: var(--color-bg);
  color: var(--color-text);
  border: 1px solid var(--color-border);
}
.btn-secondary:hover { background-color: var(--color-bg-secondary); }

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

### 10.2 カード

```css
.card {
  background-color: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm); /* 4px、最大 var(--radius-lg) = 8px */
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05); /* 極めて弱い影 */
  padding: 16px;
}
```

### 10.3 テーブル

```css
.table th {
  background-color: var(--color-bg-secondary);
  font-size: var(--font-sm);    /* 12px */
  font-weight: 600;
  color: var(--color-text-sub);
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-border);
  text-align: left;
}
.table td {
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-border);
  font-size: var(--font-md);    /* 14px */
  color: var(--color-text);
}
.table tr:nth-child(even) td {
  background-color: var(--color-bg-secondary);
}
```

### 10.4 入力欄

```css
.input {
  height: 36px;
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-sm); /* 4px */
  padding: 0 12px;
  font-size: var(--font-md);
  font-family: var(--font-base);
  color: var(--color-text);
  background-color: var(--color-bg);
  width: 100%;
}
.input::placeholder { color: var(--color-text-disabled); }
.input:focus {
  outline: none;
  border: 2px solid var(--color-accent);
}
```

### 10.5 バッジ

```css
.badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: var(--radius-sm); /* 4px（ピル型禁止） */
  font-size: var(--font-sm);       /* 12px */
  font-weight: 500;
}
.badge-default {
  background-color: var(--color-bg-secondary);
  color: var(--color-text-sub);
  border: 1px solid var(--color-border);
}
.badge-accent {
  background-color: var(--color-accent-tint);
  color: var(--color-accent);
}
```

---

## 11. ファイル構成の基本例

```text
project-root/
├── app/
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx           # ログイン画面（2パターン対応）
│   ├── (dashboard)/
│   │   ├── layout.tsx             # サイドバー + ヘッダーを含むレイアウト
│   │   └── [各機能]/
│   └── api/
│       ├── auth/
│       │   ├── lark/
│       │   │   ├── start/route.ts
│       │   │   └── callback/route.ts
│       │   └── signout/route.ts
│       └── [その他APIルート]/
├── components/
│   ├── layout/
│   │   ├── Header.tsx
│   │   └── Sidebar.tsx            # 開閉機能・LocalStorage保存を含む
│   └── ui/
│       ├── Button.tsx
│       ├── Card.tsx
│       ├── Input.tsx
│       ├── Table.tsx
│       ├── Badge.tsx
│       ├── Skeleton.tsx
│       ├── Spinner.tsx
│       └── ThemeToggle.tsx        # ホワイト/ブラック切り替え
├── lib/
│   ├── lark.ts                    # Lark OAuth クライアント
│   └── supabase/
│       ├── client.ts              # ブラウザ用クライアント
│       ├── server.ts              # サーバー用クライアント
│       └── admin.ts               # 管理者用クライアント
├── supabase/
│   └── migrations/                # DBマイグレーション
├── styles/
│   └── globals.css                # Tailwind + G-DXトークン（ライト/ダーク両方）
└── tailwind.config.ts
```

---

## 12. コーディング規約

### 12.1 TypeScript

- `strict: true`、`noUncheckedIndexedAccess: true` を設定します。
- `any` / `as unknown as` は原則禁止（やむを得ない場合は理由コメント必須）。
- Zod スキーマを単一ソースとして `z.infer` で型を導出します。
- DBの型は Supabase の型生成（`supabase gen types`）を利用します。

### 12.2 命名規則

| 対象 | 規則 | 例 |
|---|---|---|
| ファイル | kebab-case | `rating-engine.ts` |
| コンポーネント | PascalCase | `CompetencyScoreForm.tsx` |
| 変数・関数 | camelCase | `getUserData` |
| 型・interface | PascalCase | `UserProfile` |
| DBカラム | snake_case | `effective_from` |
| 日本語変数・関数名 | 禁止 | — |

### 12.3 コメント

- デフォルトは書きません。書くのは「なぜ」であり、「何を」は名前で表現します。
- 要件定義への参照は `// see: docs/<file>.md §<番号>` 形式で記述します。

### 12.4 エラーハンドリング

- ユーザーに見えるエラーは必ず日本語で記述します。
- エラーメッセージは「何が起きたか」＋「どうすればよいか」をセットで記述します。
- 権限エラーと入力バリデーションエラーは区別してUI表示します。

---

## 13. セキュリティ共通方針

- 機微情報（評価・給与・個人情報・案件売上など）は **RLS + アプリ層で二重防衛**します。
- 環境変数は `.env.local`（gitignore）に保存し、本番は Vercel の環境変数に登録します。
- ログイン成功・失敗、機微情報の閲覧イベントの監査ログを記録します。
- 本番DBへの破壊的操作（drop / truncate / reset）はユーザー承認なしに実行しません。

---

## 14. ライティングルール

業務システムとして、UIテキストは以下のルールに従います。

| 項目 | ルール |
|---|---|
| 語調 | 「です・ます」調で統一 |
| ボタンラベル | 動詞で始める（「保存する」「削除する」「追加する」） |
| エラーメッセージ | 何が起きたか + どうすればよいか をセットで記述 |
| プレースホルダー | 入力例を記載（ラベルの代わりにしない） |
| 専門用語 | 初出時に1行補足を添える |
| 絵文字 | UI上への配置は禁止 |

| 推奨表記 | 非推奨表記 |
|---|---|
| ログイン | ログオン |
| 一覧 | リスト |
| 追加する | 追加 |
| 更新する | 更新 |
| 削除する | 削除 |
| 有効 / 無効 | ON / OFF |
| 必須 | ＊ |

---

## 15. 変更履歴

| 日付 | バージョン | 変更内容 |
|---|---|---|
| 2026-04-14 | 1.0.0 | G-DX Design System 初版作成（SmartHR準拠） |
| 2026-04-23 | 1.1.0 | グラスト共通ルール（ClaudeCodeルール）として統合・拡張 |
| 2026-05-03 | 2.0.0 | Future Edition: ホワイト/ブラックテーマ、2パターン認証、サイドバー開閉、フォントサイズ調整、UX重視ローディング、Supabase標準化を追加 |

---

> **最後に**: G-DXの業務システムは「現場の運用を止めずに回す」ための道具です。綺麗なUIで自己満足するより、**現場が使いたくなる・運用が止まらない**ことを最優先にしてください。
