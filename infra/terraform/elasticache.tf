resource "aws_elasticache_subnet_group" "main" {
  name       = "${var.project}-redis-subnet-group"
  subnet_ids = aws_subnet.db[*].id
}

resource "aws_elasticache_replication_group" "redis" {
  replication_group_id = "${var.project}-redis"
  description          = "Redis for ${var.project}"

  engine         = "redis"
  engine_version = "7.2"
  node_type      = "cache.t3.micro"
  port           = 6379

  num_cache_clusters = 2

  subnet_group_name  = aws_elasticache_subnet_group.main.name
  security_group_ids = [aws_security_group.redis.id]

  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  transit_encryption_mode    = "required"

  automatic_failover_enabled = true

  snapshot_retention_limit = 1
  snapshot_window          = "03:00-04:00"
}
