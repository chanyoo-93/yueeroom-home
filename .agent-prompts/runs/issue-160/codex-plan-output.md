# Issue #160 준비 계획

## 사람이 읽는 요약

1. 네가 이해한 작업 목표

   Issue #160의 목표는 이미 완료된 보안 수정 사항이 다시 깨지지 않도록 회귀 테스트를 보강하는 것이다. 백엔드의 민감 필드 미노출, HTML sanitize, 파일 매직 넘버 검증 테스트는 이미 충분히 존재하므로 새로 구현하지 않는다. 누락된 프론트엔드 `ProductDetailContent`의 XSS 렌더링 방어 테스트만 추가 준비 대상으로 본다.

2. 수정 대상 파일
   - 수정: `apps/frontend/src/components/products/ProductDetailContent.test.tsx`
   - 참조만: `apps/frontend/src/components/products/ProductDetailContent.tsx`
   - 참조만: `apps/backend/src/common/utils/html-sanitize.ts`

3. 구현 순서
   1. `ProductDetailContent.test.tsx`의 기존 mock, render helper, 테스트 스타일을 확인한다.
   2. 파일 하단에 `describe('보안 회귀 - XSS 렌더링 방어', ...)` 블록을 추가한다.
   3. `description` 값만 XSS 페이로드로 바꾼 테스트용 product 데이터를 구성한다.
   4. `container.innerHTML`을 사용해 실제 렌더된 마크업에서 위험 요소 제거 여부를 검증한다.
   5. 신규 프론트엔드 테스트를 실행한다.
   6. 계획서에 명시된 기존 백엔드 보안 테스트도 회귀 확인 용도로 실행한다.
   7. 이후 작업 단계에서 브랜치, 커밋, PR을 진행한다.

4. 테스트 추가/수정 계획

   `ProductDetailContent.test.tsx`에 4개 테스트를 추가한다.
   - `script` 태그가 포함된 `description`은 렌더링 시 제거되는지 확인한다.
   - `onclick` 같은 이벤트 핸들러 속성이 제거되는지 확인한다.
   - `javascript:` scheme의 `href` 링크가 제거되는지 확인한다.
   - 허용된 태그인 `strong`, `em`은 보존되는지 확인한다.

   검증은 `getByText`가 아니라 `container.innerHTML`로 수행한다. DOM 텍스트 조회만으로는 제거된 속성, 링크 scheme, 보존된 HTML 태그를 정확히 확인하기 어렵기 때문이다.

5. 위험 요소
   - 프론트엔드와 백엔드의 `sanitize-html` 정책이 완전히 동일하지 않을 수 있다. 특히 백엔드는 `img`의 `data:` scheme 허용 정책이 있으나 이 이슈 범위에서는 다루지 않는다.
   - 기존 `ProductDetailContent.test.tsx`의 mock 구조에 따라 독립 mock을 새로 만들지, 기존 mock을 확장할지 결정해야 한다.
   - `sanitize-html`은 테스트 환경에서 실제로 실행되므로 별도 mock 없이 테스트해야 한다. 라이브러리를 mock하면 이 회귀 테스트의 의미가 약해진다.

6. 작업 시작 전에 확인이 필요한 점
   - `ProductDetailContent.test.tsx`의 기존 render helper와 `mockProduct` 구조를 확인해야 한다.
   - 기존 mock에 `description` 필드가 있는지 확인해야 한다.
   - `ProductDetailContent.tsx`에서 `description` 렌더링이 계획서의 위치와 동일하게 `dangerouslySetInnerHTML` 및 `sanitize-html` 조합으로 되어 있는지 확인해야 한다.
   - 계획서에서 충분하다고 명시한 백엔드 테스트 파일은 수정하지 않는다.

## machine_readable

```yaml
issue_number: 160
short_name: product-detail-xss-rendering-regression-tests
issue_goal: 'ProductDetailContent의 description HTML 렌더링에서 XSS 방어가 유지되는지 검증하는 프론트엔드 회귀 테스트를 추가한다.'
core_principles:
  - 'issue-160-plan.md 범위 안에서만 작업한다.'
  - '백엔드 보안 테스트는 이미 충분하므로 수정하지 않는다.'
  - 'ProductDetailContent 구현은 참조만 하고, 계획서상 추가 대상은 테스트 파일로 제한한다.'
  - 'sanitize-html을 mock하지 않고 실제 렌더링 결과를 검증한다.'
  - 'HTML 속성, 링크 scheme, 태그 보존 여부는 container.innerHTML로 확인한다.'
target_files:
  new: []
  modify:
    - 'apps/frontend/src/components/products/ProductDetailContent.test.tsx'
  delete: []
do_not_touch:
  - 'apps/backend/src/admin/admin.service.spec.ts'
  - 'apps/backend/src/products/products.service.spec.ts'
  - 'apps/backend/src/files/files.service.spec.ts'
  - 'apps/backend/src/common/utils/html-sanitize.ts'
  - 'apps/frontend/src/components/products/ProductDetailContent.tsx'
implementation_requirements:
  - "ProductDetailContent.test.tsx 하단에 describe('보안 회귀 - XSS 렌더링 방어', ...) 블록을 추가한다."
  - 'script 태그 제거, 이벤트 핸들러 속성 제거, javascript: href 제거, 허용 태그 보존을 각각 독립 테스트로 작성한다.'
  - '기존 mockProduct에 description 필드가 있으면 기존 구조를 활용하고, 없거나 부적합하면 describe 블록 안에서 독립 mock을 사용한다.'
  - '테스트 검증에는 container.innerHTML을 사용한다.'
  - '프론트엔드와 백엔드 sanitize 정책 차이는 이슈 범위 밖이므로 구현 변경이나 별도 제안으로 확장하지 않는다.'
test_requirements:
  - 'script 태그가 포함된 description 렌더 결과에 <script>가 없어야 한다.'
  - 'onclick 이벤트 핸들러가 포함된 description 렌더 결과에 onclick이 없어야 한다.'
  - 'javascript: scheme href가 포함된 description 렌더 결과에 javascript:가 없어야 한다.'
  - '허용된 strong, em 태그는 렌더 결과에 보존되어야 한다.'
  - '기존 백엔드 보안 테스트 3개 파일은 수정 없이 실행 확인만 한다.'
test_commands:
  - 'cd apps/frontend && npx vitest run --reporter=dot ProductDetailContent'
  - 'pnpm --filter @yueeroom/backend test -- --silent admin.service files.service products.service'
risks:
  - '프론트엔드와 백엔드 sanitize-html 정책이 일부 다를 수 있으나 이 이슈 범위에서는 조정하지 않는다.'
  - '기존 테스트 파일의 mock 구조에 따라 최소 수정 방식이 달라질 수 있다.'
  - 'getByText 기반 검증은 HTML 속성 및 태그 보존 검증에 부적합하므로 사용하면 회귀 테스트가 약해질 수 있다.'
pre_start_checks:
  - 'apps/frontend/src/components/products/ProductDetailContent.test.tsx의 기존 mockProduct, render helper, describe 배치 방식을 확인한다.'
  - 'apps/frontend/src/components/products/ProductDetailContent.tsx의 description 렌더링이 dangerouslySetInnerHTML과 sanitize-html 조합인지 확인한다.'
  - '기존 mockProduct에 description 필드가 있는지 확인한다.'
  - '계획서에서 변경 불필요 또는 충분하다고 한 백엔드 테스트 파일은 수정하지 않는다는 제한을 유지한다.'
```
