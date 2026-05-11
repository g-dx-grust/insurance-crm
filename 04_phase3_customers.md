# Phase 3 — 顧客管理

> **実装方式**: 並列（Phase 2 完了後、Phase 4・5 と同時進行可）
> **所要目安**: 3〜4時間
> **担当**: 1名

---

## 目標

顧客の一覧・詳細・新規登録・編集・家族情報管理を実装する。

---

## 画面一覧

| パス | 画面名 | 主な機能 |
|-----|-------|---------|
| `/customers` | 顧客一覧 | 検索・フィルター・ソート・ページネーション |
| `/customers/new` | 顧客新規登録 | バリデーション付き入力フォーム |
| `/customers/[id]` | 顧客詳細 | 基本情報・契約・対応履歴・案件・タスク・家族情報タブ |
| `/customers/[id]/edit` | 顧客編集 | 登録フォームと同一コンポーネントを再利用 |

---

## データ取得パターン

### 顧客一覧（Server Component）

```typescript
// src/app/(dashboard)/customers/page.tsx
import { createClient } from '@/lib/supabase/server'
import { sanitizePostgrestSearch } from '@/lib/utils/escape'

// Next.js 15 では searchParams が Promise
type SearchParams = Promise<{
  q?: string
  status?: string
  assigned_to?: string
  page?: string
}>

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const sp = await searchParams
  const supabase = await createClient()
  const page = Math.max(1, Number(sp.page ?? 1))
  const pageSize = 20
  const offset = (page - 1) * pageSize

  // ビューは security_invoker = true。RLS で自動フィルタされるため deleted_at の条件は不要
  let query = supabase
    .from('customers_with_age')
    .select('*, user_profiles!assigned_to(name)', { count: 'exact' })
    .order('updated_at', { ascending: false })
    .range(offset, offset + pageSize - 1)

  // 検索（PostgREST or() のフィルタインジェクション対策で必ずサニタイズ）
  if (sp.q) {
    const safe = sanitizePostgrestSearch(sp.q)
    if (safe.length > 0) {
      query = query.or(`name.ilike.%${safe}%,name_kana.ilike.%${safe}%`)
    }
  }

  if (sp.status)      query = query.eq('status', sp.status)
  if (sp.assigned_to) query = query.eq('assigned_to', sp.assigned_to)

  const { data: customers, count, error } = await query
  if (error) throw new Error(error.message)

  return <CustomersClient customers={customers ?? []} total={count ?? 0} page={page} />
}
```

### 顧客詳細（Server Component）

```typescript
// src/app/(dashboard)/customers/[id]/page.tsx
// Next.js 15: params も Promise
export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // 顧客基本情報
  const { data: customer } = await supabase
    .from('customers_with_age')
    .select('*, user_profiles!assigned_to(id, name)')
    .eq('id', id)
    .single()

  if (!customer) notFound()

  // 並列でデータ取得
  const [
    { data: contracts },
    { data: contactHistories },
    { data: opportunities },
    { data: tasks },
    { data: familyMembers },
  ] = await Promise.all([
    supabase.from('contracts')
      .select('*')
      .eq('customer_id', id)
      .is('deleted_at', null)
      .order('expiry_date', { ascending: true }),
    supabase.from('contact_histories')
      .select('*, user_profiles!recorded_by(name)')
      .eq('customer_id', id)
      .order('contacted_at', { ascending: false })
      .limit(20),
    supabase.from('opportunities')
      .select('*')
      .eq('customer_id', id)
      .is('deleted_at', null),
    supabase.from('tasks')
      .select('*')
      .eq('related_customer_id', id)
      .is('deleted_at', null),
    supabase.from('family_members')
      .select('*')
      .eq('customer_id', id)
      .order('created_at', { ascending: true }),
  ])

  return (
    <CustomerDetailClient
      customer={customer}
      contracts={contracts ?? []}
      contactHistories={contactHistories ?? []}
      opportunities={opportunities ?? []}
      tasks={tasks ?? []}
      familyMembers={familyMembers ?? []}
    />
  )
}
```

---

## フォームバリデーション（Zod スキーマ）

```typescript
// src/lib/validations/customer.ts
import { z } from 'zod'

export const customerSchema = z.object({
  name: z.string().min(1, '氏名は必須です').max(50, '50文字以内で入力してください'),
  name_kana: z.string()
    .min(1, 'フリガナは必須です')
    .regex(/^[ァ-ヶー\s]+$/, 'カタカナで入力してください'),
  birth_date: z.string().optional().nullable(),
  gender: z.enum(['男性', '女性', 'その他']).optional().nullable(),
  postal_code: z.string()
    .regex(/^\d{3}-?\d{4}$/, '郵便番号の形式が正しくありません（例: 150-0001）')
    .optional()
    .nullable(),
  address: z.string().max(200).optional().nullable(),
  phone: z.string()
    .regex(/^[\d\-\+\(\)\s]+$/, '電話番号の形式が正しくありません')
    .optional()
    .nullable(),
  email: z.string().email('メールアドレスの形式が正しくありません').optional().nullable(),
  status: z.enum(['見込', '既存', '休眠']),
  assigned_to: z.string().uuid().optional().nullable(),
  note: z.string().max(1000).optional().nullable(),
})

export type CustomerFormValues = z.infer<typeof customerSchema>
```

---

## Server Actions

```typescript
// src/app/(dashboard)/customers/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentTenantId } from '@/lib/auth/server'
import { customerSchema } from '@/lib/validations/customer'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createCustomer(formData: FormData) {
  const supabase = await createClient()
  const tenantId = await getCurrentTenantId() // 未認証なら redirect

  const raw = Object.fromEntries(formData)
  const parsed = customerSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.flatten() }
  }

  const { data, error } = await supabase
    .from('customers')
    .insert({ ...parsed.data, tenant_id: tenantId })
    .select()
    .single()

  if (error) {
    return { error: { message: '登録に失敗しました。入力内容をご確認ください。' } }
  }

  revalidatePath('/customers')
  redirect(`/customers/${data.id}`)
}

export async function updateCustomer(id: string, formData: FormData) {
  // createCustomer と同様のパターン
  // revalidatePath('/customers')
  // revalidatePath(`/customers/${id}`)
}

export async function deleteCustomer(id: string) {
  // 論理削除（deleted_at を設定）
  const supabase = await createClient()
  await supabase
    .from('customers')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  revalidatePath('/customers')
  redirect('/customers')
}
```

---

## 顧客詳細タブ構成

```
顧客詳細ページ
├── [基本情報タブ]
│   ├── 顧客情報カード（氏名・生年月日・住所・連絡先）
│   ├── 担当者・ステータス
│   ├── 高齢者警告バナー（is_elderly = true の場合）
│   └── アクションボタン（対応履歴を登録・編集・削除）
├── [契約タブ]
│   ├── 契約一覧テーブル（満期日ソート・残日数カラー）
│   └── 新規契約登録ボタン
├── [対応履歴タブ]
│   ├── 対応履歴一覧（タイムライン形式）
│   └── 履歴登録モーダル
├── [案件タブ]
│   ├── 案件一覧（ステージバッジ付き）
│   └── 新規案件作成ボタン
├── [タスクタブ]
│   ├── タスク一覧（優先度・期限）
│   └── タスク追加ボタン
└── [家族情報タブ]
    ├── 家族一覧テーブル（続柄・氏名・被保険者/受取人フラグ）
    ├── 世帯カバレッジ分析（加入済み/未加入の可視化）
    └── 家族追加・編集モーダル
```

---

## 対応履歴登録モーダル

```typescript
// src/components/features/customers/ContactHistoryModal.tsx
// 入力項目:
// - 対応種別: 電話 / 訪問 / メール / LINE / Lark / その他
// - 対応日時: datetime-local
// - 対応内容: textarea（必須）
// - 次回アクション: text（任意）
// - 次回アクション予定日: date（任意）
//
// 次回アクション予定日が入力された場合:
// → 「Lark Calendar に登録する」チェックボックスを表示
// → チェック時はトースト「Lark Calendar 連携後に自動登録されます」を表示
```

---

## 家族情報モーダル

```typescript
// src/components/features/customers/FamilyMemberModal.tsx
// 入力項目:
// - 続柄: select（配偶者・長男・長女・次男・次女・父・母・その他）
// - 氏名: text（必須）
// - フリガナ: text
// - 生年月日: date
// - 性別: radio
// - 被保険者: checkbox
// - 受取人: checkbox
// - 備考: textarea
```

---

## 高齢者対応フロー

`is_elderly = true`（既定 70 歳以上、`tenants.settings.elderly_age_threshold` で調整可）の顧客に対して以下を表示する。

```tsx
// 顧客詳細の基本情報タブ上部に表示
{customer.is_elderly && (
  <div className="border border-warning/30 bg-warning/10 rounded-md p-3 mb-4">
    <p className="text-sm font-semibold text-warning">
      高齢者対応が必要です
    </p>
    <p className="text-xs text-text-sub mt-1">
      保険業法に基づき、意向把握・高齢者確認フローを実施してください。
      家族同席または録音・録画を推奨します。
    </p>
  </div>
)}
```

> 色は `var(--color-warning)` 系のトークン経由で表現。`bg-amber-50` 等のパレット直指定は禁止（憲法 Design Rules §2）。

---

## 完了チェックリスト

- [ ] 顧客一覧が表示される（検索・フィルター・ページネーション動作確認）
- [ ] 顧客新規登録フォームのバリデーションが動作する（カタカナ・郵便番号・メール）
- [ ] 顧客詳細の全タブが表示される
- [ ] 対応履歴の登録・表示ができる
- [ ] 家族情報の追加・編集・削除ができる
- [ ] 70歳以上の顧客に高齢者警告バナーが表示される
- [ ] 顧客の論理削除ができる（deleted_at が設定される）
- [ ] 顧客編集フォームが動作する
