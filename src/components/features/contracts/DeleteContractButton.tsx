'use client'

import { useState, useTransition } from 'react'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { deleteContract } from '@/app/(dashboard)/contracts/actions'

export function DeleteContractButton({
  contractId,
  customerId,
  policyNumber,
}: {
  contractId: string
  customerId: string
  policyNumber: string
}) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  const handleConfirm = () => {
    startTransition(async () => {
      const result = await deleteContract(contractId, customerId)
      if (result && !result.ok) toast.error(result.error)
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
        <Trash2 className="mr-1 size-4" />
        削除
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="契約を削除しますか?"
        description={`証券番号「${policyNumber}」を一覧から削除します (論理削除のため復元可能)。`}
        confirmLabel="削除する"
        tone="danger"
        loading={pending}
        onConfirm={handleConfirm}
      />
    </>
  )
}
