variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "ap-northeast-2"
}

variable "project" {
  description = "Project name (used as resource name prefix)"
  type        = string
  default     = "yueeroom"
}

variable "env" {
  description = "Environment"
  type        = string
  default     = "prod"
}

variable "domain" {
  description = "Primary domain"
  type        = string
  default     = "yueeroom.com"
}

variable "db_username" {
  description = "RDS master username"
  type        = string
  default     = "yueeroom"
}

variable "db_password" {
  description = "RDS master password"
  type        = string
  sensitive   = true
}

variable "db_name" {
  description = "RDS database name"
  type        = string
  default     = "yueeroom"
}

variable "backend_container_port" {
  description = "Backend container port"
  type        = number
  default     = 4000
}

variable "github_repo" {
  description = "GitHub repository for OIDC trust (owner/repo)"
  type        = string
  default     = "chanyoo-93/yueeroom-home"
}

variable "api_origin" {
  description = "Backend API origin for CSP connect-src (e.g. https://api.yueeroom.com)"
  type        = string
  default     = ""
}
