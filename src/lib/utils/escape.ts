/**
 * PostgREST の `or()` フィルタや ilike にユーザー入力をそのまま埋めると、
 * `,` `(` `)` などで構文を壊される (簡易フィルタインジェクション)。
 * 一覧画面の検索クエリは必ず本関数を通すこと。
 */
export function sanitizePostgrestSearch(input: string): string {
  return input
    .replace(/[%_]/g, ' ') // ilike のワイルドカードを無効化
    .replace(/[,()*:]/g, ' ') // or() の構文文字を除去
    .trim()
    .slice(0, 100)
}
