/**
 * 案件ステージの単一情報源 (Phase 5 doc §ステージ定義)。
 * Phase 1 の CHECK 制約 (opportunities.stage) と必ず同期させること。
 */
export const OPPORTUNITY_STAGES = [
  '初回接触',
  'ニーズ把握',
  '提案中',
  '見積提出',
  'クロージング',
  '成約',
  '失注',
] as const

export type OpportunityStage = (typeof OPPORTUNITY_STAGES)[number]

/** 進行ステージ (成約・失注を除く)。バー表示・カンバン列で使用 */
export const ACTIVE_STAGES = OPPORTUNITY_STAGES.filter(
  (s) => s !== '成約' && s !== '失注',
) as readonly OpportunityStage[]

export const TERMINAL_STAGES = ['成約', '失注'] as const satisfies readonly OpportunityStage[]
