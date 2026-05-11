import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database.types'

// RLS をバイパスする処理（招待・Lark Webhook 受信・notification_logs の状態更新等）でのみ使用。
// クライアントコードからは絶対に import しないこと。
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}
