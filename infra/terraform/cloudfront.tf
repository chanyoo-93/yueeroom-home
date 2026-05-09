locals {
  csp_connect_src = join(" ", compact([
    "'self'",
    "https://api.stripe.com",
    "https://apis.naver.com",
    "https://open-api.kakaopay.com",
    var.api_origin,
  ]))

  csp_header = join("; ", [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://js.stripe.com https://pay.naver.com https://online-pay.kakao.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
    "connect-src ${local.csp_connect_src}",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ])
}

resource "aws_cloudfront_response_headers_policy" "frontend_security" {
  name    = "${var.project}-frontend-security-headers"
  comment = "Security headers for ${var.project} frontend"

  security_headers_config {
    content_security_policy {
      content_security_policy = local.csp_header
      override                = true
    }

    content_type_options {
      override = true
    }

    frame_options {
      frame_option = "SAMEORIGIN"
      override     = true
    }
  }
}

resource "aws_cloudfront_origin_access_control" "assets" {
  name                              = "${var.project}-assets-oac"
  description                       = "OAC for ${var.project} assets bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_origin_access_control" "frontend" {
  name                              = "${var.project}-frontend-oac"
  description                       = "OAC for ${var.project} frontend bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_distribution" "assets" {
  enabled     = true
  comment     = "${var.project} assets CDN"
  aliases     = ["assets.${var.domain}"]
  price_class = "PriceClass_200"
  web_acl_id  = aws_wafv2_web_acl.cloudfront.arn

  origin {
    domain_name              = aws_s3_bucket.assets.bucket_regional_domain_name
    origin_id                = "s3-assets"
    origin_access_control_id = aws_cloudfront_origin_access_control.assets.id
  }

  default_cache_behavior {
    target_origin_id       = "s3-assets"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true

    # Managed-CachingOptimized
    cache_policy_id = "658327ea-f89d-4fab-a63d-7e88639e58f6"
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.cloudfront.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  depends_on = [aws_acm_certificate_validation.cloudfront]
}

resource "aws_s3_bucket_policy" "assets" {
  bucket = aws_s3_bucket.assets.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "AllowCloudFrontOAC"
      Effect    = "Allow"
      Principal = { Service = "cloudfront.amazonaws.com" }
      Action    = "s3:GetObject"
      Resource  = "${aws_s3_bucket.assets.arn}/*"
      Condition = {
        StringEquals = {
          "AWS:SourceArn" = aws_cloudfront_distribution.assets.arn
        }
      }
    }]
  })
}

resource "aws_cloudfront_function" "url_rewrite" {
  name    = "${var.project}-url-rewrite"
  runtime = "cloudfront-js-2.0"
  publish = true
  code    = <<-EOT
    var DYNAMIC_SEGMENTS = { 'products': true, 'orders': true };

    function handler(event) {
      var uri = event.request.uri;
      var parts = uri.split('/');

      // 동적 경로: /products/{id}/... 또는 /orders/{id}/... → /_/ 로 치환
      // ex) /products/{uuid}/         → /products/_/index.html
      //     /products/{uuid}/index.txt → /products/_/index.txt  (RSC 페이로드)
      if (parts.length >= 3 && DYNAMIC_SEGMENTS[parts[1]] && parts[2] !== '_' && parts[2] !== '') {
        parts[2] = '_';
        uri = parts.join('/');
        if (uri.endsWith('/')) {
          event.request.uri = uri + 'index.html';
        } else if (!uri.split('/').pop().includes('.')) {
          event.request.uri = uri + '/index.html';
        } else {
          event.request.uri = uri;
        }
        return event.request;
      }

      if (uri.endsWith('/')) {
        event.request.uri += 'index.html';
      } else if (!uri.split('/').pop().includes('.')) {
        event.request.uri += '/index.html';
      }
      return event.request;
    }
  EOT
}

resource "aws_cloudfront_distribution" "frontend" {
  enabled             = true
  comment             = "${var.project} frontend"
  aliases             = [var.domain, "www.${var.domain}"]
  default_root_object = "index.html"
  price_class         = "PriceClass_200"
  web_acl_id          = aws_wafv2_web_acl.cloudfront.arn

  origin {
    domain_name              = aws_s3_bucket.frontend_build.bucket_regional_domain_name
    origin_id                = "s3-frontend"
    origin_access_control_id = aws_cloudfront_origin_access_control.frontend.id
  }

  default_cache_behavior {
    target_origin_id       = "s3-frontend"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true

    # Managed-CachingOptimized
    cache_policy_id             = "658327ea-f89d-4fab-a63d-7e88639e58f6"
    response_headers_policy_id  = aws_cloudfront_response_headers_policy.frontend_security.id

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.url_rewrite.arn
    }
  }

  # SPA fallback
  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
  }

  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.cloudfront.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  depends_on = [aws_acm_certificate_validation.cloudfront]
}

resource "aws_s3_bucket_policy" "frontend_build" {
  bucket = aws_s3_bucket.frontend_build.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "AllowCloudFrontOAC"
      Effect    = "Allow"
      Principal = { Service = "cloudfront.amazonaws.com" }
      Action    = "s3:GetObject"
      Resource  = "${aws_s3_bucket.frontend_build.arn}/*"
      Condition = {
        StringEquals = {
          "AWS:SourceArn" = aws_cloudfront_distribution.frontend.arn
        }
      }
    }]
  })
}

resource "aws_route53_record" "assets_cdn" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "assets.${var.domain}"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.assets.domain_name
    zone_id                = aws_cloudfront_distribution.assets.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "frontend_apex" {
  zone_id = aws_route53_zone.main.zone_id
  name    = var.domain
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.frontend.domain_name
    zone_id                = aws_cloudfront_distribution.frontend.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "frontend_www" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "www.${var.domain}"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.frontend.domain_name
    zone_id                = aws_cloudfront_distribution.frontend.hosted_zone_id
    evaluate_target_health = false
  }
}
