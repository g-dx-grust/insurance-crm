-- タスク管理機能の撤去
-- 1. tasks テーブル本体 (CASCADE で index / RLS / トリガー / FK も削除)
-- 2. tenants.settings JSONB に残るタスク関連キーをクレンジング

DROP TABLE IF EXISTS tasks CASCADE;

UPDATE tenants
SET settings = (
  (settings
    #- '{notification,task_alert_days}'
    #- '{lark,calendar,sync_tasks}'
    #- '{lark,bot,task_days_before}'
    #- '{lark,notification_templates,task_due_alert}'
  )
)
WHERE settings IS NOT NULL;
