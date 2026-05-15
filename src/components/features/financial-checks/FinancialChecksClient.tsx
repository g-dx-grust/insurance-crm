'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { Pencil, Plus, Save } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import {
  annualIncomeOptions,
  investmentExperienceOptions,
  investmentKnowledgeOptions,
  isSavingsProductCategory,
} from '@/lib/constants/financial-situation'
import type { FinancialSituationFormValues } from '@/lib/validations/financial-situation'
import { upsertFinancialSituationCheck } from '@/app/(dashboard)/financial-checks/actions'
import { formatTokyoDateTime } from '@/lib/utils/datetime'

export interface FinancialCheckRow {
  id: string
  customer_id: string
  contract_id: string | null
  intention_record_id: string | null
  source: string
  annual_income: string
  employer_name: string | null
  investment_experience: string
  investment_knowledge: string
  note: string | null
  recorded_at: string
  customers: { id: string; name: string; name_kana: string } | null
  contracts: {
    id: string
    policy_number: string
    product_name: string
    product_category: string
  } | null
  user_profiles: { name: string } | null
}

export interface FinancialContractOption {
  id: string
  customer_id: string
  policy_number: string
  insurance_company: string
  product_name: string
  product_category: string
}

const EMPTY_VALUES: FinancialSituationFormValues = {
  customer_id: '',
  contract_id: null,
  intention_record_id: null,
  annual_income: '未確認',
  employer_name: null,
  investment_experience: '未確認',
  investment_knowledge: '未確認',
  note: null,
}

export function FinancialChecksClient({
  checks,
  customers,
  contracts,
}: {
  checks: FinancialCheckRow[]
  customers: CustomerOption[]
  contracts: FinancialContractOption[]
}) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<FinancialCheckRow | null>(null)

  const openNew = () => {
    setEditing(null)
    setOpen(true)
  }

  const openEdit = (row: FinancialCheckRow) => {
    setEditing(row)
    setOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openNew}>
          <Plus className="size-4" />
          財務状況を登録
        </Button>
      </div>

      {checks.length === 0 ? (
        <EmptyState
          title="財務状況確認がありません"
          description="積立系商品を提案・契約する際に、年収・勤務先・投資経験・投資知識を記録します。"
        />
      ) : (
        <div className="overflow-hidden rounded-md border border-border bg-bg">
          <table>
            <thead>
              <tr>
                <th>顧客</th>
                <th>関連商品</th>
                <th>年収</th>
                <th>勤務先</th>
                <th>投資経験</th>
                <th>投資知識</th>
                <th>記録</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {checks.map((row) => (
                <tr key={row.id}>
                  <td>
                    {row.customers ? (
                      <Link
                        href={`/customers/${row.customers.id}`}
                        className="font-medium text-text hover:underline"
                      >
                        {row.customers.name}
                      </Link>
                    ) : (
                      <span className="text-text-muted">—</span>
                    )}
                  </td>
                  <td>
                    {row.contracts ? (
                      <div>
                        <Link
                          href={`/contracts/${row.contracts.id}`}
                          className="font-mono text-xs hover:underline"
                        >
                          {row.contracts.policy_number}
                        </Link>
                        <p className="mt-0.5 text-xs text-text-muted">
                          {row.contracts.product_name} / {row.contracts.product_category}
                        </p>
                      </div>
                    ) : row.intention_record_id ? (
                      <Link
                        href={`/intentions/${row.intention_record_id}`}
                        className="text-xs text-[color:var(--color-accent)] hover:underline"
                      >
                        意向把握から登録
                      </Link>
                    ) : (
                      <span className="text-text-muted">—</span>
                    )}
                  </td>
                  <td>{row.annual_income}</td>
                  <td className="text-text-sub">{row.employer_name ?? '—'}</td>
                  <td>{row.investment_experience}</td>
                  <td>{row.investment_knowledge}</td>
                  <td>
                    <p className="text-xs text-text-muted">
                      {formatTokyoDateTime(row.recorded_at)}
                    </p>
                    <p className="mt-0.5 text-xs text-text-muted">
                      {row.user_profiles?.name ?? '—'}
                    </p>
                  </td>
                  <td className="text-right">
                    <button
                      type="button"
                      onClick={() => openEdit(row)}
                      className="rounded-sm p-1 text-text-muted hover:bg-[color:var(--color-bg-secondary)] hover:text-text"
                      aria-label="編集"
                      title="編集"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <FinancialCheckDialog
          key={editing?.id ?? 'new'}
          open={open}
          onOpenChange={setOpen}
          initial={editing}
          customers={customers}
          contracts={contracts}
        />
      )}
    </div>
  )
}

function FinancialCheckDialog({
  open,
  onOpenChange,
  initial,
  customers,
  contracts,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial: FinancialCheckRow | null
  customers: CustomerOption[]
  contracts: FinancialContractOption[]
}) {
  const [pending, startTransition] = useTransition()
  const [values, setValues] = useState<FinancialSituationFormValues>(
    initial
      ? {
          customer_id: initial.customer_id,
          contract_id: initial.contract_id,
          intention_record_id: initial.intention_record_id,
          annual_income: initial.annual_income as FinancialSituationFormValues['annual_income'],
          employer_name: initial.employer_name,
          investment_experience:
            initial.investment_experience as FinancialSituationFormValues['investment_experience'],
          investment_knowledge:
            initial.investment_knowledge as FinancialSituationFormValues['investment_knowledge'],
          note: initial.note,
        }
      : EMPTY_VALUES,
  )

  const contractItems = useMemo(
    () =>
      contracts.map((contract) => ({
        id: contract.id,
        name: `${contract.policy_number} / ${contract.product_name}`,
      })),
    [contracts],
  )

  const selectedContract = contracts.find((contract) => contract.id === values.contract_id)
  const isSavings = selectedContract
    ? isSavingsProductCategory(selectedContract.product_category)
    : false

  const save = () => {
    startTransition(async () => {
      const result = await upsertFinancialSituationCheck(values, initial?.id)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(initial ? '財務状況確認を更新しました' : '財務状況確認を登録しました')
      onOpenChange(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[680px]">
        <DialogHeader>
          <DialogTitle>積立系商品の財務状況確認</DialogTitle>
          <DialogDescription>
            年収・勤務先・投資経験・投資知識を記録します。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="顧客 *">
              <CustomerCombobox
                customers={customers}
                value={values.customer_id || null}
                onChange={(id) => {
                  const nextCustomerId = id ?? ''
                  setValues((prev) => ({
                    ...prev,
                    customer_id: nextCustomerId,
                    contract_id:
                      contracts.find((contract) => contract.id === prev.contract_id)
                        ?.customer_id === nextCustomerId
                        ? prev.contract_id
                        : null,
                  }))
                }}
              />
            </Field>
            <Field label="関連契約">
              <Select
                value={values.contract_id ?? '__none__'}
                onValueChange={(value) => {
                  if (!value || value === '__none__') {
                    setValues((prev) => ({ ...prev, contract_id: null }))
                    return
                  }
                  const contract = contracts.find((item) => item.id === value)
                  setValues((prev) => ({
                    ...prev,
                    contract_id: value,
                    customer_id: contract?.customer_id ?? prev.customer_id,
                  }))
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="未選択" items={contractItems} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">未選択</SelectItem>
                  {contracts.map((contract) => (
                    <SelectItem key={contract.id} value={contract.id}>
                      {contract.policy_number} / {contract.product_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          {selectedContract && !isSavings && (
            <div className="rounded-sm border border-border bg-[color:var(--color-bg-secondary)] p-3 text-xs text-text-sub">
              選択中の契約カテゴリは {selectedContract.product_category} です。システム上は記録できますが、自動表示対象は積立系カテゴリです。
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <OptionField
              label="年収 *"
              value={values.annual_income}
              options={annualIncomeOptions}
              onChange={(annual_income) => setValues({ ...values, annual_income })}
            />
            <Field label="勤務先">
              <Input
                value={values.employer_name ?? ''}
                onChange={(event) =>
                  setValues({ ...values, employer_name: event.target.value || null })
                }
              />
            </Field>
            <OptionField
              label="投資経験 *"
              value={values.investment_experience}
              options={investmentExperienceOptions}
              onChange={(investment_experience) =>
                setValues({ ...values, investment_experience })
              }
            />
            <OptionField
              label="投資知識 *"
              value={values.investment_knowledge}
              options={investmentKnowledgeOptions}
              onChange={(investment_knowledge) =>
                setValues({ ...values, investment_knowledge })
              }
            />
            <Field label="補足" className="sm:col-span-2">
              <Textarea
                rows={3}
                value={values.note ?? ''}
                onChange={(event) =>
                  setValues({ ...values, note: event.target.value || null })
                }
              />
            </Field>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            キャンセル
          </Button>
          <Button onClick={save} disabled={pending || !values.customer_id}>
            <Save className="size-4" />
            {pending ? '保存中…' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function OptionField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: readonly T[]
  onChange: (value: T) => void
}) {
  return (
    <Field label={label}>
      <Select value={value} onValueChange={(next) => onChange(next as T)}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>{option}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  )
}

function Field({
  label,
  children,
  className,
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <Label className="mb-1 block text-xs font-medium text-text-sub">{label}</Label>
      {children}
    </div>
  )
}
