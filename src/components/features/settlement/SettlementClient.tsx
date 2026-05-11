'use client'

import { useState, useTransition } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Check, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { StatusBadge, type StatusVariant } from '@/components/ui/StatusBadge'
import { EmptyState } from '@/components/ui/EmptyState'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SETTLEMENT_STATUSES } from '@/lib/constants/settlement'
import { confirmPayment } from '@/app/(dashboard)/settlement/actions'
import { MdrtProgressBar, type MdrtTargets } from './MdrtProgressBar'
import { MonthlyFeeChart, type MonthlyDatum } from './MonthlyFeeChart'
import { ImportCsvModal } from './ImportCsvModal'

export interface SettlementRow {
  id: string
  customer_name: string
  insurance_company: string
  invoice_amount: number
  payment_amount: number
  fee_amount: number
  fee_rate: number | null
  status: string
  contract_id: string | null
  note: string | null
}

export interface MdrtPerformanceRow {
  id: string
  user_id: string
  performance_value: number
  user_profiles: { id: string; name: string } | null
}

export function SettlementClient({
  settlements,
  total,
  mdrtPerformances,
  mdrtTargets,
  monthlyData,
  targetMonth,
  insuranceCompanies,
}: {
  settlements: SettlementRow[]
  total: number
  mdrtPerformances: MdrtPerformanceRow[]
  mdrtTargets: MdrtTargets
  monthlyData: MonthlyDatum[]
  targetMonth: string
  insuranceCompanies: string[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()
  const [importOpen, setImportOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  const updateParams = (mut: (p: URLSearchParams) => void) => {
    const params = new URLSearchParams(sp.toString())
    mut(params)
    router.push(`${pathname}?${params.toString()}`)
  }

  const handleConfirm = (id: string) => {
    startTransition(async () => {
      const result = await confirmPayment(id)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success('入金を確認しました')
    })
  }

  return (
    <div className="space-y-6">
      {/* 月次グラフ */}
      <div className="rounded-md border border-border bg-bg p-4">
        <MonthlyFeeChart data={monthlyData} />
      </div>

      {/* MDRT 進捗 */}
      <div className="rounded-md border border-border bg-bg p-4 space-y-3">
        <h3 className="text-sm font-semibold text-text-sub">MDRT 進捗 (今年度)</h3>
        {mdrtPerformances.length === 0 ? (
          <EmptyState
            title="MDRT 実績データがありません"
            description="`mdrt_performances` にデータが投入されると、ここに進捗バーが表示されます。"
          />
        ) : (
          <div className="space-y-3">
            {mdrtPerformances.map((p) => (
              <MdrtProgressBar
                key={p.id}
                userName={p.user_profiles?.name ?? '不明'}
                performanceValue={p.performance_value}
                targets={mdrtTargets}
              />
            ))}
          </div>
        )}
      </div>

      {/* 精算一覧 */}
      <div className="space-y-3">
        <div className="flex flex-col gap-3 rounded-md border border-border bg-bg p-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:flex-1">
            <div>
              <Label className="mb-1 block text-xs font-medium text-text-sub">対象月</Label>
              <Input
                type="month"
                value={targetMonth}
                onChange={(e) => {
                  const v = e.target.value
                  updateParams((p) => {
                    if (v) p.set('month', v)
                    else p.delete('month')
                  })
                }}
              />
            </div>
            <div>
              <Label className="mb-1 block text-xs font-medium text-text-sub">ステータス</Label>
              <Select
                value={sp.get('status') ?? '__all__'}
                onValueChange={(v) =>
                  updateParams((p) => {
                    if (!v || v === '__all__') p.delete('status')
                    else p.set('status', v)
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="全て" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">全て</SelectItem>
                  {SETTLEMENT_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1 block text-xs font-medium text-text-sub">保険会社</Label>
              <Select
                value={sp.get('company') ?? '__all__'}
                onValueChange={(v) =>
                  updateParams((p) => {
                    if (!v || v === '__all__') p.delete('company')
                    else p.set('company', v)
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="全て" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">全て</SelectItem>
                  {insuranceCompanies.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={() => setImportOpen(true)}>
            <Upload className="mr-1 size-4" />
            CSV インポート
          </Button>
        </div>

        {settlements.length === 0 ? (
          <EmptyState
            title="該当する精算データがありません"
            description="CSV インポートで取り込むか、対象月を変更してください。"
          />
        ) : (
          <div className="overflow-hidden rounded-md border border-border bg-bg">
            <table>
              <thead>
                <tr>
                  <th>顧客名</th>
                  <th>保険会社</th>
                  <th className="text-right">請求額</th>
                  <th className="text-right">入金額</th>
                  <th className="text-right">手数料</th>
                  <th className="text-right">手数料率</th>
                  <th>状態</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {settlements.map((s) => (
                  <tr key={s.id}>
                    <td className="font-medium text-text">{s.customer_name}</td>
                    <td className="text-text-sub">{s.insurance_company}</td>
                    <td className="text-right text-text-sub">{s.invoice_amount.toLocaleString()}</td>
                    <td className="text-right text-text-sub">{s.payment_amount.toLocaleString()}</td>
                    <td className="text-right text-text-sub">{s.fee_amount.toLocaleString()}</td>
                    <td className="text-right text-text-muted">
                      {s.fee_rate != null ? `${s.fee_rate}%` : '—'}
                    </td>
                    <td>
                      <StatusBadge variant={settlementStatusVariant(s.status)}>
                        {s.status}
                      </StatusBadge>
                    </td>
                    <td>
                      {s.status !== '完了' && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleConfirm(s.id)}
                          disabled={pending}
                        >
                          <Check className="mr-1 size-4" />
                          入金確認
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-xs text-text-muted">全 {total} 件</p>
      </div>

      <ImportCsvModal
        open={importOpen}
        onOpenChange={setImportOpen}
        defaultMonth={targetMonth}
      />
    </div>
  )
}

function settlementStatusVariant(status: string): StatusVariant {
  switch (status) {
    case '完了':     return 'success'
    case '差異あり': return 'danger'
    case '照合中':   return 'warning'
    case '未精算':   return 'muted'
    default:         return 'default'
  }
}
