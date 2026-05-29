# Issue #186 준비 계획

## 사람이 읽는 요약

1. 네가 이해한 작업 목표

   `main`/`staging` 브랜치 push 시 CD 워크플로우의 빌드·검증 단계는 유지하되, AWS 리소스가 중단된 기간에는 GitHub Repository Variable `DEPLOY_ENABLED`로 AWS 배포 단계만 건너뛰도록 만든다. 백엔드는 기존 단일 `deploy` job을 `build-and-push`와 gated `deploy` job으로 나누고, 프론트엔드는 기존 단일 `deploy` job을 `build`와 gated `deploy` job으로 나누며 staging S3/CloudFront 배포를 추가한다.

2. 수정 대상 파일
   - `.github/workflows/cd-backend.yml`: 단일 `deploy` job을 `build-and-push`와 `deploy`로 분리하고, `deploy` job에 `vars.DEPLOY_ENABLED == 'true'` 조건을 추가한다.
   - `.github/workflows/cd-frontend.yml`: 단일 `deploy` job을 `build`와 `deploy`로 분리하고, build artifact 업로드/다운로드와 staging 배포 분기를 추가한다.
   - GitHub Repository Variables: `DEPLOY_ENABLED` 설정이 필요하지만 코드 파일 수정 대상은 아니다.
   - GitHub Secrets: staging용 `FRONTEND_STAGING_S3_BUCKET`, `CLOUDFRONT_STAGING_DISTRIBUTION_ID` 추가가 필요하지만 코드 파일 수정 대상은 아니다.

3. 구현 순서
   1. 현재 `.github/workflows/cd-backend.yml` 구조를 확인한다.
   2. 백엔드 workflow의 기존 `deploy` job에서 checkout, AWS credentials, ECR login, Docker build & push를 `build-and-push` job으로 분리한다.
   3. `build-and-push` job에 `outputs.image: ${{ steps.build-image.outputs.image }}`를 추가한다.
   4. 백엔드에 새 `deploy` job을 만들고 `needs: build-and-push`, `if: vars.DEPLOY_ENABLED == 'true'`, 기존 environment/env 값을 유지한다.
   5. 백엔드 배포 관련 steps를 새 `deploy` job으로 이동하고 image 참조를 `${{ needs.build-and-push.outputs.image }}`로 바꾼다.
   6. 현재 `.github/workflows/cd-frontend.yml` 구조를 확인한다.
   7. 프론트엔드 workflow의 checkout, pnpm/Node 설정, 의존성 설치, Next.js 빌드를 `build` job으로 분리한다.
   8. `build` job 끝에 `actions/upload-artifact@v4`로 `apps/frontend/out/` artifact를 업로드한다.
   9. 프론트엔드에 새 `deploy` job을 만들고 `needs: build`, `if: vars.DEPLOY_ENABLED == 'true'`, 기존 environment 설정을 유지한다.
   10. `deploy` job에서 `actions/download-artifact@v4`로 artifact를 `out/`에 내려받고, AWS credentials 이후 S3 upload와 CloudFront invalidation을 main/staging secret 분기로 실행한다.
   11. staging smoke test를 CloudFront invalidation 완료 후 실행되도록 `deploy` job 안으로 이동한다.

4. 테스트 추가/수정 계획
   - 애플리케이션 코드 변경이 아니므로 frontend/backend 단위 테스트는 추가하지 않는다.
   - YAML syntax와 GitHub Actions workflow 구성을 검증한다.
   - 가능하면 `act --dryrun push --branch main`으로 main 시나리오 dry-run을 확인한다.
   - 가능하면 `act --dryrun push --branch staging`으로 staging 시나리오 dry-run을 확인한다.
   - `act`가 없거나 로컬에서 GitHub Actions context/secret 검증이 제한되면 `gh workflow list`로 workflow 문법 오류 여부를 확인한다.

5. 위험 요소
   - `DEPLOY_ENABLED`가 미설정이면 빈 문자열로 평가되어 deploy job이 skip된다. 이는 의도한 fail-closed 동작이지만 운영 재개 시 `true` 설정을 잊으면 배포가 계속 skip된다.
   - build job도 environment secrets에 접근해야 하므로 기존 secrets 접근 방식이 깨지지 않도록 `environment:` 설정을 유지해야 한다.
   - 백엔드 deploy job에서 `needs.build-and-push.outputs.image`가 기존 ECR image URI 형식을 그대로 전달해야 한다.
   - 프론트엔드 artifact download 후 경로가 `out/` 기준으로 바뀌므로 S3 sync 경로를 기존 `apps/frontend/out/` 기준으로 남기면 배포가 실패할 수 있다.
   - staging S3 bucket과 CloudFront distribution secret이 없으면 `DEPLOY_ENABLED=true`인 staging deploy가 실패한다.
   - staging smoke test는 deploy job 안으로 이동하므로 `DEPLOY_ENABLED=false`일 때 함께 skip된다.

6. 작업 시작 전에 확인이 필요한 점
   - 현재 git status: `docs/plans/issue-186-plan.md`가 untracked 상태다.
   - staging environment의 `NEXT_PUBLIC_API_URL`이 production과 같은 값을 쓰는지, 별도 staging API URL secret이 있는지 확인이 필요하다.
   - `FRONTEND_STAGING_S3_BUCKET`과 `CLOUDFRONT_STAGING_DISTRIBUTION_ID` secrets가 실제로 존재하는지, 아니면 구현 후 별도로 생성할 예정인지 확인이 필요하다.
   - Repository Variable `DEPLOY_ENABLED`를 정상 운영 시 `true`, AWS 중단 시 `false`로 설정할 운영 절차 확인이 필요하다.

## machine_readable

```yaml
issue_number: 186
short_name: deploy-enabled-cd-gate
issue_goal: 'Add a GitHub Repository Variable DEPLOY_ENABLED gate so CD workflows keep build/validation behavior but skip AWS deployment steps when AWS resources are paused.'
core_principles:
  - 'Stay within docs/plans/issue-186-plan.md scope.'
  - 'Do not modify files or functions marked as no-change or forbidden in the plan.'
  - 'Keep build jobs running regardless of DEPLOY_ENABLED.'
  - "Gate only AWS deployment jobs with vars.DEPLOY_ENABLED == 'true'."
  - 'Preserve existing production and staging environment behavior unless the plan explicitly changes it.'
target_files:
  new: []
  modify:
    - '.github/workflows/cd-backend.yml'
    - '.github/workflows/cd-frontend.yml'
  delete: []
do_not_touch:
  - 'Application source files outside GitHub Actions workflows'
  - 'Backend or frontend runtime code'
  - 'Files/functions marked as 변경 불필요 or 수정 금지 in the plan'
  - 'GitHub Secrets values'
  - 'GitHub Repository Variable values from code'
implementation_requirements:
  - 'In .github/workflows/cd-backend.yml, split the current single deploy job into build-and-push and deploy jobs.'
  - 'Backend build-and-push must always run and keep checkout, AWS credentials, ECR login, and Docker build/push steps.'
  - 'Backend build-and-push must expose outputs.image from steps.build-image.outputs.image.'
  - "Backend deploy must use needs: build-and-push and if: vars.DEPLOY_ENABLED == 'true'."
  - 'Backend deploy must keep the existing environment and env values.'
  - 'Backend deploy must use needs.build-and-push.outputs.image instead of steps.build-image.outputs.image.'
  - 'Backend deploy must contain task definition download, image render, task definition registration, Prisma migration, ECS rolling update, main-only Sentry release, main-only health check, and staging-only integration tests.'
  - 'In .github/workflows/cd-frontend.yml, split the current single deploy job into build and deploy jobs.'
  - 'Frontend build must always run and keep checkout, pnpm/Node setup, dependency install, and Next.js static export build with required secrets.'
  - 'Frontend build must upload apps/frontend/out/ using actions/upload-artifact@v4.'
  - "Frontend deploy must use needs: build and if: vars.DEPLOY_ENABLED == 'true'."
  - 'Frontend deploy must download the artifact using actions/download-artifact@v4 into out/.'
  - 'Frontend deploy must configure AWS credentials after downloading the artifact.'
  - 'Frontend S3 static asset upload must support main with secrets.FRONTEND_S3_BUCKET and staging with secrets.FRONTEND_STAGING_S3_BUCKET.'
  - 'Frontend S3 HTML upload must support the same main/staging bucket branching.'
  - 'Frontend CloudFront invalidation must support main with secrets.CLOUDFRONT_DISTRIBUTION_ID and staging with secrets.CLOUDFRONT_STAGING_DISTRIBUTION_ID.'
  - 'Frontend staging smoke test must run after CloudFront invalidation inside the deploy job.'
test_requirements:
  - 'No frontend or backend unit tests are required because only GitHub Actions workflow files are in scope.'
  - 'Validate YAML syntax and workflow structure where local tooling allows.'
  - 'Check DEPLOY_ENABLED=false behavior by confirming deploy jobs are skipped while build jobs remain runnable.'
  - 'Check DEPLOY_ENABLED=true behavior by confirming deploy jobs still have all required AWS deployment steps.'
  - 'Check backend image output wiring from build-and-push to deploy.'
  - 'Check frontend artifact path changes so S3 sync uses out/ after download.'
test_commands:
  - 'act --dryrun push --branch main'
  - 'act --dryrun push --branch staging'
  - 'gh workflow list'
risks:
  - 'Unset DEPLOY_ENABLED evaluates like false, so deploy jobs skip until the variable is explicitly set to true.'
  - 'Build jobs require environment secrets, so missing environment configuration may break build behavior.'
  - 'Backend image output wiring can break ECS task rendering if the output name or URI format changes.'
  - 'Frontend artifact download changes paths from apps/frontend/out/ to out/, so stale paths can break S3 upload.'
  - 'Missing FRONTEND_STAGING_S3_BUCKET or CLOUDFRONT_STAGING_DISTRIBUTION_ID causes staging deploy failure when DEPLOY_ENABLED is true.'
  - 'Staging smoke test is skipped when DEPLOY_ENABLED is false because it lives in the gated deploy job.'
pre_start_checks:
  - 'git status currently shows docs/plans/issue-186-plan.md as untracked.'
  - 'Confirm whether staging NEXT_PUBLIC_API_URL should differ from production.'
  - 'Confirm whether FRONTEND_STAGING_S3_BUCKET exists or will be created later.'
  - 'Confirm whether CLOUDFRONT_STAGING_DISTRIBUTION_ID exists or will be created later.'
  - 'Confirm Repository Variable DEPLOY_ENABLED operating values: true for normal deployment and false while AWS resources are paused.'
```
