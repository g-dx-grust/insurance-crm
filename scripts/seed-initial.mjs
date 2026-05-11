/**
 * 初期テナントと最初の管理者ユーザーを Supabase に登録する一回限りのスクリプト。
 *
 * 実行: node --env-file=.env.local scripts/seed-initial.mjs
 *
 * 冪等: 既に同じテナントコード・メールアドレスがあればスキップする。
 * 必要 env: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js'

const TENANT = {
  name: '株式会社N-LIC',
  code: 'n-lic',
}

const ADMIN = {
  email:    process.env.SEED_ADMIN_EMAIL ?? 'demo@n-lic-crm.local',
  password: process.env.SEED_ADMIN_PASSWORD ?? 'Nlic2026demo!',
  name:     process.env.SEED_ADMIN_NAME ?? 'N-LIC デモ管理者',
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY が必要です。')
  console.error('node --env-file=.env.local scripts/seed-initial.mjs で実行してください。')
  process.exit(1)
}

const admin = createClient(url, key, { auth: { persistSession: false } })

// 1. テナントを upsert
console.log(`[1/3] テナント "${TENANT.name}" (code=${TENANT.code}) を確認・作成`)
let tenantId
{
  const { data: existing, error: selErr } = await admin
    .from('tenants')
    .select('id')
    .eq('code', TENANT.code)
    .maybeSingle()

  if (selErr) {
    console.error('テナント検索失敗:', selErr.message)
    process.exit(1)
  }

  if (existing) {
    tenantId = existing.id
    console.log(`  既存テナントを再利用: ${tenantId}`)
  } else {
    const { data: created, error: insErr } = await admin
      .from('tenants')
      .insert({
        name: TENANT.name,
        code: TENANT.code,
        plan: 'standard',
        settings: {
          elderly_age_threshold: 70,
          access_scope: 'assigned_only',
          lark: {
            sso_enabled: false,
            base:     { base_id: null, sync_customers: false, sync_contracts: false, sync_opportunities: false },
            calendar: { calendar_id: null, sync_tasks: false, sync_events: false },
            approval: { intention_flow_id: null },
            bot:      { alert_chat_id: null, expiry_days_before: 30, task_days_before: 3, notify_approval: true, notify_settlement: true },
          },
        },
      })
      .select('id')
      .single()
    if (insErr) {
      console.error('テナント作成失敗:', insErr.message)
      process.exit(1)
    }
    tenantId = created.id
    console.log(`  新規作成: ${tenantId}`)
  }
}

// 2. Auth ユーザーを作成 (既存なら ID を取得)
console.log(`[2/3] Auth ユーザー ${ADMIN.email} を確認・作成`)
let userId
{
  // listUsers で既存検索 (createUser を直接叩くと email already exists で失敗するため)
  const { data: usersList, error: listErr } = await admin.auth.admin.listUsers({
    page: 1, perPage: 1000,
  })
  if (listErr) {
    console.error('ユーザー一覧取得失敗:', listErr.message)
    process.exit(1)
  }
  const existingUser = usersList.users.find((u) => u.email === ADMIN.email)

  if (existingUser) {
    userId = existingUser.id
    console.log(`  既存 Auth ユーザーを再利用: ${userId}`)
    const { error: updateErr } = await admin.auth.admin.updateUserById(userId, {
      password: ADMIN.password,
      email_confirm: true,
      user_metadata: {
        ...existingUser.user_metadata,
        source: existingUser.user_metadata?.source ?? 'seed-initial',
        name: ADMIN.name,
      },
    })
    if (updateErr) {
      console.error('Auth ユーザー更新失敗:', updateErr.message)
      process.exit(1)
    }
    console.log('  既存 Auth ユーザーのパスワード・メタデータを同期')
  } else {
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: ADMIN.email,
      password: ADMIN.password,
      email_confirm: true,    // 確認メールをスキップ
      user_metadata: { source: 'seed-initial', name: ADMIN.name },
    })
    if (createErr || !created.user) {
      console.error('Auth ユーザー作成失敗:', createErr?.message ?? 'unknown')
      process.exit(1)
    }
    userId = created.user.id
    console.log(`  新規作成: ${userId}`)
  }
}

// 3. user_profiles を upsert (admin ロール)
console.log(`[3/3] user_profiles を admin ロールで確認・作成`)
{
  const { data: existing, error: selErr } = await admin
    .from('user_profiles')
    .select('id, role, tenant_id, name, email, is_active')
    .eq('id', userId)
    .maybeSingle()

  if (selErr) {
    console.error('プロファイル検索失敗:', selErr.message)
    process.exit(1)
  }

  if (existing) {
    console.log(`  既存プロファイル: role=${existing.role}, tenant_id=${existing.tenant_id}`)
    if (
      existing.role !== 'admin' ||
      existing.tenant_id !== tenantId ||
      existing.name !== ADMIN.name ||
      existing.email !== ADMIN.email ||
      existing.is_active !== true
    ) {
      const { error: updErr } = await admin
        .from('user_profiles')
        .update({
          role: 'admin',
          tenant_id: tenantId,
          name: ADMIN.name,
          email: ADMIN.email,
          is_active: true,
        })
        .eq('id', userId)
      if (updErr) {
        console.error('プロファイル更新失敗:', updErr.message)
        process.exit(1)
      }
      console.log('  admin ロール・テナント・氏名を上書き')
    } else {
      console.log('  変更なし')
    }
  } else {
    const { error: insErr } = await admin
      .from('user_profiles')
      .insert({
        id: userId,
        tenant_id: tenantId,
        name: ADMIN.name,
        email: ADMIN.email,
        role: 'admin',
        is_active: true,
      })
    if (insErr) {
      console.error('プロファイル作成失敗:', insErr.message)
      process.exit(1)
    }
    console.log('  新規作成')
  }
}

console.log('\n✓ 初期セットアップ完了')
console.log(`  テナント: ${TENANT.name} (${tenantId})`)
console.log(`  管理者:   ${ADMIN.email} → /login からログイン可能`)
