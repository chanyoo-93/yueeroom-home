# DB 백업 및 복구 절차

## 백업 정책 개요

| 종류 | 주기 | 보관 기간 | 저장소 |
|------|------|-----------|--------|
| RDS 자동 백업 | 매일 02:00–03:00 UTC | 7일 | AWS RDS |
| AWS Backup 일별 스냅샷 | 매일 02:30 UTC | 7일 | `yueeroom-rds-backup-vault` |
| AWS Backup 주간 스냅샷 | 매주 일요일 02:00 UTC | 35일 (5주) | `yueeroom-rds-backup-vault` |
| 장기 보관 스냅샷 | 주간 스냅샷과 동시 복사 | 365일 | `yueeroom-rds-backup-vault-longterm` |
| S3 아카이브 | 수동 or 필요 시 | 30일→Glacier, 365일 삭제 | `yueeroom-db-backup-archive` |

---

## RDS 자동 백업에서 복구

RDS 콘솔 또는 AWS CLI를 사용하여 특정 시점(Point-in-Time Recovery)으로 복구한다.

```bash
# 특정 시점으로 신규 RDS 인스턴스 복구
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier yueeroom-prod \
  --target-db-instance-identifier yueeroom-prod-restored \
  --restore-time 2026-05-01T02:00:00Z \
  --db-subnet-group-name yueeroom-db-subnet-group \
  --vpc-security-group-ids <RDS_SG_ID> \
  --no-publicly-accessible \
  --region ap-northeast-2
```

복구 완료 후:
1. 복구된 인스턴스의 엔드포인트 확인
2. ECS Task Definition의 `DATABASE_URL` 환경 변수 업데이트
3. ECS 서비스 재배포
4. 데이터 무결성 확인 후 원본 인스턴스 삭제 또는 이름 교체

---

## AWS Backup 스냅샷에서 복구

### 1. 콘솔에서 복구

1. AWS 콘솔 → **AWS Backup** → **Backup vaults**
2. `yueeroom-rds-backup-vault` (또는 `yueeroom-rds-backup-vault-longterm`) 선택
3. 복구할 복구 지점(Recovery Point) 선택 → **Restore**
4. 신규 RDS 인스턴스 설정 입력 후 복구 시작

### 2. CLI에서 복구

```bash
# 복구 지점 목록 조회
aws backup list-recovery-points-by-backup-vault \
  --backup-vault-name yueeroom-rds-backup-vault \
  --by-resource-type RDS \
  --region ap-northeast-2

# 스냅샷에서 RDS 인스턴스 복구
aws backup start-restore-job \
  --recovery-point-arn <RECOVERY_POINT_ARN> \
  --iam-role-arn arn:aws:iam::<ACCOUNT_ID>:role/yueeroom-backup-role \
  --metadata '{"DBInstanceIdentifier":"yueeroom-prod-restored","DBSubnetGroupName":"yueeroom-db-subnet-group","VpcSecurityGroupIds":"[\"<RDS_SG_ID>\"]","MultiAZ":"false","PubliclyAccessible":"false","Engine":"postgres"}' \
  --region ap-northeast-2
```

---

## S3 아카이브에서 복구

S3에 저장된 RDS 스냅샷 익스포트는 Parquet 형식으로, 직접 DB 복구에 사용하기 어렵다.  
데이터 분석·특정 레코드 조회 용도로만 활용하고, 전체 복구는 위의 RDS/Backup 방식을 사용한다.

```bash
# S3 아카이브 버킷 내 파일 목록 확인
aws s3 ls s3://yueeroom-db-backup-archive/ --recursive --region ap-northeast-2
```

---

## 복구 후 체크리스트

- [ ] 복구된 인스턴스 엔드포인트 확인
- [ ] 보안 그룹 및 서브넷 설정 검증
- [ ] 애플리케이션 `DATABASE_URL` 업데이트
- [ ] ECS 서비스 재배포
- [ ] `/api/health` 엔드포인트 응답 확인
- [ ] 주요 데이터(상품, 주문, 회원) 조회 확인
- [ ] 원본 인스턴스 처리 (이름 변경 또는 삭제)
- [ ] 복구 결과 내부 공유

---

## 백업 알람

백업 성공/실패 이벤트는 EventBridge를 통해 SNS 토픽 `yueeroom-backup-alarm`으로 전송된다.  
알람 수신을 위해 SNS 토픽에 이메일 구독을 추가한다.

```bash
aws sns subscribe \
  --topic-arn <BACKUP_ALARM_TOPIC_ARN> \
  --protocol email \
  --notification-endpoint admin@yueeroom.com \
  --region ap-northeast-2
```

---

## 복구 테스트 절차 (정기 실행)

분기별 1회 복구 테스트를 실시하여 백업의 유효성을 검증한다.

1. 최신 주간 스냅샷 확인
2. 신규 인스턴스(`yueeroom-prod-dr-test`)로 복구
3. 복구된 인스턴스에 직접 접속하여 스키마·데이터 확인
4. 테스트 완료 후 `yueeroom-prod-dr-test` 인스턴스 삭제
5. 결과 문서화 (날짜, 스냅샷 ARN, 복구 소요 시간, 확인 결과)
