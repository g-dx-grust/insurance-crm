'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2, Send } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { SignaturePadField } from '@/components/features/intentions/SignaturePadField'
import { INTENTION_SIGNATURE_CONSENT_TEXT } from '@/lib/constants/intention'
import { submitRemoteIntentionSignature } from './actions'

interface ProductSummary {
  insurance_company: string
  product_name: string
  product_category: string
  premium: number | null
  is_recommended: boolean
}

export function RemoteSignatureClient({
  token,
  signerName,
  customerName,
  initialIntention,
  finalIntention,
  products,
}: {
  token: string
  signerName: string
  customerName: string
  initialIntention: string
  finalIntention: string | null
  products: ProductSummary[]
}) {
  const [name, setName] = useState(signerName)
  const [signature, setSignature] = useState('')
  const [consent, setConsent] = useState(false)
  const [done, setDone] = useState(false)
  const [pending, startTransition] = useTransition()

  const submit = () => {
    startTransition(async () => {
      const result = await submitRemoteIntentionSignature({
        token,
        signer_name: name,
        signature_data_url: signature,
        consent_confirmed: consent,
      })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setDone(true)
      toast.success('電子サインを送信しました')
    })
  }

  if (done) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-2xl items-center px-4 py-10">
        <div className="w-full rounded-md border border-border bg-bg p-6 text-center">
          <CheckCircle2 className="mx-auto size-10 text-[color:var(--color-success)]" />
          <h1 className="mt-4 text-xl font-semibold text-text">電子サインを受け付けました</h1>
          <p className="mt-2 text-sm text-text-muted">
            入力内容はシステムに自動反映され、署名画像・入力内容・通信情報を改ざん検知できる証跡として保存しました。
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="border-b border-border pb-4">
        <h1 className="text-xl font-semibold text-text">意向把握 電子サイン</h1>
        <p className="mt-1 text-sm text-text-muted">
          {customerName} 様の意向把握内容を確認し、署名してください。
        </p>
      </div>

      <div className="mt-6 space-y-4">
        <section className="rounded-md border border-border bg-bg p-5">
          <h2 className="text-sm font-semibold text-text-sub">確認内容</h2>
          <div className="mt-3 space-y-3 text-sm">
            <div>
              <p className="text-xs font-medium text-text-muted">当初意向</p>
              <p className="mt-1 whitespace-pre-wrap text-text">{initialIntention}</p>
            </div>
            {finalIntention && (
              <div>
                <p className="text-xs font-medium text-text-muted">最終意向</p>
                <p className="mt-1 whitespace-pre-wrap text-text">{finalIntention}</p>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-md border border-border bg-bg p-5">
          <h2 className="text-sm font-semibold text-text-sub">提案商品</h2>
          <div className="mt-3 overflow-hidden rounded-md border border-border">
            <table>
              <thead>
                <tr>
                  <th>保険会社</th>
                  <th>商品名</th>
                  <th>カテゴリ</th>
                  <th>年間保険料</th>
                  <th>推奨</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product, index) => (
                  <tr key={`${product.product_name}-${index}`}>
                    <td>{product.insurance_company}</td>
                    <td>{product.product_name}</td>
                    <td className="text-text-sub">{product.product_category}</td>
                    <td className="text-text-sub">
                      {(product.premium ?? 0).toLocaleString()}円
                    </td>
                    <td>
                      {product.is_recommended ? (
                        <StatusBadge variant="success">推奨</StatusBadge>
                      ) : (
                        <span className="text-text-muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-md border border-border bg-bg p-5">
          <h2 className="text-sm font-semibold text-text-sub">電子サイン</h2>
          <div className="mt-4 space-y-4">
            <div>
              <Label className="mb-1 block text-xs font-medium text-text-sub">署名者名 *</Label>
              <Input value={name} onChange={(event) => setName(event.target.value)} />
            </div>
            <SignaturePadField value={signature} onChange={setSignature} />
            <label className="flex cursor-pointer items-start gap-2 rounded-sm border border-border bg-[color:var(--color-bg-secondary)] px-3 py-2">
              <Checkbox
                checked={consent}
                onCheckedChange={(value) => setConsent(Boolean(value))}
                className="mt-0.5"
              />
              <span className="text-sm text-text">{INTENTION_SIGNATURE_CONSENT_TEXT}</span>
            </label>
          </div>
        </section>

        <div className="flex justify-end">
          <Button
            onClick={submit}
            disabled={pending || !name.trim() || !signature || !consent}
          >
            <Send className="size-4" />
            {pending ? '送信中…' : '電子サインを送信'}
          </Button>
        </div>
      </div>
    </div>
  )
}
