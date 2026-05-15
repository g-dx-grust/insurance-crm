# Phase 7 — 精算・MDRT管理 / Phase 8 — Lark 連携設定

> **実装方式**: 並列（Phase 3・4 完了後、Phase 6 と同時進行可）
> **所要目安**: Phase 7: 3〜4時間 / Phase 8: 2〜3時間
> **担当**: 1名（または2名で並列）

---

## Phase 7: 精算・MDRT管理

### 目標

月次精算一覧・入金確認・担当者別 MDRT 進捗管理・月次手数料推移グラフを実装する。

---

### 画面一覧

| パス | 画面名 | 主な機能 |
|-----|-------|---------|
| `/settlement` | 精算・MDRT管理 | 精算一覧・MDRT進捗・月次グラフ・CSV インポート起動 |
| `/settlement/import` | 精算 CSV インポート | 保険会社別 CSV 取込 + 突合結果表示（モーダルで `/settlement` 内に開く構成も可） |

---

### データ取得

```typescript
// src/app/(dashboard)/settlement/page.tsx
// Next.js 15 では searchParams は Promise として渡される（Phase 4 と同じパターン）
export default async function SettlementPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const sp = await searchParams
  const supabase = await createClient()

  const targetMonth = sp.month ?? new Date().toISOString().slice(0, 7)
  const currentYear = new Date().getFullYear()

  const [
    { data: settlements, count },
    { data: mdrtPerformances },
    { data: mdrtTarget },
    { data: monthlyData },
    { data: users },
  ] = await Promise.all([
    // 精算一覧（対象月）
    supabase.from('settlements')
      .select('*', { count: 'exact' })
      .eq('settlement_month', targetMonth)
      .order('created_at', { ascending: false }),

    // MDRT 成績（今年度）
    supabase.from('mdrt_performances')
      .select('*, user_profiles!user_id(id, name)')
      .eq('year', currentYear),

    // MDRT 基準値（テナント × 今年度。レコードがなければ Phase 1 のテーブルデフォルト 600/1200/1800 万を使用）
    supabase.from('mdrt_targets')
      .select('mdrt_target, cot_target, tot_target')
      .eq('year', currentYear)
      .maybeSingle(),

    // 月次手数料推移（過去12ヶ月）
    supabase.from('settlements')
      .select('settlement_month, fee_amount, status')
      .gte('settlement_month', getPast12Months())
      .order('settlement_month', { ascending: true }),

    // ユーザー一覧（MDRT進捗表示用）
    supabase.from('user_profiles')
      .select('id, name')
      .eq('is_active', true),
  ])

  const targets = {
    mdrt: Number(mdrtTarget?.mdrt_target ?? 6_000_000),
    cot:  Number(mdrtTarget?.cot_target  ?? 12_000_000),
    tot:  Number(mdrtTarget?.tot_target  ?? 18_000_000),
  }

  return (
    <SettlementClient
      settlements={settlements ?? []}
      total={count ?? 0}
      mdrtPerformances={mdrtPerformances ?? []}
      mdrtTargets={targets}
      monthlyData={monthlyData ?? []}
      users={users ?? []}
      targetMonth={targetMonth}
    />
  )
}
```

---

### 精算一覧テーブル

```
カラム構成:
- 顧客名
- 保険会社
- 請求額（円）
- 入金額（円）
- 手数料額（円）
- 手数料率（%）
- ステータスバッジ（未精算 / 照合中 / 完了 / 差異あり）
- 操作（入金確認ボタン・編集・メモ）

フィルター:
- 対象月（月選択）
- ステータス
- 保険会社
```

---

### 入金確認ボタン

```typescript
// 精算ステータスを「完了」に更新する Server Action
export async function confirmPayment(settlementId: string) {
  'use server'
  const supabase = await createClient()
  await supabase
    .from('settlements')
    .update({ status: '完了', updated_at: new Date().toISOString() })
    .eq('id', settlementId)
  revalidatePath('/settlement')
}
```

---

### MDRT 進捗バー

```tsx
// src/components/features/settlement/MdrtProgressBar.tsx
// 色は G-DX トークン経由（生 Tailwind カラーの直書き禁止：CLAUDE.md §1.2 / Design Rules §2 §4）
// MDRT/COT/TOT 基準値は Phase 1 §14 の mdrt_targets テーブルから取得した値を props で受ける（ハードコード禁止）

interface MdrtTargets {
  mdrt: number
  cot: number
  tot: number
}

export function MdrtProgressBar({
  userName,
  performanceValue,
  targets,
}: {
  userName: string
  performanceValue: number
  targets: MdrtTargets
}) {
  // バーは TOT を 100% として正規化（基準線で MDRT/COT を視覚化）
  const pct = Math.min((performanceValue / targets.tot) * 100, 100)
  const mdrtLinePct = (targets.mdrt / targets.tot) * 100
  const cotLinePct  = (targets.cot  / targets.tot) * 100

  const level =
    performanceValue >= targets.tot  ? 'TOT'  :
    performanceValue >= targets.cot  ? 'COT'  :
    performanceValue >= targets.mdrt ? 'MDRT' : '—'

  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-medium text-text-sub">{userName}</span>
        <div className="flex items-center gap-2">
          <span className="text-sm text-text-muted">
            {(performanceValue / 10000).toLocaleString()}万円
          </span>
          {level !== '—' && (
            <span className="text-xs font-semibold text-accent
                             border border-border-strong rounded-sm px-1.5 py-0.5">
              {level}
            </span>
          )}
        </div>
      </div>
      {/* プログレスバー（TOT を 100% として正規化） */}
      <div className="relative h-2 bg-bg-secondary rounded-sm overflow-hidden">
        <div
          className="absolute h-full bg-accent rounded-sm transition-all"
          style={{ width: `${pct}%` }}
        />
        {/* MDRT 基準線 */}
        <div
          className="absolute top-0 h-full w-px bg-border-strong"
          style={{ left: `${mdrtLinePct}%` }}
        />
        {/* COT 基準線 */}
        <div
          className="absolute top-0 h-full w-px bg-border-strong"
          style={{ left: `${cotLinePct}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-text-muted mt-0.5">
        <span>0</span>
        <span>MDRT {(targets.mdrt / 10000).toLocaleString()}万</span>
        <span>COT {(targets.cot / 10000).toLocaleString()}万</span>
        <span>TOT {(targets.tot / 10000).toLocaleString()}万</span>
      </div>
    </div>
  )
}
```

---

### 月次手数料推移グラフ

```typescript
// recharts の BarChart を使用
// X軸: 月（YYYY-MM）
// Y軸: 手数料額（万円）
// バー: 完了分（accent）/ 未精算分（border-strong）を積み上げ
// 色は CSS 変数経由（--color-accent / --color-border-strong）。生 Tailwind カラー禁止

// 期間フィルター: 今月 / 今四半期 / 今年度
// 切り替えで表示データを変更（useState で管理）
```

---

### CSV インポート（保険会社別）

> **要件**: Master §注意事項 4 と Phase 1 §13 (`settlement_imports` テーブル) で必須化されている。保険会社ごとにフォーマットが異なるため、テンプレート選択 → 行解析 → 既存契約との突合 → settlements への投入 + 取込履歴の保存という流れで実装する。

#### 画面フロー

```
[CSV インポートを開始] ボタン（settlement ページ右上）
    ↓
保険会社テンプレート選択（DB の選択肢: 「日本生命」「東京海上」「アフラック」… 等。Phase 9-C 設定で追加可）
    ↓
ファイルアップロード（.csv のみ。Shift_JIS / UTF-8 を自動判定）
    ↓
プレビュー（先頭 20 行 + ヘッダーマッピング）
    ↓
取込実行 → 行ごとに突合結果を表示（matched / unmatched）
    ↓
settlements に挿入 + settlement_imports に履歴記録
    ↓
完了画面: matched_rows / unmatched_rows サマリー + 未マッチ行の詳細リンク
```

#### テンプレート定義

```typescript
// 保険会社ごとのカラムマッピングを定数で持つ（運用で増えた場合は Phase 9-C 設定で追加）
// src/lib/settlement/csvTemplates.ts

export interface CsvTemplate {
  insurance_company: string
  encoding: 'shift_jis' | 'utf-8'
  columns: {
    policy_number: string       // CSV 上の列名
    customer_name: string
    settlement_month: string    // 'YYYY-MM' or 'YYYY/MM/DD' (パース関数で吸収)
    invoice_amount: string
    payment_amount: string
    fee_amount: string
    fee_rate?: string
  }
}

// 例（実際の列名は 導入代理店ヒアリング後に確定）
export const CSV_TEMPLATES: CsvTemplate[] = [
  {
    insurance_company: '日本生命',
    encoding: 'shift_jis',
    columns: {
      policy_number: '証券番号',
      customer_name: '契約者名',
      settlement_month: '計上月',
      invoice_amount: '請求額',
      payment_amount: '入金額',
      fee_amount: '手数料額',
      fee_rate: '手数料率',
    },
  },
  // 他社テンプレートを追加
]
```

#### Server Action（取込 + 突合）

```typescript
// src/app/(dashboard)/settlement/import/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { parse } from 'csv-parse/sync'  // 同期 API（Server Action 内で完結させやすい）

type CsvRow = Record<string, string>

export async function importSettlementCsv(formData: FormData) {
  const supabase = await createClient()
  const tenantId = await getCurrentTenantId()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '認証が必要です' }

  const file = formData.get('file') as File
  const templateName = formData.get('template') as string
  const settlementMonth = formData.get('month') as string

  const template = CSV_TEMPLATES.find(t => t.insurance_company === templateName)
  if (!template) return { error: 'テンプレートが不正です' }

  // 1. ファイル読み込み（エンコーディング吸収）
  const buffer = await file.arrayBuffer()
  const text = template.encoding === 'shift_jis'
    ? new TextDecoder('shift_jis').decode(buffer)
    : new TextDecoder('utf-8').decode(buffer)

  // 2. パース（csv-parse/sync）
  let rows: CsvRow[]
  try {
    rows = parse(text, {
      columns: true,           // 1 行目をヘッダーとして使う
      skip_empty_lines: true,
      bom: true,               // UTF-8 BOM を自動除去
      trim: true,
    }) as CsvRow[]
  } catch (e) {
    return { error: 'CSV の解析に失敗しました', details: String(e) }
  }

  // 3. 既存契約との突合（policy_number + insurance_company で検索）
  const policyNumbers = rows
    .map(row => row[template.columns.policy_number])
    .filter(Boolean)

  const { data: contracts } = await supabase
    .from('contracts')
    .select('id, policy_number, customer_id')
    .eq('insurance_company', template.insurance_company)
    .in('policy_number', policyNumbers)

  const contractMap = new Map(contracts?.map(c => [c.policy_number, c]) ?? [])

  // 4. settlement_imports に取込履歴を先に作る（source_import_id を発行）
  const { data: importLog, error: importErr } = await supabase
    .from('settlement_imports')
    .insert({
      tenant_id: tenantId,
      insurance_company: template.insurance_company,
      settlement_month: settlementMonth,
      file_name: file.name,
      total_rows: rows.length,
      matched_rows: 0,    // 後で UPDATE
      unmatched_rows: 0,
      imported_by: user.id,
      raw_payload: rows,  // 監査用に生データ保持（Phase 1 §13 設計準拠）
    })
    .select('id')
    .single()

  if (importErr || !importLog) return { error: '取込履歴の作成に失敗しました' }

  // 5. settlements に行挿入
  let matched = 0
  let unmatched = 0
  const inserts = rows.map(row => {
    const policyNumber = row[template.columns.policy_number]
    const contract = contractMap.get(policyNumber)
    if (contract) matched++
    else unmatched++

    return {
      tenant_id: tenantId,
      contract_id: contract?.id ?? null,
      customer_name: row[template.columns.customer_name] ?? '',
      insurance_company: template.insurance_company,
      settlement_month: settlementMonth,
      invoice_amount: parseInt(row[template.columns.invoice_amount] ?? '0', 10),
      payment_amount: parseInt(row[template.columns.payment_amount] ?? '0', 10),
      fee_amount: parseInt(row[template.columns.fee_amount] ?? '0', 10),
      fee_rate: template.columns.fee_rate
        ? parseFloat(row[template.columns.fee_rate] ?? '0')
        : null,
      status: contract ? '照合中' : '差異あり',  // 未マッチは「差異あり」で要対応扱い
      source_import_id: importLog.id,
    }
  })

  const { error: insertErr } = await supabase.from('settlements').insert(inserts)
  if (insertErr) return { error: '精算データの保存に失敗しました' }

  // 6. 取込履歴に matched/unmatched を反映
  await supabase
    .from('settlement_imports')
    .update({ matched_rows: matched, unmatched_rows: unmatched })
    .eq('id', importLog.id)

  revalidatePath('/settlement')
  return { ok: true, matched, unmatched, total: rows.length }
}
```

> `csv-parse` は依存ゼロ・Node 標準寄りのパーサ。Phase 0 のパッケージ追加リストに含めて導入する（CLAUDE.md §3.2 の事前承認は完了済み）。

#### 突合結果 UI

```
取込完了画面:
- ✅ マッチ件数: X 件 (status='照合中' で挿入)
- ⚠ 未マッチ件数: Y 件 (status='差異あり' で挿入、契約未登録 or 証券番号誤り)
- 📁 取込履歴: settlement_imports.id へのリンク（再取込・削除はしない、監査用）

未マッチ行は精算一覧上で「差異あり」フィルタで一覧表示し、
- 既存契約に手動で紐付け
- 新規契約として登録
- 取消（status='未精算' に戻す）
の 3 操作を提供。
```

---

## Phase 8: Lark 連携設定

### 目標

Lark 各モジュールの連携設定 UI を実装する。実際の API 連携は将来対応とし、設定値の保存・表示のみを行う。

> **重要**: Lark App ID / App Secret は **環境変数（`LARK_APP_ID` / `LARK_APP_SECRET`）でのみ管理** し、テナント DB には保存しない（CLAUDE.md §環境変数 / Lark Rules §6 / Phase 1 §2 tenants コメント）。SSO 設定タブは「環境変数で設定済みかどうか」の読み取り専用表示のみを行う。

---

### 画面構成

```
Lark 連携設定ページ
├── [接続状態サマリー]
│   ├── 各モジュールの接続状態バッジ（接続済 / 未接続）
│   └── App ID / App Secret 設定状態（環境変数の有無のみ表示。値は表示しない）
├── [SSO 設定タブ]（読み取り専用）
│   ├── App ID / App Secret 設定状態（"設定済み" / "未設定"）
│   ├── リダイレクト URI 表示（`NEXT_PUBLIC_APP_URL` から自動生成）
│   ├── 環境変数の設定方法ヘルプ（Vercel Environment Variables へのリンク）
│   └── 接続テストボタン（env の値を使ってサーバー側で疎通確認）
├── [Lark Base タブ]
│   ├── Base ID 入力（tenants.settings.lark.base.base_id に保存）
│   ├── 同期対象テーブル選択（顧客 / 契約 / 案件）
│   ├── 同期方向（一方向 / 双方向）
│   └── 手動同期ボタン
├── [Lark Calendar タブ]
│   ├── カレンダー ID 入力（tenants.settings.lark.calendar.calendar_id に保存）
│   ├── 同期対象（タスク期日 / カレンダーイベント）
│   └── 自動同期設定
├── [Lark Approval タブ]
│   ├── 承認フロー ID 入力（tenants.settings.lark.approval.intention_flow_id に保存）
│   ├── 承認者グループ設定
│   └── 通知設定
└── [Lark Bot タブ]
    ├── 通知先チャット ID 入力（tenants.settings.lark.bot.alert_chat_id に保存）
    ├── ⚠️ 注意書き: 「通知を送信するためには、対象の Lark グループチャットに本システムのボット（アプリ）を追加してください」（Lark Rules §4.1）
    ├── 通知トリガー設定
    │   ├── 満期アラート（X日前）
    │   ├── タスク期日アラート（X日前）
    │   ├── 承認依頼通知
    │   └── 精算完了通知
    └── 通知テンプレート編集
```

---

### 設定値の保存

```typescript
// Lark 設定は tenants テーブルの settings JSONB カラムに保存
// Phase 1 §2 (tenants コメント) と完全一致させること

// settings.lark の構造:
interface TenantSettings {
  lark: {
    // App ID / App Secret は env 管理のため DB には持たない（Lark Rules §6）
    sso_enabled: boolean
    base: {
      base_id: string | null
      sync_customers: boolean
      sync_contracts: boolean
      sync_opportunities: boolean
    }
    calendar: {
      calendar_id: string | null
      sync_tasks: boolean
      sync_events: boolean
    }
    approval: {
      intention_flow_id: string | null
    }
    bot: {
      alert_chat_id: string | null   // 通知先チャット ID（Lark Rules §3.1）
      expiry_days_before: number     // 満期アラート（日前）
      task_days_before: number       // タスクアラート（日前）
      notify_approval: boolean
      notify_settlement: boolean
    }
  }
}
```

---

### 通知テンプレート編集

```typescript
// src/components/features/lark/NotificationTemplateEditor.tsx
// 各通知種別のメッセージテンプレートを編集できる UI

// テンプレート変数:
// {{customer_name}} - 顧客名
// {{contract_number}} - 証券番号
// {{expiry_date}} - 満期日
// {{remaining_days}} - 残日数
// {{assigned_to}} - 担当者名
// {{task_title}} - タスク名
// {{due_date}} - 期日

// プレビュー機能: テンプレート変数をサンプル値に置換して表示
```

---

### 接続テストボタン（モック）

```typescript
// 現在は API 連携なしのモック動作
const handleConnectionTest = async (module: string) => {
  // TODO: Lark API 連携後に実際のテストを実装
  toast.success(`${module} の接続テストが成功しました`, {
    description: 'Lark API 連携後、実際の接続確認が行われます',
  })
}
```

---

## 完了チェックリスト（Phase 7）

- [ ] 精算一覧が対象月フィルターで表示される
- [ ] 入金確認ボタンでステータスが「完了」に変わる
- [ ] MDRT 進捗バーが全ユーザー分表示される（基準値は `mdrt_targets` から取得、未登録時は Phase 1 デフォルト）
- [ ] MDRT / COT / TOT 基準線が表示される
- [ ] 月次手数料推移グラフが表示される
- [ ] 期間フィルター（今月/今四半期/今年度）でグラフが切り替わる
- [ ] CSV インポート画面で保険会社テンプレートを選択して取込できる
- [ ] 取込結果に matched / unmatched 件数が表示される
- [ ] 未マッチ行が「差異あり」ステータスで一覧表示される
- [ ] `settlement_imports` に取込履歴が記録される（`raw_payload` に生データが保存される）

## 完了チェックリスト（Phase 8）

- [ ] Lark 連携設定ページの全タブが表示される
- [ ] 設定値の保存・読み込みができる（tenants.settings.lark に書き込まれる）
- [ ] 接続テストボタンでトーストが表示される
- [ ] 通知テンプレートの編集・プレビューができる
- [ ] App ID / App Secret は **環境変数のみ**で管理され、UI には入力欄が存在しない（Lark Rules §6）
- [ ] SSO 設定タブは env の設定有無のみを読み取り専用で表示する
- [ ] Bot タブに「対象 Lark グループチャットへのボット追加が必要」の注意書きが表示される（Lark Rules §4.1）
