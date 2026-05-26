정리한 Issue #160 이해 내용을 기준으로 구현을 진행해.

목표:
ProductDetailContent의 description HTML 렌더링에서 XSS 방어가 유지되는지 검증하는 프론트엔드 회귀 테스트를 추가한다.

핵심 원칙:

- issue-160-plan.md 범위 안에서만 작업한다.
- 백엔드 보안 테스트는 이미 충분하므로 수정하지 않는다.
- ProductDetailContent 구현은 참조만 하고, 계획서상 추가 대상은 테스트 파일로 제한한다.
- sanitize-html을 mock하지 않고 실제 렌더링 결과를 검증한다.
- HTML 속성, 링크 scheme, 태그 보존 여부는 container.innerHTML로 확인한다.

참고 문서:

- docs/plans/issue-160-plan.md

중요한 제약:

- 작업 시작 전 메인 브랜치의 최신화 여부를 확인하고, 작업 브랜치로 체크아웃한다.
- 브랜치 네이밍은 fix/issue-160-product-detail-xss-rendering-regression-tests 또는 feat/issue-160-product-detail-xss-rendering-regression-tests 형식을 사용한다.
- docs/plans/issue-160-plan.md는 참고만 하고, 코드 변경 대상에 포함하지 마.
- 계획서 범위를 벗어난 리팩토링이나 기능 추가는 하지 마.
- DB schema, migration, seed 파일은 수정하지 마.
- 새 API endpoint는 명시적으로 요구되지 않는 한 추가하지 마.
  - apps/backend/src/admin/admin.service.spec.ts
- apps/backend/src/products/products.service.spec.ts
- apps/backend/src/files/files.service.spec.ts
- apps/backend/src/common/utils/html-sanitize.ts
- apps/frontend/src/components/products/ProductDetailContent.tsx

수정 대상 파일:

- 수정: apps/frontend/src/components/products/ProductDetailContent.test.tsx

구현 요구사항:

- ProductDetailContent.test.tsx 하단에 describe('보안 회귀 - XSS 렌더링 방어', ...) 블록을 추가한다.
- script 태그 제거, 이벤트 핸들러 속성 제거, javascript: href 제거, 허용 태그 보존을 각각 독립 테스트로 작성한다.
- 기존 mockProduct에 description 필드가 있으면 기존 구조를 활용하고, 없거나 부적합하면 describe 블록 안에서 독립 mock을 사용한다.
- 테스트 검증에는 container.innerHTML을 사용한다.
- 프론트엔드와 백엔드 sanitize 정책 차이는 이슈 범위 밖이므로 구현 변경이나 별도 제안으로 확장하지 않는다.

테스트 요구사항:

- script 태그가 포함된 description 렌더 결과에 <script>가 없어야 한다.
- onclick 이벤트 핸들러가 포함된 description 렌더 결과에 onclick이 없어야 한다.
- javascript: scheme href가 포함된 description 렌더 결과에 javascript:가 없어야 한다.
- 허용된 strong, em 태그는 렌더 결과에 보존되어야 한다.
- 기존 백엔드 보안 테스트 3개 파일은 수정 없이 실행 확인만 한다.

작업 방식:

1. 먼저 실제 현재 코드 상태와 git diff를 확인한다.
2. 위 범위 안에서만 코드를 수정한다.
3. 변경이 커질 경우 백엔드 → 프론트엔드 → 테스트 순서로 나눠 진행한다.
4. 수정 후 관련 테스트를 실행한다.
5. 실패 테스트가 있으면 원인을 설명하고, Issue #160 범위 안에서만 수정한다.

우선 실행 권장 테스트:

```bash
cd apps/frontend && npx vitest run --reporter=dot ProductDetailContent
```

```bash
pnpm --filter @yueeroom/backend test -- --silent admin.service files.service products.service
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
- 계획서에 있는 Issue #160 범위만 구현해.
- 보안/인증 이슈라면 기존보다 취약한 흐름을 다시 만들지 마.
