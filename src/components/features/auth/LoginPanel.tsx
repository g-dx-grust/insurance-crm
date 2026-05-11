'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function LoginPanelInner() {
  const router = useRouter()
  const search = useSearchParams()
  const next = search.get('next') ?? '/'
  const error = search.get('error')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLark = () => {
    // 現在 Lark 連携は未設定。Phase 2 doc Step 2 に従って追加実装する。
    toast.info('Lark 連携は準備中です。Lark Developer Console での登録後に有効化されます。')
  }

  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    setLoading(false)

    if (signInError) {
      toast.error('ログインに失敗しました。メールアドレスとパスワードをご確認ください。')
      return
    }
    router.replace(next)
    router.refresh()
  }

  return (
    <div className="space-y-5">
      {error === 'no_profile' && (
        <p className="rounded-sm border border-[color:var(--color-error)]/30 bg-[color:var(--color-error)]/10 px-3 py-2 text-xs text-[color:var(--color-error)]">
          このユーザーにはプロファイルが登録されていません。管理者にお問い合わせください。
        </p>
      )}

      <Button
        type="button"
        variant="default"
        className="w-full"
        disabled
        title="Lark 連携は準備中"
        onClick={handleLark}
      >
        Lark アカウントでログイン
        <span className="ml-2 rounded-sm border border-[color:var(--color-border-strong)] bg-[color:var(--color-bg-secondary)] px-1.5 text-[10px] text-text-muted">
          準備中
        </span>
      </Button>

      <div className="flex items-center gap-3 text-xs text-text-muted">
        <span className="h-px flex-1 bg-border" />
        または
        <span className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={handlePassword} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="email">メールアドレス</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="username"
            placeholder="example@company.co.jp"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">パスワード</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>
        <Button
          type="submit"
          variant="outline"
          className="w-full"
          disabled={loading}
        >
          {loading ? 'ログイン中…' : 'ID / パスワードでログイン'}
        </Button>
      </form>
    </div>
  )
}

export function LoginPanel() {
  // useSearchParams() を使う Client Component は Suspense でラップする
  return (
    <Suspense fallback={<div className="h-64" />}>
      <LoginPanelInner />
    </Suspense>
  )
}
