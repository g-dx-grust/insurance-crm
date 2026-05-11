'use client'

import { useState, useTransition } from 'react'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { deleteRider } from '@/app/(dashboard)/contracts/actions'

export function DeleteRiderButton({
  riderId,
  contractId,
  name,
}: {
  riderId: string
  contractId: string
  name: string
}) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  const handleConfirm = () => {
    startTransition(async () => {
      const result = await deleteRider(riderId, contractId)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success('特約を削除しました')
      setOpen(false)
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-sm p-1 text-text-muted hover:bg-[color:var(--color-error)]/10 hover:text-[color:var(--color-error)]"
        aria-label="削除"
        title="削除"
      >
        <Trash2 className="size-3.5" />
      </button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="特約を削除しますか?"
        description={`「${name}」を削除します。`}
        confirmLabel="削除する"
        tone="danger"
        loading={pending}
        onConfirm={handleConfirm}
      />
    </>
  )
}
