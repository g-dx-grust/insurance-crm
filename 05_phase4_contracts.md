# Phase 4 — 契約管理

> **実装方式**: 並列（Phase 2 完了後、Phase 3・5 と同時進行可）
> **所要目安**: 3〜4時間
> **担当**: 1名

---

## 目標

契約の一覧・詳細・新規登録・編集・特約管理・更改履歴を実装する。

---

## 画面一覧

| パス | 画面名 | 主な機能 |
|-----|-------|---------|
| `/contracts` | 契約一覧 | 検索・フィルター・満期日ソート・残日数カラー |
| `/contracts/new` | 契約新規登録 | バリデーション付き入力フォーム |
| `/contracts/[id]` | 契約詳細 | 特約・保険料内訳・更改履歴・関連意向把握書タブ |
| `/contracts/[id]/edit` | 契約編集 | 登録フォームと同一コンポーネントを再利用 |

---

## データ取得パターン

### 契約一覧（Server Component）

```typescript
// src/app/(dashboard)/contracts/page.tsx
import { sanitizePostgrestSearch } from '@/lib/utils/escape'

export default async function ContractsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string; status?: string; category?: string; expiry_within?: string; page?: string
  }>
}) {
  const sp = await searchParams
  const supabase = await createClient()
  const page = Math.max(1, Number(sp.page ?? 1))
  const pageSize = 20
  const offset = (page - 1) * pageSize

  let query = supabase
    .from('contracts')
    .select(`
      *,
      customers!customer_id(id, name, name_kana),
      user_profiles!assigned_to(name)
    `, { count: 'exact' })
    .is('deleted_at', null)
    .order('expiry_date', { ascending: true })
    .range(offset, offset + pageSize - 1)

  // 検索（証券番号・保険会社・商品名） - サニタイズ必須
  if (sp.q) {
    const safe = sanitizePostgrestSearch(sp.q)
    if (safe.length > 0) {
      query = query.or(
        `policy_number.ilike.%${safe}%,` +
        `insurance_company.ilike.%${safe}%,` +
        `product_name.ilike.%${safe}%`,
      )
    }
  }

  if (sp.status)   query = query.eq('status', sp.status)
  if (sp.category) query = query.eq('product_category', sp.category)

  if (sp.expiry_within) {
    const targetDate = new Date()
    targetDate.setMonth(targetDate.getMonth() + Number(sp.expiry_within))
    query = query.lte('expiry_date', targetDate.toISOString().split('T')[0])
  }

  const { data: contracts, count } = await query
  return <ContractsClient contracts={contracts ?? []} total={count ?? 0} page={page} />
}
```

### 契約詳細（Server Component）

```typescript
// src/app/(dashboard)/contracts/[id]/page.tsx
export default async function ContractDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: contract } = await supabase
    .from('contracts')
    .select(`
      *,
      customers!customer_id(id, name, name_kana, birth_date),
      user_profiles!assigned_to(id, name)
    `)
    .eq('id', id)
    .single()

  if (!contract) notFound()

  const [
    { data: riders },
    { data: intentions },
  ] = await Promise.all([
    supabase.from('contract_riders')
      .select('*')
      .eq('contract_id', id)
      .order('created_at', { ascending: true }),
    supabase.from('intention_records')
      .select('*, user_profiles!created_by(name)')
      .eq('contract_id', id)
      .order('created_at', { ascending: false }),
  ])

  return (
    <ContractDetailClient
      contract={contract}
      riders={riders ?? []}
      intentions={intentions ?? []}
    />
  )
}
```

---

## フォームバリデーション（Zod スキーマ）

```typescript
// src/lib/validations/contract.ts
import { z } from 'zod'

export const contractSchema = z.object({
  customer_id: z.string().uuid('顧客を選択してください'),
  policy_number: z.string().min(1, '証券番号は必須です').max(50),
  insurance_company: z.string().min(1, '保険会社は必須です'),
  product_name: z.string().min(1, '商品名は必須です'),
  product_category: z.enum([
    '生命保険', '損害保険', '医療保険', '介護保険', '年金保険'
  ], { errorMap: () => ({ message: '商品カテゴリを選択してください' }) }),
  premium: z.coerce.number()
    .min(0, '保険料は0以上で入力してください')
    .max(100_000_000, '保険料の値が大きすぎます'),
  start_date: z.string().min(1, '契約開始日は必須です'),
  expiry_date: z.string().optional().nullable(),
  status: z.enum(['有効', '満期', '解約', '更改中']),
  renewal_status: z.enum(['未対応', '対応中', '更改中', '完了', '辞退']),
  assigned_to: z.string().uuid().optional().nullable(),
  note: z.string().max(1000).optional().nullable(),
})
  .refine(
    (data) => {
      if (!data.expiry_date) return true
      return new Date(data.expiry_date) > new Date(data.start_date)
    },
    { message: '満期日は契約開始日より後の日付を入力してください', path: ['expiry_date'] }
  )

export type ContractFormValues = z.infer<typeof contractSchema>
```

---

## 満期日の残日数カラーリング

```typescript
// src/lib/utils/contract.ts
// 色は CSS 変数経由（trail-* 等のパレット直指定は禁止）

export function getExpiryColor(expiryDate: string | null): string {
  if (!expiryDate) return 'text-text-muted'

  const today = new Date()
  const expiry = new Date(expiryDate)
  const diffDays = Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays < 0)   return 'text-text-muted'                 // 満期済み
  if (diffDays <= 30) return 'text-error font-semibold'        // 30 日以内
  if (diffDays <= 90) return 'text-warning'                    // 90 日以内
  return 'text-text'
}

export function getExpiryBadgeVariant(
  expiryDate: string | null
): 'danger' | 'warning' | 'default' | 'muted' {
  if (!expiryDate) return 'muted'

  const today = new Date()
  const expiry = new Date(expiryDate)
  const diffDays = Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return 'muted'
  if (diffDays <= 30) return 'danger'
  if (diffDays <= 90) return 'warning'
  return 'default'
}

export function formatRemainingDays(expiryDate: string | null): string {
  if (!expiryDate) return '—'

  const today = new Date()
  const expiry = new Date(expiryDate)
  const diffDays = Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return '満期済'
  if (diffDays === 0) return '本日満期'
  return `残 ${diffDays} 日`
}
```

---

## 契約詳細タブ構成

```
契約詳細ページ
├── [概要] — 右サイドパネルに常時表示
│   ├── 契約者情報（顧客名リンク・生年月日・年齢）
│   ├── 更改状況バッジ
│   ├── 関連案件リンク
│   └── Lark 連携状況（Approval ID 表示）
├── [特約一覧タブ]
│   ├── 特約テーブル（特約名・保障内容・保険料・有効期限）
│   └── 特約追加・編集・削除
├── [保険料内訳タブ]
│   ├── 主契約保険料
│   ├── 特約保険料一覧
│   ├── 割引額
│   └── 合計保険料（自動計算）
├── [更改履歴タブ]
│   ├── タイムライン形式で更改履歴を表示
│   ├── 更改日・更改内容・担当者・Lark Approval ID
│   └── 更改記録追加ボタン
└── [関連意向把握書タブ]
    ├── この契約に紐づく意向把握記録一覧
    └── 意向把握詳細へのリンク
```

---

## 特約モーダル

```typescript
// src/components/features/contracts/RiderModal.tsx
// 入力項目:
// - 特約名: text（必須）
// - 保障内容: textarea
// - 特約保険料: number（円）
// - 有効期限: date
// - 有効フラグ: checkbox
```

---

## 更改履歴追加モーダル

```typescript
// src/components/features/contracts/RenewalHistoryModal.tsx
// 入力項目:
// - 更改日: date（必須）
// - 更改内容: textarea（必須）
// - 更改後保険料: number（円）
// - 担当者: select（ユーザー一覧）
// - Lark Approval ID: text（将来連携用、任意）
//
// 保存時: contact_histories に type='更改' で記録する
```

---

## 完了チェックリスト

- [ ] 契約一覧が表示される（満期日昇順ソート）
- [ ] 満期日の残日数カラーリングが動作する（30日以内: 赤、90日以内: 黄）
- [ ] 契約新規登録フォームのバリデーションが動作する
- [ ] 契約詳細の全タブが表示される
- [ ] 特約の追加・編集・削除ができる
- [ ] 保険料内訳タブで合計が自動計算される
- [ ] 更改履歴の追加・表示ができる
- [ ] 関連意向把握書タブに意向把握記録が表示される
- [ ] 顧客詳細の契約タブから契約詳細へ遷移できる
