'use client'

import { useState, useTransition } from 'react'
import { format } from 'date-fns'
import { Send, Check, X, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { StatusBadge, type StatusVariant } from '@/components/ui/StatusBadge'
import {
  approveIntention,
  enqueueIntentionApproval,
  rejectIntention,
  resubmitIntention,
} from '@/app/(dashboard)/intentions/actions'

interface UserOption {
  id: string
  name: string
}

export function ApprovalSection({
  intentionId,
  status,
  approverId,
  approverName,
  approvedAt,
  rejectionReason,
  larkApprovalId,
  approvers,
  currentUserRole,
  currentUserId,
}: {
  intentionId: string
  status: string
  approverId: string | null
  approverName: string | null
  approvedAt: string | null
  rejectionReason: string | null
  larkApprovalId: string | null
  approvers: UserOption[]
  currentUserRole: string
  currentUserId: string
}) {
  const [pending, startTransition] = useTransition()
  const [selectedApprover, setSelectedApprover] = useState<string>(
    approverId ?? approvers[0]?.id ?? '',
  )
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const handleSendApproval = () => {
    if (!selectedApprover) {
      toast.error('承認者を選択してください')
      return
    }
    startTransition(async () => {
      const result = await enqueueIntentionApproval(intentionId, selectedApprover)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success('承認依頼を受け付けました', {
        description:
          'Lark に承認依頼が送信されます。送信状況は通知ログでご確認ください。',
      })
    })
  }

  const handleApprove = () => {
    startTransition(async () => {
      const result = await approveIntention(intentionId)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success('承認しました')
    })
  }

  const handleReject = () => {
    startTransition(async () => {
      const result = await rejectIntention(intentionId, rejectReason)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success('差戻しました')
      setRejectOpen(false)
      setRejectReason('')
    })
  }

  const handleResubmit = () => {
    startTransition(async () => {
      const result = await resubmitIntention(intentionId)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success('実施済に戻しました。承認依頼を再送信できます。')
    })
  }

  const isAdmin = currentUserRole === 'admin'
  const canApproveThis =
    status === '承認待' && (isAdmin || approverId === currentUserId)

  return (
    <section className="rounded-md border border-border bg-bg p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text-sub">承認フロー</h2>
        <StatusBadge variant={statusVariant(status)}>{status}</StatusBadge>
      </div>

      {/* 実施済: 承認依頼を送信できる */}
      {status === '実施済' && (
        <div className="space-y-3">
          <div>
            <Label className="mb-1 block text-xs font-medium text-text-sub">
              承認者を選択
            </Label>
            <Select
              value={selectedApprover || '__none__'}
              onValueChange={(v) => setSelectedApprover(!v || v === '__none__' ? '' : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="承認者を選択" items={approvers} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">未選択</SelectItem>
                {approvers.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            onClick={handleSendApproval}
            disabled={pending || !selectedApprover}
          >
            <Send className="mr-1 size-4" />
            {pending ? '送信中…' : '承認依頼を送信する'}
          </Button>
          <p className="text-xs text-text-muted">
            Lark Approval は準備中。現在は通知キューに pending として記録されます。
          </p>
        </div>
      )}

      {/* 承認待: 承認者は承認/差戻ボタン、依頼者は待ち表示 */}
      {status === '承認待' && (
        <div className="space-y-3">
          <div className="rounded-sm bg-[color:var(--color-warning)]/10 px-3 py-2 text-xs text-[color:var(--color-warning)]">
            承認者: <span className="font-medium">{approverName ?? '—'}</span> による承認待ち
            {larkApprovalId && (
              <span className="ml-2 font-mono">[Lark Approval: {larkApprovalId}]</span>
            )}
          </div>
          {canApproveThis && (
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={handleApprove}
                disabled={pending}
                className="bg-[color:var(--color-success)] text-white hover:bg-[color:var(--color-success)]/90"
              >
                <Check className="mr-1 size-4" />
                承認する
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setRejectOpen(true)}
                disabled={pending}
                className="text-[color:var(--color-error)] hover:bg-[color:var(--color-error)]/10"
              >
                <X className="mr-1 size-4" />
                差戻す
              </Button>
            </div>
          )}
        </div>
      )}

      {/* 承認済 */}
      {status === '承認済' && (
        <div className="rounded-sm bg-[color:var(--color-success)]/10 px-3 py-2 text-sm text-[color:var(--color-success)]">
          {approverName ?? '—'} さんが
          {approvedAt && ` ${format(new Date(approvedAt), 'yyyy-MM-dd HH:mm')} に`}
          承認しました
        </div>
      )}

      {/* 差戻 */}
      {status === '差戻' && (
        <div className="space-y-3">
          <div className="rounded-md border border-[color:var(--color-error)]/30 bg-[color:var(--color-error)]/10 p-3">
            <p className="text-sm font-semibold text-[color:var(--color-error)]">
              差戻されました
            </p>
            {rejectionReason && (
              <p className="mt-1 whitespace-pre-wrap text-xs text-text-sub">
                {rejectionReason}
              </p>
            )}
          </div>
          <Button type="button" onClick={handleResubmit} disabled={pending}>
            <RotateCcw className="mr-1 size-4" />
            {pending ? '処理中…' : '内容を見直して再提出する'}
          </Button>
        </div>
      )}

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>差戻す</DialogTitle>
            <DialogDescription>
              差戻理由を記入してください。依頼者に通知されます。
            </DialogDescription>
          </DialogHeader>
          <Textarea
            rows={4}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="例: ○○の項目が不足しています"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)} disabled={pending}>
              キャンセル
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={pending}>
              {pending ? '処理中…' : '差戻す'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
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
