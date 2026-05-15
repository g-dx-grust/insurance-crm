-- 閲覧専用デモに使う viewer ロールを追加する。
-- 既存の admin / agent / staff はそのまま維持し、viewer はテナント内の参照のみ許可する。

ALTER TABLE user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_role_check;

ALTER TABLE user_profiles
  ADD CONSTRAINT user_profiles_role_check
  CHECK (role IN ('admin', 'agent', 'staff', 'viewer'));

-- 主テーブル: viewer はテナント内の全件参照のみ。
DROP POLICY IF EXISTS customers_select ON customers;
CREATE POLICY customers_select ON customers
  FOR SELECT USING (
    tenant_id = current_user_tenant_id()
    AND (
      current_user_role() IN ('admin', 'staff', 'viewer')
      OR current_tenant_access_scope() = 'tenant_wide'
      OR assigned_to = auth.uid()
    )
  );

DROP POLICY IF EXISTS customers_insert ON customers;
CREATE POLICY customers_insert ON customers
  FOR INSERT WITH CHECK (
    tenant_id = current_user_tenant_id()
    AND (
      current_user_role() IN ('admin', 'staff')
      OR (
        current_user_role() = 'agent'
        AND (assigned_to = auth.uid() OR assigned_to IS NULL)
      )
    )
  );

DROP POLICY IF EXISTS customers_update ON customers;
CREATE POLICY customers_update ON customers
  FOR UPDATE USING (
    tenant_id = current_user_tenant_id()
    AND (
      current_user_role() IN ('admin', 'staff')
      OR (
        current_user_role() = 'agent'
        AND (current_tenant_access_scope() = 'tenant_wide' OR assigned_to = auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS contracts_select ON contracts;
CREATE POLICY contracts_select ON contracts
  FOR SELECT USING (
    tenant_id = current_user_tenant_id()
    AND (
      current_user_role() IN ('admin', 'staff', 'viewer')
      OR current_tenant_access_scope() = 'tenant_wide'
      OR assigned_to = auth.uid()
    )
  );

DROP POLICY IF EXISTS contracts_insert ON contracts;
CREATE POLICY contracts_insert ON contracts
  FOR INSERT WITH CHECK (
    tenant_id = current_user_tenant_id()
    AND (
      current_user_role() IN ('admin', 'staff')
      OR (
        current_user_role() = 'agent'
        AND (assigned_to = auth.uid() OR assigned_to IS NULL)
      )
    )
  );

DROP POLICY IF EXISTS contracts_update ON contracts;
CREATE POLICY contracts_update ON contracts
  FOR UPDATE USING (
    tenant_id = current_user_tenant_id()
    AND (
      current_user_role() IN ('admin', 'staff')
      OR (
        current_user_role() = 'agent'
        AND (current_tenant_access_scope() = 'tenant_wide' OR assigned_to = auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS opportunities_select ON opportunities;
CREATE POLICY opportunities_select ON opportunities
  FOR SELECT USING (
    tenant_id = current_user_tenant_id()
    AND (
      current_user_role() IN ('admin', 'staff', 'viewer')
      OR current_tenant_access_scope() = 'tenant_wide'
      OR assigned_to = auth.uid()
    )
  );

DROP POLICY IF EXISTS opportunities_insert ON opportunities;
CREATE POLICY opportunities_insert ON opportunities
  FOR INSERT WITH CHECK (
    tenant_id = current_user_tenant_id()
    AND (
      current_user_role() IN ('admin', 'staff')
      OR (
        current_user_role() = 'agent'
        AND (assigned_to = auth.uid() OR assigned_to IS NULL)
      )
    )
  );

DROP POLICY IF EXISTS opportunities_update ON opportunities;
CREATE POLICY opportunities_update ON opportunities
  FOR UPDATE USING (
    tenant_id = current_user_tenant_id()
    AND (
      current_user_role() IN ('admin', 'staff')
      OR (
        current_user_role() = 'agent'
        AND (current_tenant_access_scope() = 'tenant_wide' OR assigned_to = auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS calendar_events_select ON calendar_events;
CREATE POLICY calendar_events_select ON calendar_events
  FOR SELECT USING (
    tenant_id = current_user_tenant_id()
    AND (
      current_user_role() IN ('admin', 'staff', 'viewer')
      OR current_tenant_access_scope() = 'tenant_wide'
      OR assigned_to = auth.uid()
    )
  );

DROP POLICY IF EXISTS calendar_events_insert ON calendar_events;
CREATE POLICY calendar_events_insert ON calendar_events
  FOR INSERT WITH CHECK (
    tenant_id = current_user_tenant_id()
    AND (
      current_user_role() IN ('admin', 'staff')
      OR (
        current_user_role() = 'agent'
        AND (assigned_to = auth.uid() OR assigned_to IS NULL)
      )
    )
  );

DROP POLICY IF EXISTS calendar_events_update ON calendar_events;
CREATE POLICY calendar_events_update ON calendar_events
  FOR UPDATE USING (
    tenant_id = current_user_tenant_id()
    AND (
      current_user_role() IN ('admin', 'staff')
      OR (
        current_user_role() = 'agent'
        AND (current_tenant_access_scope() = 'tenant_wide' OR assigned_to = auth.uid())
      )
    )
  );

-- 子テーブル: 既存の非 viewer ロールは従来どおり、viewer は SELECT のみ。
DROP POLICY IF EXISTS family_members_tenant ON family_members;
CREATE POLICY family_members_select ON family_members
  FOR SELECT USING (tenant_id = current_user_tenant_id());
CREATE POLICY family_members_modify ON family_members
  FOR ALL USING (
    tenant_id = current_user_tenant_id()
    AND current_user_role() IN ('admin', 'agent', 'staff')
  )
  WITH CHECK (
    tenant_id = current_user_tenant_id()
    AND current_user_role() IN ('admin', 'agent', 'staff')
  );

DROP POLICY IF EXISTS contract_riders_tenant ON contract_riders;
CREATE POLICY contract_riders_select ON contract_riders
  FOR SELECT USING (tenant_id = current_user_tenant_id());
CREATE POLICY contract_riders_modify ON contract_riders
  FOR ALL USING (
    tenant_id = current_user_tenant_id()
    AND current_user_role() IN ('admin', 'agent', 'staff')
  )
  WITH CHECK (
    tenant_id = current_user_tenant_id()
    AND current_user_role() IN ('admin', 'agent', 'staff')
  );

DROP POLICY IF EXISTS opportunity_activities_tenant ON opportunity_activities;
CREATE POLICY opportunity_activities_select ON opportunity_activities
  FOR SELECT USING (tenant_id = current_user_tenant_id());
CREATE POLICY opportunity_activities_modify ON opportunity_activities
  FOR ALL USING (
    tenant_id = current_user_tenant_id()
    AND current_user_role() IN ('admin', 'agent', 'staff')
  )
  WITH CHECK (
    tenant_id = current_user_tenant_id()
    AND current_user_role() IN ('admin', 'agent', 'staff')
  );

DROP POLICY IF EXISTS opportunity_suitability_tenant ON opportunity_suitability;
CREATE POLICY opportunity_suitability_select ON opportunity_suitability
  FOR SELECT USING (tenant_id = current_user_tenant_id());
CREATE POLICY opportunity_suitability_modify ON opportunity_suitability
  FOR ALL USING (
    tenant_id = current_user_tenant_id()
    AND current_user_role() IN ('admin', 'agent', 'staff')
  )
  WITH CHECK (
    tenant_id = current_user_tenant_id()
    AND current_user_role() IN ('admin', 'agent', 'staff')
  );

DROP POLICY IF EXISTS intention_products_tenant ON intention_products;
CREATE POLICY intention_products_select ON intention_products
  FOR SELECT USING (tenant_id = current_user_tenant_id());
CREATE POLICY intention_products_modify ON intention_products
  FOR ALL USING (
    tenant_id = current_user_tenant_id()
    AND current_user_role() IN ('admin', 'agent', 'staff')
  )
  WITH CHECK (
    tenant_id = current_user_tenant_id()
    AND current_user_role() IN ('admin', 'agent', 'staff')
  );

-- 保険業法対応データ: viewer は参照のみ。物理削除禁止は維持。
DROP POLICY IF EXISTS contact_histories_insert ON contact_histories;
CREATE POLICY contact_histories_insert ON contact_histories
  FOR INSERT WITH CHECK (
    tenant_id = current_user_tenant_id()
    AND current_user_role() IN ('admin', 'agent', 'staff')
  );

DROP POLICY IF EXISTS contact_histories_update ON contact_histories;
CREATE POLICY contact_histories_update ON contact_histories
  FOR UPDATE USING (
    tenant_id = current_user_tenant_id()
    AND current_user_role() IN ('admin', 'agent', 'staff')
  )
  WITH CHECK (
    tenant_id = current_user_tenant_id()
    AND current_user_role() IN ('admin', 'agent', 'staff')
  );

DROP POLICY IF EXISTS intention_records_insert ON intention_records;
CREATE POLICY intention_records_insert ON intention_records
  FOR INSERT WITH CHECK (
    tenant_id = current_user_tenant_id()
    AND current_user_role() IN ('admin', 'agent', 'staff')
  );

DROP POLICY IF EXISTS intention_records_update ON intention_records;
CREATE POLICY intention_records_update ON intention_records
  FOR UPDATE USING (
    tenant_id = current_user_tenant_id()
    AND current_user_role() IN ('admin', 'agent', 'staff')
  )
  WITH CHECK (
    tenant_id = current_user_tenant_id()
    AND current_user_role() IN ('admin', 'agent', 'staff')
  );

DROP POLICY IF EXISTS intention_signature_evidences_insert ON intention_signature_evidences;
CREATE POLICY intention_signature_evidences_insert
  ON intention_signature_evidences
  FOR INSERT WITH CHECK (
    tenant_id = current_user_tenant_id()
    AND current_user_role() IN ('admin', 'agent', 'staff')
  );

-- コンプライアンス拡張テーブル: viewer は参照のみ。物理削除禁止は維持。
DROP POLICY IF EXISTS financial_situation_checks_insert ON financial_situation_checks;
CREATE POLICY financial_situation_checks_insert
  ON financial_situation_checks
  FOR INSERT WITH CHECK (
    tenant_id = current_user_tenant_id()
    AND current_user_role() IN ('admin', 'agent', 'staff')
  );

DROP POLICY IF EXISTS financial_situation_checks_update ON financial_situation_checks;
CREATE POLICY financial_situation_checks_update
  ON financial_situation_checks
  FOR UPDATE USING (
    tenant_id = current_user_tenant_id()
    AND current_user_role() IN ('admin', 'agent', 'staff')
  )
  WITH CHECK (
    tenant_id = current_user_tenant_id()
    AND current_user_role() IN ('admin', 'agent', 'staff')
  );

DROP POLICY IF EXISTS document_carry_out_logs_insert ON document_carry_out_logs;
CREATE POLICY document_carry_out_logs_insert
  ON document_carry_out_logs
  FOR INSERT WITH CHECK (
    tenant_id = current_user_tenant_id()
    AND current_user_role() IN ('admin', 'agent', 'staff')
  );

DROP POLICY IF EXISTS document_carry_out_logs_update ON document_carry_out_logs;
CREATE POLICY document_carry_out_logs_update
  ON document_carry_out_logs
  FOR UPDATE USING (
    tenant_id = current_user_tenant_id()
    AND current_user_role() IN ('admin', 'agent', 'staff')
  )
  WITH CHECK (
    tenant_id = current_user_tenant_id()
    AND current_user_role() IN ('admin', 'agent', 'staff')
  );

DROP POLICY IF EXISTS intention_signature_requests_insert ON intention_signature_requests;
CREATE POLICY intention_signature_requests_insert
  ON intention_signature_requests
  FOR INSERT WITH CHECK (
    tenant_id = current_user_tenant_id()
    AND current_user_role() IN ('admin', 'agent', 'staff')
  );

DROP POLICY IF EXISTS intention_signature_requests_update ON intention_signature_requests;
CREATE POLICY intention_signature_requests_update
  ON intention_signature_requests
  FOR UPDATE USING (
    tenant_id = current_user_tenant_id()
    AND current_user_role() IN ('admin', 'agent', 'staff')
  )
  WITH CHECK (
    tenant_id = current_user_tenant_id()
    AND current_user_role() IN ('admin', 'agent', 'staff')
  );

-- 署名ストレージも viewer からのアップロードは不可。
DROP POLICY IF EXISTS intention_signature_objects_insert ON storage.objects;
CREATE POLICY intention_signature_objects_insert
  ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'intention-signatures'
    AND name LIKE public.current_user_tenant_id()::TEXT || '/%'
    AND public.current_user_role() IN ('admin', 'agent', 'staff')
  );
