# Phase 1 — データベース設計・マイグレーション・RLS

> **実装方式**: 直列（Phase 0 完了後、全フェーズの基盤）
> **所要目安**: 3〜4 時間
> **担当**: 1 名

---

## 目標

N-LIC CRM の全テーブル・ビュー・RLS・トリガー・通知キューを 1 マイグレーションで構築する。
保険業法対応データ（意向把握・対応履歴）の物理削除禁止を **DB レベルで強制**する。

---

## ER 概要

```
tenants ──< user_profiles ──< customers ──< contracts ──< contract_riders
                                       ──< opportunities ──< opportunity_activities
                                                        ──< opportunity_suitability
                                       ──< contact_histories
                                       ──< family_members
                              contracts ──< intention_records ──< intention_products
                              tasks
                              settlements ──< settlement_imports（CSV 取込履歴）
                              mdrt_targets（年×テナント）
                              mdrt_performances（年×ユーザー）
                              calendar_events
                              notification_logs（Lark / メール送信キュー）
                              audit_logs（重要操作の監査）
```

---

## マイグレーションファイル

`supabase/migrations/<実日付>_initial_schema.sql`（ファイル名の日付は適用日に合わせる）。

### 1. 拡張機能

```sql
-- Supabase は uuid-ossp を `extensions` schema に置くため public から uuid_generate_v4() が呼べない。
-- Postgres 13+ 組込みの gen_random_uuid() を使うので uuid-ossp は不要。
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

---

### 2. テナント

```sql
CREATE TABLE tenants (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  code        TEXT UNIQUE NOT NULL,
  plan        TEXT NOT NULL DEFAULT 'standard',
  -- settings 例:
  -- {
  --   "elderly_age_threshold": 70,
  --   "access_scope": "assigned_only" | "tenant_wide",
  --   "lark": {
  --     "sso_enabled": true,
  --     "base":     { "base_id": "...", "sync_customers": true, ... },
  --     "calendar": { "calendar_id": "...", "sync_tasks": true },
  --     "approval": { "intention_flow_id": "..." },
  --     "bot": {
  --       "alert_chat_id": "...",
  --       "expiry_days_before": 30,
  --       "task_days_before": 3,
  --       "notify_approval": true,
  --       "notify_settlement": true
  --     }
  --   }
  -- }
  -- ⚠️ App ID / App Secret は env で管理し、ここには保存しない（Lark Rules §6）
  settings    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### 3. ユーザープロファイル

```sql
CREATE TABLE user_profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  name            TEXT NOT NULL,
  name_kana       TEXT,
  email           TEXT NOT NULL,
  role            TEXT NOT NULL DEFAULT 'agent'
                  CHECK (role IN ('admin', 'agent', 'staff')),
                  -- admin: 管理者 / agent: 募集人 / staff: 事務
  department      TEXT,

  -- Lark 連携（Lark Rules §2.1, §2.2）
  lark_open_id    TEXT UNIQUE,   -- Lark の open_id（一意キー）
  lark_union_id   TEXT,          -- Lark の union_id
  lark_user_id    TEXT,          -- Lark の user_id（テナント内）
  avatar_url      TEXT,          -- Lark から同期したアバター URL（フォールバック表示用）

  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_profiles_tenant_id ON user_profiles(tenant_id);
CREATE INDEX idx_user_profiles_lark_open_id ON user_profiles(lark_open_id);
```

---

### 4. 共通ヘルパー関数（RLS で多用）

```sql
-- 現在ユーザーのテナント ID
CREATE OR REPLACE FUNCTION current_user_tenant_id()
RETURNS UUID
LANGUAGE SQL STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM user_profiles WHERE id = auth.uid()
$$;

-- 現在ユーザーのロール
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS TEXT
LANGUAGE SQL STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM user_profiles WHERE id = auth.uid()
$$;

-- 現在テナントの閲覧スコープ（assigned_only / tenant_wide）
CREATE OR REPLACE FUNCTION current_tenant_access_scope()
RETURNS TEXT
LANGUAGE SQL STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(t.settings->>'access_scope', 'assigned_only')
  FROM tenants t
  JOIN user_profiles p ON p.tenant_id = t.id
  WHERE p.id = auth.uid()
$$;
```

---

### 5. 顧客

```sql
CREATE TABLE customers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id),
  name              TEXT NOT NULL,
  name_kana         TEXT NOT NULL,
  birth_date        DATE,
  gender            TEXT CHECK (gender IN ('男性', '女性', 'その他')),
  postal_code       TEXT,
  address           TEXT,
  phone             TEXT,
  email             TEXT,
  status            TEXT NOT NULL DEFAULT '見込'
                    CHECK (status IN ('見込', '既存', '休眠')),
  assigned_to       UUID REFERENCES user_profiles(id),
  note              TEXT,
  lark_contact_id   TEXT,
  deleted_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 高齢者判定ビュー（age, is_elderly）。
-- WITH (security_invoker = true) で **呼び出し元の RLS** を適用する（必須）。
CREATE VIEW customers_with_age
  WITH (security_invoker = true)
AS
SELECT
  c.*,
  EXTRACT(YEAR FROM AGE(c.birth_date))::INT AS age,
  CASE
    WHEN c.birth_date IS NULL THEN FALSE
    ELSE EXTRACT(YEAR FROM AGE(c.birth_date)) >=
         COALESCE((SELECT (settings->>'elderly_age_threshold')::INT FROM tenants WHERE id = c.tenant_id), 70)
  END AS is_elderly
FROM customers c
WHERE c.deleted_at IS NULL;

CREATE INDEX idx_customers_tenant_id ON customers(tenant_id);
CREATE INDEX idx_customers_assigned_to ON customers(assigned_to);
CREATE INDEX idx_customers_status ON customers(status);
CREATE INDEX idx_customers_name_trgm ON customers USING gin(name gin_trgm_ops);
CREATE INDEX idx_customers_name_kana_trgm ON customers USING gin(name_kana gin_trgm_ops);
```

---

### 6. 家族情報

```sql
CREATE TABLE family_members (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id     UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  name            TEXT NOT NULL,
  name_kana       TEXT,
  relationship    TEXT NOT NULL,
  birth_date      DATE,
  gender          TEXT CHECK (gender IN ('男性', '女性', 'その他')),
  is_insured      BOOLEAN NOT NULL DEFAULT FALSE,
  is_beneficiary  BOOLEAN NOT NULL DEFAULT FALSE,
  note            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_family_members_customer_id ON family_members(customer_id);

-- 親と tenant_id がずれることを防ぐトリガー（他の子テーブルにも共通で適用）
CREATE OR REPLACE FUNCTION enforce_tenant_match_from_customer()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_tenant UUID;
BEGIN
  SELECT tenant_id INTO v_tenant FROM customers WHERE id = NEW.customer_id;
  IF NEW.tenant_id IS DISTINCT FROM v_tenant THEN
    RAISE EXCEPTION 'tenant_id mismatch with parent customer';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_family_members_tenant_match
  BEFORE INSERT OR UPDATE ON family_members
  FOR EACH ROW EXECUTE FUNCTION enforce_tenant_match_from_customer();
```

---

### 7. 契約

```sql
CREATE TABLE contracts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id),
  customer_id         UUID NOT NULL REFERENCES customers(id),
  policy_number       TEXT NOT NULL,
  insurance_company   TEXT NOT NULL,
  product_name        TEXT NOT NULL,
  product_category    TEXT NOT NULL
                      CHECK (product_category IN ('生命保険', '損害保険', '医療保険', '介護保険', '年金保険')),
  premium             INTEGER NOT NULL DEFAULT 0,
  start_date          DATE NOT NULL,
  expiry_date         DATE,
  status              TEXT NOT NULL DEFAULT '有効'
                      CHECK (status IN ('有効', '満期', '解約', '更改中')),
  renewal_status      TEXT NOT NULL DEFAULT '未対応'
                      CHECK (renewal_status IN ('未対応', '対応中', '更改中', '完了', '辞退')),
  assigned_to         UUID REFERENCES user_profiles(id),
  note                TEXT,
  deleted_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, insurance_company, policy_number)
);

CREATE INDEX idx_contracts_tenant_id ON contracts(tenant_id);
CREATE INDEX idx_contracts_customer_id ON contracts(customer_id);
CREATE INDEX idx_contracts_expiry_date ON contracts(expiry_date);
CREATE INDEX idx_contracts_status ON contracts(status);
CREATE INDEX idx_contracts_assigned_to ON contracts(assigned_to);
```

---

### 8. 特約

```sql
CREATE TABLE contract_riders (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id   UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  tenant_id     UUID NOT NULL REFERENCES tenants(id),
  name          TEXT NOT NULL,
  coverage      TEXT,
  premium       INTEGER DEFAULT 0,
  expiry_date   DATE,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_contract_riders_contract_id ON contract_riders(contract_id);
```

---

### 9. 案件

```sql
CREATE TABLE opportunities (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id),
  customer_id           UUID NOT NULL REFERENCES customers(id),
  title                 TEXT NOT NULL,
  stage                 TEXT NOT NULL DEFAULT '初回接触'
                        CHECK (stage IN (
                          '初回接触', 'ニーズ把握', '提案中',
                          '見積提出', 'クロージング', '成約', '失注'
                        )),
  estimated_premium     INTEGER DEFAULT 0,
  expected_close_date   DATE,
  assigned_to           UUID REFERENCES user_profiles(id),
  note                  TEXT,
  lost_reason           TEXT,
  deleted_at            TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_opportunities_tenant_id ON opportunities(tenant_id);
CREATE INDEX idx_opportunities_customer_id ON opportunities(customer_id);
CREATE INDEX idx_opportunities_stage ON opportunities(stage);
CREATE INDEX idx_opportunities_assigned_to ON opportunities(assigned_to);

-- 活動履歴
CREATE TABLE opportunity_activities (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id    UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  tenant_id         UUID NOT NULL REFERENCES tenants(id),
  type              TEXT NOT NULL CHECK (type IN ('電話', '訪問', 'メール', 'Lark', '提案書送付', 'その他')),
  content           TEXT NOT NULL,
  activity_date     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recorded_by       UUID NOT NULL REFERENCES user_profiles(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_opportunity_activities_opportunity_id ON opportunity_activities(opportunity_id);

-- 特定保険適合性確認チェックリスト（保険業法対応のため別テーブルで構造化保存）
CREATE TABLE opportunity_suitability (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id           UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  tenant_id                UUID NOT NULL REFERENCES tenants(id),
  age_confirmed            BOOLEAN NOT NULL DEFAULT FALSE,
  income_confirmed         BOOLEAN NOT NULL DEFAULT FALSE,
  family_confirmed         BOOLEAN NOT NULL DEFAULT FALSE,
  existing_confirmed       BOOLEAN NOT NULL DEFAULT FALSE,
  need_confirmed           BOOLEAN NOT NULL DEFAULT FALSE,
  product_explained        BOOLEAN NOT NULL DEFAULT FALSE,
  premium_confirmed        BOOLEAN NOT NULL DEFAULT FALSE,
  comparison_done          BOOLEAN NOT NULL DEFAULT FALSE,
  consent_obtained         BOOLEAN NOT NULL DEFAULT FALSE,
  recorded_by              UUID NOT NULL REFERENCES user_profiles(id),
  recorded_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(opportunity_id)
);

CREATE INDEX idx_opportunity_suitability_opportunity_id ON opportunity_suitability(opportunity_id);
```

---

### 10. タスク

```sql
CREATE TABLE tasks (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID NOT NULL REFERENCES tenants(id),
  title                   TEXT NOT NULL,
  description             TEXT,
  related_customer_id     UUID REFERENCES customers(id),
  related_contract_id     UUID REFERENCES contracts(id),
  related_opportunity_id  UUID REFERENCES opportunities(id),
  status                  TEXT NOT NULL DEFAULT '未着手'
                          CHECK (status IN ('未着手', '進行中', '完了', '保留')),
  priority                TEXT NOT NULL DEFAULT '中'
                          CHECK (priority IN ('高', '中', '低')),
  due_date                DATE,
  assigned_to             UUID REFERENCES user_profiles(id),
  lark_calendar_event_id  TEXT,
  deleted_at              TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tasks_tenant_id ON tasks(tenant_id);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
```

---

### 11. 対応履歴（保険業法対応：物理削除禁止）

```sql
CREATE TABLE contact_histories (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id),
  customer_id      UUID NOT NULL REFERENCES customers(id),
  type             TEXT NOT NULL
                   CHECK (type IN ('電話', '訪問', 'メール', 'LINE', 'Lark', '更改', 'その他')),
  content          TEXT NOT NULL,
  next_action      TEXT,
  next_action_date DATE,
  contacted_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recorded_by      UUID NOT NULL REFERENCES user_profiles(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_contact_histories_customer_id ON contact_histories(customer_id);
CREATE INDEX idx_contact_histories_contacted_at ON contact_histories(contacted_at DESC);
```

---

### 12. 意向把握（保険業法対応：物理削除禁止）

```sql
CREATE TABLE intention_records (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id),
  customer_id           UUID NOT NULL REFERENCES customers(id),
  contract_id           UUID REFERENCES contracts(id),

  initial_intention     TEXT NOT NULL,
  initial_recorded_at   TIMESTAMPTZ,

  comparison_method     TEXT CHECK (comparison_method IN ('ロ方式', 'イ方式')),
  comparison_reason     TEXT,

  final_intention       TEXT,
  final_recorded_at     TIMESTAMPTZ,

  checklist             JSONB NOT NULL DEFAULT '{}',

  status                TEXT NOT NULL DEFAULT '未実施'
                        CHECK (status IN ('未実施', '実施済', '承認待', '承認済', '差戻')),
  approver_id           UUID REFERENCES user_profiles(id),
  approved_at           TIMESTAMPTZ,
  rejection_reason      TEXT,
  lark_approval_id      TEXT,

  created_by            UUID NOT NULL REFERENCES user_profiles(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE intention_products (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intention_record_id   UUID NOT NULL REFERENCES intention_records(id) ON DELETE CASCADE,
  tenant_id             UUID NOT NULL REFERENCES tenants(id),
  insurance_company     TEXT NOT NULL,
  product_name          TEXT NOT NULL,
  product_category      TEXT NOT NULL,
  premium               INTEGER DEFAULT 0,
  is_recommended        BOOLEAN NOT NULL DEFAULT FALSE,
  recommendation_reason TEXT,
  sort_order            INTEGER NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_intention_records_tenant_id ON intention_records(tenant_id);
CREATE INDEX idx_intention_records_customer_id ON intention_records(customer_id);
CREATE INDEX idx_intention_records_status ON intention_records(status);
```

> `intention_products` の親 (`intention_record_id`) が `ON DELETE CASCADE` だが、後述の RLS で `intention_records` の DELETE を拒否するため実質的には削除不可。

---

### 13. 精算 + CSV インポート履歴

```sql
CREATE TABLE settlements (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id),
  contract_id         UUID REFERENCES contracts(id),
  customer_name       TEXT NOT NULL,    -- CSV 突合用の非正規化（契約に紐付かない一時データも保持）
  insurance_company   TEXT NOT NULL,
  settlement_month    TEXT NOT NULL CHECK (settlement_month ~ '^\d{4}-\d{2}$'),
  invoice_amount      INTEGER NOT NULL DEFAULT 0,
  payment_amount      INTEGER NOT NULL DEFAULT 0,
  fee_amount          INTEGER NOT NULL DEFAULT 0,
  fee_rate            NUMERIC(5,2),
  status              TEXT NOT NULL DEFAULT '未精算'
                      CHECK (status IN ('未精算', '照合中', '完了', '差異あり')),
  source_import_id    UUID,             -- どの CSV から作られたか
  note                TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_settlements_tenant_id ON settlements(tenant_id);
CREATE INDEX idx_settlements_settlement_month ON settlements(settlement_month);
CREATE INDEX idx_settlements_status ON settlements(status);
CREATE INDEX idx_settlements_contract_id ON settlements(contract_id);

CREATE TABLE settlement_imports (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id),
  insurance_company   TEXT NOT NULL,
  settlement_month    TEXT NOT NULL,
  file_name           TEXT NOT NULL,
  total_rows          INTEGER NOT NULL DEFAULT 0,
  matched_rows        INTEGER NOT NULL DEFAULT 0,
  unmatched_rows      INTEGER NOT NULL DEFAULT 0,
  imported_by         UUID NOT NULL REFERENCES user_profiles(id),
  imported_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  raw_payload         JSONB           -- 取込時の生データを監査用に保持
);

ALTER TABLE settlements
  ADD CONSTRAINT fk_settlements_source_import
  FOREIGN KEY (source_import_id) REFERENCES settlement_imports(id) ON DELETE SET NULL;
```

---

### 14. MDRT（年×テナントの目標 + 年×ユーザーの実績）

```sql
-- 年ごとの基準値（テナント単位で上書き可能）
CREATE TABLE mdrt_targets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id),
  year          INTEGER NOT NULL,
  mdrt_target   BIGINT NOT NULL DEFAULT  6000000,
  cot_target    BIGINT NOT NULL DEFAULT 12000000,
  tot_target    BIGINT NOT NULL DEFAULT 18000000,
  UNIQUE(tenant_id, year)
);

CREATE TABLE mdrt_performances (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id),
  user_id             UUID NOT NULL REFERENCES user_profiles(id),
  year                INTEGER NOT NULL,
  insurance_company   TEXT NOT NULL DEFAULT '複数社',
  performance_value   BIGINT NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, user_id, year, insurance_company)
);
```

---

### 15. カレンダーイベント（カラム名は `start_at` / `end_at` で統一）

```sql
CREATE TABLE calendar_events (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID NOT NULL REFERENCES tenants(id),
  title                   TEXT NOT NULL,
  type                    TEXT NOT NULL DEFAULT 'その他'
                          CHECK (type IN ('訪問', '電話', 'Web会議', '書類作業', '社内会議', '研修', 'その他')),
  start_at                TIMESTAMPTZ NOT NULL,
  end_at                  TIMESTAMPTZ NOT NULL,
  all_day                 BOOLEAN NOT NULL DEFAULT FALSE,
  related_customer_id     UUID REFERENCES customers(id),
  related_opportunity_id  UUID REFERENCES opportunities(id),
  assigned_to             UUID REFERENCES user_profiles(id),
  location                TEXT,
  note                    TEXT,
  lark_calendar_event_id  TEXT,
  deleted_at              TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (end_at >= start_at)
);

CREATE INDEX idx_calendar_events_tenant_id ON calendar_events(tenant_id);
CREATE INDEX idx_calendar_events_start_at ON calendar_events(start_at);
CREATE INDEX idx_calendar_events_assigned_to ON calendar_events(assigned_to);
```

---

### 16. 通知キュー（Lark Rules §4.2）

```sql
CREATE TABLE notification_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id),
  channel           TEXT NOT NULL CHECK (channel IN ('lark_im', 'lark_approval', 'email')),
  target_type       TEXT NOT NULL CHECK (target_type IN ('user', 'group', 'open_id', 'email')),
  target_value      TEXT NOT NULL,                -- chat_id / open_id / email
  template_key      TEXT NOT NULL,                -- 'expiry_alert', 'task_due_alert', ...
  payload           JSONB NOT NULL DEFAULT '{}',  -- テンプレ変数
  status            TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'sending', 'sent', 'failed', 'cancelled')),
  retry_count       INTEGER NOT NULL DEFAULT 0,
  scheduled_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_attempted_at TIMESTAMPTZ,
  sent_at           TIMESTAMPTZ,
  last_error        TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notification_logs_status_scheduled
  ON notification_logs(status, scheduled_at)
  WHERE status IN ('pending', 'failed');
CREATE INDEX idx_notification_logs_tenant_id ON notification_logs(tenant_id);
```

---

### 17. 監査ログ

```sql
CREATE TABLE audit_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id),
  actor_id     UUID REFERENCES user_profiles(id),
  action       TEXT NOT NULL,           -- 'login', 'view_intention', 'export_csv', ...
  entity_type  TEXT,                    -- 'customer', 'contract', ...
  entity_id    UUID,
  metadata     JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_tenant_id ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
```

---

### 18. updated_at 自動更新トリガー

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END $$;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'tenants','user_profiles','customers','contracts','opportunities',
    'tasks','intention_records','settlements','mdrt_performances',
    'calendar_events','notification_logs'
  ]) LOOP
    EXECUTE format(
      'CREATE TRIGGER update_%1$s_updated_at BEFORE UPDATE ON %1$s
       FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();', t);
  END LOOP;
END $$;
```

---

### 19. RLS（行レベルセキュリティ）

#### 19-1. 有効化

```sql
ALTER TABLE tenants                ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers              ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members         ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts              ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_riders        ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities          ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunity_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunity_suitability ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_histories      ENABLE ROW LEVEL SECURITY;
ALTER TABLE intention_records      ENABLE ROW LEVEL SECURITY;
ALTER TABLE intention_products     ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlements            ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlement_imports     ENABLE ROW LEVEL SECURITY;
ALTER TABLE mdrt_targets           ENABLE ROW LEVEL SECURITY;
ALTER TABLE mdrt_performances      ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events        ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs             ENABLE ROW LEVEL SECURITY;
```

#### 19-2. 標準ポリシー（テナント分離 + 募集人スコープ）

`customers` を例に示す。同じパターンを `contracts` `opportunities` `tasks` `calendar_events` などに適用する。

```sql
-- SELECT: 自テナント、かつ admin/staff は全件、agent はスコープ設定で分岐
CREATE POLICY customers_select ON customers
  FOR SELECT USING (
    tenant_id = current_user_tenant_id()
    AND (
      current_user_role() IN ('admin', 'staff')
      OR current_tenant_access_scope() = 'tenant_wide'
      OR assigned_to = auth.uid()
    )
  );

-- INSERT: 自テナント、agent は assigned_to を自分にする場合のみ
CREATE POLICY customers_insert ON customers
  FOR INSERT WITH CHECK (
    tenant_id = current_user_tenant_id()
    AND (
      current_user_role() IN ('admin', 'staff')
      OR assigned_to = auth.uid()
      OR assigned_to IS NULL
    )
  );

-- UPDATE: 同上
CREATE POLICY customers_update ON customers
  FOR UPDATE USING (
    tenant_id = current_user_tenant_id()
    AND (
      current_user_role() IN ('admin', 'staff')
      OR current_tenant_access_scope() = 'tenant_wide'
      OR assigned_to = auth.uid()
    )
  );

-- DELETE: admin のみ（実運用は論理削除）
CREATE POLICY customers_delete ON customers
  FOR DELETE USING (
    tenant_id = current_user_tenant_id()
    AND current_user_role() = 'admin'
  );
```

#### 19-3. 保険業法対応データの DELETE 全拒否

```sql
-- intention_records: DELETE を全拒否（service role でもアプリ経由では消せないようにする）
CREATE POLICY intention_records_no_delete ON intention_records
  FOR DELETE USING (false);

-- contact_histories も同様
CREATE POLICY contact_histories_no_delete ON contact_histories
  FOR DELETE USING (false);

-- 通常の SELECT/INSERT/UPDATE は他テーブルと同様に作成（省略）
```

> Service Role Key を使うと RLS をバイパスできる。Service Role を使う Server Action 側でも `intention_records` / `contact_histories` の DELETE はアプリレイヤーで明示的に禁止すること（CLAUDE.md §3.2）。

#### 19-4. notification_logs / audit_logs

```sql
-- notification_logs はテナント単位で SELECT 可、書込は管理者・サーバーのみ
CREATE POLICY notification_logs_select ON notification_logs
  FOR SELECT USING (tenant_id = current_user_tenant_id());

-- audit_logs は admin のみ閲覧
CREATE POLICY audit_logs_select ON audit_logs
  FOR SELECT USING (
    tenant_id = current_user_tenant_id()
    AND current_user_role() = 'admin'
  );
```

---

## 型定義の自動生成

```bash
pnpm db:types
```

生成先: `src/lib/types/database.types.ts`

---

## 完了チェックリスト

- [ ] `supabase/migrations/<日付>_initial_schema.sql` が作成されている
- [ ] `pnpm supabase db push` がエラーなく完了する
- [ ] Supabase Dashboard で全テーブルが作成され、RLS が **全テーブル有効**
- [ ] `customers_with_age` が `security_invoker = true` で作成されている
- [ ] `intention_records` / `contact_histories` の DELETE がポリシーで拒否される
- [ ] `notification_logs` テーブルが存在する
- [ ] `mdrt_targets` と `mdrt_performances` が分離されている
- [ ] `calendar_events` のカラム名が `start_at` / `end_at`
- [ ] `pnpm db:types` で `database.types.ts` が生成される
