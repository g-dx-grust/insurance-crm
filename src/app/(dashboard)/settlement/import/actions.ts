'use server'

import { revalidatePath } from 'next/cache'
import { parse } from 'csv-parse/sync'
import { createClient } from '@/lib/supabase/server'
import {
  getCurrentTenantId,
  getSessionUserOrRedirect,
} from '@/lib/auth/server'
import { CSV_TEMPLATES } from '@/lib/settlement/csvTemplates'

type CsvRow = Record<string, string>

export type ImportCsvResult =
  | {
      ok: true
      matched: number
      unmatched: number
      total: number
      importLogId: string
    }
  | { ok: false; error: string; details?: string }

export async function importSettlementCsv(
  formData: FormData,
): Promise<ImportCsvResult> {
  const supabase = await createClient()
  const tenantId = await getCurrentTenantId()
  const { user } = await getSessionUserOrRedirect()

  const file = formData.get('file')
  const templateName = formData.get('template')
  const settlementMonth = formData.get('month')

  if (!(file instanceof File)) return { ok: false, error: 'ファイルを選択してください' }
  if (typeof templateName !== 'string')
    return { ok: false, error: 'テンプレートを選択してください' }
  if (typeof settlementMonth !== 'string' || !/^\d{4}-\d{2}$/.test(settlementMonth))
    return { ok: false, error: '対象月 (YYYY-MM) を指定してください' }

  const template = CSV_TEMPLATES.find((t) => t.insurance_company === templateName)
  if (!template) return { ok: false, error: 'テンプレートが不正です' }

  // 1. ファイル読み込み (エンコーディング吸収)
  const buffer = await file.arrayBuffer()
  let text: string
  try {
    text =
      template.encoding === 'shift_jis'
        ? new TextDecoder('shift_jis').decode(buffer)
        : new TextDecoder('utf-8').decode(buffer)
  } catch (e) {
    return {
      ok: false,
      error: 'ファイルのデコードに失敗しました',
      details: String(e),
    }
  }

  // 2. パース
  let rows: CsvRow[]
  try {
    rows = parse(text, {
      columns: true,
      skip_empty_lines: true,
      bom: true,
      trim: true,
    }) as CsvRow[]
  } catch (e) {
    return {
      ok: false,
      error: 'CSV の解析に失敗しました',
      details: String(e),
    }
  }

  if (rows.length === 0) {
    return { ok: false, error: 'CSV に有効な行がありません' }
  }

  // 3. 既存契約との突合
  const policyNumbers = rows
    .map((row) => row[template.columns.policy_number])
    .filter(Boolean)

  const { data: contracts } = await supabase
    .from('contracts')
    .select('id, policy_number, customer_id')
    .eq('insurance_company', template.insurance_company)
    .in('policy_number', policyNumbers)

  const contractMap = new Map(contracts?.map((c) => [c.policy_number, c]) ?? [])

  // 4. 取込履歴を先に作る
  const { data: importLog, error: importErr } = await supabase
    .from('settlement_imports')
    .insert({
      tenant_id: tenantId,
      insurance_company: template.insurance_company,
      settlement_month: settlementMonth,
      file_name: file.name,
      total_rows: rows.length,
      matched_rows: 0,
      unmatched_rows: 0,
      imported_by: user.id,
      raw_payload: rows,
    })
    .select('id')
    .single()

  if (importErr || !importLog) {
    return { ok: false, error: '取込履歴の作成に失敗しました' }
  }

  // 5. settlements に挿入
  let matched = 0
  let unmatched = 0
  const inserts = rows.map((row) => {
    const policyNumber = row[template.columns.policy_number]
    const contract = contractMap.get(policyNumber)
    if (contract) matched++
    else unmatched++

    return {
      tenant_id: tenantId,
      contract_id: contract?.id ?? null,
      customer_name: row[template.columns.customer_name] ?? '',
      insurance_company: template.insurance_company,
      settlement_month: settlementMonth,
      invoice_amount: toInt(row[template.columns.invoice_amount]),
      payment_amount: toInt(row[template.columns.payment_amount]),
      fee_amount: toInt(row[template.columns.fee_amount]),
      fee_rate: template.columns.fee_rate
        ? toFloat(row[template.columns.fee_rate])
        : null,
      status: contract ? '照合中' : '差異あり',
      source_import_id: importLog.id,
    }
  })

  const { error: insertErr } = await supabase.from('settlements').insert(inserts)
  if (insertErr) {
    return { ok: false, error: '精算データの保存に失敗しました', details: insertErr.message }
  }

  // 6. 取込履歴に matched/unmatched を反映
  await supabase
    .from('settlement_imports')
    .update({ matched_rows: matched, unmatched_rows: unmatched })
    .eq('id', importLog.id)

  revalidatePath('/settlement')

  return {
    ok: true,
    matched,
    unmatched,
    total: rows.length,
    importLogId: importLog.id,
  }
}

function toInt(s: string | undefined): number {
  if (!s) return 0
  const n = parseInt(s.replace(/[,¥\s]/g, ''), 10)
  return Number.isFinite(n) ? n : 0
}

function toFloat(s: string | undefined): number | null {
  if (!s) return null
  const n = parseFloat(s.replace(/[%,\s]/g, ''))
  return Number.isFinite(n) ? n : null
}
