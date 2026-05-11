# Phase 10 — ダッシュボード・共通コンポーネント仕上げ

> **実装方式**: 直列（全フェーズ完了後の最終仕上げ）
> **所要目安**: 3〜4時間
> **担当**: 1名

---

## 目標

全フェーズの実装が完了した後、ダッシュボードを実データで動作させ、共通コンポーネントの品質を仕上げる。

---

## ダッシュボード

### データ取得

```typescript
// src/app/(dashboard)/page.tsx
export default async function DashboardPage({ searchParams }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const period = searchParams.period ?? 'this_month'
  const { startDate, endDate } = getPeriodRange(period)

  const [
    { count: totalCustomers },
    { count: activeContracts },
    { data: expiringContracts },
    { data: pendingTasks },
    { data: monthlyData },
    { data: userPerformance },
    { data: pendingIntentions },
  ] = await Promise.all([
    // 総顧客数
    supabase.from('customers')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null),

    // 有効契約数
    supabase.from('contracts')
      .select('*', { count: 'exact', head: true })
      .eq('status', '有効')
      .is('deleted_at', null),

    // 満期アラート（60日以内）
    supabase.from('contracts')
      .select('*, customers!customer_id(name)')
      .eq('status', '有効')
      .lte('expiry_date', getDateAfterDays(60))
      .gte('expiry_date', new Date().toISOString().split('T')[0])
      .is('deleted_at', null)
      .order('expiry_date', { ascending: true })
      .limit(10),

    // 優先タスク（期日が近い未完了タスク）
    supabase.from('tasks')
      .select('*, customers!related_customer_id(name)')
      .neq('status', '完了')
      .is('deleted_at', null)
      .order('due_date', { ascending: true, nullsFirst: false })
      .limit(5),

    // 月次推移データ（グラフ用）
    supabase.rpc('get_monthly_contracts_summary', { months: 12 }),

    // 担当者別実績
    supabase.rpc('get_performance_by_user', {
      start_date: startDate,
      end_date: endDate,
    }),

    // 承認待ち意向把握
    supabase.from('intention_records')
      .select('*', { count: 'exact', head: true })
      .eq('status', '承認待'),
  ])

  return (
    <DashboardClient
      totalCustomers={totalCustomers ?? 0}
      activeContracts={activeContracts ?? 0}
      expiringContracts={expiringContracts ?? []}
      pendingTasks={pendingTasks ?? []}
      monthlyData={monthlyData ?? []}
      userPerformance={userPerformance ?? []}
      pendingIntentions={pendingIntentions ?? 0}
      period={period}
    />
  )
}
```

---

### KPI カード構成

```
KPI カード（4枚）:
1. 総顧客数（前月比）
2. 有効契約数（前月比）
3. 今月新規契約件数（目標達成率）
4. 承認待ち意向把握件数（クリックで意向把握一覧へ）

満期アラートテーブル:
- 60日以内の満期契約を残日数昇順で表示
- 残日数カラーリング（30日以内: 赤 / 90日以内: 黄）
- 顧客名・証券番号・保険会社・満期日・残日数・担当者・更改状況

優先タスクリスト:
- 未完了タスクを期日昇順で5件表示
- 期日超過は赤字
- 完了ボタン（クリックでステータス変更）
```

---

### 期間フィルター

```typescript
// 今月 / 今四半期 / 今年度 の切り替え
// searchParams で管理（URL パラメータ）
// 月次グラフ・担当者別実績グラフに反映

export function getPeriodRange(period: string): { startDate: string; endDate: string } {
  const now = new Date()

  switch (period) {
    case 'this_month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      return {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
      }
    }
    case 'this_quarter': {
      const quarter = Math.floor(now.getMonth() / 3)
      const start = new Date(now.getFullYear(), quarter * 3, 1)
      const end = new Date(now.getFullYear(), quarter * 3 + 3, 0)
      return {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
      }
    }
    case 'this_year': {
      // 保険業界の年度は4月始まり
      const fiscalYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1
      return {
        startDate: `${fiscalYear}-04-01`,
        endDate: `${fiscalYear + 1}-03-31`,
      }
    }
    default:
      return getPeriodRange('this_month')
  }
}
```

---

## 共通コンポーネント仕上げ

### 確認すべき共通コンポーネント

```
src/components/
├── ui/                          # shadcn/ui ベース（変更不要）
├── features/
│   ├── customers/
│   │   ├── CustomerCombobox.tsx  # 顧客検索・選択（全フォームで共有）
│   │   └── CustomerBadge.tsx     # 高齢者フラグ・VIPバッジ
│   ├── contracts/
│   │   ├── ExpiryBadge.tsx       # 残日数バッジ
│   │   └── RenewalStatusBadge.tsx # 更改状況バッジ
│   ├── intentions/
│   │   └── IntentionStatusBadge.tsx # 意向把握ステータスバッジ
│   └── lark/
│       └── LarkSyncBadge.tsx     # Lark 連携状態バッジ
└── layout/
    ├── Sidebar.tsx               # サイドバー（SVGロゴ・ホバーメニュー）
    ├── Header.tsx                # ヘッダー
    └── DashboardLayout.tsx       # 共通レイアウト
```

---

### CustomerCombobox（全フォームで共有）

```typescript
// src/components/features/customers/CustomerCombobox.tsx
// 顧客名・フリガナで検索できる Combobox
// 全フォーム（契約・案件・タスク・意向把握・カレンダー）で共有

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export function CustomerCombobox({
  value,
  onChange,
  placeholder = '顧客を検索...',
}: {
  value: string | null
  onChange: (customerId: string | null, customerName: string | null) => void
  placeholder?: string
}) {
  const [query, setQuery] = useState('')
  const [customers, setCustomers] = useState<{ id: string; name: string; name_kana: string }[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (query.length < 1) {
      setCustomers([])
      return
    }

    const timer = setTimeout(async () => {
      setLoading(true)
      const supabase = createClient()
      const { data } = await supabase
        .from('customers')
        .select('id, name, name_kana')
        .or(`name.ilike.%${query}%,name_kana.ilike.%${query}%`)
        .is('deleted_at', null)
        .limit(10)
      setCustomers(data ?? [])
      setLoading(false)
    }, 300)  // 300ms デバウンス

    return () => clearTimeout(timer)
  }, [query])

  // ... Combobox の UI 実装
}
```

---

## Supabase RPC 関数

```sql
-- 月次契約サマリー
CREATE OR REPLACE FUNCTION get_monthly_contracts_summary(months INTEGER)
RETURNS TABLE (
  month TEXT,
  new_contracts BIGINT,
  total_premium NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS month,
    COUNT(*) AS new_contracts,
    COALESCE(SUM(premium), 0) AS total_premium
  FROM contracts
  WHERE
    created_at >= DATE_TRUNC('month', NOW()) - INTERVAL '1 month' * (months - 1)
    AND deleted_at IS NULL
  GROUP BY DATE_TRUNC('month', created_at)
  ORDER BY DATE_TRUNC('month', created_at);
END;
$$ LANGUAGE plpgsql;

-- 担当者別実績
CREATE OR REPLACE FUNCTION get_performance_by_user(
  start_date DATE,
  end_date DATE
)
RETURNS TABLE (
  user_id UUID,
  user_name TEXT,
  new_contracts BIGINT,
  total_premium NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id AS user_id,
    u.name AS user_name,
    COUNT(c.id) AS new_contracts,
    COALESCE(SUM(c.premium), 0) AS total_premium
  FROM user_profiles u
  LEFT JOIN contracts c ON
    c.assigned_to = u.id
    AND c.created_at::DATE BETWEEN start_date AND end_date
    AND c.deleted_at IS NULL
  WHERE u.is_active = TRUE
  GROUP BY u.id, u.name
  ORDER BY total_premium DESC;
END;
$$ LANGUAGE plpgsql;

-- 顧客年代分布
CREATE OR REPLACE FUNCTION get_customer_age_distribution()
RETURNS TABLE (
  age_group TEXT,
  count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    CASE
      WHEN age < 30 THEN '20代以下'
      WHEN age < 40 THEN '30代'
      WHEN age < 50 THEN '40代'
      WHEN age < 60 THEN '50代'
      WHEN age < 70 THEN '60代'
      WHEN age < 80 THEN '70代'
      ELSE '80代以上'
    END AS age_group,
    COUNT(*) AS count
  FROM (
    SELECT
      EXTRACT(YEAR FROM AGE(birth_date)) AS age
    FROM customers
    WHERE birth_date IS NOT NULL AND deleted_at IS NULL
  ) ages
  GROUP BY age_group
  ORDER BY age_group;
END;
$$ LANGUAGE plpgsql;
```

---

## 完了チェックリスト（Phase 10）

- [ ] ダッシュボードの全 KPI カードが実データで表示される
- [ ] 満期アラートテーブルが実データで表示される（残日数カラーリング確認）
- [ ] 優先タスクリストが実データで表示される
- [ ] 月次推移グラフが実データで表示される
- [ ] 担当者別実績グラフが実データで表示される
- [ ] 期間フィルター（今月/今四半期/今年度）が動作する
- [ ] CustomerCombobox が全フォームで正しく動作する
- [ ] 各バッジコンポーネントが正しく表示される
- [ ] Supabase RPC 関数が正しく動作する
- [ ] モバイル表示でサイドバーが正しく動作する（折りたたみ）
