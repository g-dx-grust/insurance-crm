'use client'

import { useMemo, useState, useTransition } from 'react'
import { Plus, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  CustomerCombobox,
  type CustomerOption,
} from '@/components/features/customers/CustomerCombobox'
import { StepIndicator } from './StepIndicator'
import {
  COMPARISON_METHODS,
  INTENTION_CHECKLIST_ITEMS,
  type ComparisonMethod,
} from '@/lib/constants/intention'
import { productCategories } from '@/lib/validations/contract'
import type { IntentionWizardValues } from '@/lib/validations/intention'
import { nowTokyoDateTimeLocal } from '@/lib/utils/datetime'
import { createIntentionRecord } from '@/app/(dashboard)/intentions/actions'

export interface ContractOption {
  id: string
  customer_id: string
  policy_number: string
  insurance_company: string
  product_name: string
}

interface UserOption {
  id: string
  name: string
}

interface ProductDraft {
  client_id: string
  insurance_company: string
  product_name: string
  product_category: (typeof productCategories)[number]
  premium: number
  is_recommended: boolean
  recommendation_reason: string
}

interface WizardState {
  customer_id: string
  contract_id: string | null
  initial_intention: string
  initial_recorded_at: string

  comparison_method: ComparisonMethod | ''
  comparison_reason: string
  products: ProductDraft[]

  final_intention: string
  final_change_note: string
  final_recorded_at: string

  checklist: Record<string, boolean>
  approver_id: string | null
}

function buildInitialChecklist(): Record<string, boolean> {
  return INTENTION_CHECKLIST_ITEMS.reduce<Record<string, boolean>>((acc, item) => {
    acc[item.key] = false
    return acc
  }, {})
}

export function IntentionWizard({
  customers,
  contracts,
  approvers,
  defaultCustomerId,
  defaultContractId,
}: {
  customers: CustomerOption[]
  contracts: ContractOption[]
  approvers: UserOption[]
  defaultCustomerId?: string
  defaultContractId?: string
}) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [pending, startTransition] = useTransition()

  const initialContract = defaultContractId
    ? (contracts.find((c) => c.id === defaultContractId) ?? null)
    : null

  const [state, setState] = useState<WizardState>({
    customer_id: defaultCustomerId ?? initialContract?.customer_id ?? '',
    contract_id: initialContract?.id ?? null,
    initial_intention: '',
    initial_recorded_at: nowTokyoDateTimeLocal(),

    comparison_method: '',
    comparison_reason: '',
    products: [],

    final_intention: '',
    final_change_note: '',
    final_recorded_at: nowTokyoDateTimeLocal(),

    checklist: buildInitialChecklist(),
    approver_id: null,
  })

  // 顧客に紐づく契約のみ
  const filteredContracts = useMemo(
    () => contracts.filter((c) => c.customer_id === state.customer_id),
    [contracts, state.customer_id],
  )

  const update = <K extends keyof WizardState>(key: K, value: WizardState[K]) => {
    setState((prev) => ({ ...prev, [key]: value }))
  }

  const validateStep = (s: 1 | 2 | 3 | 4): string | null => {
    if (s === 1) {
      if (!state.customer_id) return '顧客を選択してください'
      if (!state.initial_intention.trim()) return '当初意向を入力してください'
      if (!state.initial_recorded_at) return '記録日時を入力してください'
    }
    if (s === 2) {
      if (!state.comparison_method) return '比較方式を選択してください'
      if (state.products.length === 0) return '提案商品を1件以上追加してください'
      // 商品の必須項目チェック
      for (const p of state.products) {
        if (!p.insurance_company.trim()) return '提案商品の保険会社を入力してください'
        if (!p.product_name.trim()) return '提案商品の商品名を入力してください'
        if (p.premium < 0) return '提案商品の年間保険料は0以上で入力してください'
      }
      if (state.comparison_method === 'ロ方式') {
        const recs = state.products.filter((p) => p.is_recommended)
        if (recs.length === 0) return 'ロ方式では推奨商品を1件以上指定してください'
        if (recs.some((p) => !p.recommendation_reason.trim()))
          return '推奨商品の推奨理由を入力してください'
      }
      if (state.comparison_method === 'イ方式') {
        if (state.products.length !== 1)
          return 'イ方式では商品を1件のみ提案してください'
        if (!state.products[0].recommendation_reason.trim())
          return 'イ方式では提案理由 (推奨理由) が必須です'
      }
    }
    if (s === 3) {
      if (!state.final_intention.trim()) return '最終意向を入力してください'
      if (!state.final_recorded_at) return '記録日時を入力してください'
    }
    return null
  }

  const handleNext = () => {
    const err = validateStep(step)
    if (err) {
      toast.error(err)
      return
    }
    if (step < 4) setStep(((step + 1) as 1 | 2 | 3 | 4))
  }

  const handleBack = () => {
    if (step > 1) setStep(((step - 1) as 1 | 2 | 3 | 4))
  }

  const handleSave = () => {
    // 全 4 ステップを再検証
    for (const s of [1, 2, 3] as const) {
      const err = validateStep(s)
      if (err) {
        toast.error(`Step ${s}: ${err}`)
        setStep(s)
        return
      }
    }
    // 必須チェック項目 (条件に該当するもの) が全部 true か
    const required = INTENTION_CHECKLIST_ITEMS.filter((item) => {
      if ('requiresComparisonMode' in item && item.requiresComparisonMode) {
        return state.comparison_method === item.requiresComparisonMode
      }
      // requiresElderly のもの: ここでは顧客の年齢情報を持っていないので任意扱い (UI に注記)
      if ('requiresElderly' in item) return false
      return true
    })
    const missing = required.filter((item) => !state.checklist[item.key])
    if (missing.length > 0) {
      toast.error(`未チェック項目があります: ${missing[0].label}`)
      return
    }

    const values: IntentionWizardValues = {
      customer_id: state.customer_id,
      contract_id: state.contract_id ?? null,
      initial_intention: state.initial_intention,
      initial_recorded_at: state.initial_recorded_at,
      comparison_method: state.comparison_method as ComparisonMethod,
      comparison_reason: state.comparison_reason || null,
      products: state.products.map(({ client_id, ...rest }) => {
        void client_id
        return {
          ...rest,
          recommendation_reason: rest.recommendation_reason || null,
        }
      }),
      final_intention: state.final_intention,
      final_change_note: state.final_change_note || null,
      final_recorded_at: state.final_recorded_at,
      checklist: state.checklist,
      approver_id: state.approver_id,
    }

    startTransition(async () => {
      const result = await createIntentionRecord(values)
      if (result && !result.ok) {
        toast.error(result.error)
      }
      // ok の場合は redirect で例外 throw により UI 遷移
    })
  }

  return (
    <div className="space-y-6">
      <StepIndicator currentStep={step} />

      <div className="rounded-md border border-border bg-bg p-6">
        {step === 1 && (
          <Step1
            state={state}
            update={update}
            customers={customers}
            contracts={filteredContracts}
          />
        )}
        {step === 2 && <Step2 state={state} update={update} setState={setState} />}
        {step === 3 && <Step3 state={state} update={update} />}
        {step === 4 && (
          <Step4 state={state} update={update} approvers={approvers} />
        )}
      </div>

      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={handleBack}
          disabled={step === 1 || pending}
        >
          <ChevronLeft className="mr-1 size-4" />
          前へ
        </Button>
        {step < 4 ? (
          <Button type="button" onClick={handleNext} disabled={pending}>
            次へ
            <ChevronRight className="ml-1 size-4" />
          </Button>
        ) : (
          <Button type="button" onClick={handleSave} disabled={pending}>
            {pending ? '保存中…' : '意向把握を完了する'}
          </Button>
        )}
      </div>
    </div>
  )
}

// ─── Step 1 ────────────────────────────────────────────────────────

function Step1({
  state,
  update,
  customers,
  contracts,
}: {
  state: WizardState
  update: <K extends keyof WizardState>(k: K, v: WizardState[K]) => void
  customers: CustomerOption[]
  contracts: ContractOption[]
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-text-sub">Step 1: 当初意向の確認</h2>

      <div>
        <Label className="mb-1 block text-xs font-medium text-text-sub">顧客 *</Label>
        <CustomerCombobox
          customers={customers}
          value={state.customer_id || null}
          onChange={(id) => {
            update('customer_id', id ?? '')
            // 顧客が変わったら契約はクリア
            if (id !== state.customer_id) update('contract_id', null)
          }}
        />
      </div>

      <div>
        <Label className="mb-1 block text-xs font-medium text-text-sub">関連契約 (任意)</Label>
        <Select
          value={state.contract_id ?? '__none__'}
          onValueChange={(v) =>
            update('contract_id', !v || v === '__none__' ? null : v)
          }
        >
          <SelectTrigger>
            <SelectValue
              placeholder="契約に紐付けない"
              items={contracts.map((c) => ({
                id: c.id,
                name: `${c.policy_number} (${c.insurance_company} / ${c.product_name})`,
              }))}
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">契約に紐付けない</SelectItem>
            {contracts.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.policy_number} ({c.insurance_company} / {c.product_name})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {state.customer_id && contracts.length === 0 && (
          <p className="mt-1 text-xs text-text-muted">この顧客には契約がありません</p>
        )}
      </div>

      <div>
        <Label className="mb-1 block text-xs font-medium text-text-sub">当初意向 *</Label>
        <Textarea
          rows={4}
          value={state.initial_intention}
          onChange={(e) => update('initial_intention', e.target.value)}
          placeholder="例: 子供の進学に備えた学資保険を検討したい"
        />
      </div>

      <div>
        <Label className="mb-1 block text-xs font-medium text-text-sub">記録日時 *</Label>
        <Input
          type="datetime-local"
          value={state.initial_recorded_at}
          onChange={(e) => update('initial_recorded_at', e.target.value)}
        />
      </div>
    </div>
  )
}

// ─── Step 2 ────────────────────────────────────────────────────────

function Step2({
  state,
  update,
  setState,
}: {
  state: WizardState
  update: <K extends keyof WizardState>(k: K, v: WizardState[K]) => void
  setState: React.Dispatch<React.SetStateAction<WizardState>>
}) {
  const addProduct = () => {
    setState((prev) => ({
      ...prev,
      products: [
        ...prev.products,
        {
          client_id: crypto.randomUUID(),
          insurance_company: '',
          product_name: '',
          product_category: '生命保険',
          premium: 0,
          is_recommended: false,
          recommendation_reason: '',
        },
      ],
    }))
  }

  const removeProduct = (clientId: string) => {
    setState((prev) => ({
      ...prev,
      products: prev.products.filter((p) => p.client_id !== clientId),
    }))
  }

  const patchProduct = (clientId: string, patch: Partial<ProductDraft>) => {
    setState((prev) => ({
      ...prev,
      products: prev.products.map((p) =>
        p.client_id === clientId ? { ...p, ...patch } : p,
      ),
    }))
  }

  const isLo = state.comparison_method === 'ロ方式'
  const isI = state.comparison_method === 'イ方式'

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-text-sub">Step 2: 提案・比較推奨</h2>

      <div>
        <Label className="mb-2 block text-xs font-medium text-text-sub">比較方式 *</Label>
        <RadioGroup
          value={state.comparison_method}
          onValueChange={(v) => {
            if (!v) return
            update('comparison_method', v as ComparisonMethod)
            // イ方式に変更した場合、商品を 1 件に絞る (先頭を残す)
            if (v === 'イ方式' && state.products.length > 1) {
              setState((prev) => ({ ...prev, products: prev.products.slice(0, 1) }))
            }
          }}
          className="flex gap-4"
        >
          {COMPARISON_METHODS.map((m) => (
            <div key={m} className="flex items-center gap-2">
              <RadioGroupItem id={`cm-${m}`} value={m} />
              <Label htmlFor={`cm-${m}`} className="text-sm">
                {m}
              </Label>
            </div>
          ))}
        </RadioGroup>
        <p className="mt-1 text-xs text-text-muted">
          ロ方式: 複数商品を比較して推奨商品を選定 ／ イ方式: 1商品のみ提案 (理由必須)
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium text-text-sub">提案商品 *</Label>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={addProduct}
            disabled={isI && state.products.length >= 1}
          >
            <Plus className="mr-1 size-4" />
            商品を追加
          </Button>
        </div>
        {state.products.length === 0 ? (
          <p className="rounded-sm border border-dashed border-border bg-[color:var(--color-bg-secondary)] p-4 text-center text-xs text-text-muted">
            商品を追加してください
          </p>
        ) : (
          <ul className="space-y-3">
            {state.products.map((p, idx) => (
              <li
                key={p.client_id}
                className="space-y-3 rounded-md border border-border bg-bg p-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-text-sub">
                    商品 {idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeProduct(p.client_id)}
                    className="rounded-sm p-1 text-text-muted hover:bg-[color:var(--color-error)]/10 hover:text-[color:var(--color-error)]"
                    aria-label="削除"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="保険会社 *">
                    <Input
                      value={p.insurance_company}
                      onChange={(e) =>
                        patchProduct(p.client_id, { insurance_company: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="商品名 *">
                    <Input
                      value={p.product_name}
                      onChange={(e) =>
                        patchProduct(p.client_id, { product_name: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="カテゴリ *">
                    <Select
                      value={p.product_category}
                      onValueChange={(v) =>
                        v &&
                        patchProduct(p.client_id, {
                          product_category: v as (typeof productCategories)[number],
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {productCategories.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="年間保険料 (円)">
                    <Input
                      type="number"
                      inputMode="numeric"
                      value={p.premium}
                      onChange={(e) =>
                        patchProduct(p.client_id, { premium: Number(e.target.value) || 0 })
                      }
                    />
                  </Field>
                </div>

                {isLo && (
                  <label className="flex items-center gap-2 rounded-sm border border-border bg-[color:var(--color-bg-secondary)] px-3 py-2 text-sm">
                    <Checkbox
                      checked={p.is_recommended}
                      onCheckedChange={(v) =>
                        patchProduct(p.client_id, { is_recommended: Boolean(v) })
                      }
                    />
                    推奨商品として選定
                  </label>
                )}

                {(isI || (isLo && p.is_recommended)) && (
                  <Field label={isI ? '提案理由 *' : '推奨理由 *'}>
                    <Textarea
                      rows={2}
                      value={p.recommendation_reason}
                      onChange={(e) =>
                        patchProduct(p.client_id, { recommendation_reason: e.target.value })
                      }
                      placeholder={isI ? 'なぜこの商品を提案したか' : 'なぜこの商品を推奨するか'}
                    />
                  </Field>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {isLo && (
        <Field label="比較推奨理由 (全体)">
          <Textarea
            rows={3}
            value={state.comparison_reason}
            onChange={(e) => update('comparison_reason', e.target.value)}
            placeholder="比較した結果と推奨商品を選んだ全体的な理由"
          />
        </Field>
      )}
    </div>
  )
}

// ─── Step 3 ────────────────────────────────────────────────────────

function Step3({
  state,
  update,
}: {
  state: WizardState
  update: <K extends keyof WizardState>(k: K, v: WizardState[K]) => void
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-text-sub">Step 3: 最終意向の確認</h2>

      <Field label="最終意向 *">
        <Textarea
          rows={4}
          value={state.final_intention}
          onChange={(e) => update('final_intention', e.target.value)}
          placeholder="例: 提案を踏まえて X 社の Y 商品で進めたい"
        />
      </Field>

      <Field label="当初意向との変化点 (任意)">
        <Textarea
          rows={3}
          value={state.final_change_note}
          onChange={(e) => update('final_change_note', e.target.value)}
          placeholder="意向が変化した場合、その理由・経緯"
        />
      </Field>

      <Field label="記録日時 *">
        <Input
          type="datetime-local"
          value={state.final_recorded_at}
          onChange={(e) => update('final_recorded_at', e.target.value)}
        />
      </Field>
    </div>
  )
}

// ─── Step 4 ────────────────────────────────────────────────────────

function Step4({
  state,
  update,
  approvers,
}: {
  state: WizardState
  update: <K extends keyof WizardState>(k: K, v: WizardState[K]) => void
  approvers: UserOption[]
}) {
  const visibleItems = INTENTION_CHECKLIST_ITEMS.filter((item) => {
    if ('requiresComparisonMode' in item && item.requiresComparisonMode) {
      return state.comparison_method === item.requiresComparisonMode
    }
    return true
  })

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-text-sub">Step 4: 確認事項チェック</h2>

      <ul className="space-y-1.5">
        {visibleItems.map((item) => (
          <li key={item.key}>
            <label className="flex cursor-pointer items-start gap-2 rounded-sm px-2 py-1.5 hover:bg-[color:var(--color-bg-secondary)]">
              <Checkbox
                checked={state.checklist[item.key] ?? false}
                onCheckedChange={(v) =>
                  update('checklist', { ...state.checklist, [item.key]: Boolean(v) })
                }
                className="mt-0.5"
              />
              <span className="text-sm text-text">{item.label}</span>
            </label>
          </li>
        ))}
      </ul>

      <div className="rounded-md border border-border bg-[color:var(--color-bg-secondary)] p-4">
        <Label className="mb-2 block text-xs font-medium text-text-sub">
          承認依頼先 (任意)
        </Label>
        <Select
          value={state.approver_id ?? '__none__'}
          onValueChange={(v) =>
            update('approver_id', !v || v === '__none__' ? null : v)
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="承認者を選択" items={approvers} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">承認なしで完了 (status「実施済」)</SelectItem>
            {approvers.map((u) => (
              <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="mt-2 text-xs text-text-muted">
          承認者を選択すると status は「承認待」になり、Lark Approval (準備中) のキューに登録されます。
        </p>
      </div>
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <Label className="mb-1 block text-xs font-medium text-text-sub">{label}</Label>
      {children}
    </div>
  )
}
