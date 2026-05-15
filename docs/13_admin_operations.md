# 13. 管理者運用

> 管理者ロール (`admin`) が日常的に行う、現場では直接見えないオペレーションをまとめます。

## 日常運用カレンダー

| 頻度 | 作業 | 画面 |
|---|---|---|
| 毎朝 | ダッシュボードで「承認待ち意向把握」「満期アラート」を確認 | [10. ダッシュボード](./10_dashboard.md) |
| 毎週 | レポート画面で担当者別実績を確認 | [09. レポート](./09_reports.md) |
| 毎月初 | 月次精算 CSV を取り込み・照合 | [07. 精算・MDRT 管理](./07_settlement.md) |
| 毎月末 | MDRT 進捗を確認、達成見込みの低い担当者をフォロー | [07. 精算・MDRT 管理](./07_settlement.md) |
| 不定期 | 意向把握書の承認 | [06. 意向把握](./06_intentions.md) |
| 不定期 | ユーザー招待・ロール変更 | [11. 設定](./11_settings.md) |

## ユーザー管理

### 新しいスタッフを迎え入れる

1. **［設定］** → **［ユーザー管理］** タブ → **［ユーザーを招待］**
2. メールアドレス、氏名、ロールを入力 → 招待送信
3. スタッフがメール内リンクをクリック → パスワード設定
4. ログイン → 担当者として顧客・契約に紐付け可能

### スタッフが退職する

1. **［設定］** → **［ユーザー管理］** → 該当ユーザー行 → **［無効化］**
2. ログイン不可、担当選択肢から除外
3. **過去の対応履歴・担当履歴・監査ログは残ります**

> ⚠️ 「物理削除」はできません。退職者の **アカウント削除** ではなく、必ず「無効化」で対応してください。データの整合性が保たれます。

### ロール変更

ロールはいつでも変更可能：

| 変更 | 影響 |
|---|---|
| staff → agent | 自分が担当する顧客に対する意向把握作成権限を付与 |
| agent → admin | すべての画面で編集可能、設定変更権限を付与 |
| admin → staff | 設定画面から弾かれる、意向把握の承認権限を失う |

> ⚠️ **最後の管理者** を staff に降格しないでください。設定画面・Lark 連携が誰も操作できなくなります。最低 1 名は admin を維持してください。

## パスワード再発行

利用者からの依頼ベース：

1. 管理者は Supabase ダッシュボード → Authentication → Users で該当ユーザーを検索
2. **［Send password reset email］** で再発行メールを送る
3. または Supabase の SQL Editor から `auth.admin.generate_link` を実行

> 💡 アプリ内に「パスワードリセット」ボタンを置く UI は将来追加予定です。

## バックアップとリストア

### バックアップ

Supabase のマネージドバックアップに依存します。

| 種別 | 頻度 | 保持期間 |
|---|---|---|
| 自動日次バックアップ | 毎日 | 7 日（Free プラン）／ 14〜28 日（Pro 以上） |
| 手動 PITR | 必要時 | プランによる |

詳細は **Supabase Dashboard → Database → Backups** を参照。

### 復元

1. Supabase Dashboard → Backups → 該当時点を選択
2. **［Restore］** で復元（注意：DB 全体が巻き戻る）
3. 部分復元（特定テーブルのみ）はサポート外。SQL での手動復元が必要

> ⚠️ 復元は本番影響が大きいため、必ずメンテナンス時間を取り、利用者全員に周知してください。

## 監査ログ

`audit_logs` テーブルに以下が記録されます：

| 記録される操作 |
|---|
| 顧客・契約・案件・意向把握の作成／編集／削除 |
| ユーザーの招待／ロール変更／無効化 |
| Lark 連携設定の変更 |
| ログイン／ログアウト |
| 意向把握の承認／差戻し |

### 監査ログ閲覧 UI（将来）

現状、監査ログ閲覧 UI は未実装です。SQL で確認します：

```sql
SELECT
  al.created_at,
  up.name AS actor,
  al.action,
  al.target_type,
  al.target_id,
  al.changes
FROM audit_logs al
LEFT JOIN user_profiles up ON up.id = al.actor_id
WHERE al.tenant_id = '<tenant_id>'
ORDER BY al.created_at DESC
LIMIT 100;
```

詳細は [14. セキュリティ](./14_security_compliance.md) を参照。

## 環境変数の管理

主要な環境変数（Vercel の Environment Variables で設定）：

| 変数 | 用途 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase プロジェクト URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anonymous Key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service Role Key（**秘匿**） |
| `NEXT_PUBLIC_APP_URL` | アプリの公開 URL（OAuth リダイレクト先） |
| `LARK_APP_ID` / `LARK_APP_SECRET` | Lark アプリ認証情報 |
| `LARK_WEBHOOK_VERIFY_TOKEN` | Lark Webhook 検証トークン |
| `LARK_OAUTH_REDIRECT_URI` | Lark OAuth リダイレクト URI |

> ⚠️ **`SUPABASE_SERVICE_ROLE_KEY`** は **RLS をバイパスする最強権限** です。Vercel の Sensitive にチェックを入れ、Preview デプロイへの露出を最小化してください。

## デプロイ・更新作業

1. 開発者がコードを GitHub にプッシュ
2. Vercel が自動ビルド → Preview デプロイ
3. テスト確認 → Production にプロモート
4. データベース変更がある場合は `supabase db push` で migration 適用

詳細は開発者ドキュメント（リポジトリの `AGENTS.md` 参照）。

## トラブル対応

| 症状 | 対応者 | 対応 |
|---|---|---|
| 大量のエラー通知 | 開発者 | Vercel ログ確認 → ロールバック |
| 特定ユーザーのデータが見えない | 管理者 | ロール・テナント設定確認、`user_profiles.tenant_id` を技術担当に確認依頼 |
| パフォーマンス劣化 | 開発者 | Supabase Dashboard → Database → Query Performance |
| 不正アクセス疑い | 管理者 + 開発者 | 監査ログ確認、該当アカウント無効化、パスワード強制リセット |

## 連絡先（運用窓口）

> 開発・運用窓口情報をここに記載してください。
> 例: `support@grust.jp` / Lark Group: `HOKENA CRM 運用` / 緊急時: `XX-XXXX-XXXX`
