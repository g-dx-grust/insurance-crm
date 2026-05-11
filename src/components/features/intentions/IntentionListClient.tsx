'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { Plus } from 'lucide-react'
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
import { INTENTION_STATUSES } from '@/lib/constants/intention'

export interface IntentionListItem {
  id: string
  status: string
  initial_intention: string
  final_intention: string | null
  comparison_method: string | null
  created_at: string
  customers: { id: string; name: string; name_kana: string } | null
  user_profiles: { name: string } | null
}

interface UserOption {
  id: string
  name: string
}

export function IntentionListClient({
  intentions,
  approvalWaitingCount,
  users,
}: {
  intentions: IntentionListItem[]
  approvalWaitingCount: number
  users: UserOption[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()

  const updateParams = (mut: (p: URLSearchParams) => void) => {
    const params = new URLSearchParams(sp.toString())
    mut(params)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-md border border-border bg-bg p-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:flex-1">
          <SearchInput
            defaultValue={sp.get('q') ?? ''}
            placeholder="顧客名で検索"
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
              {INTENTION_STATUSES.map((s) => (
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
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="担当: 全員" items={users} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">担当: 全員</SelectItem>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          {approvalWaitingCount > 0 && (
            <StatusBadge variant="warning">
              承認待ち: {approvalWaitingCount}件
            </StatusBadge>
          )}
          <Button render={<Link href="/intentions/new" />}>
            <Plus className="mr-1 size-4" />
            新規作成
          </Button>
        </div>
      </div>

      {intentions.length === 0 ? (
        <EmptyState
          title="意向把握記録がありません"
          description="保険業法対応として、提案前に意向把握記録を作成します。"
        />
      ) : (
        <div className="overflow-hidden rounded-md border border-border bg-bg">
          <table>
            <thead>
              <tr>
                <th>顧客</th>
                <th>当初意向</th>
                <th>最終意向</th>
                <th>比較方式</th>
                <th>作成日</th>
                <th>担当</th>
                <th>状態</th>
              </tr>
            </thead>
            <tbody>
              {intentions.map((i) => (
                <tr
                  key={i.id}
                  className="cursor-pointer transition-colors hover:bg-[color:var(--color-bg-secondary)]"
                  onClick={() => router.push(`/intentions/${i.id}`)}
                >
                  <td className="font-medium text-text">{i.customers?.name ?? '—'}</td>
                  <td className="max-w-xs truncate text-text-sub">{i.initial_intention}</td>
                  <td className="max-w-xs truncate text-text-sub">{i.final_intention ?? '—'}</td>
                  <td className="text-text-sub">{i.comparison_method ?? '—'}</td>
                  <td className="text-text-muted">
                    {format(new Date(i.created_at), 'yyyy-MM-dd')}
                  </td>
                  <td className="text-text-sub">{i.user_profiles?.name ?? '—'}</td>
                  <td>
                    <StatusBadge variant={statusVariant(i.status)}>{i.status}</StatusBadge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function statusVariant(status: string): StatusVariant {
  switch (status) {
    case '承認済': return 'success'
    case '差戻':   return 'danger'
    case '承認待': return 'warning'
    case '実施済': return 'info'
    case '未実施': return 'muted'
    default:       return 'default'
  }
}
