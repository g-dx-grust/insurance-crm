-- リモート署名をメール送信前提からリンク発行前提へ変更する。
-- 既存レコードは保持し、メールアドレスを任意化する。

ALTER TABLE intention_signature_requests
  ALTER COLUMN signer_email DROP NOT NULL;

ALTER TABLE intention_signature_requests
  DROP CONSTRAINT IF EXISTS intention_signature_requests_status_check;

UPDATE intention_signature_requests
SET status = 'リンク発行'
WHERE status = '送信待ち';

ALTER TABLE intention_signature_requests
  ALTER COLUMN status SET DEFAULT 'リンク発行';

ALTER TABLE intention_signature_requests
  ADD CONSTRAINT intention_signature_requests_status_check
  CHECK (status IN ('リンク発行', '送信待ち', '署名済', '期限切れ', '取消'));
