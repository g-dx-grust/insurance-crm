'use client'

import { useState, useTransition } from 'react'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { deleteCustomer } from '@/app/(dashboard)/customers/actions'

export function DeleteCustomerButton({
  customerId,
  customerName,
}: {
  customerId: string
  customerName: string
}) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  const handleConfirm = () => {
    startTransition(async () => {
      const result = await deleteCustomer(customerId)
      if (result && !result.ok) {
        toast.error(result.error)
      }
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
        title="顧客を削除しますか?"
        description={`「${customerName}」を一覧から削除します (論理削除のため復元可能です)。関連する契約・案件・対応履歴は保持されます。`}
        confirmLabel="削除する"
        tone="danger"
        loading={pending}
        onConfirm={handleConfirm}
      />
    </>
  )
}
