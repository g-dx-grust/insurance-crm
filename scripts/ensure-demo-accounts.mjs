#!/usr/bin/env node

/**
 * HOKENA CRM の権限別デモログインアカウントを作成・同期する。
 *
 * 実行:
 *   pnpm demo:accounts
 *
 * 対象:
 *   DEMO_TENANT_CODE (既定: hokena) の user_profiles と Supabase Auth。
 */

import { existsSync, readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

if (!process.argv.includes('--yes')) {
  console.error('デモアカウントを作成・更新するには --yes を付けて実行してください。')
  process.exit(1)
}

loadLocalEnv()

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const tenantCode = process.env.DEMO_TENANT_CODE ?? 'hokena'

if (!url || !serviceKey) {
  console.error('NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY が必要です。')
  process.exit(1)
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false } })

const DEMO_PASSWORD = 'hokena@123'
const DEMO_ACCOUNTS = [
  {
    email: 'viewer@hokena-crm.local',
    password: DEMO_PASSWORD,
    name: '閲覧者デモ',
    name_kana: 'エツランシャ デモ',
    role: 'viewer',
    department: 'デモ',
  },
  {
    email: 'agent@hokena-crm.local',
    password: DEMO_PASSWORD,
    name: '募集人デモ',
    name_kana: 'ボシュウニン デモ',
    role: 'agent',
    department: 'デモ',
  },
  {
    email: 'admin@hokena-crm.local',
    password: DEMO_PASSWORD,
    name: '管理者デモ',
    name_kana: 'カンリシャ デモ',
    role: 'admin',
    department: 'デモ',
  },
]

const tenant = await resolveDemoTenant(tenantCode)
console.log(`対象テナント: ${tenant.name} (${tenant.id})`)

const authUsers = await listAuthUsers()

for (const account of DEMO_ACCOUNTS) {
  const existingAuth = authUsers.find((user) => user.email === account.email)
  let userId = existingAuth?.id

  if (userId) {
    const { error } = await admin.auth.admin.updateUserById(userId, {
      password: account.password,
      email_confirm: true,
      user_metadata: {
        ...(existingAuth.user_metadata ?? {}),
        name: account.name,
        source: 'ensure-demo-accounts',
      },
    })
    if (error) fail(`${account.email} の Auth 更新に失敗しました`, error)
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: account.email,
      password: account.password,
      email_confirm: true,
      user_metadata: {
        name: account.name,
        source: 'ensure-demo-accounts',
      },
    })
    if (error || !data.user) fail(`${account.email} の Auth 作成に失敗しました`, error)
    userId = data.user.id
  }

  const { data, error } = await admin
    .from('user_profiles')
    .upsert({
      id: userId,
      tenant_id: tenant.id,
      name: account.name,
      name_kana: account.name_kana,
      email: account.email,
      role: account.role,
      department: account.department,
      is_active: true,
    })
    .select('id, email, name, role, is_active')
    .single()
  if (error || !data) fail(`${account.email} の profile upsert に失敗しました`, error)

  console.log(`  ${data.role}: ${data.email} (${data.name})`)
}

if (anonKey) {
  console.log('\nログイン確認')
  for (const account of DEMO_ACCOUNTS) {
    const client = createClient(url, anonKey, { auth: { persistSession: false } })
    const { error } = await client.auth.signInWithPassword({
      email: account.email,
      password: account.password,
    })
    if (error) fail(`${account.email} のログイン確認に失敗しました`, error)
    await client.auth.signOut()
    console.log(`  OK: ${account.email}`)
  }
}

console.log('\n✓ デモアカウントの作成・同期が完了しました')

async function resolveDemoTenant(code) {
  const primary = await findTenantByCode(code)
  if (primary) return primary

  if (code === 'hokena') {
    const legacy = await findTenantByCode('n-lic')
    if (legacy) return legacy
  }

  fail(`テナント code=${code} が見つかりません`)
}

async function findTenantByCode(code) {
  const { data, error } = await admin
    .from('tenants')
    .select('id, name, code')
    .eq('code', code)
    .maybeSingle()
  if (error) fail(`テナント code=${code} の取得に失敗しました`, error)
  return data
}

async function listAuthUsers() {
  const users = []
  const perPage = 1000
  for (let page = 1; ; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
    if (error) fail('Auth ユーザー一覧取得に失敗しました', error)
    users.push(...data.users)
    if (data.users.length < perPage) return users
  }
}

function loadLocalEnv() {
  if (!existsSync('.env.local')) return

  const lines = readFileSync('.env.local', 'utf8').split(/\r?\n/)
  let currentKey = null
  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue

    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (match) {
      currentKey = match[1]
      if (!process.env[currentKey]) process.env[currentKey] = stripQuotes(match[2])
      continue
    }

    if (currentKey && process.env[currentKey]) {
      process.env[currentKey] += stripQuotes(line)
    }
  }
}

function stripQuotes(value) {
  return value.replace(/^['"]|['"]$/g, '')
}

function fail(message, error) {
  console.error(message)
  if (error) console.error(error.message ?? error)
  process.exit(1)
}
