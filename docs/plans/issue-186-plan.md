# Issue #186 구현 계획: CD 파이프라인 DEPLOY_ENABLED 게이트 추가

## Context

AWS 리소스(ECS, RDS, ElastiCache)가 중단된 상태에서도 `main`/`staging` 브랜치에 push하면 CD 파이프라인이 트리거되어 배포 단계에서 실패한다. 빌드·검증은 통과하지만 AWS 의존 단계에서 연쇄 실패가 발생하는 문제(#184, #185)를 해결하기 위해, GitHub Repository Variable `DEPLOY_ENABLED`를 게이트로 사용하여 AWS 배포 단계만 선택적으로 skip한다.

---

## 1. 관련 파일 목록

| 파일                                | 변경 여부     | 설명                                                               |
| ----------------------------------- | ------------- | ------------------------------------------------------------------ |
| `.github/workflows/cd-backend.yml`  | **수정**      | 단일 `deploy` job → `build-and-push` + `deploy` job 분리           |
| `.github/workflows/cd-frontend.yml` | **수정**      | 단일 `deploy` job → `build` + `deploy` job 분리, staging 배포 추가 |
| GitHub Repository Variables         | **설정 필요** | `DEPLOY_ENABLED` 변수 추가 (true/false)                            |
| GitHub Secrets (staging용)          | **추가 필요** | `FRONTEND_STAGING_S3_BUCKET`, `CLOUDFRONT_STAGING_DISTRIBUTION_ID` |

---

## 2. 현재 구조 요약

### cd-backend.yml (184 lines)

- **단일 `deploy` job** — 브랜치 조건 없이 모든 step이 순서대로 실행됨
- Steps 순서:
  1. Checkout
  2. AWS credentials (OIDC)
  3. ECR login
  4. Docker build & push → `steps.build-image.outputs.image` 생성
  5. ECS task definition 다운로드
  6. task definition에 image 업데이트
  7. 새 task definition revision 등록
  8. Prisma migration (ECS one-off task)
  9. ECS rolling update 배포 (`wait-for-service-stability: true`)
  10. Sentry 릴리스 알림 (`if: github.ref_name == 'main'`)
  11. Health check (`if: github.ref_name == 'main'`)
  12. Integration tests (`if: github.ref_name == 'staging'`)
- **현재 게이트 없음** — AWS 중단 시 step 4 이후부터 실패

### cd-frontend.yml (117 lines)

- **단일 `deploy` job** — build는 항상 실행, S3/CloudFront는 main만, staging은 smoke test만
- Steps 순서:
  1. Checkout
  2. pnpm/Node.js 설정
  3. 의존성 설치
  4. Next.js 빌드 (정적 export) — 환경 secrets 다수 사용
  5. AWS credentials (OIDC)
  6. S3 정적 자산 업로드 (`if: github.ref_name == 'main'`)
  7. S3 HTML 파일 업로드 (`if: github.ref_name == 'main'`)
  8. CloudFront 캐시 무효화 (`if: github.ref_name == 'main'`)
  9. Smoke test (`if: github.ref_name == 'staging'`) — **staging용 S3 배포 없음**
- **현재 staging에는 실제 배포 단계 없음** — 이슈 요구사항으로 추가 필요

---

## 3. 변경해야 할 지점

### cd-backend.yml

**`deploy` job을 두 job으로 분리:**

```
build-and-push job (항상 실행):
  environment: production | staging
  outputs: image (ECR 이미지 URI)
  steps:
    - Checkout
    - AWS credentials (OIDC)
    - ECR login
    - Docker build & push
    - ↑ echo "image=..." >> $GITHUB_OUTPUT

deploy job (DEPLOY_ENABLED == 'true' 일 때만):
  needs: build-and-push
  if: vars.DEPLOY_ENABLED == 'true'
  environment: production | staging
  env: ECS_CLUSTER, ECS_SERVICE, TASK_DEFINITION (현재와 동일)
  steps:
    - Checkout
    - AWS credentials (OIDC)
    - task definition 다운로드
    - image 업데이트 (needs.build-and-push.outputs.image 사용)
    - task definition revision 등록
    - Prisma migration
    - ECS rolling update 배포
    - Sentry 릴리스 (main only)
    - Health check (main only) / Integration tests (staging only)
```

**핵심 변경사항:** `build-image` step의 `outputs.image`를 job outputs으로 노출해야 함:

```yaml
# build-and-push job에 추가
outputs:
  image: ${{ steps.build-image.outputs.image }}
```

`deploy` job에서 image 참조 방식 변경:

```yaml
# 기존
image: ${{ steps.build-image.outputs.image }}
# 변경 후
image: ${{ needs.build-and-push.outputs.image }}
```

---

### cd-frontend.yml

**`deploy` job을 두 job으로 분리 + staging 배포 추가:**

```
build job (항상 실행):
  environment: production | staging
  steps:
    - Checkout
    - pnpm/Node.js 설정
    - 의존성 설치
    - Next.js 빌드 (정적 export, secrets 포함)
    - Upload artifact: apps/frontend/out/ (actions/upload-artifact@v4)

deploy job (DEPLOY_ENABLED == 'true' 일 때만):
  needs: build
  if: vars.DEPLOY_ENABLED == 'true'
  environment: production | staging
  steps:
    - Download artifact (actions/download-artifact@v4)
    - AWS credentials (OIDC)
    - S3 정적 자산 업로드:
        main → secrets.FRONTEND_S3_BUCKET
        staging → secrets.FRONTEND_STAGING_S3_BUCKET
    - S3 HTML 파일 업로드 (동일한 bucket 분기)
    - CloudFront 캐시 무효화:
        main → secrets.CLOUDFRONT_DISTRIBUTION_ID
        staging → secrets.CLOUDFRONT_STAGING_DISTRIBUTION_ID
    - Smoke test (staging only, CloudFront 무효화 완료 후)
```

**아티팩트 경로:** `apps/frontend/out/` (Next.js static export 출력 기본 경로)

**S3 업로드 step 변경 예시:**

```yaml
# 기존 (main only)
if: github.ref_name == 'main'
run: |
  aws s3 sync apps/frontend/out/_next/static/ \
    s3://${{ secrets.FRONTEND_S3_BUCKET }}/_next/static/ ...

# 변경 후 (main + staging 분기)
env:
  S3_BUCKET: ${{ github.ref_name == 'main' && secrets.FRONTEND_S3_BUCKET || secrets.FRONTEND_STAGING_S3_BUCKET }}
run: |
  aws s3 sync out/_next/static/ \  # artifact 경로
    s3://$S3_BUCKET/_next/static/ ...
```

---

## 4. 잠재적 위험

| 위험                                           | 설명                                                                              | 대응                                                                     |
| ---------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| **`vars.DEPLOY_ENABLED` 미설정 시 기본값**     | 변수가 없으면 빈 문자열 → `== 'true'` 실패 → 배포 skip                            | 의도한 동작. 단, 처음 설정 시 `true`로 등록해야 정상 배포 가능           |
| **환경(environment) 중복 접근**                | `build-and-push`/`build` job도 environment secrets 접근 필요                      | 두 job 모두 `environment:` 설정 필요                                     |
| **아티팩트 만료**                              | `upload-artifact` 기본 보관 기간 90일                                             | 같은 workflow run 내에서만 사용하므로 문제 없음                          |
| **staging 빌드 API URL**                       | 현재 `NEXT_PUBLIC_API_URL` secret은 production/staging 구분 없이 동일 값일 가능성 | **확인 필요**: staging 환경에 별도 `NEXT_PUBLIC_API_URL` secret이 있는지 |
| **`amazon-ecs-render-task-definition` action** | job outputs 경유 image URI 전달 시 포맷 동일해야 함                               | `$ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG` 형식 그대로 유지              |
| **Smoke test 위치**                            | deploy job 내에 포함 → `DEPLOY_ENABLED=false`이면 smoke test도 skip됨             | 배포 없이 smoke test는 의미 없으므로 acceptable                          |

---

## 5. 구현 순서

1. **cd-backend.yml 수정**
   1. `deploy` job → `build-and-push` job으로 분리 (steps 1~4)
   2. `build-and-push`에 job `outputs` 추가
   3. 새 `deploy` job 작성 (`needs: build-and-push`, `if: vars.DEPLOY_ENABLED == 'true'`)
   4. steps 5~12를 `deploy` job으로 이동, image 참조 경로 수정

2. **cd-frontend.yml 수정**
   1. `deploy` job → `build` job으로 분리 (steps 1~4)
   2. `build` job 마지막에 `actions/upload-artifact@v4` 추가
   3. 새 `deploy` job 작성 (`needs: build`, `if: vars.DEPLOY_ENABLED == 'true'`)
   4. `download-artifact` step 추가 (artifact 경로: `out/`)
   5. S3 upload steps → main/staging 분기 추가 (secrets 분기)
   6. CloudFront invalidation → main/staging 분기 추가
   7. Smoke test step 이동 (CloudFront 무효화 완료 후)

3. **GitHub 설정** (수동, 코드 변경 아님)
   - Repository Variables: `DEPLOY_ENABLED = true` (정상 운영 시) / `false` (AWS 중단 시)
   - Secrets 추가 (staging environment):
     - `FRONTEND_STAGING_S3_BUCKET`
     - `CLOUDFRONT_STAGING_DISTRIBUTION_ID`

---

## 6. 테스트 전략

### 단위 검증 (YAML syntax)

```bash
# GitHub Actions workflow 문법 검증
act --dryrun push --branch main  # act 설치 시
# 또는
gh workflow list  # 문법 오류 확인
```

### 시나리오 테스트

| 시나리오                    | `DEPLOY_ENABLED` | 기대 결과                               |
| --------------------------- | ---------------- | --------------------------------------- |
| AWS 중단 중 push to main    | `false`          | `build-and-push` 성공, `deploy` skip    |
| AWS 중단 중 push to staging | `false`          | `build` 성공, `deploy` skip             |
| AWS 복구 후 push to main    | `true`           | 전체 파이프라인 정상 실행               |
| AWS 복구 후 push to staging | `true`           | staging S3+CloudFront 배포 + smoke test |

### 검증 포인트

- `build-and-push` job이 `DEPLOY_ENABLED=false`일 때도 완료되는지
- `deploy` job이 `DEPLOY_ENABLED=false`일 때 `skipped` 상태로 표시되는지
- `needs.build-and-push.outputs.image` 값이 `deploy` job에서 올바르게 참조되는지
- artifact download 후 S3 sync 경로가 올바른지 (`out/` 기준)

---

## 확인 필요 사항

- **staging 환경 `NEXT_PUBLIC_API_URL`**: production과 동일한 값을 사용하는지, 아니면 staging API URL이 별도 있는지 (기존 이슈, #186 범위 외일 수 있음)
- **`FRONTEND_STAGING_S3_BUCKET` / `CLOUDFRONT_STAGING_DISTRIBUTION_ID` secrets**: 실제 AWS 리소스가 있는지, 또는 이슈 구현 후 나중에 생성할 예정인지
