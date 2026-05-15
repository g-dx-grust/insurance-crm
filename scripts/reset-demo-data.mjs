#!/usr/bin/env node

/**
 * HOKENA CRM のデモデータを入れ替えるスクリプト。
 *
 * 実行:
 *   node scripts/reset-demo-data.mjs --yes
 *
 * 対象:
 *   DEMO_TENANT_CODE (既定: hokena) の顧客に紐づく業務データを削除し、
 *   横展開デモで説明しやすい顧客・契約・案件・意向把握・財務確認・
 *   持ち出し記録を再作成する。
 */

import { existsSync, readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

if (!process.argv.includes('--yes')) {
  console.error('デモデータを入れ替えるには --yes を付けて実行してください。')
  process.exit(1)
}

loadLocalEnv()

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
const tenantCode = process.env.DEMO_TENANT_CODE ?? 'hokena'

if (!url || !key) {
  console.error('NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY が必要です。')
  process.exit(1)
}

const admin = createClient(url, key, { auth: { persistSession: false } })

const DEMO_USERS = [
  {
    email: 'misaki.sato@hokena-crm.local',
    password: 'Hokena2026demo!',
    name: '佐藤 美咲',
    name_kana: 'サトウ ミサキ',
    role: 'agent',
    department: '営業一課',
  },
  {
    email: 'kenta.tanaka@hokena-crm.local',
    password: 'Hokena2026demo!',
    name: '田中 健太',
    name_kana: 'タナカ ケンタ',
    role: 'agent',
    department: '営業二課',
  },
  {
    email: 'risa.yamamoto@hokena-crm.local',
    password: 'Hokena2026demo!',
    name: '山本 理沙',
    name_kana: 'ヤマモト リサ',
    role: 'staff',
    department: '業務管理',
  },
]

const tenant = await resolveDemoTenant(tenantCode)

console.log(`対象テナント: ${tenant.name} (${tenant.id})`)

const users = await ensureDemoUsers(tenant.id)
const primaryAgent = users.find((u) => u.email === DEMO_USERS[0].email) ?? users[0]
const secondAgent = users.find((u) => u.email === DEMO_USERS[1].email) ?? primaryAgent
const staffUser = users.find((u) => u.email === DEMO_USERS[2].email) ?? primaryAgent

console.log('\n[1/4] 既存の顧客関連データを削除')
await deleteSignatureObjects(tenant.id)
for (const table of [
  'notification_logs',
  'document_carry_out_logs',
  'financial_situation_checks',
  'intention_signature_evidences',
  'intention_signature_requests',
  'intention_products',
  'intention_records',
  'contact_histories',
  'calendar_events',
  'opportunity_suitability',
  'opportunity_activities',
  'opportunities',
  'contract_riders',
  'settlements',
  'settlement_imports',
  'contracts',
  'family_members',
  'customers',
]) {
  await deleteTenantRows(table, tenant.id)
}

console.log('\n[2/4] 顧客・契約・案件を作成')
const customers = await insertRows('customers', buildCustomers(tenant.id, primaryAgent.id, secondAgent.id))
const byName = new Map(customers.map((customer) => [customer.name, customer]))

await insertRows('family_members', [
  family(tenant.id, byName.get('鈴木 一郎'), '鈴木 陽子', 'スズキ ヨウコ', '配偶者', '1953-04-16', '女性', true, true),
  family(tenant.id, byName.get('田中 花子'), '田中 悠真', 'タナカ ユウマ', '子', '2012-09-20', '男性', false, true),
  family(tenant.id, byName.get('高橋 誠'), '高橋 美緒', 'タカハシ ミオ', '配偶者', '1978-06-11', '女性', true, false),
  family(tenant.id, byName.get('渡辺 美和'), '渡辺 修', 'ワタナベ オサム', '配偶者', '1954-01-28', '男性', true, true),
  family(tenant.id, byName.get('加藤 健一'), '加藤 由里', 'カトウ ユリ', '子', '1979-10-03', '女性', false, true),
])

const contracts = await insertRows('contracts', buildContracts(tenant.id, byName, primaryAgent.id, secondAgent.id))
const byPolicy = new Map(contracts.map((contract) => [contract.policy_number, contract]))

await insertRows('contract_riders', [
  rider(tenant.id, byPolicy.get('HKN-1001'), '先進医療特約', '先進医療にかかる技術料を通算 2,000 万円まで保障', 320, null),
  rider(tenant.id, byPolicy.get('HKN-1003'), '介護年金移行特約', '要介護時に年金受取へ移行可能', 0, null),
  rider(tenant.id, byPolicy.get('HKN-1006'), '弁護士費用特約', '事故対応時の弁護士費用を補償', 410, '2026-08-31'),
  rider(tenant.id, byPolicy.get('HKN-1008'), '入院一時金特約', '入院時に一時金 10 万円', 980, null),
])

const opportunities = await insertRows(
  'opportunities',
  buildOpportunities(tenant.id, byName, primaryAgent.id, secondAgent.id),
)
const byOpportunity = new Map(opportunities.map((opportunity) => [opportunity.title, opportunity]))

await insertRows('opportunity_activities', buildOpportunityActivities(tenant.id, byOpportunity, primaryAgent.id, secondAgent.id))
await insertRows('opportunity_suitability', [
  suitability(tenant.id, byOpportunity.get('変額個人年金の比較提案'), primaryAgent.id, true),
  suitability(tenant.id, byOpportunity.get('法人役員向け医療保障見直し'), secondAgent.id, false),
  suitability(tenant.id, byOpportunity.get('自動車保険の更改提案'), primaryAgent.id, true),
])

console.log('\n[3/4] 意向把握・財務確認・持ち出し記録を作成')
const intentions = await insertRows(
  'intention_records',
  buildIntentions(tenant.id, byName, byPolicy, primaryAgent.id, secondAgent.id, staffUser.id),
)
const byIntentionCustomer = new Map(intentions.map((record) => [record.customer_id, record]))

await insertRows('intention_products', buildIntentionProducts(tenant.id, intentions, byName))
await insertRows('financial_situation_checks', [
  financial(tenant.id, byName.get('鈴木 一郎'), byPolicy.get('HKN-1003'), byIntentionCustomer, primaryAgent.id, '500〜1000万円', '鈴木不動産株式会社', '3年以上', '標準', '退職金の一部を年金原資に充当予定。元本変動リスクを説明済み。'),
  financial(tenant.id, byName.get('田中 花子'), byPolicy.get('HKN-1004'), byIntentionCustomer, secondAgent.id, '300〜500万円', '株式会社ミナト商事', '1〜3年', '標準', '教育資金準備として月額保険料の継続余力を確認。'),
  financial(tenant.id, byName.get('渡辺 美和'), byPolicy.get('HKN-1009'), byIntentionCustomer, primaryAgent.id, '300万円未満', '年金受給', 'なし', '低い', '高齢者対応として家族同席。商品性は図解資料で説明。'),
  financial(tenant.id, byName.get('中村 由紀'), byPolicy.get('HKN-1011'), byIntentionCustomer, secondAgent.id, '1000万円以上', '中村デザイン事務所', '3年以上', '高い', '法人資金と個人資金を分けて確認。'),
])

await insertRows('document_carry_out_logs', buildCarryOutLogs(tenant.id, byName, primaryAgent.id, secondAgent.id, staffUser.id))
await insertRows('contact_histories', buildContactHistories(tenant.id, byName, primaryAgent.id, secondAgent.id, staffUser.id))

const settlementImport = await insertRows('settlement_imports', [
  {
    tenant_id: tenant.id,
    insurance_company: 'サクラ生命',
    settlement_month: '2026-05',
    file_name: 'demo_settlement_2026_05.csv',
    total_rows: 8,
    matched_rows: 7,
    unmatched_rows: 1,
    imported_by: staffUser.id,
    raw_payload: { source: 'reset-demo-data' },
  },
])
await insertRows('settlements', buildSettlements(tenant.id, byPolicy, settlementImport[0]?.id))
await insertRows('calendar_events', buildCalendarEvents(tenant.id, byName, byOpportunity, primaryAgent.id, secondAgent.id, staffUser.id))

console.log('\n[4/4] 管理用サンプルを補完')
await upsertMdrt(tenant.id, primaryAgent.id, secondAgent.id, staffUser.id)
await ensureMeetingTemplates(tenant.id, staffUser.id)

console.log('\n✓ デモデータの入れ替えが完了しました')
console.log(`  顧客: ${customers.length} 件`)
console.log(`  契約: ${contracts.length} 件`)
console.log(`  案件: ${opportunities.length} 件`)
console.log(`  財務状況確認: 4 件`)
console.log(`  持ち出し記録: 5 件`)

function buildCustomers(tenantId, primaryAgentId, secondAgentId) {
  return [
    customer(tenantId, '鈴木 一郎', 'スズキ イチロウ', '1950-06-12', '男性', '既存', primaryAgentId, '150-0001', '東京都渋谷区神宮前1-10-1', '03-4400-1001', 'ichiro.suzuki@example.jp', '高齢者対応対象。長女同席を希望。'),
    customer(tenantId, '田中 花子', 'タナカ ハナコ', '1982-11-03', '女性', '既存', secondAgentId, '220-0012', '神奈川県横浜市西区みなとみらい2-2-1', '045-330-2102', 'hanako.tanaka@example.jp', '教育資金と老後資金の両立を重視。'),
    customer(tenantId, '高橋 誠', 'タカハシ マコト', '1976-02-18', '男性', '見込', secondAgentId, '460-0008', '愛知県名古屋市中区栄3-5-12', '052-210-3303', 'makoto.takahashi@example.jp', '法人役員。医療保障の見直し相談中。'),
    customer(tenantId, '佐々木 直美', 'ササキ ナオミ', '1968-09-21', '女性', '既存', primaryAgentId, '530-0001', '大阪府大阪市北区梅田1-1-3', '06-6100-4404', 'naomi.sasaki@example.jp', '火災保険更改。収支より補償内容重視。'),
    customer(tenantId, '伊藤 翔太', 'イトウ ショウタ', '1992-03-04', '男性', '見込', secondAgentId, '810-0001', '福岡県福岡市中央区天神2-8-38', '092-720-5505', 'shota.ito@example.jp', '住宅購入予定。団信と医療保障の比較希望。'),
    customer(tenantId, '渡辺 美和', 'ワタナベ ミワ', '1955-12-15', '女性', '既存', primaryAgentId, '060-0005', '北海道札幌市中央区北5条西2-5', '011-200-6606', 'miwa.watanabe@example.jp', '高齢者対応対象。面談は対面希望。'),
    customer(tenantId, '小林 大輔', 'コバヤシ ダイスケ', '1988-07-30', '男性', '見込', secondAgentId, '980-0021', '宮城県仙台市青葉区中央1-6-35', '022-300-7707', 'daisuke.kobayashi@example.jp', '自動車保険の事故対応力を重視。'),
    customer(tenantId, '中村 由紀', 'ナカムラ ユキ', '1979-04-10', '女性', '既存', secondAgentId, '730-0031', '広島県広島市中区紙屋町1-2-22', '082-240-8808', 'yuki.nakamura@example.jp', '個人事業主。積立と保障のバランス相談。'),
    customer(tenantId, '加藤 健一', 'カトウ ケンイチ', '1948-01-08', '男性', '休眠', primaryAgentId, '920-0853', '石川県金沢市本町2-15-1', '076-210-9909', 'kenichi.kato@example.jp', '休眠掘り起こし対象。高齢者対応フラグ確認用。'),
    customer(tenantId, '山口 彩', 'ヤマグチ アヤ', '1995-08-25', '女性', '見込', secondAgentId, '900-0015', '沖縄県那覇市久茂地1-1-1', '098-860-1010', 'aya.yamaguchi@example.jp', '初めての保険相談。比較資料を希望。'),
  ]
}

function buildContracts(tenantId, customers, primaryAgentId, secondAgentId) {
  return [
    contract(tenantId, customers.get('鈴木 一郎'), 'HKN-1001', 'サクラ生命', '終身保険プレミア', '生命保険', 18400, '2018-04-01', null, '有効', '未対応', primaryAgentId, '相続対策を兼ねた保障。'),
    contract(tenantId, customers.get('鈴木 一郎'), 'HKN-1003', 'あおぞら年金', '変額個人年金バランス', '年金保険', 30000, '2026-05-01', null, '有効', '未対応', primaryAgentId, '財務状況確認あり。'),
    contract(tenantId, customers.get('田中 花子'), 'HKN-1004', 'みらい積立', '積立ドリーム20', '積立保険', 25000, '2026-04-01', null, '有効', '未対応', secondAgentId, '教育資金準備。'),
    contract(tenantId, customers.get('高橋 誠'), 'HKN-1005', '日本医療', '医療安心プラス', '医療保険', 9200, '2026-03-15', null, '有効', '未対応', secondAgentId, '役員保障の見直し。'),
    contract(tenantId, customers.get('佐々木 直美'), 'HKN-1006', 'セーフ損保', '火災ワイドガード', '損害保険', 11800, '2025-09-01', '2026-08-31', '更改中', '対応中', primaryAgentId, '更改提案中。'),
    contract(tenantId, customers.get('小林 大輔'), 'HKN-1007', 'セーフ損保', '自動車保険ワイド', '損害保険', 8200, '2025-08-01', '2026-07-31', '有効', '更改中', secondAgentId, '事故対応特約を検討。'),
    contract(tenantId, customers.get('渡辺 美和'), 'HKN-1008', 'サクラ生命', '介護サポート終身', '介護保険', 15600, '2019-10-01', null, '有効', '未対応', primaryAgentId, '家族同席面談。'),
    contract(tenantId, customers.get('渡辺 美和'), 'HKN-1009', 'みらい積立', '積立安心10', '積立保険', 15000, '2026-05-10', null, '有効', '未対応', primaryAgentId, '高齢者対応と財務確認あり。'),
    contract(tenantId, customers.get('中村 由紀'), 'HKN-1010', '日本医療', '女性医療セレクト', '医療保険', 7400, '2022-01-01', null, '有効', '未対応', secondAgentId, null),
    contract(tenantId, customers.get('中村 由紀'), 'HKN-1011', 'あおぞら年金', '外貨建年金ステップ', '年金保険', 45000, '2026-02-01', null, '有効', '未対応', secondAgentId, '投資経験あり。'),
    contract(tenantId, customers.get('加藤 健一'), 'HKN-1012', 'サクラ生命', '定期保険ライト', '生命保険', 5600, '2016-06-01', '2026-06-30', '有効', '未対応', primaryAgentId, '満期前フォロー対象。'),
  ]
}

function buildOpportunities(tenantId, customers, primaryAgentId, secondAgentId) {
  return [
    opportunity(tenantId, customers.get('鈴木 一郎'), '変額個人年金の比較提案', '成約', 360000, '2026-05-01', primaryAgentId, '高齢者対応として家族同席で説明済み。', null),
    opportunity(tenantId, customers.get('田中 花子'), '教育資金向け積立提案', '成約', 300000, '2026-04-20', secondAgentId, '積立保険で成約。', null),
    opportunity(tenantId, customers.get('高橋 誠'), '法人役員向け医療保障見直し', '提案中', 180000, '2026-06-10', secondAgentId, '既契約との重複確認中。', null),
    opportunity(tenantId, customers.get('佐々木 直美'), '火災保険更改', '見積提出', 141600, '2026-08-01', primaryAgentId, '水災補償の有無を比較中。', null),
    opportunity(tenantId, customers.get('小林 大輔'), '自動車保険の更改提案', 'ニーズ把握', 98400, '2026-07-10', secondAgentId, 'ドラレコ特約に関心。', null),
    opportunity(tenantId, customers.get('中村 由紀'), '外貨建年金の追加提案', 'クロージング', 540000, '2026-05-25', secondAgentId, '為替リスク説明済み。', null),
    opportunity(tenantId, customers.get('山口 彩'), '初回保障設計', '初回接触', 96000, '2026-06-05', secondAgentId, '初めての保険相談。', null),
    opportunity(tenantId, customers.get('伊藤 翔太'), '住宅購入時の保障相談', '失注', 120000, '2026-05-12', secondAgentId, '住宅ローン審査後に再検討。', '住宅ローン条件確定待ち'),
  ]
}

function buildOpportunityActivities(tenantId, opportunities, primaryAgentId, secondAgentId) {
  return [
    activity(tenantId, opportunities.get('変額個人年金の比較提案'), '訪問', '家族同席でリスク説明。財務状況確認を実施。', '2026-04-25T10:00:00+09:00', primaryAgentId),
    activity(tenantId, opportunities.get('法人役員向け医療保障見直し'), 'メール', '既契約証券の写しを依頼。', '2026-05-13T15:30:00+09:00', secondAgentId),
    activity(tenantId, opportunities.get('火災保険更改'), '電話', '水災補償あり・なしの見積比較を説明。', '2026-05-14T11:00:00+09:00', primaryAgentId),
    activity(tenantId, opportunities.get('外貨建年金の追加提案'), '提案書送付', '外貨建年金の比較表と注意喚起文書を送付。', '2026-05-10T09:15:00+09:00', secondAgentId),
  ]
}

function buildIntentions(tenantId, customers, contracts, primaryAgentId, secondAgentId, staffUserId) {
  return [
    intention(tenantId, customers.get('鈴木 一郎'), contracts.get('HKN-1003'), '退職金の一部を老後資金として運用し、定期的な年金受取を希望。', '2026-04-25T10:15:00+09:00', 'ロ方式', '既契約の保障内容と運用性商品の比較が必要なため。', 'リスク許容度を確認し、変額個人年金バランスを選定。', '2026-04-25T11:20:00+09:00', '承認済', staffUserId, primaryAgentId),
    intention(tenantId, customers.get('田中 花子'), contracts.get('HKN-1004'), '教育資金を計画的に準備したい。保険料は月 3 万円以内。', '2026-04-15T13:00:00+09:00', 'イ方式', '顧客が積立型商品を指定。類似商品との違いを説明。', '払込期間と返戻率のバランスから積立ドリーム20を選定。', '2026-04-15T14:10:00+09:00', '実施済', null, secondAgentId),
    intention(tenantId, customers.get('渡辺 美和'), contracts.get('HKN-1009'), '預金以外で無理のない積立をしたい。元本変動は避けたい。', '2026-05-09T10:00:00+09:00', 'ロ方式', '年齢と商品特性を踏まえ複数案の確認が必要。', '家族同席のうえ、積立安心10を少額で開始。', '2026-05-09T11:00:00+09:00', '承認待', staffUserId, primaryAgentId),
  ]
}

function buildIntentionProducts(tenantId, intentions, customers) {
  const customerById = new Map([...customers.values()].map((customer) => [customer.id, customer.name]))
  return intentions.flatMap((record) => {
    const customerName = customerById.get(record.customer_id)
    if (customerName === '鈴木 一郎') {
      return [
        product(tenantId, record.id, 'あおぞら年金', '変額個人年金バランス', '年金保険', 30000, true, '運用先分散と年金受取設計が希望に合うため。', 0),
        product(tenantId, record.id, 'みらい積立', '積立安心10', '積立保険', 20000, false, '元本安定性は高いが運用性が希望より低いため。', 1),
      ]
    }
    if (customerName === '田中 花子') {
      return [
        product(tenantId, record.id, 'みらい積立', '積立ドリーム20', '積立保険', 25000, true, '払込期間と教育資金の受取時期が一致するため。', 0),
      ]
    }
    return [
      product(tenantId, record.id, 'みらい積立', '積立安心10', '積立保険', 15000, true, '少額で継続可能で、家族同席時の説明内容と一致するため。', 0),
    ]
  })
}

function buildCarryOutLogs(tenantId, customers, primaryAgentId, secondAgentId, staffUserId) {
  return [
    carryOut(tenantId, customers.get('鈴木 一郎'), '変額個人年金 提案設計書', '設計書', '対面面談での説明', '顧客自宅', primaryAgentId, staffUserId, '2026-05-13T09:30:00+09:00', '2026-05-13T18:00:00+09:00', '2026-05-13T17:20:00+09:00', '返却済', null),
    carryOut(tenantId, customers.get('田中 花子'), '積立保険 申込書控え', '申込書', '署名済み書類の代理店持ち帰り', '営業二課', secondAgentId, staffUserId, '2026-05-14T14:00:00+09:00', '2026-05-15T12:00:00+09:00', null, '持出中', '本日午前に返却予定。'),
    carryOut(tenantId, customers.get('佐々木 直美'), '火災保険 見積比較表', '設計書', '更改提案', '顧客店舗', primaryAgentId, primaryAgentId, '2026-05-10T10:00:00+09:00', '2026-05-10T18:00:00+09:00', '2026-05-10T16:45:00+09:00', '返却済', null),
    carryOut(tenantId, customers.get('小林 大輔'), '本人確認書類コピー', '本人確認書類', '自動車保険申込準備', '営業二課', secondAgentId, staffUserId, '2026-05-12T11:00:00+09:00', '2026-05-12T17:00:00+09:00', null, '紛失', '管理者へ報告済み。再発防止として持出袋番号を運用記録。'),
    carryOut(tenantId, customers.get('山口 彩'), '初回相談ヒアリングシート', 'その他', '初回相談内容の社内確認', '営業二課', secondAgentId, secondAgentId, '2026-05-15T09:00:00+09:00', '2026-05-15T18:00:00+09:00', null, '持出中', null),
  ]
}

function buildContactHistories(tenantId, customers, primaryAgentId, secondAgentId, staffUserId) {
  return [
    contact(tenantId, customers.get('鈴木 一郎'), '訪問', '長女同席で変額個人年金のリスクと受取方法を説明。', '契約成立後フォロー連絡', '2026-05-20', '2026-04-25T11:30:00+09:00', primaryAgentId),
    contact(tenantId, customers.get('田中 花子'), 'メール', '積立保険の申込控えと払込スケジュールを送付。', '初回引落前確認', '2026-05-25', '2026-04-16T09:00:00+09:00', secondAgentId),
    contact(tenantId, customers.get('高橋 誠'), '電話', '法人契約と個人契約の違いを説明。既契約証券を依頼。', '証券受領後に提案書作成', '2026-05-22', '2026-05-13T15:40:00+09:00', secondAgentId),
    contact(tenantId, customers.get('佐々木 直美'), '更改', '水災補償あり・なしの更改見積を提示。', '店舗訪問で最終確認', '2026-05-24', '2026-05-14T11:10:00+09:00', primaryAgentId),
    contact(tenantId, customers.get('渡辺 美和'), '訪問', '家族同席で積立保険の説明。高齢者対応として理解度確認。', '承認後に申込手続き', '2026-05-19', '2026-05-09T11:15:00+09:00', primaryAgentId),
    contact(tenantId, customers.get('小林 大輔'), '電話', '自動車保険の使用目的と年間走行距離を確認。', '見積作成', '2026-05-18', '2026-05-12T10:20:00+09:00', secondAgentId),
    contact(tenantId, customers.get('山口 彩'), 'LINE', '初回相談の日程候補を送付。', 'Web面談', '2026-05-21', '2026-05-15T09:20:00+09:00', staffUserId),
  ]
}

function buildSettlements(tenantId, contracts, importId) {
  return [
    settlement(tenantId, contracts.get('HKN-1001'), '鈴木 一郎', 'サクラ生命', '2026-05', 18400, 18400, 5520, 30, '完了', importId),
    settlement(tenantId, contracts.get('HKN-1003'), '鈴木 一郎', 'あおぞら年金', '2026-05', 30000, 30000, 9000, 30, '照合中', importId),
    settlement(tenantId, contracts.get('HKN-1004'), '田中 花子', 'みらい積立', '2026-05', 25000, 25000, 7500, 30, '完了', importId),
    settlement(tenantId, contracts.get('HKN-1005'), '高橋 誠', '日本医療', '2026-05', 9200, 9200, 2760, 30, '未精算', importId),
    settlement(tenantId, contracts.get('HKN-1006'), '佐々木 直美', 'セーフ損保', '2026-05', 11800, 11000, 2600, 22, '差異あり', importId),
    settlement(tenantId, contracts.get('HKN-1011'), '中村 由紀', 'あおぞら年金', '2026-05', 45000, 45000, 13500, 30, '完了', importId),
  ]
}

function buildCalendarEvents(tenantId, customers, opportunities, primaryAgentId, secondAgentId, staffUserId) {
  return [
    event(tenantId, '鈴木様 契約後フォロー', '電話', '2026-05-20T10:00:00+09:00', '2026-05-20T10:30:00+09:00', customers.get('鈴木 一郎'), opportunities.get('変額個人年金の比較提案'), primaryAgentId, '電話', '年金受取開始時期を再確認。'),
    event(tenantId, '高橋様 医療保障提案', 'Web会議', '2026-05-22T14:00:00+09:00', '2026-05-22T15:00:00+09:00', customers.get('高橋 誠'), opportunities.get('法人役員向け医療保障見直し'), secondAgentId, 'Google Meet', null),
    event(tenantId, '佐々木様 火災更改訪問', '訪問', '2026-05-24T11:00:00+09:00', '2026-05-24T12:00:00+09:00', customers.get('佐々木 直美'), opportunities.get('火災保険更改'), primaryAgentId, '顧客店舗', null),
    event(tenantId, '山口様 初回相談', 'Web会議', '2026-05-21T18:00:00+09:00', '2026-05-21T19:00:00+09:00', customers.get('山口 彩'), opportunities.get('初回保障設計'), secondAgentId, 'Zoom', '初回ヒアリング。'),
    event(tenantId, '月次精算チェック', '書類作業', '2026-05-16T09:30:00+09:00', '2026-05-16T11:00:00+09:00', null, null, staffUserId, '本社', '差異あり明細を確認。'),
  ]
}

async function ensureDemoUsers(tenantId) {
  const { data: currentProfiles, error: profilesError } = await admin
    .from('user_profiles')
    .select('id, email, name, role, is_active')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
  if (profilesError) fail('既存ユーザー取得に失敗しました', profilesError)

  const { data: usersList, error: listError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  })
  if (listError) fail('Auth ユーザー一覧取得に失敗しました', listError)

  const ensured = []
  for (const demoUser of DEMO_USERS) {
    const existingAuth = usersList.users.find((user) => user.email === demoUser.email)
    let userId = existingAuth?.id
    if (userId) {
      const { error } = await admin.auth.admin.updateUserById(userId, {
        password: demoUser.password,
        email_confirm: true,
        user_metadata: { ...(existingAuth.user_metadata ?? {}), name: demoUser.name },
      })
      if (error) fail(`${demoUser.email} の Auth 更新に失敗しました`, error)
    } else {
      const { data, error } = await admin.auth.admin.createUser({
        email: demoUser.email,
        password: demoUser.password,
        email_confirm: true,
        user_metadata: { source: 'reset-demo-data', name: demoUser.name },
      })
      if (error || !data.user) fail(`${demoUser.email} の Auth 作成に失敗しました`, error)
      userId = data.user.id
    }

    const profile = {
      id: userId,
      tenant_id: tenantId,
      name: demoUser.name,
      name_kana: demoUser.name_kana,
      email: demoUser.email,
      role: demoUser.role,
      department: demoUser.department,
      is_active: true,
    }
    const { data, error } = await admin
      .from('user_profiles')
      .upsert(profile)
      .select('id, email, name, role')
      .single()
    if (error || !data) fail(`${demoUser.email} の profile upsert に失敗しました`, error)
    ensured.push(data)
  }

  return [...ensured, ...(currentProfiles ?? [])].filter(
    (profile, index, list) => list.findIndex((item) => item.id === profile.id) === index,
  )
}

async function resolveDemoTenant(code) {
  const primary = await findTenantByCode(code)
  if (primary) return primary

  if (code === 'hokena') {
    const legacy = await findTenantByCode('n-lic')
    if (legacy) {
      const { data, error } = await admin
        .from('tenants')
        .update({
          name: 'HOKENA デモ代理店',
          code: 'hokena',
          settings: {
            elderly_age_threshold: 70,
            access_scope: 'tenant_wide',
            lark: {
              sso_enabled: false,
              base: { base_id: null, sync_customers: false, sync_contracts: false, sync_opportunities: false },
              calendar: { calendar_id: null, sync_events: false },
              approval: { intention_flow_id: null },
              bot: {
                alert_chat_id: null,
                expiry_days_before: 30,
                notify_approval: true,
                notify_settlement: true,
              },
            },
          },
        })
        .eq('id', legacy.id)
        .select('id, name, code')
        .single()
      if (error || !data) fail('旧テナントの HOKENA 化に失敗しました', error)
      console.log(`旧テナント ${legacy.code} を ${data.code} に更新しました`)
      return data
    }
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

async function deleteTenantRows(table, tenantId) {
  const { count, error } = await admin
    .from(table)
    .delete({ count: 'exact' })
    .eq('tenant_id', tenantId)

  if (error) fail(`${table} の削除に失敗しました`, error)
  console.log(`  ${table}: ${count ?? 0} 件削除`)
}

async function deleteSignatureObjects(tenantId) {
  const bucket = admin.storage.from('intention-signatures')
  const paths = []

  async function walk(path) {
    const { data, error } = await bucket.list(path, { limit: 1000 })
    if (error) {
      if (error.message.includes('not found')) return
      fail('署名ストレージ一覧取得に失敗しました', error)
    }
    for (const item of data ?? []) {
      const fullPath = path ? `${path}/${item.name}` : item.name
      if (item.id) paths.push(fullPath)
      else await walk(fullPath)
    }
  }

  await walk(tenantId)
  if (paths.length === 0) {
    console.log('  intention-signatures: 0 件削除')
    return
  }

  for (let i = 0; i < paths.length; i += 100) {
    const { error } = await bucket.remove(paths.slice(i, i + 100))
    if (error) fail('署名ストレージ削除に失敗しました', error)
  }
  console.log(`  intention-signatures: ${paths.length} 件削除`)
}

async function insertRows(table, rows) {
  const filtered = rows.filter(Boolean)
  if (filtered.length === 0) return []
  const { data, error } = await admin.from(table).insert(filtered).select('*')
  if (error) fail(`${table} の作成に失敗しました`, error)
  console.log(`  ${table}: ${filtered.length} 件作成`)
  return data ?? []
}

async function upsertMdrt(tenantId, primaryAgentId, secondAgentId, staffUserId) {
  const { error: targetError } = await admin.from('mdrt_targets').upsert(
    {
      tenant_id: tenantId,
      year: 2026,
      mdrt_target: 6000000,
      cot_target: 12000000,
      tot_target: 18000000,
    },
    { onConflict: 'tenant_id,year' },
  )
  if (targetError) fail('MDRT 目標の upsert に失敗しました', targetError)

  const performances = [
    { tenant_id: tenantId, user_id: primaryAgentId, year: 2026, insurance_company: 'サクラ生命', performance_value: 4280000 },
    { tenant_id: tenantId, user_id: primaryAgentId, year: 2026, insurance_company: 'あおぞら年金', performance_value: 2160000 },
    { tenant_id: tenantId, user_id: secondAgentId, year: 2026, insurance_company: 'みらい積立', performance_value: 3840000 },
    { tenant_id: tenantId, user_id: staffUserId, year: 2026, insurance_company: '複数社', performance_value: 960000 },
  ]
  const { error } = await admin
    .from('mdrt_performances')
    .upsert(performances, { onConflict: 'tenant_id,user_id,year,insurance_company' })
  if (error) fail('MDRT 実績の upsert に失敗しました', error)
  console.log('  mdrt_targets / mdrt_performances: 更新')
}

async function ensureMeetingTemplates(tenantId, createdBy) {
  const { data, error } = await admin
    .from('meeting_record_templates')
    .select('id')
    .eq('tenant_id', tenantId)
    .limit(1)
  if (error) fail('面談テンプレート確認に失敗しました', error)
  if ((data ?? []).length > 0) {
    console.log('  meeting_record_templates: 既存テンプレートを維持')
    return
  }

  await insertRows('meeting_record_templates', [
    template(tenantId, '初回ヒアリング', '訪問', '家族構成、既契約、保険料予算、保障で不安な点を確認。次回までに比較提案を準備する。', '比較提案書を作成', 10, createdBy),
    template(tenantId, '更改前フォロー', '更改', '満期日、現在の補償内容、事故歴、変更希望、保険料許容範囲を確認。', '更改見積を提示', 20, createdBy),
    template(tenantId, '高齢者対応面談', '訪問', '家族同席の有無、理解度確認、商品リスク、契約意思を丁寧に確認。', '同席者へ控えを送付', 30, createdBy),
    template(tenantId, '書類回収連絡', '電話', '不足書類、提出期限、回収方法を確認。個人情報書類の持ち出し記録が必要な場合は記録する。', '書類回収予定を登録', 40, createdBy),
  ])
}

function customer(tenantId, name, nameKana, birthDate, gender, status, assignedTo, postalCode, address, phone, email, note) {
  return {
    id: randomUUID(),
    tenant_id: tenantId,
    name,
    name_kana: nameKana,
    birth_date: birthDate,
    gender,
    postal_code: postalCode,
    address,
    phone,
    email,
    status,
    assigned_to: assignedTo,
    note,
  }
}

function family(tenantId, customer, name, nameKana, relationship, birthDate, gender, isInsured, isBeneficiary) {
  if (!customer) return null
  return {
    tenant_id: tenantId,
    customer_id: customer.id,
    name,
    name_kana: nameKana,
    relationship,
    birth_date: birthDate,
    gender,
    is_insured: isInsured,
    is_beneficiary: isBeneficiary,
  }
}

function contract(tenantId, customer, policyNumber, insuranceCompany, productName, productCategory, premium, startDate, expiryDate, status, renewalStatus, assignedTo, note) {
  return {
    id: randomUUID(),
    tenant_id: tenantId,
    customer_id: customer.id,
    policy_number: policyNumber,
    insurance_company: insuranceCompany,
    product_name: productName,
    product_category: productCategory,
    premium,
    start_date: startDate,
    expiry_date: expiryDate,
    status,
    renewal_status: renewalStatus,
    assigned_to: assignedTo,
    note,
  }
}

function rider(tenantId, contractRow, name, coverage, premium, expiryDate) {
  if (!contractRow) return null
  return {
    tenant_id: tenantId,
    contract_id: contractRow.id,
    name,
    coverage,
    premium,
    expiry_date: expiryDate,
    is_active: true,
  }
}

function opportunity(tenantId, customer, title, stage, estimatedPremium, expectedCloseDate, assignedTo, note, lostReason) {
  return {
    id: randomUUID(),
    tenant_id: tenantId,
    customer_id: customer.id,
    title,
    stage,
    estimated_premium: estimatedPremium,
    expected_close_date: expectedCloseDate,
    assigned_to: assignedTo,
    note,
    lost_reason: lostReason,
  }
}

function activity(tenantId, opportunityRow, type, content, activityDate, recordedBy) {
  if (!opportunityRow) return null
  return {
    tenant_id: tenantId,
    opportunity_id: opportunityRow.id,
    type,
    content,
    activity_date: activityDate,
    recorded_by: recordedBy,
  }
}

function suitability(tenantId, opportunityRow, recordedBy, done) {
  if (!opportunityRow) return null
  return {
    tenant_id: tenantId,
    opportunity_id: opportunityRow.id,
    age_confirmed: true,
    income_confirmed: done,
    family_confirmed: true,
    existing_confirmed: true,
    need_confirmed: true,
    product_explained: done,
    premium_confirmed: done,
    comparison_done: done,
    consent_obtained: done,
    recorded_by: recordedBy,
  }
}

function intention(tenantId, customer, contractRow, initialIntention, initialRecordedAt, comparisonMethod, comparisonReason, finalIntention, finalRecordedAt, status, approverId, createdBy) {
  return {
    id: randomUUID(),
    tenant_id: tenantId,
    customer_id: customer.id,
    contract_id: contractRow?.id ?? null,
    initial_intention: initialIntention,
    initial_recorded_at: initialRecordedAt,
    comparison_method: comparisonMethod,
    comparison_reason: comparisonReason,
    final_intention: finalIntention,
    final_recorded_at: finalRecordedAt,
    checklist: {
      customer_needs_confirmed: true,
      product_comparison_explained: true,
      important_matters_explained: true,
      customer_understanding_confirmed: true,
      elderly_customer_followed: customer.birth_date <= '1956-05-15',
      _change_note: 'デモデータとして登録',
    },
    status,
    approver_id: approverId,
    approved_at: status === '承認済' ? '2026-04-26T09:00:00+09:00' : null,
    created_by: createdBy,
  }
}

function product(tenantId, intentionRecordId, insuranceCompany, productName, productCategory, premium, isRecommended, recommendationReason, sortOrder) {
  return {
    tenant_id: tenantId,
    intention_record_id: intentionRecordId,
    insurance_company: insuranceCompany,
    product_name: productName,
    product_category: productCategory,
    premium,
    is_recommended: isRecommended,
    recommendation_reason: recommendationReason,
    sort_order: sortOrder,
  }
}

function financial(tenantId, customer, contractRow, intentionMap, recordedBy, annualIncome, employerName, investmentExperience, investmentKnowledge, note) {
  if (!customer) return null
  const intentionRecord = intentionMap.get(customer.id)
  return {
    tenant_id: tenantId,
    customer_id: customer.id,
    contract_id: contractRow?.id ?? null,
    intention_record_id: intentionRecord?.id ?? null,
    source: intentionRecord ? 'intention' : 'manual',
    annual_income: annualIncome,
    employer_name: employerName,
    investment_experience: investmentExperience,
    investment_knowledge: investmentKnowledge,
    note,
    recorded_by: recordedBy,
    recorded_at: '2026-05-15T09:00:00+09:00',
  }
}

function carryOut(tenantId, customer, title, type, purpose, destination, carriedBy, createdBy, carriedAt, expectedReturnAt, returnedAt, status, note) {
  return {
    tenant_id: tenantId,
    customer_id: customer?.id ?? null,
    document_title: title,
    document_type: type,
    purpose,
    destination,
    carried_out_by: carriedBy,
    carried_out_at: carriedAt,
    expected_return_at: expectedReturnAt,
    returned_at: returnedAt,
    status,
    loss_reported_at: status === '紛失' ? '2026-05-12T17:30:00+09:00' : null,
    note,
    created_by: createdBy,
  }
}

function contact(tenantId, customer, type, content, nextAction, nextActionDate, contactedAt, recordedBy) {
  return {
    tenant_id: tenantId,
    customer_id: customer.id,
    type,
    content,
    next_action: nextAction,
    next_action_date: nextActionDate,
    contacted_at: contactedAt,
    recorded_by: recordedBy,
  }
}

function settlement(tenantId, contractRow, customerName, insuranceCompany, month, invoiceAmount, paymentAmount, feeAmount, feeRate, status, importId) {
  return {
    tenant_id: tenantId,
    contract_id: contractRow?.id ?? null,
    customer_name: customerName,
    insurance_company: insuranceCompany,
    settlement_month: month,
    invoice_amount: invoiceAmount,
    payment_amount: paymentAmount,
    fee_amount: feeAmount,
    fee_rate: feeRate,
    status,
    source_import_id: importId ?? null,
    note: status === '差異あり' ? 'デモ用差異。代理店手数料率を確認。' : null,
  }
}

function event(tenantId, title, type, startAt, endAt, customer, opportunityRow, assignedTo, location, note) {
  return {
    tenant_id: tenantId,
    title,
    type,
    start_at: startAt,
    end_at: endAt,
    all_day: false,
    related_customer_id: customer?.id ?? null,
    related_opportunity_id: opportunityRow?.id ?? null,
    assigned_to: assignedTo,
    location,
    note,
  }
}

function template(tenantId, title, type, content, nextAction, sortOrder, createdBy) {
  return {
    tenant_id: tenantId,
    title,
    type,
    content,
    next_action: nextAction,
    sort_order: sortOrder,
    is_active: true,
    created_by: createdBy,
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
