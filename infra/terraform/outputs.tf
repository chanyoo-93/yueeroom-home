output "vpc_id" {
  value = aws_vpc.main.id
}

output "rds_endpoint" {
  description = "RDS endpoint — DATABASE_URL 조합: postgresql://USER:PASS@ENDPOINT/DB_NAME"
  value       = aws_db_instance.main.endpoint
}

output "redis_primary_endpoint" {
  description = "Redis primary endpoint — REDIS_URL 조합: rediss://ENDPOINT:6379"
  value       = aws_elasticache_replication_group.redis.primary_endpoint_address
}

output "alb_dns_name" {
  description = "ALB DNS name (api.yueeroom.com CNAME 확인용)"
  value       = aws_lb.main.dns_name
}

output "ecr_backend_url" {
  description = "Backend ECR repository URL"
  value       = aws_ecr_repository.backend.repository_url
}

output "ecr_frontend_url" {
  description = "Frontend ECR repository URL"
  value       = aws_ecr_repository.frontend.repository_url
}

output "cloudfront_assets_domain" {
  description = "Assets CloudFront domain (assets.yueeroom.com)"
  value       = aws_cloudfront_distribution.assets.domain_name
}

output "cloudfront_frontend_domain" {
  description = "Frontend CloudFront domain (yueeroom.com)"
  value       = aws_cloudfront_distribution.frontend.domain_name
}

output "github_actions_role_arn" {
  description = "GitHub Secrets → AWS_DEPLOY_ROLE_ARN에 등록할 ARN"
  value       = aws_iam_role.github_actions_deploy.arn
}
