'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SearchInput } from '@/components/ui/SearchInput'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatTokyoDate } from '@/lib/utils/datetime'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const STATUSES = ['見込', '既存', '休眠'] as const

export interface CustomerListItem {
  id: string
  name: string
  name_kana: string
  status: string
  age: number | null
  is_elderly: boolean
  phone: string | null
  email: string | null
  updated_at: string
  user_profiles: { name: string } | null
}

interface UserOption {
  id: string
  name: string
}

export function CustomerListClient({
  customers,
  total,
  page,
  pageSize,
  users,
}: {
  customers: CustomerListItem[]
  total: number
  page: number
  pageSize: number
  users: UserOption[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const updateParams = (mut: (p: URLSearchParams) => void) => {
    const params = new URLSearchParams(sp.toString())
    mut(params)
    // フィルター変更時はページを 1 に戻す
    if (![...params.keys()].includes('page')) params.delete('page')
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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:flex-1">
          <SearchInput
            defaultValue={sp.get('q') ?? ''}
            placeholder="氏名・カナで検索"
            onChange={(v) =>
              updateParams((p) => {
                if (v) p.set('q', v)
                else p.delete('q')
                p.delete('page')
              })
            }
          />
          <Select
            value={sp.get('status') ?? '__all__'}
            onValueChange={(v) =>
              updateParams((p) => {
                if (!v || v === '__all__') p.delete('status')
                else p.set('status', v)
                p.delete('page')
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="状態: 全て" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">すべて</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={sp.get('assigned_to') ?? '__all__'}
            onValueChange={(v) =>
              updateParams((p) => {
                if (!v || v === '__all__') p.delete('assigned_to')
                else p.set('assigned_to', v)
                p.delete('page')
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="担当: 全員" items={users} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">全員</SelectItem>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button render={<Link href="/customers/new" />}>
          <Plus className="mr-1 size-4" />
          新規登録
        </Button>
      </div>

      {customers.length === 0 ? (
        <EmptyState
          title="該当する顧客がいません"
          description="検索条件を変更するか、新規登録してください。"
        />
      ) : (
        <div className="overflow-hidden rounded-md border border-border bg-bg">
          <table>
            <thead>
              <tr>
                <th>顧客名</th>
                <th>カナ</th>
                <th>ステータス</th>
                <th>年齢</th>
                <th>連絡先</th>
                <th>担当</th>
                <th>更新</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr
                  key={c.id}
                  className="cursor-pointer transition-colors hover:bg-[color:var(--color-bg-secondary)]"
                  onClick={() => router.push(`/customers/${c.id}`)}
                >
                  <td className="font-medium text-text">{c.name}</td>
                  <td className="text-text-sub">{c.name_kana}</td>
                  <td>
                    <StatusBadge variant={statusVariant(c.status)}>{c.status}</StatusBadge>
                  </td>
                  <td>
                    {c.age != null ? (
                      <span className={c.is_elderly ? 'text-[color:var(--color-warning)] font-medium' : ''}>
                        {c.age}歳
                        {c.is_elderly && <span className="ml-1 text-xs">(高齢者)</span>}
                      </span>
                    ) : (
                      <span className="text-text-muted">—</span>
                    )}
                  </td>
                  <td className="text-text-sub">{c.phone ?? c.email ?? '—'}</td>
                  <td className="text-text-sub">{c.user_profiles?.name ?? '—'}</td>
                  <td className="text-text-muted">{formatTokyoDate(c.updated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-text-muted">
        <span>
          全 {total} 件 / {page} / {totalPages} ページ
        </span>
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

function statusVariant(status: string): 'success' | 'info' | 'muted' | 'default' {
  switch (status) {
    case '既存': return 'success'
    case '見込': return 'info'
    case '休眠': return 'muted'
    default:     return 'default'
  }
}
