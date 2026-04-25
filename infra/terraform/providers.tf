terraform {
  required_version = ">= 1.7"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Terraform state를 S3에 저장 (적용 전 버킷 직접 생성 필요)
  # backend "s3" {
  #   bucket  = "yueeroom-terraform-state"
  #   key     = "prod/terraform.tfstate"
  #   region  = "ap-northeast-2"
  #   encrypt = true
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project
      Environment = var.env
      ManagedBy   = "terraform"
    }
  }
}

# CloudFront ACM 인증서는 반드시 us-east-1에서 발급
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"

  default_tags {
    tags = {
      Project     = var.project
      Environment = var.env
      ManagedBy   = "terraform"
    }
  }
}

data "aws_caller_identity" "current" {}
