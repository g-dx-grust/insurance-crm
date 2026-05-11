'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  SUITABILITY_ITEMS,
  type SuitabilityKey,
} from '@/lib/constants/suitability'
import { saveSuitability } from '@/app/(dashboard)/opportunities/actions'

export type SuitabilityValues = Record<SuitabilityKey, boolean>

export function SuitabilityChecklist({
  opportunityId,
  initial,
}: {
  opportunityId: string
  initial: SuitabilityValues
}) {
  const [values, setValues] = useState<SuitabilityValues>(initial)
  const [pending, startTransition] = useTransition()

  const checked = Object.values(values).filter(Boolean).length
  const total = SUITABILITY_ITEMS.length
  const allDone = checked === total

  const handleToggle = (key: SuitabilityKey, v: boolean) => {
    setValues((prev) => ({ ...prev, [key]: v }))
  }

  const handleSave = () => {
    startTransition(async () => {
      const result = await saveSuitability(opportunityId, values)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success('適合性確認を保存しました')
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-text-muted">
          進捗 <span className={allDone ? 'font-medium text-[color:var(--color-success)]' : 'font-medium text-text'}>{checked}</span> / {total}
        </p>
        <Button type="button" size="sm" onClick={handleSave} disabled={pending}>
          <Save className="mr-1 size-4" />
          {pending ? '保存中…' : '保存'}
        </Button>
      </div>
      <ul className="space-y-1.5">
        {SUITABILITY_ITEMS.map((item) => (
          <li key={item.key}>
            <label className="flex items-start gap-2 rounded-sm px-2 py-1.5 hover:bg-[color:var(--color-bg-secondary)] cursor-pointer">
              <Checkbox
                checked={values[item.key as SuitabilityKey] ?? false}
                onCheckedChange={(v) =>
                  handleToggle(item.key as SuitabilityKey, Boolean(v))
                }
                className="mt-0.5"
              />
              <span className="text-sm text-text">{item.label}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  )
}
