# Issue #162 준비 계획

## 사람이 읽는 요약

1. 네가 이해한 작업 목표

운영 환경(`NODE_ENV=production`)에서 Swagger 문서가 `/api/docs`로 공개 노출되지 않도록 `apps/backend/src/main.ts`의 Swagger 등록을 환경 조건으로 제한한다.  
`staging`, `development` 등 production이 아닌 환경에서는 기존처럼 Swagger 접근이 가능해야 한다.

GitHub issue #162는 open 상태이며, 계획서와 동일하게 Swagger 환경 분리와 health check 영향 확인을 요구한다.

2. 수정 대상 파일

- `apps/backend/src/main.ts`: 주요 수정 대상. Swagger 설정, 문서 생성, `SwaggerModule.setup`, API docs 로그를 `NODE_ENV !== 'production'` 조건 안으로 이동.
- `.github/workflows/cd-backend.yml`: 선택적 수정 대상. staging 통합 테스트에 `/api/docs` 200 확인을 추가할 수 있음.
- `docs/plans/issue-162-plan.md`: 이번 단계에서 읽기만 함. 현재 `git status`상 untracked 파일임.

3. 구현 순서

1. 브랜치 생성: `feature/issue162-restrict-swagger-in-production`
1. `main.ts`에서 Swagger 등록 블록을 `process.env['NODE_ENV'] !== 'production'` 조건으로 감쌈
1. `console.log('API docs: ...')`도 같은 조건 블록 안으로 이동
1. 필요 시 `.github/workflows/cd-backend.yml` staging check에 `/api/docs` 200 검증 추가
1. production/development 또는 staging 동작을 로컬 또는 CI 경로로 검증
1. 커밋, 푸시, PR 생성 시 본문에 `Closes #162` 포함

1. 테스트 추가/수정 계획

- 유닛 테스트는 추가하지 않음. 계획서 기준으로 `main.ts` 부트스트랩 로직은 유닛 테스트 대상이 아님.
- 백엔드 기존 테스트를 관련 범위로 실행하되, 계획서에는 전체 백엔드 테스트 명령이 제시되어 있음.
- 수동 검증:
  - `NODE_ENV=production`에서 `/api/docs`가 404인지 확인
  - `NODE_ENV=development` 또는 `NODE_ENV=staging`에서 `/api/docs`가 200인지 확인
- 선택적으로 `.github/workflows/cd-backend.yml` staging 통합 테스트에 `/api/docs` 200 확인 추가

5. 위험 요소

- `NODE_ENV`가 누락되면 production으로 간주되지 않아 Swagger가 노출될 수 있으나, 계획서에 따르면 env validation에서 필수값으로 검증됨.
- staging이 실수로 `NODE_ENV=production`으로 설정되면 Swagger가 비활성화됨.
- `/api/docs-json`도 Swagger setup과 함께 제공되므로 조건 블록 밖에 남기지 않아야 함.
- `/api/health`는 Swagger와 무관하지만, 운영 health check 영향은 검증해야 함.
- 현재 `docs/plans/issue-162-plan.md`가 untracked 상태라 커밋 범위에 포함할지 작업 시작 전 확인 필요.

6. 작업 시작 전에 확인이 필요한 점

- `.github/workflows/cd-backend.yml` 수정은 계획서에서 “선택적”으로 되어 있으므로 실제 구현 단계에서 포함할지 확인 필요.
- GitHub issue의 완료 조건에는 “배포 문서에 정책 반영”이 있지만, 계획서의 구체 수정 대상은 `main.ts`와 선택적 CD workflow에 한정되어 있음. 문서 수정은 계획서 범위 밖으로 보이므로 작업 전 포함 여부 확인 필요.
- 현재 untracked인 `docs/plans/issue-162-plan.md`를 PR에 포함할지 제외할지 확인 필요.

## machine_readable

```yaml
issue_number: 162
short_name: restrict-swagger-in-production
issue_goal: 'production 환경에서 Swagger 문서(`/api/docs` 및 SwaggerModule이 제공하는 JSON 문서)가 공개 노출되지 않도록 하고, non-production 환경에서는 기존 접근을 유지한다.'
core_principles:
  - "NODE_ENV === 'production'일 때 Swagger 설정과 등록을 완전히 실행하지 않는다."
  - "NODE_ENV !== 'production'일 때 development/staging 기존 Swagger 접근을 유지한다."
  - 'API docs 로그도 Swagger가 활성화되는 환경에서만 출력한다.'
  - '운영 health check(`/api/health`)에는 영향을 주지 않는다.'
target_files:
  new: []
  modify:
    - 'apps/backend/src/main.ts'
    - '.github/workflows/cd-backend.yml'
  delete: []
do_not_touch:
  - 'docs/plans/issue-162-plan.md'
implementation_requirements:
  - "apps/backend/src/main.ts에서 DocumentBuilder, SwaggerModule.createDocument, SwaggerModule.setup 호출을 process.env['NODE_ENV'] !== 'production' 조건 안으로 이동한다."
  - 'console.log(`API docs: ...`)도 동일 조건 블록 안으로 이동한다.'
  - "production에서는 SwaggerModule.setup('api/docs', app, document)가 호출되지 않아야 한다."
  - 'staging(NODE_ENV=staging)에서는 Swagger 접근이 기존과 동일하게 가능해야 한다.'
  - '.github/workflows/cd-backend.yml 수정은 선택 사항이며, 수정 시 staging 통합 테스트에 `/api/docs` 200 검증만 추가한다.'
test_requirements:
  - 'production 환경에서 `/api/docs`가 공개 노출되지 않음을 확인한다.'
  - 'development 또는 staging 환경에서 `/api/docs`가 기존처럼 접근 가능함을 확인한다.'
  - '`/api/health` health check 영향이 없음을 확인한다.'
  - 'main.ts 부트스트랩 로직에 대한 유닛 테스트는 추가하지 않는다.'
test_commands:
  - 'pnpm --filter @yueeroom/backend test -- --silent'
  - 'NODE_ENV=production node apps/backend/dist/main'
  - 'curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/api/docs'
  - 'NODE_ENV=development node apps/backend/dist/main'
  - 'curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/api/docs'
risks:
  - 'NODE_ENV가 누락되면 production으로 판정되지 않아 Swagger가 활성화될 수 있으나, 계획서 기준 env.validation.ts에서 필수값으로 검증된다.'
  - 'staging NODE_ENV가 production으로 잘못 설정되면 staging에서도 Swagger가 비활성화된다.'
  - '`/api/docs-json`은 SwaggerModule.setup과 함께 제공되므로 Swagger setup 전체가 조건 안에 있어야 한다.'
  - 'Swagger 변경이 `/api/health`에 직접 영향은 없지만 배포 health check는 확인해야 한다.'
  - '현재 `docs/plans/issue-162-plan.md`가 git status에서 untracked로 표시된다.'
pre_start_checks:
  - '현재 git status 확인 완료: `?? docs/plans/issue-162-plan.md`'
  - 'GitHub issue #162 확인 완료: open 상태, 제목은 `[배포/운영 개선] 운영 Swagger 문서 접근 제한`'
  - '.github/workflows/cd-backend.yml 수정 여부 확인 필요: 계획서상 선택 사항'
  - 'GitHub issue 완료 조건의 배포 문서 반영을 이번 작업 범위에 포함할지 확인 필요'
  - 'untracked `docs/plans/issue-162-plan.md`를 PR에 포함할지 확인 필요'
```
