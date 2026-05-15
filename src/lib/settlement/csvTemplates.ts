/**
 * 保険会社別 CSV テンプレート。実際の列名は導入代理店ヒアリング後に確定。
 * 暫定値で進行 (memory: pending_pdf_ocr.md 参照)。
 */
export interface CsvTemplate {
  insurance_company: string
  encoding: 'shift_jis' | 'utf-8'
  columns: {
    policy_number: string
    customer_name: string
    settlement_month: string
    invoice_amount: string
    payment_amount: string
    fee_amount: string
    fee_rate?: string
  }
}

export const CSV_TEMPLATES: CsvTemplate[] = [
  {
    insurance_company: '日本生命',
    encoding: 'shift_jis',
    columns: {
      policy_number: '証券番号',
      customer_name: '契約者名',
      settlement_month: '計上月',
      invoice_amount: '請求額',
      payment_amount: '入金額',
      fee_amount: '手数料額',
      fee_rate: '手数料率',
    },
  },
  {
    insurance_company: '東京海上日動',
    encoding: 'utf-8',
    columns: {
      policy_number: 'policy_no',
      customer_name: 'customer',
      settlement_month: 'month',
      invoice_amount: 'invoice',
      payment_amount: 'payment',
      fee_amount: 'fee',
    },
  },
  {
    insurance_company: 'アフラック',
    encoding: 'shift_jis',
    columns: {
      policy_number: '証券Ｎｏ',
      customer_name: '契約者氏名',
      settlement_month: '対象月',
      invoice_amount: '請求金額',
      payment_amount: '入金金額',
      fee_amount: '手数料',
      fee_rate: '料率',
    },
  },
]
