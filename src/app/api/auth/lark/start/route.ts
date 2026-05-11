import { NextResponse } from 'next/server'
import { isLarkConfigured } from '@/lib/lark/oauth'

// Lark OAuth スタート。env 未設定の現段階では 503 を返す。
// 本実装は Phase 2 doc Step 2 を参照 (Lark Developer Console での登録後に有効化)。
export async function GET() {
  if (!isLarkConfigured()) {
    return NextResponse.json(
      {
        error: 'lark_not_configured',
        message:
          'Lark 連携はまだ設定されていません。LARK_APP_ID / LARK_APP_SECRET を設定後にご利用ください。',
      },
      { status: 503 },
    )
  }

  // TODO: Phase 2 doc Step 2 の buildAuthorizeUrl + state Cookie 発行に置き換える
  return NextResponse.json({ error: 'not_implemented' }, { status: 501 })
}
