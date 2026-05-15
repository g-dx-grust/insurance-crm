-- ============================================================================
-- コンプライアンス機能拡張
-- ----------------------------------------------------------------------------
-- 1. 横展開向け商品カテゴリ (積立保険)
-- 2. 積立系商品の財務状況確認
-- 3. 個人情報書類の持ち出し記録簿
-- 4. 面談記録テンプレート
-- 5. 意向把握リモート署名依頼
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────
-- 商品カテゴリ: 積立保険を追加
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE contracts
  DROP CONSTRAINT IF EXISTS contracts_product_category_check;

ALTER TABLE contracts
  ADD CONSTRAINT contracts_product_category_check
  CHECK (product_category IN (
    '生命保険',
    '損害保険',
    '医療保険',
    '介護保険',
    '年金保険',
    '積立保険'
  ));


-- ─────────────────────────────────────────────────────────────────────────
-- 積立系商品の財務状況確認
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE financial_situation_checks (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id),
  customer_id           UUID NOT NULL REFERENCES customers(id),
  contract_id           UUID REFERENCES contracts(id) ON DELETE SET NULL,
  intention_record_id   UUID REFERENCES intention_records(id) ON DELETE SET NULL,
  source                TEXT NOT NULL DEFAULT 'manual'
                        CHECK (source IN ('manual', 'intention', 'contract')),

  annual_income         TEXT NOT NULL
                        CHECK (annual_income IN (
                          '未確認', '300万円未満', '300〜500万円',
                          '500〜1000万円', '1000万円以上'
                        )),
  employer_name         TEXT,
  investment_experience TEXT NOT NULL
                        CHECK (investment_experience IN (
                          '未確認', 'なし', '1年未満', '1〜3年', '3年以上'
                        )),
  investment_knowledge  TEXT NOT NULL
                        CHECK (investment_knowledge IN (
                          '未確認', '低い', '標準', '高い'
                        )),
  note                  TEXT,
  recorded_by           UUID NOT NULL REFERENCES user_profiles(id),
  recorded_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_financial_situation_checks_tenant_id
  ON financial_situation_checks(tenant_id);
CREATE INDEX idx_financial_situation_checks_customer_id
  ON financial_situation_checks(customer_id);
CREATE INDEX idx_financial_situation_checks_contract_id
  ON financial_situation_checks(contract_id);
CREATE INDEX idx_financial_situation_checks_intention_record_id
  ON financial_situation_checks(intention_record_id);


-- ─────────────────────────────────────────────────────────────────────────
-- 持ち出し記録簿
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE document_carry_out_logs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id),
  customer_id         UUID REFERENCES customers(id) ON DELETE SET NULL,
  document_title      TEXT NOT NULL,
  document_type       TEXT NOT NULL
                      CHECK (document_type IN (
                        '設計書', '申込書', '本人確認書類', '意向把握書', 'その他'
                      )),
  purpose             TEXT NOT NULL,
  destination         TEXT,
  carried_out_by      UUID NOT NULL REFERENCES user_profiles(id),
  carried_out_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expected_return_at  TIMESTAMPTZ,
  returned_at         TIMESTAMPTZ,
  status              TEXT NOT NULL DEFAULT '持出中'
                      CHECK (status IN ('持出中', '返却済', '紛失', '取消')),
  loss_reported_at    TIMESTAMPTZ,
  note                TEXT,
  created_by          UUID NOT NULL REFERENCES user_profiles(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_document_carry_out_logs_tenant_id
  ON document_carry_out_logs(tenant_id);
CREATE INDEX idx_document_carry_out_logs_customer_id
  ON document_carry_out_logs(customer_id);
CREATE INDEX idx_document_carry_out_logs_status
  ON document_carry_out_logs(status);
CREATE INDEX idx_document_carry_out_logs_carried_out_at
  ON document_carry_out_logs(carried_out_at DESC);


-- ─────────────────────────────────────────────────────────────────────────
-- 面談記録テンプレート
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE meeting_record_templates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id),
  title         TEXT NOT NULL,
  type          TEXT NOT NULL
                CHECK (type IN ('電話', '訪問', 'メール', 'LINE', 'Lark', '更改', 'その他')),
  content       TEXT NOT NULL,
  next_action   TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_by    UUID NOT NULL REFERENCES user_profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_meeting_record_templates_tenant_id
  ON meeting_record_templates(tenant_id);
CREATE INDEX idx_meeting_record_templates_active
  ON meeting_record_templates(tenant_id, is_active, sort_order);


-- ─────────────────────────────────────────────────────────────────────────
-- リモート署名依頼
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE intention_signature_requests (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id),
  intention_record_id   UUID NOT NULL REFERENCES intention_records(id),
  signer_name           TEXT NOT NULL,
  signer_email          TEXT NOT NULL,
  token_hash            TEXT NOT NULL UNIQUE CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  status                TEXT NOT NULL DEFAULT '送信待ち'
                        CHECK (status IN ('送信待ち', '署名済', '期限切れ', '取消')),
  expires_at            TIMESTAMPTZ NOT NULL,
  sent_at               TIMESTAMPTZ,
  signed_at             TIMESTAMPTZ,
  created_by            UUID NOT NULL REFERENCES user_profiles(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_intention_signature_requests_tenant_id
  ON intention_signature_requests(tenant_id);
CREATE INDEX idx_intention_signature_requests_intention_record_id
  ON intention_signature_requests(intention_record_id);
CREATE INDEX idx_intention_signature_requests_status
  ON intention_signature_requests(status);

ALTER TABLE intention_signature_evidences
  ADD COLUMN IF NOT EXISTS signature_channel TEXT NOT NULL DEFAULT 'onsite'
    CHECK (signature_channel IN ('onsite', 'remote')),
  ADD COLUMN IF NOT EXISTS signature_request_id UUID
    REFERENCES intention_signature_requests(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS signer_email TEXT;

CREATE INDEX IF NOT EXISTS idx_intention_signature_evidences_request_id
  ON intention_signature_evidences(signature_request_id);


-- ─────────────────────────────────────────────────────────────────────────
-- updated_at トリガー
-- ─────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'financial_situation_checks',
    'document_carry_out_logs',
    'meeting_record_templates',
    'intention_signature_requests'
  ]) LOOP
    EXECUTE format(
      'CREATE TRIGGER update_%1$s_updated_at BEFORE UPDATE ON %1$s
       FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();', t);
  END LOOP;
END $$;


-- ─────────────────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE financial_situation_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_carry_out_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_record_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE intention_signature_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY financial_situation_checks_select
  ON financial_situation_checks
  FOR SELECT USING (tenant_id = current_user_tenant_id());
CREATE POLICY financial_situation_checks_insert
  ON financial_situation_checks
  FOR INSERT WITH CHECK (tenant_id = current_user_tenant_id());
CREATE POLICY financial_situation_checks_update
  ON financial_situation_checks
  FOR UPDATE USING (tenant_id = current_user_tenant_id())
  WITH CHECK (tenant_id = current_user_tenant_id());
CREATE POLICY financial_situation_checks_no_delete
  ON financial_situation_checks
  FOR DELETE USING (false);

CREATE POLICY document_carry_out_logs_select
  ON document_carry_out_logs
  FOR SELECT USING (tenant_id = current_user_tenant_id());
CREATE POLICY document_carry_out_logs_insert
  ON document_carry_out_logs
  FOR INSERT WITH CHECK (tenant_id = current_user_tenant_id());
CREATE POLICY document_carry_out_logs_update
  ON document_carry_out_logs
  FOR UPDATE USING (tenant_id = current_user_tenant_id())
  WITH CHECK (tenant_id = current_user_tenant_id());
CREATE POLICY document_carry_out_logs_no_delete
  ON document_carry_out_logs
  FOR DELETE USING (false);

CREATE POLICY meeting_record_templates_select
  ON meeting_record_templates
  FOR SELECT USING (tenant_id = current_user_tenant_id());
CREATE POLICY meeting_record_templates_admin_insert
  ON meeting_record_templates
  FOR INSERT WITH CHECK (
    tenant_id = current_user_tenant_id() AND current_user_role() = 'admin'
  );
CREATE POLICY meeting_record_templates_admin_update
  ON meeting_record_templates
  FOR UPDATE USING (
    tenant_id = current_user_tenant_id() AND current_user_role() = 'admin'
  )
  WITH CHECK (
    tenant_id = current_user_tenant_id() AND current_user_role() = 'admin'
  );
CREATE POLICY meeting_record_templates_admin_delete
  ON meeting_record_templates
  FOR DELETE USING (
    tenant_id = current_user_tenant_id() AND current_user_role() = 'admin'
  );

CREATE POLICY intention_signature_requests_select
  ON intention_signature_requests
  FOR SELECT USING (tenant_id = current_user_tenant_id());
CREATE POLICY intention_signature_requests_insert
  ON intention_signature_requests
  FOR INSERT WITH CHECK (tenant_id = current_user_tenant_id());
CREATE POLICY intention_signature_requests_update
  ON intention_signature_requests
  FOR UPDATE USING (tenant_id = current_user_tenant_id())
  WITH CHECK (tenant_id = current_user_tenant_id());
CREATE POLICY intention_signature_requests_no_delete
  ON intention_signature_requests
  FOR DELETE USING (false);
