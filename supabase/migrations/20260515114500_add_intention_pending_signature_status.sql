-- リモート署名用に、意向把握レコードを署名前の状態で保持できるようにする。

ALTER TABLE intention_records
  DROP CONSTRAINT IF EXISTS intention_records_status_check;

ALTER TABLE intention_records
  ADD CONSTRAINT intention_records_status_check
  CHECK (status IN ('未実施', '署名待ち', '実施済', '承認待', '承認済', '差戻'));
