'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SearchInput } from '@/components/ui/SearchInput'
import { StatusBadge, type StatusVariant } from '@/components/ui/StatusBadge'
import { EmptyState } from '@/components/ui/EmptyState'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  contractStatuses,
  productCategories,
} from '@/lib/validations/contract'
import {
  formatRemainingDays,
  getExpiryBadgeVariant,
} from '@/lib/utils/contract'

const EXPIRY_OPTIONS = [
  { value: '__all__', label: '満期: 全て' },
  { value: '1', label: '1ヶ月以内' },
  { value: '3', label: '3ヶ月以内' },
  { value: '6', label: '6ヶ月以内' },
] as const

export interface ContractListItem {
  id: string
  policy_number: string
  insurance_company: string
  product_name: string
  product_category: string
  premium: number
  status: string
  expiry_date: string | null
  customers: { id: string; name: string; name_kana: string } | null
  user_profiles: { name: string } | null
}

export function ContractListClient({
  contracts,
  total,
  page,
  pageSize,
}: {
  contracts: ContractListItem[]
  total: number
  page: number
  pageSize: number
}) {
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const updateParams = (mut: (p: URLSearchParams) => void) => {
    const params = new URLSearchParams(sp.toString())
    mut(params)
    params.delete('page')
    router.push(`${pathname}?${params.toString()}`)
  }
  const setPage = (next: number) => {
    const params = new URLSearchParams(sp.toString())
    params.set('page', String(next))
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-md border border-border bg-bg p-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4 sm:flex-1">
          <SearchInput
            defaultValue={sp.get('q') ?? ''}
            placeholder="証券番号・会社・商品名で検索"
            onChange={(v) =>
              updateParams((p) => {
                if (v) p.set('q', v)
                else p.delete('q')
              })
            }
          />
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
              <SelectValue placeholder="状態: 全て" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">状態: 全て</SelectItem>
              {contractStatuses.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={sp.get('category') ?? '__all__'}
            onValueChange={(v) =>
              updateParams((p) => {
                if (!v || v === '__all__') p.delete('category')
                else p.set('category', v)
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="カテゴリ: 全て" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">カテゴリ: 全て</SelectItem>
              {productCategories.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={sp.get('expiry_within') ?? '__all__'}
            onValueChange={(v) =>
              updateParams((p) => {
                if (!v || v === '__all__') p.delete('expiry_within')
                else p.set('expiry_within', v)
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="満期: 全て" />
            </SelectTrigger>
            <SelectContent>
              {EXPIRY_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button render={<Link href="/contracts/new" />}>
          <Plus className="mr-1 size-4" />
          新規登録
        </Button>
      </div>

      {contracts.length === 0 ? (
        <EmptyState
          title="該当する契約がありません"
          description="検索条件を変更するか、新規登録してください。"
        />
      ) : (
        <div className="overflow-hidden rounded-md border border-border bg-bg">
          <table>
            <thead>
              <tr>
                <th>顧客</th>
                <th>証券番号</th>
                <th>保険会社</th>
                <th>商品 / カテゴリ</th>
                <th>年間保険料</th>
                <th>満期日</th>
                <th>残日数</th>
                <th>状態</th>
                <th>担当</th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((c) => (
                <tr
                  key={c.id}
                  className="cursor-pointer transition-colors hover:bg-[color:var(--color-bg-secondary)]"
                  onClick={() => router.push(`/contracts/${c.id}`)}
                >
                  <td className="font-medium text-text">{c.customers?.name ?? '—'}</td>
                  <td className="font-mono text-xs">{c.policy_number}</td>
                  <td className="text-text-sub">{c.insurance_company}</td>
                  <td>
                    <div className="text-text">{c.product_name}</div>
                    <div className="text-xs text-text-muted">{c.product_category}</div>
                  </td>
                  <td className="text-text-sub">{c.premium.toLocaleString()}円</td>
                  <td className="text-text-sub">{c.expiry_date ?? '—'}</td>
                  <td>
                    <StatusBadge variant={getExpiryBadgeVariant(c.expiry_date)}>
                      {formatRemainingDays(c.expiry_date)}
                    </StatusBadge>
                  </td>
                  <td>
                    <StatusBadge variant={contractStatusVariant(c.status)}>
                      {c.status}
                    </StatusBadge>
                  </td>
                  <td className="text-text-sub">{c.user_profiles?.name ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-text-muted">
        <span>全 {total} 件 / {page} / {totalPages} ページ</span>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPage(page - 1)}
            disabled={page <= 1}
          >
            <ChevronLeft className="size-4" />
            前へ
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPage(page + 1)}
            disabled={page >= totalPages}
          >
            次へ
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

function contractStatusVariant(status: string): StatusVariant {
  switch (status) {
    case '有効':   return 'success'
    case '更改中': return 'warning'
    case '満期':   return 'muted'
    case '解約':   return 'danger'
    default:       return 'default'
  }
}
