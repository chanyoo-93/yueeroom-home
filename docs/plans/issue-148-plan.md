# Issue #148 구현 계획 — 상품 설명 HTML 서버 사이드 정화

> 작성일: 2026-05-20  
> 이슈: [[보안 개선] 상품 설명 HTML 서버 사이드 정화 추가](https://github.com/chanyoo-93/yueeroom-home/issues/148)

---

## 1. 관련 파일 목록

| 파일                                                             | 역할                                                    |
| ---------------------------------------------------------------- | ------------------------------------------------------- |
| `apps/backend/src/products/products.service.ts`                  | `create()` / `update()`에서 sanitize 적용               |
| `apps/backend/src/products/dto/create-product.dto.ts`            | `description` 필드 선언                                 |
| `apps/backend/src/products/dto/update-product.dto.ts`            | `PartialType(OmitType(CreateProductDto))` — 변경 불필요 |
| `apps/backend/src/products/products.service.spec.ts`             | XSS 방어 테스트 추가                                    |
| `apps/frontend/src/components/products/ProductDetailContent.tsx` | 현재 프론트 sanitize 위치 (변경 여부 결정 필요)         |

신규 생성:

- `apps/backend/src/common/utils/html-sanitize.ts` — sanitize 유틸

---

## 2. 현재 구조 요약

- **저장 시점**: `products.service.ts`의 `create()` L.137, `update()` L.199에서 `dto.description`을 그대로 Prisma에 전달. 정화 없음.
- **렌더링 시점**: `ProductDetailContent.tsx` L.280에서 `sanitize-html`로 프론트 정화 후 `dangerouslySetInnerHTML` 적용.
- **허용 태그/속성 (프론트 기준)**:
  - 태그: `p, strong, em, u, h2, h3, ul, ol, li, a, img, br`
  - 속성: `a[href, target]`, `img[src, alt]`
- **백엔드**: `sanitize-html` 패키지 없음 — 새로 설치 필요.

---

## 3. 변경해야 할 지점

**① `apps/backend/src/common/utils/html-sanitize.ts` (신규)**

```ts
import sanitizeHtml from 'sanitize-html';

const ALLOWED_TAGS = ['p', 'strong', 'em', 'u', 'h2', 'h3', 'ul', 'ol', 'li', 'a', 'img', 'br'];
const ALLOWED_ATTRIBUTES = { a: ['href', 'target'], img: ['src', 'alt'] };

export function sanitizeProductDescription(html: string | undefined): string | undefined {
  if (!html) return html;
  return sanitizeHtml(html, { allowedTags: ALLOWED_TAGS, allowedAttributes: ALLOWED_ATTRIBUTES });
}
```

**② `products.service.ts`**

- `create()` L.137: `description: dto.description` → `description: sanitizeProductDescription(dto.description)`
- `update()` L.199: `data: dto` → `data: { ...dto, description: sanitizeProductDescription(dto.description) }`

**③ 의존성 설치**

```bash
pnpm --filter @yueeroom/backend add sanitize-html
pnpm --filter @yueeroom/backend add -D @types/sanitize-html
```

**④ `products.service.spec.ts`** — XSS 방어 테스트 케이스 추가 (아래 테스트 전략 참고)

---

## 4. 잠재적 위험

| 위험                      | 내용                                                            | 대응                                                                           |
| ------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| **허용 정책 불일치**      | 프론트와 백엔드 허용 태그가 따로 유지되면 나중에 달라질 수 있음 | `packages/shared`에 상수를 두거나, 주석으로 "양쪽 동기화 필요" 명시            |
| **기존 DB 데이터**        | 이미 저장된 악성 HTML은 이번 작업으로 정화되지 않음             | 마이그레이션 스크립트 또는 별도 이슈로 관리 (이번 범위 밖)                     |
| **`update()` DTO spread** | `{ ...dto, description: ... }` 시 Prisma 타입 불일치 가능       | `UpdateProductDto`는 `Partial<CreateProductDto>`이므로 undefined 처리 주의     |
| **`img[src]` XSS**        | `javascript:` 스킴의 src 허용 시 XSS 가능                       | `sanitize-html`의 `allowedSchemes` 옵션으로 `http, https, data` 제한 추가 권장 |

---

## 5. 구현 순서

1. `sanitize-html` + `@types/sanitize-html` 백엔드에 설치
2. `apps/backend/src/common/utils/html-sanitize.ts` 유틸 파일 생성
3. `products.service.ts`의 `create()` / `update()`에 `sanitizeProductDescription()` 적용
4. `products.service.spec.ts`에 XSS 방어 테스트 추가
5. 테스트 실행 확인

---

## 6. 테스트 전략

`products.service.spec.ts`에 `describe('HTML sanitize')` 블록 추가:

```
create() — description에 <script> 포함 시 저장 데이터에서 제거됨
create() — 허용 태그(<strong>, <p> 등)는 그대로 저장됨
create() — onerror, onclick 등 이벤트 핸들러 속성 제거됨
create() — img src에 javascript: 스킴 차단됨
update() — description 수정 시에도 동일하게 sanitize 적용됨
```

**실행 명령**:

```bash
pnpm --filter @yueeroom/backend test -- --silent apps/backend/src/products/products.service.spec.ts
```

---

## 미결 사항

- `img[src]`의 `allowedSchemes` 제한 추가 여부 결정 필요 (권장: `['http', 'https', 'data']`로 제한)
