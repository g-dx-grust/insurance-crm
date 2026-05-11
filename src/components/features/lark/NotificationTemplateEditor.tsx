'use client'

import { useMemo, useState } from 'react'
import { Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { NotificationTemplateKey } from '@/lib/validations/lark-settings'

const SAMPLE_VARS: Record<string, string> = {
  customer_name: '山田 太郎',
  contract_number: 'NL-2026-001',
  expiry_date: '2026-07-02',
  remaining_days: '30',
  assigned_to: '玉木亮司',
}

const TEMPLATE_LABELS: Record<NotificationTemplateKey, string> = {
  expiry_alert: '満期アラート',
  approval_request: '承認依頼',
  settlement_completed: '精算完了',
}

export function NotificationTemplateEditor({
  templateKey,
  initial,
  pending,
  onSave,
}: {
  templateKey: NotificationTemplateKey
  initial: string
  pending: boolean
  onSave: (template: string) => void
}) {
  const [value, setValue] = useState(initial)

  const preview = useMemo(() => {
    return value.replace(/\{\{(\w+)\}\}/g, (_, key) => SAMPLE_VARS[key] ?? `{{${key}}}`)
  }, [value])

  return (
    <section className="rounded-md border border-border bg-bg p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-sub">{TEMPLATE_LABELS[templateKey]}</h3>
        <Button
          type="button"
          size="sm"
          onClick={() => onSave(value)}
          disabled={pending}
        >
          <Save className="mr-1 size-4" />
          {pending ? '保存中…' : '保存'}
        </Button>
      </div>

      <div>
        <Label className="mb-1 block text-xs font-medium text-text-sub">テンプレート</Label>
        <Textarea
          rows={3}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="font-mono text-xs"
        />
      </div>

      <div>
        <p className="mb-1 text-xs font-medium text-text-sub">プレビュー (サンプル値)</p>
        <p className="rounded-sm bg-[color:var(--color-bg-secondary)] p-2 text-xs text-text">
          {preview}
        </p>
      </div>

      <p className="text-xs text-text-muted">
        変数: {'{{customer_name}} {{contract_number}} {{expiry_date}} {{remaining_days}} {{assigned_to}}'}
      </p>
    </section>
  )
}
