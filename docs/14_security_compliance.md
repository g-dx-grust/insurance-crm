# 14. セキュリティとコンプライアンス

> N-LIC CRM のセキュリティ統制、保険業法対応、データ保持・破棄ポリシーをまとめます。
> 導入前審査・社内コンプラ部門への説明に利用してください。

## アクセス制御の二重構造

UI ガードだけではなく、データベースの **Row Level Security (RLS)** で多重に防御しています。

```
┌─────────────────────────────────────────────────────┐
│  ① UI ガード   ロールに応じて画面・ボタンを出し分け    │
└──────────────────┬──────────────────────────────────┘
                   │ URL 直叩きでも
                   ▼
┌─────────────────────────────────────────────────────┐
│  ② Server Action  Server 側で再度ロール確認           │
└──────────────────┬──────────────────────────────────┘
                   │ 例外的に通過しても
                   ▼
┌─────────────────────────────────────────────────────┐
│  ③ Supabase RLS  DB レベルで tenant_id + ロールを    │
│                  最終チェック (`current_user_role`)   │
└─────────────────────────────────────────────────────┘
```

### テナント分離

すべての業務テーブルに `tenant_id` カラムがあり、RLS で以下のポリシーが適用されます：

```sql
USING ( tenant_id = current_user_tenant_id() )
```

`current_user_tenant_id()` は **ログインユーザーの user_profiles から取得** される SQL 関数。他テナントのデータは原理的に参照不可。

### ロール別 RLS

| 対象 | admin | agent | staff |
|---|---|---|---|
| 顧客 (customers) | 全件 R/W | 自分担当のみ | 全件 R/W |
| 契約 (contracts) | 全件 R/W | 自分担当のみ | 全件 R/W |
| 案件 (opportunities) | 全件 R/W | 自分担当のみ | 全件 R/W |
| 意向把握 (intention_records) | 全件 R + 承認 | 自分作成のみ R/W、承認不可 | 全件 R、作成不可 |
| 精算 (settlements) | 全件 R/W | R only | R only |
| 監査ログ (audit_logs) | R only | R only（自分の操作のみ） | R only（自分の操作のみ） |

> 💡 `tenants.settings.access_scope` を `tenant_wide` にすると、agent も全顧客を見られます。代理店の運用方針に合わせて切替可能（現状は技術担当が SQL で更新）。

## 認証

| 方式 | 状態 |
|---|---|
| ID + パスワード（Supabase Auth） | ✅ 利用可能 |
| Lark OAuth | 🔧 準備中（[12. Lark 連携](./12_lark_integration.md)） |
| パスワード強度 | Supabase 標準（8 文字以上） |
| MFA / 2FA | Supabase Auth 側設定で有効化可（未デフォルト） |
| セッション期限 | Supabase デフォルト（リフレッシュトークン 7 日） |

## 保険業法対応

### 意向把握記録

| 項目 | 対応 |
|---|---|
| 物理削除 | **禁止**。`deleted_at` 論理削除のみ。RLS でも `DELETE` ポリシー未定義 |
| 編集制限 | `承認済` 後は編集不可 |
| 承認フロー | 担当者作成 → 管理者承認 → 確定 |
| 監査証跡 | `audit_logs` に作成・承認・差戻し・編集をすべて記録 |
| 比較推奨 | イ方式 / ロ方式 を選択し、説明を強制（チェックリスト 9 項目） |
| 高齢者対応 | 顧客が高齢者の場合、追加チェック項目を必須化 |
| 保管期間 | 設定 > コンプライアンス > データ保持年数（既定 10 年） |

詳細は [06. 意向把握](./06_intentions.md) 参照。

### 高齢者対応

| 項目 | 仕組み |
|---|---|
| 高齢者判定 | `customers_with_age` ビューで生年月日から年齢を自動算出 |
| 閾値 | `tenants.settings.elderly_age_threshold`（既定 70 歳） |
| UI 表示 | 高齢者顧客の詳細画面に **警告バナー** |
| 意向把握 | チェックリスト「高齢者対応を実施した」が必須に |
| 推奨運用 | 家族同席または録音・録画 |

## 監査ログ

`audit_logs` テーブルに以下を記録：

| 列 | 内容 |
|---|---|
| `id` | UUID |
| `tenant_id` | テナント |
| `actor_id` | 操作したユーザー (`user_profiles.id`) |
| `action` | `CREATE` / `UPDATE` / `DELETE` / `APPROVE` / `REJECT` / `LOGIN` 等 |
| `target_type` | `customer` / `contract` / `opportunity` / `intention_record` 等 |
| `target_id` | 対象レコードの UUID |
| `changes` | 変更内容（JSONB、編集前後の差分） |
| `created_at` | タイムスタンプ |

> 💡 監査ログ閲覧 UI は将来追加予定。現状は SQL での確認（[13. 管理者運用](./13_admin_operations.md) 参照）。

## データ保持・削除

### 論理削除

| テーブル | 削除方式 | 復元 |
|---|---|---|
| customers | `deleted_at` セット | 技術担当が SQL でクリア |
| contracts | `deleted_at` セット | 技術担当が SQL でクリア |
| opportunities | `deleted_at` セット | 技術担当が SQL でクリア |
| intention_records | `deleted_at` セット | **原則復元しない**（業法証跡として保持） |
| family_members | 物理削除 | 不可 |
| contact_histories | 物理削除されない（業法対応） | — |

### データ保持年数

設定 > コンプライアンス > **データ保持年数**（既定 10 年）。

- 削除済みデータでも、保持年数を超えるまで物理削除しません。
- 保持年数を超過したデータについて、技術担当が SQL で物理削除する運用を想定。
- 監査ログは別途長期保管（保険業法上の保管義務に合わせる）。

## 機密情報の取扱い

### 環境変数（秘匿）

| 変数 | 漏洩リスク | 対応 |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | RLS バイパス、全データ操作可 | Vercel Sensitive、Preview デプロイから除外 |
| `LARK_APP_SECRET` | Lark API 操作 | Vercel Sensitive |
| `LARK_WEBHOOK_VERIFY_TOKEN` | Webhook 偽装 | Vercel Sensitive |

### クライアント側に露出してよい変数

`NEXT_PUBLIC_` プレフィックス付きのみ：

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`（Anonymous Key は RLS で制限される）
- `NEXT_PUBLIC_APP_URL`

## ネットワーク

| 項目 | 内容 |
|---|---|
| 通信 | 全リクエスト HTTPS（Vercel が自動 TLS） |
| Supabase 通信 | TLS（クライアント・サーバー両方） |
| Lark API | TLS |

## 脆弱性対策

| 種別 | 対応 |
|---|---|
| SQL Injection | Supabase クライアントが PostgREST 経由で実行、生 SQL は admin 操作のみ |
| XSS | React のデフォルトエスケープ、`dangerouslySetInnerHTML` 不使用 |
| CSRF | Supabase Auth セッション + Next.js Server Actions の SameSite Cookie |
| CSV インポートインジェクション | サニタイズ層（`sanitizePostgrestSearch` 等） |
| 認可バイパス | RLS + Server Actions の二重防御 |

## インシデント時の連絡フロー

> 実運用では下記を埋めて連絡先を確定させてください。

1. **検知**：監視ツール（Sentry／Vercel／Supabase）または利用者からの通報
2. **一次対応者**：開発担当（XX）
3. **エスカレーション**：管理責任者（XX） → 代理店オーナー（XX）
4. **対外**：必要に応じて顧客告知・監督官庁報告

## コンプライアンスチェックリスト

新規導入時のチェック項目：

- [ ] 管理者 1 名以上が登録されている
- [ ] `elderly_age_threshold` が法令準拠の値（既定 70 歳）
- [ ] 「新規契約に意向把握書を必須化」が ON
- [ ] 「意向把握書の承認を必須化」が ON
- [ ] データ保持年数が法定保管期間以上
- [ ] `SUPABASE_SERVICE_ROLE_KEY` が Vercel Sensitive
- [ ] バックアップ取得頻度・保持期間が組織ポリシーを満たす
- [ ] スタッフ研修（操作・コンプラ）を完了
- [ ] 監査ログの定期確認体制を整備
