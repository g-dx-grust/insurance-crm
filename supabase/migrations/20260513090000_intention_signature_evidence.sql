-- ============================================================================
-- 意向把握 電子サイン証跡
-- ----------------------------------------------------------------------------
-- タッチパネル署名画像と、署名時点の意向把握スナップショットを改ざん検知
-- できる形で保存する。既存の intention_records と同じく物理削除は禁止。
-- ============================================================================

-- 非公開バケット。署名画像と証跡 manifest JSON のみ保存する。
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'intention-signatures',
  'intention-signatures',
  FALSE,
  1048576,
  ARRAY['image/png', 'application/json']::TEXT[]
)
ON CONFLICT (id) DO UPDATE SET
  public = FALSE,
  file_size_limit = 1048576,
  allowed_mime_types = ARRAY['image/png', 'application/json']::TEXT[];

CREATE TABLE intention_signature_evidences (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                UUID NOT NULL REFERENCES tenants(id),
  intention_record_id      UUID NOT NULL REFERENCES intention_records(id),
  revision                 INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),

  signer_name              TEXT NOT NULL,
  consent_text             TEXT NOT NULL,
  consent_version          TEXT NOT NULL,
  signed_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  signature_storage_path   TEXT NOT NULL,
  signature_sha256         TEXT NOT NULL CHECK (signature_sha256 ~ '^[0-9a-f]{64}$'),
  signature_mime_type      TEXT NOT NULL DEFAULT 'image/png',
  signature_size_bytes     INTEGER NOT NULL CHECK (signature_size_bytes > 0),

  manifest_storage_path    TEXT NOT NULL,
  evidence_manifest        JSONB NOT NULL,
  evidence_manifest_sha256 TEXT NOT NULL CHECK (evidence_manifest_sha256 ~ '^[0-9a-f]{64}$'),

  server_seal_algorithm    TEXT NOT NULL DEFAULT 'HMAC-SHA256',
  server_seal_key_id       TEXT NOT NULL DEFAULT 'local-v1',
  server_seal              TEXT NOT NULL CHECK (server_seal ~ '^[0-9a-f]{64}$'),

  trusted_timestamp_provider TEXT,
  trusted_timestamp_token    TEXT,
  trusted_timestamped_at     TIMESTAMPTZ,

  client_ip                TEXT,
  client_user_agent        TEXT,
  created_by               UUID NOT NULL REFERENCES user_profiles(id),
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (intention_record_id, revision)
);

CREATE INDEX idx_intention_signature_evidences_tenant_id
  ON intention_signature_evidences(tenant_id);
CREATE INDEX idx_intention_signature_evidences_intention_record_id
  ON intention_signature_evidences(intention_record_id);

ALTER TABLE intention_signature_evidences ENABLE ROW LEVEL SECURITY;

CREATE POLICY intention_signature_evidences_select
  ON intention_signature_evidences
  FOR SELECT USING (tenant_id = current_user_tenant_id());

CREATE POLICY intention_signature_evidences_insert
  ON intention_signature_evidences
  FOR INSERT WITH CHECK (tenant_id = current_user_tenant_id());

CREATE POLICY intention_signature_evidences_no_update
  ON intention_signature_evidences
  FOR UPDATE USING (false)
  WITH CHECK (false);

CREATE POLICY intention_signature_evidences_no_delete
  ON intention_signature_evidences
  FOR DELETE USING (false);

-- Storage objects are scoped by the first path segment:
--   {tenant_id}/{intention_record_id}/rev-001-signature.png
DROP POLICY IF EXISTS intention_signature_objects_select ON storage.objects;
DROP POLICY IF EXISTS intention_signature_objects_insert ON storage.objects;

CREATE POLICY intention_signature_objects_select
  ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'intention-signatures'
    AND name LIKE public.current_user_tenant_id()::TEXT || '/%'
  );

CREATE POLICY intention_signature_objects_insert
  ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'intention-signatures'
    AND name LIKE public.current_user_tenant_id()::TEXT || '/%'
  );
