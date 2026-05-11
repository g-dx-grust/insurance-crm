# N-LIC CRM — 全体設計・実装マスター（Claude Code 向け）

> 本ドキュメント群は **N-LIC 様向け保険代理店 CRM** を Next.js 15 (App Router) + Supabase で本格実装するための指示書です。
> **憲法**（最優先・絶対遵守）として、同階層の以下 4 ファイルを必ず先に読み込むこと。
>
> 1. `CLAUDE.md` — グラスト G-DX 共通ルール（最上位）
> 2. `AGENTS.md` — 全 AI エージェント行動規範
> 3. `G-DX_Future_Design_Rules.md` — UI/UX デザインルール
> 4. `G-DX_Lark_Integration_Rules.md` — Lark 連携ルール
>
> 本マスターと憲法に矛盾が生じた場合は **必ず憲法が優先**。本マスターを修正すること。

---

## 技術スタック（憲法 §3 準拠）

| レイヤー | 採用技術 |
|---------|---------|
| フレームワーク | **Next.js 15（App Router）** + TypeScript（strict, `noUncheckedIndexedAccess`） |
| UI / React | React 19 |
| スタイリング | **Tailwind CSS v4**（`@theme` ブロックで G-DX トークン読み込み） |
| UI コンポーネント | **shadcn/ui**（G-DX トークンでカスタマイズ） |
| アイコン | **Lucide React** のみ |
| フォント | **Noto Sans JP** のみ |
| データベース | **Supabase（PostgreSQL）** + Auth + Storage |
| 認証 | **Lark OAuth 2.0 を主**、**ID + パスワードを副**（2 パターン併用） |
| Lark 連携 | Lark Open Platform API（Phase 8 で本番接続。それ以前は UI 先行 + キュー設計） |
| データ取得 | **Server Components / Server Actions が第一選択**。必要時のみ TanStack Query |
| クライアント状態 | React state / URL searchParams を基本。**Zustand は要件で必要になった時のみ導入**（デフォルト不採用） |
| フォーム | react-hook-form + zod |
| 日時 | date-fns（dayjs / moment 禁止） |
| グラフ | recharts |
| 通知トースト | sonner |
| ドラッグ & ドロップ | （Phase 5 でカンバン D&D を採用しないため不要。導入時のみ `@dnd-kit/*`） |
| デプロイ | Vercel（フロント）+ Supabase Cloud（DB・Tokyo リージョン） |

---

## フェーズ構成（実体ファイルと一致）

```
Phase 0   環境構築・プロジェクト初期化               ── 直列（必須前提）
Phase 1   DB 設計・マイグレーション・RLS             ── 直列（全フェーズの基盤）
Phase 2   認証（Lark + ID/PW）・レイアウト・共通 UI ── 直列（全ページの前提）
─────────────────────────────────────────────────────
Phase 3   顧客管理（一覧・詳細・登録・家族情報）   ┐
Phase 4   契約管理（一覧・詳細・登録・特約）       ├ 並列実装可
Phase 5   案件管理（カンバン・詳細）/ タスク管理   ┘
─────────────────────────────────────────────────────
Phase 6   意向把握（4 ステップ・承認フロー UI）    ┐
Phase 7   精算・MDRT / Phase 8 Lark 連携設定       ├ 並列実装可
Phase 9-A カレンダー / 9-B レポート / 9-C 設定     ┘
─────────────────────────────────────────────────────
Phase 10  ダッシュボード・共通コンポーネント仕上げ ── 直列（最終仕上げ）
```

> 旧計画にあった「Phase 11（システム設定・ユーザー管理）」は **Phase 9-C に統合済み**。

---

## ドキュメント構成（実ファイル）

| ファイル | 内容 |
|---------|------|
| `00_MASTER.md` | 本ファイル。全体設計・技術スタック・共通ルール |
| `01_phase0_setup.md` | Phase 0: 環境構築・テーマ / フォントスケールの基盤 |
| `02_phase1_database.md` | Phase 1: 全テーブル定義・RLS・トリガー・notification_logs |
| `03_phase2_auth_layout.md` | Phase 2: Lark OAuth + ID/PW 認証・レイアウト・共通 UI |
| `04_phase3_customers.md` | Phase 3: 顧客管理 |
| `05_phase4_contracts.md` | Phase 4: 契約管理 |
| `06_phase5_opportunities_tasks.md` | Phase 5: 案件管理・タスク管理 |
| `07_phase6_intentions.md` | Phase 6: 意向把握ウィザード（保険業法対応） |
| `08_phase7_settlement_lark.md` | Phase 7: 精算 + CSV インポート / Phase 8: Lark 連携設定 |
| `09_phase9_calendar_reports_settings.md` | Phase 9-A/B/C: カレンダー / レポート / 設定 |
| `10_phase10_dashboard_polish.md` | Phase 10: ダッシュボード・共通コンポーネント仕上げ |

> 旧 `G-DX for 保険 — 本格実装ガイド（Claude Code 向け）.md` は本マスターに置き換わったため**参照しないこと**（差分が古く、矛盾の元）。

---

## 共通実装ルール

### ディレクトリ構成

```
src/
├── app/
│   ├── (auth)/
│   │   └── login/                 # Lark OAuth + ID/PW のハイブリッド画面
│   ├── (dashboard)/               # 認証必須
│   │   ├── layout.tsx
│   │   ├── page.tsx               # ダッシュボード
│   │   ├── customers/
│   │   ├── contracts/
│   │   ├── opportunities/
│   │   ├── tasks/
│   │   ├── calendar/
│   │   ├── intentions/
│   │   ├── settlement/
│   │   ├── reports/
│   │   ├── lark/                  # Lark 連携設定
│   │   └── settings/
│   └── api/
│       ├── auth/
│       │   ├── lark/
│       │   │   ├── start/route.ts
│       │   │   └── callback/route.ts
│       │   └── signout/route.ts
│       ├── lark/                  # Lark API プロキシ（Server-only）
│       └── webhooks/              # Lark Webhook 等
├── components/
│   ├── ui/                        # shadcn/ui（G-DX トークン適用）
│   ├── layout/                    # Sidebar, Header, ThemeToggle, FontScaleControl
│   └── features/                  # 機能別
├── lib/
│   ├── supabase/                  # client / server / admin
│   ├── lark/                      # OAuth・API クライアント・トークンキャッシュ
│   ├── types/                     # database.types.ts ほか
│   ├── validations/               # zod スキーマ
│   └── utils/
└── hooks/
```

### 型定義

- Supabase の `Database` 型を `src/lib/types/database.types.ts` に自動生成
- アプリ層型は `Pick` / `Omit` でビュー側型を派生
- DB は `null` を返すため、アプリ層も `null` で統一（`undefined` と混在禁止）

### Server / Client コンポーネント

- データ取得は **Server Component**（`async/await` + Supabase Server Client）
- フォーム・モーダル・フィルター・テーマ切替は **Client Component** に分離
- `"use client"` は最小スコープ

### エラーハンドリング

- Supabase の `{ data, error }` は必ず `error` をチェック
- ユーザー向けエラーは `sonner` トースト（`toast.error()`）
- 404 は `notFound()`、認証エラーは `redirect('/login')`
- ユーザー向けエラー文は **「何が起きたか」+ 「どうすればよいか」** をセットで日本語

### デザイン（憲法 Design Rules §2 §4 §10 を参照）

- 角丸は **4px 基準・最大 8px**、ピル型禁止
- 色・フォントサイズ・間隔は **CSS 変数 / Tailwind トークン経由のみ**。HEX や px 直書き禁止
- 強い影・グラデ・パステル・複数アクセント・絵文字は禁止
- アイコンは Lucide React のみ
- ホワイト/ブラック切替、フォントスケール（small/normal/large）はシステム設定から変更可

---

## 環境変数（`.env.local`）

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# アプリ
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Lark（App ID / Secret は **env のみ**。テナント DB に保存しないこと）
LARK_APP_ID=
LARK_APP_SECRET=
LARK_OAUTH_REDIRECT_URI=http://localhost:3000/api/auth/lark/callback
LARK_WEBHOOK_VERIFY_TOKEN=
```

> Lark Rules §6: **App ID / App Secret は DB に保存しない**。テナントごとに切り替える運用が必要になった場合は Supabase Vault またはサーバ側 KMS を使う。

---

## RLS（行レベルセキュリティ）方針

- 全テーブルで RLS 有効
- 自テナントのレコードのみアクセス可（`tenant_id = current_user_tenant_id()`）
- **募集人（agent）は `assigned_to = auth.uid()` のレコードに限定**（`tenants.settings.access_scope` で `tenant_wide` に変更可）
- `admin` は全件、`staff` は読取のみ等、ロール別に分岐
- **`intention_records` / `contact_histories` は DELETE を全拒否**（保険業法対応）
- ビュー（`customers_with_age` 等）は `WITH (security_invoker = true)` で作成

詳細は `02_phase1_database.md` §17 を参照。

---

## 注意事項

1. **保険業法対応データの物理削除禁止** — `intention_records` / `contact_histories` は RLS で DELETE 拒否。論理削除フラグも持たない。
2. **高齢者判定** — `customers_with_age` ビューで `age >= 70` を `is_elderly` として算出。閾値は `tenants.settings.elderly_age_threshold` で上書き可。
3. **Lark 連携は UI 先行 + キュー設計** — Phase 8 で API 接続するが、それまでも `notification_logs` への積み上げ・モック送信は Phase 1 から動く構造にする。
4. **精算 CSV 照合** — Phase 7 で保険会社別 CSV インポート + 突合機能を実装（08_phase7_settlement_lark.md 参照）。
5. **業務 PDF（手書きシート）** — `N-LIC様_業務フロー・改善ご要望＿手書きシート.pdf` は画像 PDF。**OCR 結果を踏まえて Phase 1 の列挙値（顧客ステータス・案件ステージ・保険商品カテゴリ等）と業務用語の整合確認が未完**。N-LIC 様にヒアリング後、本マスター + Phase 1 を更新すること。

---

## 進め方の指示（CLAUDE.md §3 準拠）

### 着手時に必ず行う

1. 同階層の `CLAUDE.md` / `AGENTS.md` / `G-DX_Future_Design_Rules.md` / `G-DX_Lark_Integration_Rules.md` を読む
2. 本ファイルと該当 Phase の md を読む
3. 影響するテーブル・画面・権限を列挙
4. 実装 → 型チェック（`pnpm type-check`）→ ローカル `pnpm dev` でブラウザ確認

### やってはいけないこと

- 新規パッケージの**勝手な追加**（必ずユーザー承認）
- migration 経由以外の Supabase スキーマ変更
- 要件にない機能の追加（"あったら便利" で増やさない）
- デザイントークン外の値（HEX・px）の直書き
- 本番 DB への破壊的操作（drop / truncate / reset）
- App ID / Secret の DB 保存、API キーのフロント露出
