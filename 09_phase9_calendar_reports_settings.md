# Phase 9 — カレンダー・レポート・設定

> **実装方式**: 並列（Phase 2 完了後、他フェーズと同時進行可）
> **所要目安**: カレンダー: 3〜4時間 / レポート: 2〜3時間 / 設定: 2〜3時間
> **担当**: 1〜2名

---

## Phase 9-A: カレンダー

### 目標

月/週ビュー切替・活動種別カテゴリ・右サイドパネルで予定追加を実装する。

---

### 画面一覧

| パス | 画面名 | 主な機能 |
|-----|-------|---------|
| `/calendar` | カレンダー | 月/週ビュー・予定追加・Lark Calendar 同期 UI |

---

### データ取得

```typescript
// src/app/(dashboard)/calendar/page.tsx
export default async function CalendarPage({ searchParams }) {
  const supabase = await createClient()

  const year = Number(searchParams.year ?? new Date().getFullYear())
  const month = Number(searchParams.month ?? new Date().getMonth() + 1)

  // 表示月の前後1ヶ月を含めて取得（週ビュー対応）
  const startDate = new Date(year, month - 2, 1).toISOString().split('T')[0]
  const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0]

  const { data: events } = await supabase
    .from('calendar_events')
    .select(`
      *,
      customers!related_customer_id(id, name),
      user_profiles!assigned_to(id, name)
    `)
    .gte('start_datetime', startDate)
    .lte('start_datetime', endDate)
    .is('deleted_at', null)
    .order('start_datetime', { ascending: true })

  return <CalendarClient events={events ?? []} year={year} month={month} />
}
```

---

### 活動種別カテゴリ

```typescript
// 活動種別の定義（カラーコーディング付き）
export const EVENT_CATEGORIES = {
  '訪問':     { color: 'bg-blue-100 text-blue-700 border-blue-200' },
  '電話':     { color: 'bg-green-100 text-green-700 border-green-200' },
  'Web会議':  { color: 'bg-purple-100 text-purple-700 border-purple-200' },
  '書類作業': { color: 'bg-amber-100 text-amber-700 border-amber-200' },
  '社内会議': { color: 'bg-gray-100 text-gray-700 border-gray-200' },
  'その他':   { color: 'bg-slate-100 text-slate-700 border-slate-200' },
} as const
```

---

### 予定追加サイドパネル

```typescript
// src/components/features/calendar/EventSidePanel.tsx
// 入力項目:
// - タイトル: text（必須）
// - 活動種別: select（上記カテゴリ）
// - 開始日時: datetime-local（必須）
// - 終了日時: datetime-local
// - 関連顧客: Combobox（任意）
// - 場所: text
// - 持ち出し物: textarea
// - メモ: textarea
// - Lark Calendar 同期: checkbox（将来連携用）

// 保存後: calendar_events テーブルに挿入
// Lark Calendar 同期チェックがある場合: lark_calendar_event_id を保存（将来実装）
```

---

### 月ビュー / 週ビュー

```typescript
// 月ビュー: 42マスのグリッド（6週 × 7日）
// - 各マスに最大3件のイベントを表示
// - 3件超の場合は「+N件」リンクを表示
// - 日付クリックでサイドパネルを開く（その日の予定追加）

// 週ビュー: 7列 × 24時間のタイムライングリッド
// - 各イベントを時間帯に合わせて配置
// - 重複するイベントは横並びで表示
// - 30分単位のグリッド線

// ⚠️ 週ビューのmap処理では必ず key を付与すること
// HOURS.map((hour) => <React.Fragment key={hour}>...</React.Fragment>)
// weekDates.map((date) => <div key={date.toISOString()}>...</div>)
```

---

## Phase 9-B: レポート

### 目標

月次推移・担当者別・商品別・顧客分布グラフを実装する。

---

### データ取得

```typescript
// src/app/(dashboard)/reports/page.tsx
export default async function ReportsPage({ searchParams }) {
  const supabase = await createClient()

  const period = searchParams.period ?? 'this_month'

  const { startDate, endDate } = getPeriodRange(period)

  const [
    { data: monthlyContracts },
    { data: byUser },
    { data: byCategory },
    { data: customerSegments },
  ] = await Promise.all([
    // 月次新規契約推移（過去12ヶ月）
    supabase.rpc('get_monthly_contracts_summary', { months: 12 }),

    // 担当者別実績
    supabase.rpc('get_performance_by_user', { start_date: startDate, end_date: endDate }),

    // 商品カテゴリ別
    supabase.from('contracts')
      .select('product_category, premium')
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .is('deleted_at', null),

    // 顧客分布（年代別）
    supabase.rpc('get_customer_age_distribution'),
  ])

  return (
    <ReportsClient
      monthlyContracts={monthlyContracts ?? []}
      byUser={byUser ?? []}
      byCategory={byCategory ?? []}
      customerSegments={customerSegments ?? []}
      period={period}
    />
  )
}
```

---

### グラフ構成（recharts 使用）

```
グラフ一覧:
1. 月次新規契約推移（BarChart）
   - X軸: 月
   - Y軸: 件数 / 保険料合計
   - 期間フィルター: 今月 / 今四半期 / 今年度

2. 担当者別実績（BarChart 横向き）
   - Y軸: 担当者名
   - X軸: 新規契約件数 / 保険料合計

3. 商品カテゴリ別構成（PieChart）
   - 生命保険 / 損害保険 / 医療保険 / 介護保険 / 年金保険

4. 顧客年代分布（BarChart）
   - X軸: 年代（20代 / 30代 / ... / 80代以上）
   - Y軸: 顧客数
```

---

## Phase 9-C: 設定（システム管理）

### 目標

代理店情報・ユーザー管理・通知設定・コンプライアンス設定を実装する。

---

### 画面構成

```
設定ページ
├── [代理店情報タブ]
│   ├── 代理店名・代表者名・住所・電話・メール
│   ├── 保険代理店登録番号
│   └── ロゴ画像アップロード（Supabase Storage）
├── [ユーザー管理タブ]
│   ├── ユーザー一覧（名前・メール・ロール・ステータス）
│   ├── ユーザー招待（メール送信）
│   ├── ロール変更（管理者 / 一般）
│   └── アカウント無効化
├── [通知設定タブ]
│   ├── 満期アラート: X日前に通知（デフォルト: 90日・60日・30日）
│   ├── タスク期日アラート: X日前に通知
│   ├── 通知方法: メール / Lark Bot（将来連携）
│   └── 通知対象: 担当者のみ / 管理者も含む
└── [コンプライアンス設定タブ]
    ├── 高齢者対応年齢閾値（デフォルト: 70歳）
    ├── 意向把握必須フラグ（新規契約時に意向把握を必須にする）
    ├── 承認フロー必須フラグ（意向把握の承認を必須にする）
    └── データ保持期間設定
```

---

### ユーザー招待

```typescript
// src/app/(dashboard)/settings/actions.ts
export async function inviteUser(email: string, role: string) {
  'use server'
  const supabase = await createClient()

  // Supabase Auth の inviteUserByEmail を使用
  const { error } = await supabase.auth.admin.inviteUserByEmail(email, {
    data: { role },
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
  })

  if (error) return { error: '招待メールの送信に失敗しました' }
  return { success: true }
}
```

---

## 完了チェックリスト（Phase 9-A: カレンダー）

- [ ] 月ビューが正しく表示される（42マスグリッド）
- [ ] 週ビューが正しく表示される（タイムライン）
- [ ] 月/週ビューの切替が動作する
- [ ] 予定追加サイドパネルが開閉できる
- [ ] 予定の保存・表示ができる
- [ ] 活動種別カテゴリのカラーコーディングが表示される
- [ ] `key` プロップの警告が出ない（WeekView の map 処理確認）

## 完了チェックリスト（Phase 9-B: レポート）

- [ ] 全4グラフが表示される
- [ ] 期間フィルターでグラフデータが切り替わる
- [ ] recharts のレスポンシブ対応（ResponsiveContainer 使用）

## 完了チェックリスト（Phase 9-C: 設定）

- [ ] 代理店情報の保存・読み込みができる
- [ ] ユーザー一覧が表示される
- [ ] ユーザー招待メールが送信できる
- [ ] ロール変更・無効化ができる
- [ ] 通知設定の保存・読み込みができる
- [ ] コンプライアンス設定の保存・読み込みができる
