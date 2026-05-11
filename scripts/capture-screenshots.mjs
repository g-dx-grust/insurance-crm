/**
 * docs/assets/ 配下にスクリーンショットを取得するワンショットスクリプト。
 *
 * 必要 env: SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD (scripts/seed-initial.mjs と同じ)
 *
 * Playwright がプロジェクトに devDep として入っていないため、
 *   1. 一時ディレクトリで npm install playwright
 *   2. このスクリプトをコピーして node 実行
 * の手順で運用する。詳細は README 末尾参照。
 */

import { chromium } from 'playwright'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = resolve(__dirname, '../docs/assets')
const BASE = process.env.SCREENSHOT_BASE_URL ?? 'http://localhost:3001'
const EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'r.tamaki@josho-group.com'
const PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'Josho0315'

async function main() {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    locale: 'ja-JP',
  })
  const page = await ctx.newPage()

  // Next.js dev オーバーレイ (shadow DOM) を毎ページ削除するヘルパー
  const hideDevOverlay = async () => {
    try {
      await page.evaluate(() => {
        document.querySelectorAll('nextjs-portal').forEach((el) => el.remove())
      })
    } catch {
      /* ignore */
    }
  }

  const shot = async (name, opts = {}) => {
    await hideDevOverlay()
    await page.screenshot({
      path: `${OUT_DIR}/${name}.png`,
      fullPage: opts.fullPage ?? true,
    })
    console.log(`  📸 ${name}.png`)
  }

  const goto = async (path) => {
    await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' })
    await page.waitForLoadState('networkidle')
  }

  // ─── ログイン ────────────────────────────────────────────────────────
  console.log(`→ ログイン: ${EMAIL}`)
  await goto('/login')
  await shot('02-01-login', { fullPage: false })

  await page.fill('input[type="email"]', EMAIL)
  await page.fill('input[type="password"]', PASSWORD)
  await page.click('button[type="submit"]')
  await page.waitForURL(`${BASE}/`, { timeout: 15000 })
  await page.waitForLoadState('networkidle')

  // ─── ダッシュボード ──────────────────────────────────────────────────
  console.log('→ ダッシュボード')
  await shot('02-02-layout', { fullPage: false })
  await shot('10-01-dashboard', { fullPage: true })

  // 満期アラート部だけクロップ用に同じものを保存
  await shot('10-02-dashboard-expiry', { fullPage: true })

  // ─── 顧客 ────────────────────────────────────────────────────────────
  console.log('→ 顧客')
  await goto('/customers')
  await shot('02-03-filters', { fullPage: false })
  await shot('03-01-customers-list', { fullPage: true })

  await goto('/customers/new')
  await shot('03-02-customer-new', { fullPage: true })

  // 顧客詳細 (一覧から行クリック)
  await goto('/customers')
  const firstCustomerRow = page.locator('table tbody tr').first()
  if ((await firstCustomerRow.count()) > 0) {
    await Promise.all([
      page.waitForURL(/\/customers\/[0-9a-f-]+(\?|$)/, { timeout: 15000 }),
      firstCustomerRow.click(),
    ])
    await page.waitForLoadState('networkidle')
    await shot('03-03-customer-detail', { fullPage: true })

    const familyTab = page.getByRole('tab', { name: /家族/ })
    if ((await familyTab.count()) > 0) {
      await familyTab.first().click()
      await page.waitForTimeout(400)
      await shot('03-04-customer-family', { fullPage: true })
    }
  }

  // ─── 契約 ────────────────────────────────────────────────────────────
  console.log('→ 契約')
  await goto('/contracts')
  await shot('04-01-contracts-list', { fullPage: true })

  await goto('/contracts/new')
  await shot('04-02-contract-new', { fullPage: true })

  await goto('/contracts')
  const firstContractRow = page.locator('table tbody tr').first()
  if ((await firstContractRow.count()) > 0) {
    await Promise.all([
      page.waitForURL(/\/contracts\/[0-9a-f-]+(\?|$)/, { timeout: 15000 }),
      firstContractRow.click(),
    ])
    await page.waitForLoadState('networkidle')
    await shot('04-03-contract-detail', { fullPage: true })

    for (const [tabName, fname] of [
      [/特約/, '04-04-contract-riders'],
      [/更改履歴/, '04-05-contract-renewals'],
    ]) {
      const tab = page.getByRole('tab', { name: tabName })
      if ((await tab.count()) > 0) {
        await tab.first().click()
        await page.waitForTimeout(400)
        await shot(fname, { fullPage: true })
      }
    }
  }

  // ─── 案件 ────────────────────────────────────────────────────────────
  console.log('→ 案件')
  await goto('/opportunities')
  await shot('05-01-opportunities-kanban', { fullPage: true })

  // リストビューに切り替え
  const listBtn = page.getByRole('button', { name: /リスト/ })
  if ((await listBtn.count()) > 0) {
    await listBtn.first().click()
    await page.waitForTimeout(400)
    await shot('05-02-opportunities-list', { fullPage: true })
  }

  // 新規作成モーダル
  await goto('/opportunities')
  const newOppBtn = page.getByRole('button', { name: /新規作成/ })
  if ((await newOppBtn.count()) > 0) {
    await newOppBtn.first().click()
    await page.waitForTimeout(500)
    await shot('05-03-opportunity-new', { fullPage: false })
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
  }

  // 案件詳細 (一覧/カンバンの最初のカードへ)
  await goto('/opportunities')
  const firstKanbanCard = page.locator('a[href*="/opportunities/"]').first()
  if ((await firstKanbanCard.count()) > 0) {
    await Promise.all([
      page.waitForURL(/\/opportunities\/[0-9a-f-]+(\?|$)/, { timeout: 15000 }),
      firstKanbanCard.click(),
    ])
    await page.waitForLoadState('networkidle')
    await shot('05-04-opportunity-detail', { fullPage: true })
  }

  // ─── 意向把握 ─────────────────────────────────────────────────────────
  console.log('→ 意向把握')
  await goto('/intentions')
  await shot('06-01-intentions-list', { fullPage: true })

  // 新規ウィザード Step 1
  await goto('/intentions/new')
  await shot('06-02-intention-step1', { fullPage: true })
  // Step2/3/4 は入力検証を満たさないと進めないためスキップ (手動撮影を推奨)

  // 意向把握詳細 — 一覧の最初の行
  await goto('/intentions')
  const firstIntentionRow = page.locator('table tbody tr a, a[href^="/intentions/"]').first()
  if ((await firstIntentionRow.count()) > 0) {
    try {
      await Promise.all([
        page.waitForURL(/\/intentions\/[0-9a-f-]+(\?|$)/, { timeout: 10000 }),
        firstIntentionRow.click(),
      ])
      await page.waitForLoadState('networkidle')
      await shot('06-06-intention-detail', { fullPage: true })
    } catch {
      console.log('  詳細遷移できず (スキップ)')
    }
  }

  // ─── 精算・MDRT ──────────────────────────────────────────────────────
  console.log('→ 精算・MDRT')
  await goto('/settlement')
  await shot('07-01-settlement', { fullPage: true })

  const importBtn = page.getByRole('button', { name: /CSV.*インポート|インポート/ })
  if ((await importBtn.count()) > 0) {
    await importBtn.first().click()
    await page.waitForTimeout(500)
    await shot('07-02-settlement-import', { fullPage: false })
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
  }

  // ─── カレンダー ──────────────────────────────────────────────────────
  console.log('→ カレンダー')
  await goto('/calendar')
  await shot('08-01-calendar-month', { fullPage: true })

  await goto('/calendar?view=week')
  await shot('08-02-calendar-week', { fullPage: true })

  // 予定モーダル: 新規予定ボタン
  await goto('/calendar')
  const newEventBtn = page.getByRole('button', { name: /新規予定/ })
  if ((await newEventBtn.count()) > 0) {
    await newEventBtn.first().click()
    await page.waitForTimeout(500)
    await shot('08-03-calendar-modal', { fullPage: false })
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
  }

  // ─── レポート ────────────────────────────────────────────────────────
  console.log('→ レポート')
  await goto('/reports')
  await shot('09-01-reports', { fullPage: true })

  // ─── 設定 ────────────────────────────────────────────────────────────
  console.log('→ 設定')
  await goto('/settings')
  await shot('11-01-settings-org', { fullPage: true })

  for (const [tabName, fname] of [
    [/ユーザー管理/, '11-02-settings-users'],
    [/通知設定/, '11-03-settings-notification'],
    [/コンプライアンス/, '11-04-settings-compliance'],
  ]) {
    const tab = page.getByRole('tab', { name: tabName })
    if ((await tab.count()) > 0) {
      await tab.first().click()
      await page.waitForTimeout(400)
      await shot(fname, { fullPage: true })
    }
  }

  // ─── Lark ────────────────────────────────────────────────────────────
  console.log('→ Lark 連携')
  await goto('/lark')
  await shot('12-01-lark-status', { fullPage: false })

  for (const [tabName, fname] of [
    [/^SSO$/, '12-02-lark-sso'],
    [/^Base$/, '12-03-lark-base'],
    [/^Bot$/, '12-04-lark-bot'],
    [/通知テンプレ/, '12-05-lark-templates'],
  ]) {
    const tab = page.getByRole('tab', { name: tabName })
    if ((await tab.count()) > 0) {
      await tab.first().click()
      await page.waitForTimeout(400)
      await shot(fname, { fullPage: true })
    }
  }

  await browser.close()
  console.log('✓ 完了')
}

main().catch((err) => {
  console.error('✗ 失敗:', err)
  process.exit(1)
})
