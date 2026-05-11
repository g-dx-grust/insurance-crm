# Phase 6 — 意向把握（保険業法対応）

> **実装方式**: 直列（Phase 3・4 完了後に実装。顧客・契約データが必要）
> **所要目安**: 4〜5時間
> **担当**: 1名

---

## 目標

保険業法に基づく意向把握の4ステップウィザード・比較推奨記録・承認フロー（Lark Approval 連携 UI）を実装する。

> **重要**: 意向把握記録は保険業法上の重要書類のため、**物理削除禁止**。`deleted_at` による論理削除も行わない。
> Phase 1 §19-3 で `intention_records` の DELETE を RLS ポリシー (`USING (false)`) で拒否済み。Service Role を使う Server Action でも DELETE は実装しないこと。

---

## 画面一覧

| パス | 画面名 | 主な機能 |
|-----|-------|---------|
| `/intentions` | 意向把握一覧 | 検索・ステータスフィルター・承認待ち件数バッジ |
| `/intentions/new` | 意向把握新規作成 | 4ステップウィザード |
| `/intentions/[id]` | 意向把握詳細 | 記録内容の閲覧・PDF 出力・承認フロー |

---

## 4ステップウィザード設計

```
Step 1: 当初意向の確認
  ├── 顧客選択（Combobox）
  ├── 関連契約選択（任意）
  ├── 当初意向テキスト（textarea、必須）
  └── 記録日時（自動設定、変更可）

Step 2: 提案・比較推奨
  ├── 比較方式選択（ロ方式 / イ方式）
  │   ├── ロ方式: 複数商品を比較して推奨商品を選定
  │   └── イ方式: 1商品のみ提案（理由必須）
  ├── 提案商品リスト（追加・削除可能）
  │   ├── 保険会社
  │   ├── 商品名
  │   ├── 商品カテゴリ
  │   ├── 年間保険料
  │   ├── 推奨商品フラグ（ロ方式の場合）
  │   └── 推奨理由（推奨商品のみ必須）
  └── 比較推奨理由（全体）

Step 3: 最終意向の確認
  ├── 最終意向テキスト（textarea、必須）
  ├── 当初意向との変化点（任意）
  └── 記録日時（自動設定、変更可）

Step 4: 確認事項チェック
  ├── チェックリスト（9項目）
  │   ├── 顧客の意向を正確に把握した
  │   ├── 商品内容を十分に説明した
  │   ├── 比較推奨の説明を行った（ロ方式の場合）
  │   ├── 保険料・保障内容を確認した
  │   ├── 高齢者対応を実施した（対象者のみ）
  │   ├── 顧客の署名・同意を得た
  │   ├── 意向把握書を顧客に交付した
  │   ├── 控えを保管した
  │   └── 次回フォロー日程を設定した
  ├── 承認依頼先選択（管理者ユーザー一覧）
  └── Lark Approval 送信ボタン（将来連携用）
```

---

## ウィザード状態管理

```typescript
// src/components/features/intentions/IntentionWizard.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

type WizardStep = 1 | 2 | 3 | 4

interface WizardState {
  // Step 1
  customer_id: string
  contract_id: string | null
  initial_intention: string
  initial_recorded_at: string

  // Step 2
  comparison_method: 'ロ方式' | 'イ方式' | null
  comparison_reason: string
  products: IntentionProduct[]

  // Step 3
  final_intention: string
  final_recorded_at: string

  // Step 4
  checklist: Record<string, boolean>
  approver_id: string | null
}

interface IntentionProduct {
  id: string  // クライアント側の一時ID
  insurance_company: string
  product_name: string
  product_category: string
  premium: number
  is_recommended: boolean
  recommendation_reason: string
}

export function IntentionWizard() {
  const [step, setStep] = useState<WizardStep>(1)
  const [state, setState] = useState<WizardState>(initialState)
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  const handleNext = () => {
    // 各ステップのバリデーション
    if (step === 1 && !state.customer_id) {
      toast.error('顧客を選択してください')
      return
    }
    if (step === 1 && !state.initial_intention) {
      toast.error('当初意向を入力してください')
      return
    }
    if (step === 2 && !state.comparison_method) {
      toast.error('比較方式を選択してください')
      return
    }
    if (step === 2 && state.products.length === 0) {
      toast.error('提案商品を1件以上追加してください')
      return
    }
    if (step === 3 && !state.final_intention) {
      toast.error('最終意向を入力してください')
      return
    }

    if (step < 4) setStep((prev) => (prev + 1) as WizardStep)
  }

  const handleBack = () => {
    if (step > 1) setStep((prev) => (prev - 1) as WizardStep)
  }

  const handleSave = async () => {
    // 全チェックリストが完了しているか確認
    const allChecked = Object.values(state.checklist).every(Boolean)
    if (!allChecked) {
      toast.error('全ての確認事項にチェックを入れてください')
      return
    }

    setSaving(true)
    // Server Action を呼び出して保存
    // await createIntentionRecord(state)
    setSaving(false)
  }

  return (
    <div>
      {/* ステップインジケーター */}
      <StepIndicator currentStep={step} totalSteps={4} />

      {/* 各ステップのコンテンツ */}
      {step === 1 && <Step1 state={state} onChange={setState} />}
      {step === 2 && <Step2 state={state} onChange={setState} />}
      {step === 3 && <Step3 state={state} onChange={setState} />}
      {step === 4 && <Step4 state={state} onChange={setState} />}

      {/* ナビゲーションボタン */}
      <div className="flex justify-between mt-6">
        <button onClick={handleBack} disabled={step === 1}>
          前へ
        </button>
        {step < 4 ? (
          <button onClick={handleNext}>次へ</button>
        ) : (
          <button onClick={handleSave} disabled={saving}>
            {saving ? '保存中...' : '意向把握を完了する'}
          </button>
        )}
      </div>
    </div>
  )
}
```

---

## Server Action

```typescript
// src/app/(dashboard)/intentions/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createIntentionRecord(data: WizardState) {
  const supabase = await createClient()
  const tenantId = await getCurrentTenantId() // 未認証なら redirect

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 意向把握レコードを作成
  const { data: record, error } = await supabase
    .from('intention_records')
    .insert({
      tenant_id: tenantId,
      customer_id: data.customer_id,
      contract_id: data.contract_id,
      initial_intention: data.initial_intention,
      initial_recorded_at: data.initial_recorded_at,
      comparison_method: data.comparison_method,
      comparison_reason: data.comparison_reason,
      final_intention: data.final_intention,
      final_recorded_at: data.final_recorded_at,
      checklist: data.checklist,
      approver_id: data.approver_id,
      status: data.approver_id ? '承認待' : '実施済',
      created_by: user.id,
    })
    .select()
    .single()

  if (error || !record) {
    return { error: '保存に失敗しました' }
  }

  // 提案商品を一括挿入
  if (data.products.length > 0) {
    await supabase.from('intention_products').insert(
      data.products.map((p, index) => ({
        intention_record_id: record.id,
        tenant_id: tenantId,
        insurance_company: p.insurance_company,
        product_name: p.product_name,
        product_category: p.product_category,
        premium: p.premium,
        is_recommended: p.is_recommended,
        recommendation_reason: p.recommendation_reason,
        sort_order: index,
      }))
    )
  }

  revalidatePath('/intentions')
  redirect(`/intentions/${record.id}`)
}
```

---

## 承認フロー UI

```typescript
// 意向把握詳細ページの承認フローセクション
// src/components/features/intentions/ApprovalSection.tsx

// 状態に応じた表示:
// 未実施: 「意向把握を開始する」ボタン
// 実施済: 「承認依頼を送信する」ボタン + 承認者選択
// 承認待: 「承認待ち」バッジ + Lark Approval ID 表示
// 承認済: 「承認済み」バッジ + 承認者名 + 承認日時
// 差戻: 「差戻」バッジ + 差戻理由 + 「再提出する」ボタン

// Lark Approval 送信ボタン（Phase 8 で実 API に差し替え）
const handleSendApproval = async () => {
  // Server Action で notification_logs に積み（channel='lark_approval'）、status='承認待' に更新
  // Lark Rules §4.2 に従い、送信本体はキューワーカーが非同期処理 + 指数バックオフで担う
  await enqueueIntentionApproval(intentionId, approverId)
  toast.success('承認依頼を受け付けました', {
    description: 'Lark に承認依頼が送信されます。送信状況は通知ログでご確認ください。',
  })
}
```

---

## 意向把握一覧のフィルター

```
フィルター項目:
- ステータス: 全て / 未実施 / 実施済 / 承認待 / 承認済 / 差戻
- 顧客名検索
- 担当者フィルター
- 期間フィルター（作成日）

ヘッダーに「承認待ち: X件」バッジを表示
```

---

## 完了チェックリスト

- [ ] 意向把握一覧が表示される（ステータスフィルター動作確認）
- [ ] 4ステップウィザードが動作する（各ステップのバリデーション確認）
- [ ] 提案商品の追加・削除ができる
- [ ] ロ方式/イ方式の切り替えで UI が変わる
- [ ] 確認事項チェックリストが全チェックで保存できる
- [ ] 意向把握詳細ページが表示される
- [ ] 承認依頼ボタンでトーストが表示される
- [ ] 承認済み状態の表示が正しく動作する
- [ ] 意向把握記録が物理削除されない（削除ボタンが存在しない）
