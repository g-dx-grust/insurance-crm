'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { XCircle } from 'lucide-react'
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
import { recordLost } from '@/app/(dashboard)/opportunities/actions'

export function LostDialog({
  opportunityId,
}: {
  opportunityId: string
}) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [pending, startTransition] = useTransition()

  const handleSubmit = () => {
    if (!reason.trim()) {
      toast.error('失注理由を入力してください')
      return
    }
    startTransition(async () => {
      const result = await recordLost(opportunityId, reason)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success('失注として記録しました')
      setOpen(false)
      setReason('')
    })
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="text-[color:var(--color-error)] hover:bg-[color:var(--color-error)]/10"
      >
        <XCircle className="mr-1 size-4" />
        失注として記録
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>失注として記録</DialogTitle>
            <DialogDescription>
              失注理由は今後の改善材料として保存されます。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="lost-reason" className="text-xs font-medium text-text-sub">
              失注理由 *
            </Label>
            <Textarea
              id="lost-reason"
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="例: 競合他社の提案を採用された、保険料が予算を超えた等"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              キャンセル
            </Button>
            <Button variant="destructive" onClick={handleSubmit} disabled={pending}>
              {pending ? '記録中…' : '記録する'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
