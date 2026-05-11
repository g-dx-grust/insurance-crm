import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// Next.js 16: ファイル規約は `proxy.ts`、エクスポート名も `proxy`。
// 旧名 `middleware` は deprecated（@see node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md）。
export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  // 静的アセットと Lark OAuth コールバックは認証チェックから除外
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/auth/lark|api/webhooks|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
