resource "aws_route53_zone" "main" {
  name    = var.domain
  comment = "Hosted zone for ${var.domain}"

  lifecycle {
    prevent_destroy = true
  }
}
