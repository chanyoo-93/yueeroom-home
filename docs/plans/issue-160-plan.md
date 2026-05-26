# Issue #160 — 보안 취약점 재현 테스트 추가

## Context

보안 수정 PR(#165/#146 민감 필드, #148 HTML sanitize, #149 magic number)이 완료된 후, 회귀 방지를 위한 체계적인 테스트가 필요하다. 백엔드 3개 서비스의 보안 테스트는 각 수정 PR에서 이미 추가되어 있으나, 프론트엔드 `ProductDetailContent`의 XSS 렌더링 방어 테스트가 누락되어 있다.

---

## 현황 분석

### 이미 존재하는 테스트 (확인 완료)

| 파일                                                 | 내용                                                                                                 | 상태    |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------- |
| `apps/backend/src/admin/admin.service.spec.ts`       | `listUsers` / `listPendingUsers` — password·mfaSecret·providerId 미노출, USER_SAFE_SELECT 검증 (4개) | ✅ 충분 |
| `apps/backend/src/products/products.service.spec.ts` | script 제거, 이벤트 핸들러 제거, javascript: 차단, 허용 태그 보존, update 시 sanitize (5개)          | ✅ 충분 |
| `apps/backend/src/files/files.service.spec.ts`       | JPEG·PNG·WebP 스푸핑 차단, 길이 부족 검증 (9개)                                                      | ✅ 충분 |

### 미완료 — 추가 대상

| 파일                                                                  | 필요 내용                                                              |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `apps/frontend/src/components/products/ProductDetailContent.test.tsx` | XSS 렌더링 방어: `dangerouslySetInnerHTML` + `sanitize-html` 조합 검증 |

---

## 관련 파일

**수정 대상:**

- `apps/frontend/src/components/products/ProductDetailContent.test.tsx` — describe 블록 추가 (현재 47개 테스트)

**참조 파일:**

- `apps/frontend/src/components/products/ProductDetailContent.tsx` (line ~279–297) — `dangerouslySetInnerHTML` + `sanitize-html` 구현
- `apps/backend/src/common/utils/html-sanitize.ts` — 백엔드 sanitize 정책 (허용 태그·속성·scheme 정의)

---

## 변경 지점

`ProductDetailContent.test.tsx` 하단에 단일 `describe` 블록 추가:

```tsx
describe('보안 회귀 - XSS 렌더링 방어', () => {
  it('script 태그가 포함된 description은 렌더링 시 제거된다');
  it('onclick 이벤트 핸들러 속성이 제거된다');
  it('javascript: scheme href 링크가 제거된다');
  it('허용된 태그(strong, em)는 보존된다');
});
```

**검증 방법**: `container.innerHTML`로 렌더 결과 직접 확인

- `getByText`는 DOM 텍스트만 읽으므로 HTML 속성·태그 검증 불가
- `container.innerHTML`로 실제 렌더된 마크업 문자열 검사

---

## 잠재적 위험

1. **sanitize-html 정책 불일치**: 백엔드는 img에 `data:` scheme 허용, 프론트엔드는 미지정(기본값 제외). 이 차이는 현재 이슈 범위 밖이므로 언급 없이 진행.

2. **기존 mock 구조 파악 필요**: 파일 읽기 후 기존 `mockProduct`에 `description` 필드가 있는지 확인. 없으면 새 describe 블록 내에서 독립 mock 사용.

3. **sanitize-html은 테스트 환경에서 실제 동작**: RTL 테스트에서 실제 라이브러리가 실행되므로 별도 mock 불필요. 결과 확인만 하면 됨.

---

## 구현 순서

1. `ProductDetailContent.test.tsx` 읽기 — 기존 mock 구조·helper 파악
2. 파일 하단에 `describe('보안 회귀 - XSS 렌더링 방어')` 블록 추가 (4개 테스트)
3. 프론트 테스트 실행: `cd apps/frontend && npx vitest run --reporter=dot ProductDetailContent`
4. 백엔드 기존 보안 테스트 통과 확인: `pnpm --filter @yueeroom/backend test -- --silent admin.service files.service products.service`
5. 브랜치 생성 → 커밋 → PR (`Closes #160`)

---

## 테스트 전략

### 프론트엔드 (신규 — 4개 테스트)

```
시나리오 1: script 태그 제거
  description = '<p>안전</p><script>alert("xss")</script>'
  → container.innerHTML에 '<script>' 없음

시나리오 2: 이벤트 핸들러 제거
  description = '<p onclick="alert(1)">텍스트</p>'
  → container.innerHTML에 'onclick' 없음

시나리오 3: javascript: href 제거
  description = '<a href="javascript:alert(1)">링크</a>'
  → container.innerHTML에 'javascript:' 없음

시나리오 4: 허용 태그 보존
  description = '<p><strong>굵게</strong></p>'
  → container.innerHTML에 '<strong>' 있음
```

### 백엔드 (기존 확인)

- `admin.service.spec.ts` — listUsers/listPendingUsers 민감 필드 4개
- `products.service.spec.ts` — sanitize 5개
- `files.service.spec.ts` — 매직 넘버 9개
