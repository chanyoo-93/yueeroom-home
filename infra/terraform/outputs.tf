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

output "route53_name_servers" {
  description = "도메인 등록기관(registrar)에 등록할 Route 53 네임서버 목록"
  value       = aws_route53_zone.main.name_servers
}

output "cloudfront_frontend_distribution_id" {
  description = "프론트엔드 CloudFront distribution ID (CI/CD 캐시 무효화용)"
  value       = aws_cloudfront_distribution.frontend.id
}

output "cloudfront_assets_distribution_id" {
  description = "에셋 CloudFront distribution ID (CI/CD 캐시 무효화용)"
  value       = aws_cloudfront_distribution.assets.id
}
