정리한 Issue #162 이해 내용을 기준으로 구현을 진행해.

목표:
production 환경에서 Swagger 문서(`/api/docs` 및 SwaggerModule이 제공하는 JSON 문서)가 공개 노출되지 않도록 하고, non-production 환경에서는 기존 접근을 유지한다.

핵심 원칙:

- NODE_ENV === 'production'일 때 Swagger 설정과 등록을 완전히 실행하지 않는다.
- NODE_ENV !== 'production'일 때 development/staging 기존 Swagger 접근을 유지한다.
- API docs 로그도 Swagger가 활성화되는 환경에서만 출력한다.
- 운영 health check(`/api/health`)에는 영향을 주지 않는다.

참고 문서:

- docs/plans/issue-162-plan.md

중요한 제약:

- 작업 시작 전 메인 브랜치의 최신화 여부를 확인하고, 작업 브랜치로 체크아웃한다.
- 브랜치 네이밍은 fix/issue-162-restrict-swagger-in-production 또는 feat/issue-162-restrict-swagger-in-production 형식을 사용한다.
- docs/plans/issue-162-plan.md는 참고만 하고, 코드 변경 대상에 포함하지 마.
- 계획서 범위를 벗어난 리팩토링이나 기능 추가는 하지 마.
- DB schema, migration, seed 파일은 수정하지 마.
- 새 API endpoint는 명시적으로 요구되지 않는 한 추가하지 마.
  - docs/plans/issue-162-plan.md

수정 대상 파일:

- 수정: apps/backend/src/main.ts
- 수정: .github/workflows/cd-backend.yml

구현 요구사항:

- apps/backend/src/main.ts에서 DocumentBuilder, SwaggerModule.createDocument, SwaggerModule.setup 호출을 process.env['NODE_ENV'] !== 'production' 조건 안으로 이동한다.
- console.log(`API docs: ...`)도 동일 조건 블록 안으로 이동한다.
- production에서는 SwaggerModule.setup('api/docs', app, document)가 호출되지 않아야 한다.
- staging(NODE_ENV=staging)에서는 Swagger 접근이 기존과 동일하게 가능해야 한다.
- .github/workflows/cd-backend.yml 수정은 선택 사항이며, 수정 시 staging 통합 테스트에 `/api/docs` 200 검증만 추가한다.

테스트 요구사항:

- production 환경에서 `/api/docs`가 공개 노출되지 않음을 확인한다.
- development 또는 staging 환경에서 `/api/docs`가 기존처럼 접근 가능함을 확인한다.
- `/api/health` health check 영향이 없음을 확인한다.
- main.ts 부트스트랩 로직에 대한 유닛 테스트는 추가하지 않는다.

작업 방식:

1. 먼저 실제 현재 코드 상태와 git diff를 확인한다.
2. 위 범위 안에서만 코드를 수정한다.
3. 변경이 커질 경우 백엔드 → 프론트엔드 → 테스트 순서로 나눠 진행한다.
4. 수정 후 관련 테스트를 실행한다.
5. 실패 테스트가 있으면 원인을 설명하고, Issue #162 범위 안에서만 수정한다.

우선 실행 권장 테스트:

```bash
pnpm --filter @yueeroom/backend test -- --silent
```

```bash
NODE_ENV=production node apps/backend/dist/main
```

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/api/docs
```

```bash
NODE_ENV=development node apps/backend/dist/main
```

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/api/docs
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
- 계획서에 있는 Issue #162 범위만 구현해.
- 보안/인증 이슈라면 기존보다 취약한 흐름을 다시 만들지 마.
