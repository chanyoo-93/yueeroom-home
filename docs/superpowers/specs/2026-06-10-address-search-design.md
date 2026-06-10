# 주소 검색 연동 설계

**날짜**: 2026-06-10  
**범위**: 마이페이지 배송지 추가 + 결제 화면 새 배송지 추가  
**라이브러리**: react-daum-postcode (Kakao 우편번호 서비스)

---

## 배경

현재 마이페이지 `AddressList`에서 배송지를 추가할 때 우편번호·주소·상세주소를 모두 텍스트로 직접 입력한다. 국내 상용 서비스 표준인 주소 검색(자동입력) + 상세주소 직접입력 방식으로 교체한다. 결제 화면에서도 새 배송지를 바로 추가할 수 있도록 함께 개선한다.

---

## UI 패턴

**모달(overlay) 방식**: "주소 검색" 버튼 클릭 시 react-daum-postcode 위젯이 페이지 위 오버레이 모달로 열린다. 주소 선택 시 모달이 자동으로 닫히고 우편번호·도로명주소가 폼에 채워진다. 이후 상세주소 입력 필드에 커서가 자동 포커스된다.

---

## 컴포넌트 구조

### 신규 파일

#### `src/components/address/DaumPostcodeModal.tsx`

```ts
interface Props {
  isOpen: boolean;
  onComplete: (zipCode: string, address1: string) => void;
  onClose: () => void;
}
```

- react-daum-postcode의 `DaumPostcode` 컴포넌트를 overlay 모달로 감싼다.
- 모달 외부 클릭 또는 ESC 키 입력 시 `onClose` 호출.
- 스크립트 로드 실패 시 모달 내 에러 메시지 표시.

#### `src/components/address/AddressForm.tsx`

```ts
interface Props {
  onSubmit: (dto: CreateAddressDto) => Promise<void>;
  onCancel: () => void;
}
```

- react-hook-form으로 내부 상태 관리.
- 배송지명·수령인·연락처·우편번호·주소·상세주소 모두 표시. (`CreateAddressDto.name`이 필수값이므로 결제 화면에서도 배송지명 필드를 생략하지 않는다.)
- `zipCode`·`address1`은 비활성화 읽기 전용 필드. 값은 DaumPostcodeModal 완료 시에만 채워진다.
- 폼 제출 시 `zipCode`가 비어있으면 "주소 검색을 먼저 진행해주세요" 인라인 에러 표시.
- 검색 완료 후 `address2` 필드에 자동 포커스.

### 수정 파일

#### `src/components/my-page/AddressList.tsx`

- 기존 인라인 폼 제거, `AddressForm` 컴포넌트로 교체.
- `showNameField` 기본값(true) 사용.

#### `src/components/checkout/CheckoutContent.tsx`

- 배송지가 있을 때: 목록 하단에 "새 배송지 추가" 버튼 추가.
- 배송지가 없을 때: 기존 "등록된 배송지가 없습니다" 안내 아래에도 "새 배송지 추가" 버튼 표시. 마이페이지 링크는 유지.
- 버튼 클릭 시 인라인으로 `AddressForm` 표시.
- 추가 완료 시 폼 닫힘, 새로 저장된 주소 자동 선택.

---

## 데이터 흐름

```
사용자: "주소 검색" 클릭
  → DaumPostcodeModal isOpen=true
  → 사용자가 주소 선택
  → onComplete(zipCode, address1) 호출
  → DaumPostcodeModal isOpen=false
  → AddressForm zipCode·address1 필드 채워짐
  → address2 필드 포커스
  → 사용자: 상세주소 입력 후 제출
  → onSubmit(CreateAddressDto) 호출
```

---

## 에러 처리

| 상황                                   | 처리                                        |
| -------------------------------------- | ------------------------------------------- |
| 주소 미검색 상태로 제출                | "주소 검색을 먼저 진행해주세요" 인라인 에러 |
| react-daum-postcode 스크립트 로드 실패 | 모달 내 에러 메시지 표시                    |
| 모달 외부 클릭 / ESC                   | 모달 닫힘, 기존 폼 값 유지                  |

---

## 테스트 계획

| 파일                         | 테스트 항목                                                         |
| ---------------------------- | ------------------------------------------------------------------- |
| `DaumPostcodeModal.test.tsx` | isOpen에 따른 렌더/비렌더, onComplete 콜백 데이터, onClose 트리거   |
| `AddressForm.test.tsx`       | 주소 미검색 제출 시 에러, 검색 완료 후 필드 자동 채움, 정상 제출    |
| `AddressList.test.tsx`       | 기존 테스트 유지 (AddressForm mock)                                 |
| `CheckoutContent.test.tsx`   | "새 배송지 추가" 버튼 → AddressForm 노출, 추가 완료 후 새 주소 선택 |

---

## 패키지 추가

```bash
pnpm --filter @yueeroom/frontend add react-daum-postcode
```
