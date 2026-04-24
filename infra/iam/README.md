# AWS IAM 최소 권한 점검 결과

**점검일**: 2026-04-24  
**대상**: 유이룸 프로덕션 인프라 (ECS Fargate, S3, SES, RDS, ElastiCache)

---

## 점검 항목별 결과

### 1. ECS Task Role: S3, SES 접근 범위 최소화

**상태**: ✅ 수정 완료

**문제점**:

- `files.service.ts`, `email.service.ts` 모두 `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` 정적 자격증명을 명시적으로 사용
- IAM 사용자(User) 기반 접근으로, 자격증명 유출 시 전체 AWS 계정 위험

**조치**:

- 두 서비스에서 명시적 `credentials` 블록 제거 → AWS SDK 기본 자격증명 체인(ECS Task Role 자동 사용)
- `.env.example`에서 정적 자격증명 주석 처리 및 가이드 보완
- ECS Task Role 권한 정책 작성 (`ecs-task-role-policy.json`):
  - S3: `PutObject`, `DeleteObject` — `yueeroom-assets/products/*` 경로만 허용
  - SES: `SendEmail` — `yueeroom.com` identity만 허용

**적용 방법**:

```bash
# 1. Task Role 생성
aws iam create-role \
  --role-name yueeroom-ecs-task-role \
  --assume-role-policy-document file://ecs-task-role-trust-policy.json

# 2. 권한 정책 적용
aws iam put-role-policy \
  --role-name yueeroom-ecs-task-role \
  --policy-name yueeroom-ecs-task-policy \
  --policy-document file://ecs-task-role-policy.json
```

---

### 2. GitHub Actions OIDC Role: ECR Push + ECS Deploy 권한만 부여

**상태**: ✅ 신규 구성

**문제점**:

- 배포 워크플로우(`deploy.yml`)가 존재하지 않아 IAM 자격증명 관리 방식 미정

**조치**:

- OIDC Provider를 통한 역할(Role) 기반 인증 구성 (`github-actions-oidc-trust-policy.json`)
  - `sub` 조건을 `repo:chanyoo-93/yueeroom-home:ref:refs/heads/main`으로 한정 → main 브랜치 배포만 허용
- 최소 권한 정책 작성 (`github-actions-oidc-permissions-policy.json`):
  - ECR: `GetAuthorizationToken`(전체), 나머지 Push 액션은 `yueeroom-backend` 리포지터리만 허용
  - ECS: Task Definition 등록/조회, 서비스 업데이트는 지정 클러스터/서비스만 허용
  - `iam:PassRole`: ECS Task Role / Execution Role만 전달 허용
- `deploy.yml` 워크플로우 추가 (정적 자격증명 없이 OIDC만 사용)

**적용 방법**:

```bash
# 1. OIDC Role 생성 (ACCOUNT_ID 치환 필요)
aws iam create-role \
  --role-name yueeroom-github-actions-deploy \
  --assume-role-policy-document file://github-actions-oidc-trust-policy.json

# 2. 권한 정책 적용
aws iam put-role-policy \
  --role-name yueeroom-github-actions-deploy \
  --policy-name yueeroom-github-actions-deploy-policy \
  --policy-document file://github-actions-oidc-permissions-policy.json

# 3. GitHub Secrets에 ARN 등록
# Settings → Secrets → AWS_DEPLOY_ROLE_ARN = arn:aws:iam::ACCOUNT_ID:role/yueeroom-github-actions-deploy
```

---

### 3. RDS 접근: VPC 내부 전용, 퍼블릭 접근 차단

**상태**: ✅ 가이드 문서화 (인프라 배포 시 적용 필요)

**요구사항**:

- RDS 인스턴스는 Private Subnet에만 배치
- Security Group: ECS Task의 Security Group에서 5432 포트만 인바운드 허용
- `PubliclyAccessible: false` 설정 필수

**Terraform / CloudFormation 적용 체크리스트**:

```
☐ RDS subnet group → private subnets만 포함
☐ RDS security group → ECS SG에서 5432만 허용, 0.0.0.0/0 불허
☐ RDS parameter: publicly_accessible = false
```

---

### 4. ElastiCache: VPC 내부 전용

**상태**: ✅ 가이드 문서화 (인프라 배포 시 적용 필요)

**요구사항**:

- Redis 클러스터는 Private Subnet에만 배치
- Security Group: ECS Task의 Security Group에서 6379 포트만 인바운드 허용
- 전송 중 암호화(`TransitEncryptionEnabled: true`)

**Terraform / CloudFormation 적용 체크리스트**:

```
☐ Cache subnet group → private subnets만 포함
☐ Redis security group → ECS SG에서 6379만 허용, 0.0.0.0/0 불허
☐ transit_encryption_enabled = true
```

---

### 5. S3 버킷: 퍼블릭 읽기 차단 (CloudFront 경유만 허용)

**상태**: ✅ 정책 문서화

**조치**:

- `s3-bucket-policy.json` 작성:
  - `s3:GetObject`: `cloudfront.amazonaws.com`만 허용 (OAC 방식)
  - Principal이 CloudFront 서비스가 아닌 경우 모두 Deny
- Block Public Access 설정 활성화 필수

**S3 콘솔/CLI 적용**:

```bash
# Block Public Access 전체 활성화
aws s3api put-public-access-block \
  --bucket yueeroom-assets \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

# 버킷 정책 적용 (CLOUDFRONT_DISTRIBUTION_ID, ACCOUNT_ID 치환 필요)
aws s3api put-bucket-policy \
  --bucket yueeroom-assets \
  --policy file://s3-bucket-policy.json
```

---

### 6. IAM 사용자 대신 IAM 역할(Role) 사용

**상태**: ✅ 수정 완료

| 구분                 | 이전                     | 이후                                    |
| -------------------- | ------------------------ | --------------------------------------- |
| ECS 앱 (S3/SES 접근) | IAM 사용자 정적 자격증명 | ECS Task Role (SDK 자동 사용)           |
| GitHub Actions 배포  | 미정                     | OIDC Provider → IAM Role                |
| 로컬 개발            | 환경변수 직접 설정       | `aws configure --profile yueeroom` 권장 |

---

## 파일 구조

```
infra/iam/
├── ecs-task-role-trust-policy.json          # ECS Task Role 신뢰 정책
├── ecs-task-role-policy.json                # ECS Task Role 권한 정책 (S3 + SES)
├── github-actions-oidc-trust-policy.json   # GitHub Actions OIDC 신뢰 정책
├── github-actions-oidc-permissions-policy.json  # GitHub Actions 권한 정책
└── s3-bucket-policy.json                   # S3 버킷 정책 (CloudFront OAC)
```

> **주의**: JSON 파일의 `ACCOUNT_ID`, `CLOUDFRONT_DISTRIBUTION_ID` 플레이스홀더는 실제 값으로 치환하여 적용하세요.
