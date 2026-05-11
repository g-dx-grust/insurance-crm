# Phase 5 — 案件管理・タスク管理

> **実装方式**: 並列（Phase 2 完了後、Phase 3・4 と同時進行可）
> **所要目安**: 4〜5時間
> **担当**: 1名

---

## 目標

案件のカンバン/リスト管理・案件詳細（ステージ進行・適合性確認）・タスク管理（Lark Calendar 同期 UI）を実装する。

---

## 画面一覧

| パス | 画面名 | 主な機能 |
|-----|-------|---------|
| `/opportunities` | 案件管理 | カンバン/リスト切替・新規作成モーダル |
| `/opportunities/[id]` | 案件詳細 | ステージ進行バー・活動履歴・適合性確認 |
| `/tasks` | タスク管理 | 一覧・フィルター・Lark Calendar 同期 UI |

---

## 案件管理

### データ取得

```typescript
// src/app/(dashboard)/opportunities/page.tsx
export default async function OpportunitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string; assigned_to?: string }>
}) {
  const sp = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('opportunities')
    .select(`
      *,
      customers!customer_id(id, name, name_kana),
      user_profiles!assigned_to(id, name)
    `)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })

  if (sp.stage)       query = query.eq('stage', sp.stage)
  if (sp.assigned_to) query = query.eq('assigned_to', sp.assigned_to)

  const { data: opportunities } = await query
  return <OpportunitiesClient opportunities={opportunities ?? []} />
}
```

### ステージ定義（単一情報源）

DB 側 CHECK 制約と TS 側 const を同期させるため、**`src/lib/constants/opportunity.ts` を唯一の定義場所**とする。Phase 1 のマイグレーションを変更する場合は必ずこのファイルも更新する。

```typescript
// src/lib/constants/opportunity.ts
export const OPPORTUNITY_STAGES = [
  '初回接触',
  'ニーズ把握',
  '提案中',
  '見積提出',
  'クロージング',
  '成約',
  '失注',
] as const

export type OpportunityStage = (typeof OPPORTUNITY_STAGES)[number]

// 進行ステージ（成約・失注を除く）。バー表示用
export const ACTIVE_STAGES = OPPORTUNITY_STAGES.filter(
  (s) => s !== '成約' && s !== '失注',
) as readonly OpportunityStage[]
```

### カンバンビュー

```typescript
import { OPPORTUNITY_STAGES } from '@/lib/constants/opportunity'

// カンバンカードの表示項目
// - 顧客名（リンク）
// - 案件タイトル
// - 想定保険料（万円単位）
// - 担当者名
// - 更新日
// - 成約予定日（残日数）
```

### ステージ変更（楽観的 UI）

```typescript
// ドラッグ&ドロップは実装しない
// カンバンカードの「ステージ変更」ボタン → セレクトボックスでステージ選択
// Server Action で即時更新 → revalidatePath

import type { OpportunityStage } from '@/lib/constants/opportunity'

export async function updateOpportunityStage(id: string, stage: OpportunityStage) {
  'use server'
  const supabase = await createClient()
  // updated_at は trigger で自動更新されるため手動指定しない
  await supabase.from('opportunities').update({ stage }).eq('id', id)
  revalidatePath('/opportunities')
}
```

### 案件新規作成モーダル

```typescript
// src/components/features/opportunities/OpportunityModal.tsx
// 入力項目:
// - 顧客: Combobox（顧客名で検索・選択）
// - 案件タイトル: text（必須）
// - ステージ: select
// - 想定保険料: number（円）
// - 成約予定日: date
// - 担当者: select（ユーザー一覧）
// - メモ: textarea
```

---

## 案件詳細

### 画面構成

```
案件詳細ページ
├── [ステージ進行バー]（ページ上部に常時表示）
│   ├── 7段階のステージを横並びで表示
│   ├── 現在のステージをハイライト
│   ├── 完了済みステージにチェックマーク
│   └── ステージ変更ボタン
├── [左カラム: 活動履歴]
│   ├── 活動履歴タイムライン（種別アイコン + 日時 + 内容）
│   └── 活動記録追加ボタン
└── [右カラム: 案件情報]
    ├── 顧客情報（リンク付き）
    ├── 担当者・想定保険料・成約予定日
    ├── 特定保険適合性確認チェックリスト（9項目）
    └── 失注記録ボタン（ステージが「失注」以外の場合）
```

### ステージ進行バーコンポーネント

```tsx
// src/components/features/opportunities/StageProgressBar.tsx
'use client'

import { Check } from 'lucide-react'
import { ACTIVE_STAGES, type OpportunityStage } from '@/lib/constants/opportunity'

export function StageProgressBar({
  currentStage,
  onStageChange,
}: {
  currentStage: OpportunityStage
  onStageChange: (stage: OpportunityStage) => void
}) {
  const isLost  = currentStage === '失注'
  const isWon   = currentStage === '成約'
  // ACTIVE_STAGES（成約・失注を除いたバー表示用）でインデックス計算する
  const currentIndex = isWon
    ? ACTIVE_STAGES.length          // 成約 → 全ステージ完了
    : isLost
    ? -1                            // 失注 → バー上のハイライト無し
    : ACTIVE_STAGES.indexOf(currentStage as OpportunityStage)

  return (
    <div className="flex items-center gap-0 mb-6">
      {ACTIVE_STAGES.map((stage, index) => {
        const isCurrent   = !isLost && !isWon && stage === currentStage
        const isPast      = index < currentIndex
        const variant     = isCurrent
          ? 'border-accent text-accent'
          : isPast
          ? 'border-success text-success'
          : 'border-border text-text-muted'

        return (
          <button
            key={stage}
            onClick={() => onStageChange(stage)}
            className={`flex-1 py-2 text-xs font-medium border-b-2 transition-colors ${variant} flex items-center justify-center gap-1`}
          >
            {isPast && <Check className="size-3" aria-hidden />}
            {stage}
          </button>
        )
      })}
    </div>
  )
}
```

> 絵文字 `✓` は Lucide の `Check` アイコンに置換（憲法 §2 / §10）。色は CSS 変数経由のトークンに統一。

### 特定保険適合性確認チェックリスト（保険業法対応）

保険業法の証跡として残すため、`opportunity_suitability` テーブル（Phase 1 §9 で定義済み）に**構造化保存**する。`note` への JSON 保存はしない。

```typescript
// src/lib/constants/suitability.ts
export const SUITABILITY_ITEMS = [
  { key: 'age_confirmed',      label: '年齢・健康状態を確認した' },
  { key: 'income_confirmed',   label: '収入・資産状況を確認した' },
  { key: 'family_confirmed',   label: '家族構成・扶養状況を確認した' },
  { key: 'existing_confirmed', label: '既存契約の内容を確認した' },
  { key: 'need_confirmed',     label: '保険ニーズを確認した' },
  { key: 'product_explained',  label: '商品内容・特約を説明した' },
  { key: 'premium_confirmed',  label: '保険料の支払い能力を確認した' },
  { key: 'comparison_done',    label: '複数商品の比較説明を行った' },
  { key: 'consent_obtained',   label: '顧客の同意を得た' },
] as const
```

```typescript
// Server Action: 全項目チェック済みのときのみ upsert（一部だけのチェックでも保存可）
export async function saveSuitability(opportunityId: string, values: Record<string, boolean>) {
  'use server'
  const supabase = await createClient()
  const tenantId = await getCurrentTenantId()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  await supabase.from('opportunity_suitability').upsert({
    opportunity_id: opportunityId,
    tenant_id: tenantId,
    age_confirmed:      values.age_confirmed ?? false,
    income_confirmed:   values.income_confirmed ?? false,
    family_confirmed:   values.family_confirmed ?? false,
    existing_confirmed: values.existing_confirmed ?? false,
    need_confirmed:     values.need_confirmed ?? false,
    product_explained:  values.product_explained ?? false,
    premium_confirmed:  values.premium_confirmed ?? false,
    comparison_done:    values.comparison_done ?? false,
    consent_obtained:   values.consent_obtained ?? false,
    recorded_by: user.id,
    recorded_at: new Date().toISOString(),
  }, { onConflict: 'opportunity_id' })

  revalidatePath(`/opportunities/${opportunityId}`)
}
```

---

## タスク管理

### データ取得

```typescript
// src/app/(dashboard)/tasks/page.tsx
export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; priority?: string; assigned_to?: string }>
}) {
  const sp = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('tasks')
    .select(`
      *,
      customers!related_customer_id(id, name),
      user_profiles!assigned_to(id, name)
    `)
    .is('deleted_at', null)
    .order('due_date', { ascending: true, nullsFirst: false })

  // ステータスフィルター
  if (sp.status) {
    query = query.eq('status', sp.status)
  }

  // 優先度フィルター
  if (sp.priority) {
    query = query.eq('priority', sp.priority)
  }

  // 担当者フィルター
  if (sp.assigned_to) {
    query = query.eq('assigned_to', sp.assigned_to)
  }

  const { data: tasks } = await query
  return <TasksClient tasks={tasks ?? []} />
}
```

### タスク一覧テーブル

```
カラム構成:
- 優先度バッジ（高: 赤 / 中: 黄 / 低: グレー）
- タスク名
- 関連顧客（リンク）
- 担当者
- 期日（過ぎている場合は赤字）
- ステータス（セレクトで即時変更可能）
- Lark Calendar 登録ボタン
- 操作（編集・削除）
```

### Lark Calendar 同期 UI

```tsx
// src/components/features/tasks/LarkCalendarButton.tsx
'use client'

import { useState } from 'react'
import { toast } from 'sonner'

export function LarkCalendarButton({
  taskId,
  taskTitle,
  dueDate,
  isRegistered,
}: {
  taskId: string
  taskTitle: string
  dueDate: string | null
  isRegistered: boolean
}) {
  const [registered, setRegistered] = useState(isRegistered)

  const handleRegister = async () => {
    if (!dueDate) {
      toast.error('期日が設定されていません')
      return
    }

    // TODO: Lark Calendar API 連携後に実装
    // 現在はモック動作（状態を変更してトーストを表示）
    setRegistered(true)

    // lark_calendar_event_id を DB に保存（将来実装）
    // await updateTaskLarkCalendar(taskId, 'mock-event-id')

    toast.success('Lark Calendar に登録しました', {
      description: 'Lark API 連携後、実際のカレンダーに反映されます',
    })
  }

  if (registered) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-600
                       border border-green-200 rounded px-2 py-0.5">
        <span>✓</span> 登録済
      </span>
    )
  }

  return (
    <button
      onClick={handleRegister}
      className="text-xs text-blue-600 border border-blue-200 rounded px-2 py-0.5
                 hover:bg-blue-50 transition-colors"
    >
      Calendar 登録
    </button>
  )
}
```

### タスク新規登録モーダル

```typescript
// src/components/features/tasks/TaskModal.tsx
// 入力項目:
// - タスク名: text（必須）
// - 説明: textarea
// - 関連顧客: Combobox（任意）
// - 関連契約: select（関連顧客選択後に絞り込み）
// - 関連案件: select（関連顧客選択後に絞り込み）
// - 優先度: radio（高 / 中 / 低）
// - ステータス: select
// - 期日: date
// - 担当者: select（ユーザー一覧）
```

---

## フォームバリデーション

```typescript
// src/lib/validations/opportunity.ts
import { z } from 'zod'

export const opportunitySchema = z.object({
  customer_id: z.string().uuid('顧客を選択してください'),
  title: z.string().min(1, '案件タイトルは必須です').max(100),
  stage: z.enum(['初回接触', 'ニーズ把握', '提案中', '見積提出', 'クロージング', '成約', '失注']),
  estimated_premium: z.coerce.number().min(0).optional().nullable(),
  expected_close_date: z.string().optional().nullable(),
  assigned_to: z.string().uuid().optional().nullable(),
  note: z.string().max(1000).optional().nullable(),
})

// src/lib/validations/task.ts
export const taskSchema = z.object({
  title: z.string().min(1, 'タスク名は必須です').max(100),
  description: z.string().max(1000).optional().nullable(),
  related_customer_id: z.string().uuid().optional().nullable(),
  related_contract_id: z.string().uuid().optional().nullable(),
  related_opportunity_id: z.string().uuid().optional().nullable(),
  status: z.enum(['未着手', '進行中', '完了', '保留']),
  priority: z.enum(['高', '中', '低']),
  due_date: z.string().optional().nullable(),
  assigned_to: z.string().uuid().optional().nullable(),
})
```

---

## 完了チェックリスト

- [ ] 案件一覧がカンバン/リスト切替で表示される
- [ ] 案件新規作成モーダルが動作する（顧客 Combobox 検索含む）
- [ ] カンバンカードからステージ変更ができる
- [ ] 案件詳細のステージ進行バーが表示・変更できる
- [ ] 案件詳細の活動履歴追加ができる
- [ ] 特定保険適合性確認チェックリストが表示・保存できる
- [ ] タスク一覧が表示される（期日・優先度フィルター動作確認）
- [ ] タスクのステータスがテーブル上で即時変更できる
- [ ] Lark Calendar 登録ボタンが動作する（トースト表示確認）
- [ ] タスク新規登録モーダルが動作する
