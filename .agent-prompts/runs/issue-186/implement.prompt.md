정리한 Issue #186 이해 내용을 기준으로 구현을 진행해.

목표:
Add a GitHub Repository Variable DEPLOY_ENABLED gate so CD workflows keep build/validation behavior but skip AWS deployment steps when AWS resources are paused.

핵심 원칙:

- Stay within docs/plans/issue-186-plan.md scope.
- Do not modify files or functions marked as no-change or forbidden in the plan.
- Keep build jobs running regardless of DEPLOY_ENABLED.
- Gate only AWS deployment jobs with vars.DEPLOY_ENABLED == 'true'.
- Preserve existing production and staging environment behavior unless the plan explicitly changes it.

참고 문서:

- docs/plans/issue-186-plan.md

중요한 제약:

- 작업 시작 전 메인 브랜치의 최신화 여부를 확인하고, 작업 브랜치로 체크아웃한다.
- 브랜치 네이밍은 fix/issue-186-deploy-enabled-cd-gate 또는 feat/issue-186-deploy-enabled-cd-gate 형식을 사용한다.
- docs/plans/issue-186-plan.md는 참고만 하고, 코드 변경 대상에 포함하지 마.
- 계획서 범위를 벗어난 리팩토링이나 기능 추가는 하지 마.
- DB schema, migration, seed 파일은 수정하지 마.
- 새 API endpoint는 명시적으로 요구되지 않는 한 추가하지 마.
  - Application source files outside GitHub Actions workflows
- Backend or frontend runtime code
- Files/functions marked as 변경 불필요 or 수정 금지 in the plan
- GitHub Secrets values
- GitHub Repository Variable values from code

수정 대상 파일:

- 수정: .github/workflows/cd-backend.yml
- 수정: .github/workflows/cd-frontend.yml

구현 요구사항:

- In .github/workflows/cd-backend.yml, split the current single deploy job into build-and-push and deploy jobs.
- Backend build-and-push must always run and keep checkout, AWS credentials, ECR login, and Docker build/push steps.
- Backend build-and-push must expose outputs.image from steps.build-image.outputs.image.
- Backend deploy must use needs: build-and-push and if: vars.DEPLOY_ENABLED == 'true'.
- Backend deploy must keep the existing environment and env values.
- Backend deploy must use needs.build-and-push.outputs.image instead of steps.build-image.outputs.image.
- Backend deploy must contain task definition download, image render, task definition registration, Prisma migration, ECS rolling update, main-only Sentry release, main-only health check, and staging-only integration tests.
- In .github/workflows/cd-frontend.yml, split the current single deploy job into build and deploy jobs.
- Frontend build must always run and keep checkout, pnpm/Node setup, dependency install, and Next.js static export build with required secrets.
- Frontend build must upload apps/frontend/out/ using actions/upload-artifact@v4.
- Frontend deploy must use needs: build and if: vars.DEPLOY_ENABLED == 'true'.
- Frontend deploy must download the artifact using actions/download-artifact@v4 into out/.
- Frontend deploy must configure AWS credentials after downloading the artifact.
- Frontend S3 static asset upload must support main with secrets.FRONTEND_S3_BUCKET and staging with secrets.FRONTEND_STAGING_S3_BUCKET.
- Frontend S3 HTML upload must support the same main/staging bucket branching.
- Frontend CloudFront invalidation must support main with secrets.CLOUDFRONT_DISTRIBUTION_ID and staging with secrets.CLOUDFRONT_STAGING_DISTRIBUTION_ID.
- Frontend staging smoke test must run after CloudFront invalidation inside the deploy job.

테스트 요구사항:

- No frontend or backend unit tests are required because only GitHub Actions workflow files are in scope.
- Validate YAML syntax and workflow structure where local tooling allows.
- Check DEPLOY_ENABLED=false behavior by confirming deploy jobs are skipped while build jobs remain runnable.
- Check DEPLOY_ENABLED=true behavior by confirming deploy jobs still have all required AWS deployment steps.
- Check backend image output wiring from build-and-push to deploy.
- Check frontend artifact path changes so S3 sync uses out/ after download.

작업 방식:

1. 먼저 실제 현재 코드 상태와 git diff를 확인한다.
2. 위 범위 안에서만 코드를 수정한다.
3. 변경이 커질 경우 백엔드 → 프론트엔드 → 테스트 순서로 나눠 진행한다.
4. 수정 후 관련 테스트를 실행한다.
5. 실패 테스트가 있으면 원인을 설명하고, Issue #186 범위 안에서만 수정한다.

우선 실행 권장 테스트:

```bash
act --dryrun push --branch main
```

```bash
act --dryrun push --branch staging
```

```bash
gh workflow list
```

출력 형식:

1. 변경한 파일 목록
2. 핵심 변경 내용
3. 응답 계약 변경 요약
4. 실행한 테스트 명령
5. 테스트 결과
6. 실패한 테스트가 있다면 원인과 조치 내용
7. 남은 위험 요소
8. 커밋 전 확인해야 할 사항

주의:

- 한 번에 전체 구조를 갈아엎지 마.
- 계획서에 있는 Issue #186 범위만 구현해.
- 보안/인증 이슈라면 기존보다 취약한 흐름을 다시 만들지 마.
