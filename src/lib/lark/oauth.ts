import 'server-only'

/**
 * Lark OAuth スタブ。Lark Developer Console でアプリ登録 + LARK_APP_ID / LARK_APP_SECRET を
 * .env.local に設定したら、Phase 2 doc Step 2 の実装に置き換える。
 *
 * 現状は env が未設定なので、ルートハンドラ側で isLarkConfigured() で判定し
 * 503 (Service Unavailable) を返す。
 */
export function isLarkConfigured(): boolean {
  return Boolean(
    process.env.LARK_APP_ID &&
      process.env.LARK_APP_SECRET &&
      process.env.LARK_OAUTH_REDIRECT_URI,
  )
}
