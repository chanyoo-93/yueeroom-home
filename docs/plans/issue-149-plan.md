# Issue #149 구현 계획 — 업로드 이미지 파일 시그니처 검증

## 1. 관련 파일 목록

| 파일                                                              | 역할                                          | 변경 여부 |
| ----------------------------------------------------------------- | --------------------------------------------- | --------- |
| `apps/backend/src/files/files.service.ts`                         | 핵심 업로드 로직 — MIME/크기 검사 + S3 업로드 | **변경**  |
| `apps/backend/src/files/files.service.spec.ts`                    | FilesService 단위 테스트                      | **변경**  |
| `apps/backend/src/products/images/product-images.controller.ts`   | 업로드 엔드포인트                             | 변경 없음 |
| `apps/backend/src/products/images/product-images.service.ts`      | 상품 이미지 저장 로직                         | 변경 없음 |
| `apps/backend/src/products/images/product-images.service.spec.ts` | `FilesService` mock 사용 — 영향 없음          | 변경 없음 |

---

## 2. 현재 구조 요약

`FilesService.uploadImage`의 검증 흐름:

```
요청 수신
  └─ MIME type 검사 (allowlist: image/jpeg, image/png, image/webp)
       └─ 파일 크기 검사 (≤ 5MB)
            └─ S3 업로드
```

**빠진 단계**: MIME type 문자열은 클라이언트가 조작 가능하다. 실제 파일 내용(buffer)의 magic number를 확인하는 단계가 없다.

---

## 3. 변경해야 할 지점

### `files.service.ts`

`uploadImage` 메서드 내부, MIME/크기 검사 이후 — S3 업로드 이전에 magic number 검증 단계를 추가한다.

**추가할 private 메서드**:

```typescript
private validateMagicNumber(buffer: Buffer, mimetype: string): void
```

**mimetype별 예상 magic bytes**:

| MIME type    | 확인 위치        | 바이트 값 (hex)                             |
| ------------ | ---------------- | ------------------------------------------- |
| `image/jpeg` | offset 0–2       | `FF D8 FF`                                  |
| `image/png`  | offset 0–7       | `89 50 4E 47 0D 0A 1A 0A`                   |
| `image/webp` | offset 0–3, 8–11 | `52 49 46 46` (RIFF) + `57 45 42 50` (WEBP) |

magic number 불일치 시 → `BadRequestException` (400)

**주의**: `file-type` npm 패키지(v19+)는 ESM 전용이라 Jest(CommonJS) 환경에서 `import` 불가. 외부 패키지 없이 buffer를 직접 검사하는 방식을 사용한다.

### `files.service.spec.ts`

기존 "유효한 파일" fixture의 `buffer`가 `Buffer.from('fake-image-data')`로 되어 있다. magic number 검증 추가 후 이 fixture는 통과하지 못한다.

**수정 대상**: `makeFile` 팩터리 또는 각 케이스별 buffer를 실제 magic bytes가 담긴 값으로 교체.

---

## 4. 잠재적 위험

### 기존 테스트 fixture 파손 (높음)

`files.service.spec.ts`의 `VALID_FILE`, `makeFile` 팩터리가 `Buffer.from('fake-image-data')` 사용. magic number 검증을 추가하면 기존 "유효한 파일 업로드" 테스트가 즉시 실패한다. 테스트 fixture를 동시에 수정해야 한다.

### buffer 길이 부족 (중간)

WebP magic number는 offset 8–11까지 확인해야 하므로, buffer가 12바이트 미만이면 `buffer.slice(8, 12)` 결과가 짧아진다. buffer 길이 최소값 검사를 먼저 수행하거나 magic byte 비교 전 길이를 확인해야 한다.

### 확인 필요 — 재인코딩 파이프라인

이슈 배경에 "이미지 재인코딩 파이프라인 도입" 언급이 있다. sharp 등 재인코딩은 범위를 크게 확대하므로 이번 PR에서는 포함하지 않고 magic number 검증만 구현하는 것이 적절한지 확인 필요.

---

## 5. 구현 순서

1. **`files.service.ts` 수정**
   - `validateMagicNumber(buffer: Buffer, mimetype: string): void` private 메서드 추가
   - `uploadImage` 내부에서 MIME/크기 검사 직후 호출

2. **`files.service.spec.ts` 수정**
   - 기존 `makeFile` / `VALID_FILE` fixture의 buffer를 실제 magic bytes로 교체
   - 스푸핑 케이스 테스트 추가 (아래 §6 참고)

3. **테스트 실행**

   ```bash
   pnpm --filter @yueeroom/backend test -- --silent apps/backend/src/files/files.service.spec.ts
   ```

4. **커밋 → 푸시 → PR** (`Closes #149`)

---

## 6. 테스트 전략

### 기존 fixture 수정

```typescript
// JPEG magic bytes: FF D8 FF + 패딩
const jpegMagic = Buffer.from([0xff, 0xd8, 0xff, 0xe0, ...]);

// PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A
const pngMagic = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

// WebP magic bytes: RIFF(4) + size(4) + WEBP(4)
const webpMagic = Buffer.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
```

### 추가할 테스트 케이스

| 케이스                               | 입력                                      | 기대 결과             |
| ------------------------------------ | ----------------------------------------- | --------------------- |
| JPEG MIME + GIF 내용 (`47 49 46 38`) | mimetype: `image/jpeg`, buffer: GIF bytes | `BadRequestException` |
| PNG MIME + JPEG 내용                 | mimetype: `image/png`, buffer: JPEG bytes | `BadRequestException` |
| WebP MIME + PNG 내용                 | mimetype: `image/webp`, buffer: PNG bytes | `BadRequestException` |
| 길이 부족 buffer (4바이트)           | mimetype: `image/webp`, buffer: 4바이트   | `BadRequestException` |
| 유효 JPEG magic + JPEG MIME          | —                                         | S3 업로드 성공        |
| 유효 PNG magic + PNG MIME            | —                                         | S3 업로드 성공        |
| 유효 WebP magic + WebP MIME          | —                                         | S3 업로드 성공        |

> `product-images.service.spec.ts`는 `FilesService`를 mock으로 사용하므로 변경 불필요.
