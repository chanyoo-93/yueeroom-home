# WAF WebACL은 CloudFront에 연결되므로 반드시 us-east-1 프로바이더를 사용한다.

# ────────────────────────────────────────────────────────
# Admin IP 화이트리스트 (선택)
# ────────────────────────────────────────────────────────
resource "aws_wafv2_ip_set" "admin_whitelist" {
  provider = aws.us_east_1

  name               = "${var.project}-admin-whitelist"
  description        = "Admin page IP whitelist"
  scope              = "CLOUDFRONT"
  ip_address_version = "IPV4"
  addresses          = var.waf_admin_ip_whitelist
}

# ────────────────────────────────────────────────────────
# WAF WebACL
# ────────────────────────────────────────────────────────
resource "aws_wafv2_web_acl" "cloudfront" {
  provider = aws.us_east_1

  name        = "${var.project}-cloudfront-waf"
  description = "WAF WebACL for ${var.project} CloudFront distributions"
  scope       = "CLOUDFRONT"

  default_action {
    allow {}
  }

  # ── Rule 1: Admin IP 화이트리스트 (우선순위 최상위)
  dynamic "rule" {
    for_each = length(var.waf_admin_ip_whitelist) > 0 ? [1] : []
    content {
      name     = "AdminIPWhitelist"
      priority = 1

      action {
        allow {}
      }

      statement {
        and_statement {
          statement {
            ip_set_reference_statement {
              arn = aws_wafv2_ip_set.admin_whitelist.arn
            }
          }
          statement {
            byte_match_statement {
              field_to_match {
                uri_path {}
              }
              positional_constraint = "STARTS_WITH"
              search_string         = "/admin"
              text_transformation {
                priority = 0
                type     = "LOWERCASE"
              }
            }
          }
        }
      }

      visibility_config {
        cloudwatch_metrics_enabled = true
        metric_name                = "AdminIPWhitelistRule"
        sampled_requests_enabled   = true
      }
    }
  }

  # ── Rule 10: Rate-based Rule (IP당 5분간 요청 수 제한)
  rule {
    name     = "RateBasedRule"
    priority = 10

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = var.waf_rate_limit
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "RateBasedRule"
      sampled_requests_enabled   = true
    }
  }

  # ── Rule 20: AWS Managed Rules — Core Rule Set (XSS, 일반 공격 패턴 포함)
  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 20

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSManagedRulesCommonRuleSet"
      sampled_requests_enabled   = true
    }
  }

  # ── Rule 30: AWS Managed Rules — SQL Injection
  rule {
    name     = "AWSManagedRulesSQLiRuleSet"
    priority = 30

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesSQLiRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSManagedRulesSQLiRuleSet"
      sampled_requests_enabled   = true
    }
  }

  # ── Rule 40: AWS Managed Rules — Known Bad Inputs (XSS, Log4j 등)
  rule {
    name     = "AWSManagedRulesKnownBadInputsRuleSet"
    priority = 40

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSManagedRulesKnownBadInputsRuleSet"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${var.project}-cloudfront-waf"
    sampled_requests_enabled   = true
  }

  tags = {
    Name = "${var.project}-cloudfront-waf"
  }
}

# ────────────────────────────────────────────────────────
# WAF 로그 → CloudWatch Logs
# WAF 로그 그룹명은 반드시 "aws-waf-logs-" 접두사가 있어야 한다.
# ────────────────────────────────────────────────────────
resource "aws_cloudwatch_log_group" "waf" {
  provider = aws.us_east_1

  name              = "aws-waf-logs-${var.project}"
  retention_in_days = 90
}

resource "aws_wafv2_web_acl_logging_configuration" "cloudfront" {
  provider = aws.us_east_1

  resource_arn            = aws_wafv2_web_acl.cloudfront.arn
  log_destination_configs = [aws_cloudwatch_log_group.waf.arn]

  depends_on = [aws_wafv2_web_acl.cloudfront, aws_cloudwatch_log_group.waf]
}
