resource "aws_db_subnet_group" "main" {
  name       = "${var.project}-db-subnet-group"
  subnet_ids = aws_subnet.db[*].id
}

resource "aws_db_parameter_group" "postgres16" {
  name   = "${var.project}-postgres16"
  family = "postgres16"
}

resource "aws_db_instance" "main" {
  identifier = "${var.project}-prod"

  engine                = "postgres"
  engine_version        = "16.6"
  instance_class        = "db.t3.medium"
  allocated_storage     = 20
  max_allocated_storage = 100
  storage_type          = "gp3"
  storage_encrypted     = true

  db_name  = var.db_name
  username = var.db_username
  password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  parameter_group_name   = aws_db_parameter_group.postgres16.name

  multi_az            = false
  publicly_accessible = false
  deletion_protection = true

  skip_final_snapshot       = false
  final_snapshot_identifier = "${var.project}-prod-final-snapshot"

  backup_retention_period = 0
  maintenance_window      = "Mon:03:00-Mon:04:00"

  performance_insights_enabled = false
}
