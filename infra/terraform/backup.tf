# ── AWS Backup Vault ────────────────────────────────────────────────────────
resource "aws_backup_vault" "rds" {
  name = "${var.project}-rds-backup-vault"
}

# ── IAM Role for AWS Backup ──────────────────────────────────────────────────
resource "aws_iam_role" "backup" {
  name = "${var.project}-backup-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "backup.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "backup_service" {
  role       = aws_iam_role.backup.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForBackup"
}

resource "aws_iam_role_policy_attachment" "backup_restore" {
  role       = aws_iam_role.backup.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForRestores"
}

# S3 export 권한 (RDS 스냅샷 → S3 내보내기용)
resource "aws_iam_role_policy_attachment" "backup_s3_export" {
  role       = aws_iam_role.backup.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonS3FullAccess"
}

# ── AWS Backup Plan ──────────────────────────────────────────────────────────
resource "aws_backup_plan" "rds_weekly" {
  name = "${var.project}-rds-weekly"

  rule {
    rule_name         = "weekly-snapshot"
    target_vault_name = aws_backup_vault.rds.name
    # 매주 일요일 02:00 UTC (KST 11:00, 새벽 백업 윈도우 이후)
    schedule = "cron(0 2 ? * SUN *)"

    lifecycle {
      delete_after = 35 # 5주 보관
    }

    copy_action {
      destination_vault_arn = aws_backup_vault.rds_longterm.arn
      lifecycle {
        delete_after = 365 # 장기 보관 볼트: 1년
      }
    }
  }

  rule {
    rule_name         = "daily-snapshot"
    target_vault_name = aws_backup_vault.rds.name
    # 매일 02:30 UTC (자동 백업 윈도우 직후)
    schedule = "cron(30 2 * * ? *)"

    lifecycle {
      delete_after = 7 # 일별 스냅샷은 7일 보관
    }
  }

  tags = {
    Project = var.project
    Env     = var.env
  }
}

# 장기 보관 전용 볼트 (30일 이상)
resource "aws_backup_vault" "rds_longterm" {
  name = "${var.project}-rds-backup-vault-longterm"
}

# ── Backup Selection (RDS 인스턴스 연결) ────────────────────────────────────
resource "aws_backup_selection" "rds" {
  iam_role_arn = aws_iam_role.backup.arn
  name         = "${var.project}-rds-selection"
  plan_id      = aws_backup_plan.rds_weekly.id

  resources = [aws_db_instance.main.arn]
}

# ── EventBridge: 백업 실패 알람 ──────────────────────────────────────────────
resource "aws_cloudwatch_event_rule" "backup_failed" {
  name        = "${var.project}-backup-job-failed"
  description = "AWS Backup 작업 실패 시 알람"

  event_pattern = jsonencode({
    source      = ["aws.backup"]
    detail-type = ["Backup Job State Change"]
    detail = {
      state = ["FAILED", "ABORTED", "EXPIRED"]
    }
  })
}

resource "aws_cloudwatch_event_target" "backup_failed_sns" {
  rule      = aws_cloudwatch_event_rule.backup_failed.name
  target_id = "backup-failed-sns"
  arn       = aws_sns_topic.backup_alarm.arn
}

resource "aws_sns_topic" "backup_alarm" {
  name = "${var.project}-backup-alarm"
}

resource "aws_sns_topic_policy" "backup_alarm" {
  arn = aws_sns_topic.backup_alarm.arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "events.amazonaws.com" }
      Action    = "SNS:Publish"
      Resource  = aws_sns_topic.backup_alarm.arn
    }]
  })
}

resource "aws_cloudwatch_event_rule" "backup_succeeded" {
  name        = "${var.project}-backup-job-succeeded"
  description = "AWS Backup 작업 성공 알람 (선택적)"

  event_pattern = jsonencode({
    source      = ["aws.backup"]
    detail-type = ["Backup Job State Change"]
    detail = {
      state = ["COMPLETED"]
    }
  })
}

resource "aws_cloudwatch_event_target" "backup_succeeded_sns" {
  rule      = aws_cloudwatch_event_rule.backup_succeeded.name
  target_id = "backup-succeeded-sns"
  arn       = aws_sns_topic.backup_alarm.arn
}
