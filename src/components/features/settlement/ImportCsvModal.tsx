'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, CheckCircle, AlertTriangle } from 'lucide-react'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CSV_TEMPLATES } from '@/lib/settlement/csvTemplates'
import {
  importSettlementCsv,
  type ImportCsvResult,
} from '@/app/(dashboard)/settlement/import/actions'

export function ImportCsvModal({
  open,
  onOpenChange,
  defaultMonth,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultMonth: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<ImportCsvResult | null>(null)

  const [template, setTemplate] = useState(CSV_TEMPLATES[0]?.insurance_company ?? '')
  const [month, setMonth] = useState(defaultMonth)
  const [file, setFile] = useState<File | null>(null)

  const reset = () => {
    setResult(null)
    setFile(null)
    setMonth(defaultMonth)
    setTemplate(CSV_TEMPLATES[0]?.insurance_company ?? '')
  }

  const handleSubmit = () => {
    if (!file) {
      toast.error('ファイルを選択してください')
      return
    }
    if (!template) {
      toast.error('テンプレートを選択してください')
      return
    }
    if (!/^\d{4}-\d{2}$/.test(month)) {
      toast.error('対象月 (YYYY-MM) を指定してください')
      return
    }

    const fd = new FormData()
    fd.set('file', file)
    fd.set('template', template)
    fd.set('month', month)

    startTransition(async () => {
      const res = await importSettlementCsv(fd)
      setResult(res)
      if (res.ok) {
        toast.success(`取込完了: ${res.matched} 件マッチ / ${res.unmatched} 件未マッチ`)
        router.refresh()
      } else {
        toast.error(res.error)
      }
    })
  }

  const handleClose = () => {
    onOpenChange(false)
    setTimeout(reset, 300) // dialog 閉じてから状態リセット
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) handleClose()
        else onOpenChange(o)
      }}
    >
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>精算 CSV インポート</DialogTitle>
          <DialogDescription>
            保険会社別のテンプレートに従って取り込み、既存契約と自動突合します。
          </DialogDescription>
        </DialogHeader>

        {result?.ok ? (
          <ResultView result={result} />
        ) : (
          <div className="space-y-4">
            <div>
              <Label className="mb-1 block text-xs font-medium text-text-sub">
                保険会社テンプレート *
              </Label>
              <Select
                value={template}
                onValueChange={(v) => v && setTemplate(v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CSV_TEMPLATES.map((t) => (
                    <SelectItem key={t.insurance_company} value={t.insurance_company}>
                      {t.insurance_company} ({t.encoding})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1 text-xs text-text-muted">
                エンコーディング (Shift_JIS / UTF-8) は自動判定されます
              </p>
            </div>

            <div>
              <Label className="mb-1 block text-xs font-medium text-text-sub">対象月 *</Label>
              <Input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              />
            </div>

            <div>
              <Label className="mb-1 block text-xs font-medium text-text-sub">CSV ファイル *</Label>
              <Input
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              {file && (
                <p className="mt-1 text-xs text-text-muted">
                  選択中: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>

            {result && !result.ok && (
              <div className="rounded-sm border border-[color:var(--color-error)]/30 bg-[color:var(--color-error)]/10 p-2 text-xs text-[color:var(--color-error)]">
                {result.error}
                {result.details && <div className="mt-1 font-mono opacity-70">{result.details}</div>}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {result?.ok ? (
            <Button onClick={handleClose}>閉じる</Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose} disabled={pending}>
                キャンセル
              </Button>
              <Button onClick={handleSubmit} disabled={pending || !file}>
                <Upload className="mr-1 size-4" />
                {pending ? '取込中…' : '取込開始'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ResultView({ result }: { result: Extract<ImportCsvResult, { ok: true }> }) {
  return (
    <div className="space-y-3">
      <div className="rounded-md border border-[color:var(--color-success)]/30 bg-[color:var(--color-success)]/10 p-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-[color:var(--color-success)]">
          <CheckCircle className="size-4" />
          取込完了
        </div>
        <p className="mt-1 text-xs text-text-sub">
          全 {result.total} 件 / マッチ {result.matched} 件 / 未マッチ {result.unmatched} 件
        </p>
      </div>
      {result.unmatched > 0 && (
        <div className="rounded-md border border-[color:var(--color-warning)]/30 bg-[color:var(--color-warning)]/10 p-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-[color:var(--color-warning)]">
            <AlertTriangle className="size-4" />
            未マッチ {result.unmatched} 件
          </div>
          <p className="mt-1 text-xs text-text-sub">
            一覧で「差異あり」フィルターを使うと、これらの行を確認・契約に紐付けできます。
          </p>
        </div>
      )}
      <p className="text-xs text-text-muted">
        取込履歴 ID: <span className="font-mono">{result.importLogId}</span>
      </p>
    </div>
  )
}
