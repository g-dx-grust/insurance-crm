import { LoginPanel } from '@/components/features/auth/LoginPanel'

export const metadata = {
  title: 'ログイン | HOKENA CRM',
}

export default function LoginPage() {
  return (
    <div className="grid min-h-screen grid-cols-1 bg-bg md:grid-cols-[55%_45%]">
      {/* 左: ブランドビジュアル */}
      <div className="relative hidden md:block bg-bg-secondary">
        <div
          className="absolute inset-0"
          style={{ backgroundColor: 'color-mix(in oklab, var(--color-accent) 12%, transparent)' }}
        />
        <div className="relative flex h-full items-end p-10">
          <p className="text-sm leading-relaxed text-text-sub">
            HOKENA CRM
            <br />
            保険代理店業務を、現場の手で止めずに回す。
          </p>
        </div>
      </div>

      {/* 右: フォーム */}
      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[360px]">
          <h1 className="mb-1 text-xl font-semibold text-text">ログイン</h1>
          <p className="mb-6 text-sm text-text-muted">
            ID / パスワードでログインしてください。
          </p>
          <LoginPanel />
        </div>
      </div>
    </div>
  )
}
