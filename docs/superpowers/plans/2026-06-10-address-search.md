# 주소 검색 연동 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 마이페이지 배송지 추가 폼과 결제 화면 새 배송지 추가에 Kakao 우편번호 검색(모달)을 연동하여 우편번호·주소1을 자동입력하고 상세주소만 직접 입력받는다.

**Architecture:** `DaumPostcodeModal`(react-daum-postcode 래퍼)과 `AddressForm`(배송지 입력 폼)을 `src/components/address/`에 신규 생성한다. `AddressList`는 기존 인라인 폼을 `AddressForm`으로 교체하고, `CheckoutContent`는 "새 배송지 추가" 버튼 + `AddressForm`을 추가한다.

**Tech Stack:** Next.js 15, React 19, react-hook-form 7, react-daum-postcode, Vitest + @testing-library/react

---

## 파일 맵

| 파일                                                              | 동작                                             |
| ----------------------------------------------------------------- | ------------------------------------------------ |
| `apps/frontend/src/components/address/DaumPostcodeModal.tsx`      | 신규 — react-daum-postcode를 overlay 모달로 감쌈 |
| `apps/frontend/src/components/address/DaumPostcodeModal.test.tsx` | 신규 — 위 컴포넌트 단위 테스트                   |
| `apps/frontend/src/components/address/AddressForm.tsx`            | 신규 — 배송지 입력 폼 (마이페이지·결제 공유)     |
| `apps/frontend/src/components/address/AddressForm.test.tsx`       | 신규 — 위 컴포넌트 단위 테스트                   |
| `apps/frontend/src/components/my-page/AddressList.tsx`            | 수정 — 인라인 폼 제거, AddressForm 사용          |
| `apps/frontend/src/components/my-page/AddressList.test.tsx`       | 신규 — AddressList 단위 테스트                   |
| `apps/frontend/src/components/checkout/CheckoutContent.tsx`       | 수정 — "새 배송지 추가" 기능 추가                |
| `apps/frontend/src/components/checkout/CheckoutContent.test.tsx`  | 수정 — 새 배송지 추가 테스트 추가                |

---

## Task 1: react-daum-postcode 설치

**Files:**

- Modify: `apps/frontend/package.json`

- [ ] **Step 1: 패키지 설치**

```bash
cd apps/frontend && pnpm add react-daum-postcode
```

Expected output: `apps/frontend/package.json`의 `dependencies`에 `"react-daum-postcode": "^3.x.x"` 추가됨.

- [ ] **Step 2: 타입 체크 통과 확인**

```bash
cd apps/frontend && npx tsc --noEmit
```

Expected: 에러 없음.

- [ ] **Step 3: 커밋**

```bash
git add apps/frontend/package.json pnpm-lock.yaml
git commit -m "chore: react-daum-postcode 설치"
```

---

## Task 2: DaumPostcodeModal 구현

**Files:**

- Create: `apps/frontend/src/components/address/DaumPostcodeModal.tsx`
- Create: `apps/frontend/src/components/address/DaumPostcodeModal.test.tsx`

- [ ] **Step 1: 실패 테스트 작성**

`apps/frontend/src/components/address/DaumPostcodeModal.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DaumPostcodeModal from './DaumPostcodeModal';

vi.mock('react-daum-postcode', () => ({
  default: ({
    onComplete,
  }: {
    onComplete: (data: { zonecode: string; roadAddress: string; jibunAddress: string }) => void;
  }) => (
    <button
      data-testid="daum-widget"
      onClick={() =>
        onComplete({ zonecode: '06236', roadAddress: '서울 강남구 테헤란로 152', jibunAddress: '' })
      }
    >
      주소 선택
    </button>
  ),
}));

describe('DaumPostcodeModal', () => {
  it('isOpen=false 이면 렌더되지 않는다', () => {
    render(<DaumPostcodeModal isOpen={false} onComplete={vi.fn()} onClose={vi.fn()} />);
    expect(screen.queryByText('주소 검색')).not.toBeInTheDocument();
  });

  it('isOpen=true 이면 모달이 렌더된다', () => {
    render(<DaumPostcodeModal isOpen={true} onComplete={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText('주소 검색')).toBeInTheDocument();
  });

  it('닫기 버튼 클릭 시 onClose 호출', async () => {
    const onClose = vi.fn();
    render(<DaumPostcodeModal isOpen={true} onComplete={vi.fn()} onClose={onClose} />);
    await userEvent.click(screen.getByRole('button', { name: '닫기' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('오버레이 클릭 시 onClose 호출', async () => {
    const onClose = vi.fn();
    render(<DaumPostcodeModal isOpen={true} onComplete={vi.fn()} onClose={onClose} />);
    await userEvent.click(screen.getByTestId('postcode-overlay'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('주소 선택 시 onComplete(zonecode, roadAddress) 호출', async () => {
    const onComplete = vi.fn();
    render(<DaumPostcodeModal isOpen={true} onComplete={onComplete} onClose={vi.fn()} />);
    await userEvent.click(screen.getByTestId('daum-widget'));
    expect(onComplete).toHaveBeenCalledWith('06236', '서울 강남구 테헤란로 152');
  });

  it('ESC 키 입력 시 onClose 호출', async () => {
    const onClose = vi.fn();
    render(<DaumPostcodeModal isOpen={true} onComplete={vi.fn()} onClose={onClose} />);
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: 실패 확인**

```bash
cd apps/frontend && npx vitest run --reporter=dot src/components/address/DaumPostcodeModal.test.tsx
```

Expected: FAIL — `DaumPostcodeModal` 모듈 없음.

- [ ] **Step 3: 구현**

`apps/frontend/src/components/address/DaumPostcodeModal.tsx`:

```tsx
'use client';

import { useEffect } from 'react';
import DaumPostcode from 'react-daum-postcode';

interface Props {
  isOpen: boolean;
  onComplete: (zipCode: string, address1: string) => void;
  onClose: () => void;
}

export default function DaumPostcodeModal({ isOpen, onComplete, onClose }: Props) {
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      data-testid="postcode-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-lg bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <span className="text-sm font-semibold text-gray-900">주소 검색</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>
        <DaumPostcode
          onComplete={(data) => {
            onComplete(data.zonecode, data.roadAddress || data.jibunAddress);
          }}
          style={{ height: 400 }}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 통과 확인**

```bash
cd apps/frontend && npx vitest run --reporter=dot src/components/address/DaumPostcodeModal.test.tsx
```

Expected: 6개 테스트 PASS.

- [ ] **Step 5: 커밋**

```bash
git add apps/frontend/src/components/address/DaumPostcodeModal.tsx apps/frontend/src/components/address/DaumPostcodeModal.test.tsx
git commit -m "feat: DaumPostcodeModal 컴포넌트 구현"
```

---

## Task 3: AddressForm 구현

**Files:**

- Create: `apps/frontend/src/components/address/AddressForm.tsx`
- Create: `apps/frontend/src/components/address/AddressForm.test.tsx`

- [ ] **Step 1: 실패 테스트 작성**

`apps/frontend/src/components/address/AddressForm.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AddressForm from './AddressForm';

vi.mock('@/components/address/DaumPostcodeModal', () => ({
  default: ({
    isOpen,
    onComplete,
  }: {
    isOpen: boolean;
    onComplete: (zip: string, addr: string) => void;
    onClose: () => void;
  }) =>
    isOpen ? (
      <button
        data-testid="postcode-complete"
        onClick={() => onComplete('06236', '서울 강남구 테헤란로 152')}
      >
        주소 선택
      </button>
    ) : null,
}));

describe('AddressForm', () => {
  it('주소 검색 없이 제출하면 에러 메시지 표시', async () => {
    render(<AddressForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
    await userEvent.type(screen.getByLabelText('배송지명'), '집');
    await userEvent.type(screen.getByLabelText('수령인'), '홍길동');
    await userEvent.type(screen.getByLabelText('연락처'), '010-1234-5678');
    await userEvent.click(screen.getByRole('button', { name: '추가' }));
    expect(await screen.findByText('주소 검색을 먼저 진행해주세요.')).toBeInTheDocument();
  });

  it('주소 검색 버튼 클릭 시 DaumPostcodeModal 열림', async () => {
    render(<AddressForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: '주소 검색' }));
    expect(screen.getByTestId('postcode-complete')).toBeInTheDocument();
  });

  it('주소 검색 완료 후 zipCode·address1 자동 채움', async () => {
    render(<AddressForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: '주소 검색' }));
    await userEvent.click(screen.getByTestId('postcode-complete'));
    expect(screen.getByDisplayValue('06236')).toBeInTheDocument();
    expect(screen.getByDisplayValue('서울 강남구 테헤란로 152')).toBeInTheDocument();
  });

  it('정상 제출 시 onSubmit 호출', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<AddressForm onSubmit={onSubmit} onCancel={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: '주소 검색' }));
    await userEvent.click(screen.getByTestId('postcode-complete'));
    await userEvent.type(screen.getByLabelText('배송지명'), '집');
    await userEvent.type(screen.getByLabelText('수령인'), '홍길동');
    await userEvent.type(screen.getByLabelText('연락처'), '010-1234-5678');
    await userEvent.type(screen.getByLabelText('상세주소'), '101호');
    await userEvent.click(screen.getByRole('button', { name: '추가' }));
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        name: '집',
        recipient: '홍길동',
        phone: '010-1234-5678',
        zipCode: '06236',
        address1: '서울 강남구 테헤란로 152',
        address2: '101호',
      });
    });
  });

  it('취소 버튼 클릭 시 onCancel 호출', async () => {
    const onCancel = vi.fn();
    render(<AddressForm onSubmit={vi.fn()} onCancel={onCancel} />);
    await userEvent.click(screen.getByRole('button', { name: '취소' }));
    expect(onCancel).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: 실패 확인**

```bash
cd apps/frontend && npx vitest run --reporter=dot src/components/address/AddressForm.test.tsx
```

Expected: FAIL — `AddressForm` 모듈 없음.

- [ ] **Step 3: 구현**

`apps/frontend/src/components/address/AddressForm.tsx`:

```tsx
'use client';

import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import DaumPostcodeModal from '@/components/address/DaumPostcodeModal';
import type { CreateAddressDto } from '@/lib/types/user';

interface FormValues {
  name: string;
  recipient: string;
  phone: string;
  address2: string;
}

interface Props {
  onSubmit: (dto: CreateAddressDto) => Promise<void>;
  onCancel: () => void;
}

export default function AddressForm({ onSubmit, onCancel }: Props) {
  const [isPostcodeOpen, setIsPostcodeOpen] = useState(false);
  const [zipCode, setZipCode] = useState('');
  const [address1, setAddress1] = useState('');
  const [addressError, setAddressError] = useState('');
  const address2Ref = useRef<HTMLInputElement | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>();

  const handlePostcodeComplete = (newZipCode: string, newAddress1: string) => {
    setZipCode(newZipCode);
    setAddress1(newAddress1);
    setAddressError('');
    setIsPostcodeOpen(false);
    address2Ref.current?.focus();
  };

  const handleFormSubmit = async (data: FormValues) => {
    if (!zipCode) {
      setAddressError('주소 검색을 먼저 진행해주세요.');
      return;
    }
    await onSubmit({
      name: data.name,
      recipient: data.recipient,
      phone: data.phone,
      zipCode,
      address1,
      address2: data.address2 || undefined,
    });
    reset();
    setZipCode('');
    setAddress1('');
  };

  const { ref: address2FormRef, ...address2Rest } = register('address2');

  return (
    <>
      <DaumPostcodeModal
        isOpen={isPostcodeOpen}
        onComplete={handlePostcodeComplete}
        onClose={() => setIsPostcodeOpen(false)}
      />
      <form
        onSubmit={handleSubmit(handleFormSubmit)}
        className="space-y-3 rounded-lg border border-indigo-100 bg-indigo-50 p-4"
        noValidate
      >
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="addr-name" className="block text-sm font-medium text-gray-700">
              배송지명
            </label>
            <input
              id="addr-name"
              type="text"
              placeholder="집, 회사"
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
              {...register('name', { required: '배송지명을 입력해주세요.' })}
            />
            {errors.name && (
              <p role="alert" className="mt-1 text-xs text-red-600">
                {errors.name.message}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="addr-recipient" className="block text-sm font-medium text-gray-700">
              수령인
            </label>
            <input
              id="addr-recipient"
              type="text"
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
              {...register('recipient', { required: '수령인을 입력해주세요.' })}
            />
            {errors.recipient && (
              <p role="alert" className="mt-1 text-xs text-red-600">
                {errors.recipient.message}
              </p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="addr-phone" className="block text-sm font-medium text-gray-700">
            연락처
          </label>
          <input
            id="addr-phone"
            type="tel"
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
            {...register('phone', { required: '연락처를 입력해주세요.' })}
          />
          {errors.phone && (
            <p role="alert" className="mt-1 text-xs text-red-600">
              {errors.phone.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">주소</label>
          <div className="mt-1 flex gap-2">
            <input
              type="text"
              readOnly
              value={zipCode}
              placeholder="우편번호"
              className="w-24 rounded border bg-gray-50 px-3 py-2 text-sm text-gray-700"
            />
            <button
              type="button"
              onClick={() => setIsPostcodeOpen(true)}
              className="rounded border border-indigo-400 px-3 py-2 text-sm text-indigo-600 hover:bg-indigo-50"
            >
              주소 검색
            </button>
          </div>
          {address1 && (
            <input
              type="text"
              readOnly
              value={address1}
              className="mt-1 w-full rounded border bg-gray-50 px-3 py-2 text-sm text-gray-700"
            />
          )}
          {addressError && (
            <p role="alert" className="mt-1 text-xs text-red-600">
              {addressError}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="addr-address2" className="block text-sm font-medium text-gray-700">
            상세주소
          </label>
          <input
            id="addr-address2"
            type="text"
            placeholder="동·호수 직접 입력"
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
            ref={(el) => {
              address2FormRef(el);
              address2Ref.current = el;
            }}
            {...address2Rest}
          />
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded bg-indigo-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
          >
            {isSubmitting ? '저장 중...' : '추가'}
          </button>
          <button
            type="button"
            onClick={() => {
              onCancel();
              reset();
              setZipCode('');
              setAddress1('');
            }}
            className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-600"
          >
            취소
          </button>
        </div>
      </form>
    </>
  );
}
```

- [ ] **Step 4: 통과 확인**

```bash
cd apps/frontend && npx vitest run --reporter=dot src/components/address/AddressForm.test.tsx
```

Expected: 5개 테스트 PASS.

- [ ] **Step 5: 커밋**

```bash
git add apps/frontend/src/components/address/AddressForm.tsx apps/frontend/src/components/address/AddressForm.test.tsx
git commit -m "feat: AddressForm 컴포넌트 구현"
```

---

## Task 4: AddressList 리팩터링

**Files:**

- Modify: `apps/frontend/src/components/my-page/AddressList.tsx`
- Create: `apps/frontend/src/components/my-page/AddressList.test.tsx`

- [ ] **Step 1: 실패 테스트 작성**

`apps/frontend/src/components/my-page/AddressList.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AddressList from './AddressList';
import type { Address } from '@/lib/types/user';

vi.mock('@/components/address/AddressForm', () => ({
  default: ({
    onSubmit,
    onCancel,
  }: {
    onSubmit: (dto: unknown) => Promise<void>;
    onCancel: () => void;
  }) => (
    <div data-testid="address-form">
      <button
        onClick={() =>
          onSubmit({
            name: '집',
            recipient: '홍길동',
            phone: '010-0000-0000',
            zipCode: '06236',
            address1: '서울 강남구 테헤란로 152',
          })
        }
      >
        폼 제출
      </button>
      <button onClick={onCancel}>폼 취소</button>
    </div>
  ),
}));

function makeAddress(overrides: Partial<Address> = {}): Address {
  return {
    id: 'addr-1',
    userId: 'user-1',
    name: '집',
    recipient: '홍길동',
    phone: '010-0000-0000',
    zipCode: '06236',
    address1: '서울 강남구 테헤란로 152',
    address2: null,
    isDefault: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('AddressList', () => {
  it('배송지가 없으면 안내 메시지를 표시한다', () => {
    render(
      <AddressList addresses={[]} onAdd={vi.fn()} onDelete={vi.fn()} onSetDefault={vi.fn()} />,
    );
    expect(screen.getByText('등록된 배송지가 없습니다.')).toBeInTheDocument();
  });

  it('배송지 목록을 렌더링한다', () => {
    render(
      <AddressList
        addresses={[makeAddress()]}
        onAdd={vi.fn()}
        onDelete={vi.fn()}
        onSetDefault={vi.fn()}
      />,
    );
    expect(screen.getByText('집')).toBeInTheDocument();
    expect(screen.getByText('홍길동 · 010-0000-0000')).toBeInTheDocument();
  });

  it('기본 배송지에 "기본" 뱃지를 표시한다', () => {
    render(
      <AddressList
        addresses={[makeAddress({ isDefault: true })]}
        onAdd={vi.fn()}
        onDelete={vi.fn()}
        onSetDefault={vi.fn()}
      />,
    );
    expect(screen.getByText('기본')).toBeInTheDocument();
  });

  it('"+ 배송지 추가" 클릭 시 AddressForm이 노출된다', async () => {
    render(
      <AddressList addresses={[]} onAdd={vi.fn()} onDelete={vi.fn()} onSetDefault={vi.fn()} />,
    );
    await userEvent.click(screen.getByRole('button', { name: /배송지 추가/ }));
    expect(screen.getByTestId('address-form')).toBeInTheDocument();
  });

  it('AddressForm 폼 제출 시 onAdd 호출 후 폼 닫힘', async () => {
    const onAdd = vi.fn().mockResolvedValue(undefined);
    render(<AddressList addresses={[]} onAdd={onAdd} onDelete={vi.fn()} onSetDefault={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /배송지 추가/ }));
    await userEvent.click(screen.getByRole('button', { name: '폼 제출' }));
    expect(onAdd).toHaveBeenCalledOnce();
    expect(screen.queryByTestId('address-form')).not.toBeInTheDocument();
  });

  it('AddressForm 취소 시 폼 닫힘', async () => {
    render(
      <AddressList addresses={[]} onAdd={vi.fn()} onDelete={vi.fn()} onSetDefault={vi.fn()} />,
    );
    await userEvent.click(screen.getByRole('button', { name: /배송지 추가/ }));
    await userEvent.click(screen.getByRole('button', { name: '폼 취소' }));
    expect(screen.queryByTestId('address-form')).not.toBeInTheDocument();
  });

  it('삭제 버튼 클릭 시 onDelete 호출', async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined);
    render(
      <AddressList
        addresses={[makeAddress({ id: 'addr-1', name: '집' })]}
        onAdd={vi.fn()}
        onDelete={onDelete}
        onSetDefault={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: '집 삭제' }));
    expect(onDelete).toHaveBeenCalledWith('addr-1');
  });
});
```

- [ ] **Step 2: 실패 확인**

```bash
cd apps/frontend && npx vitest run --reporter=dot src/components/my-page/AddressList.test.tsx
```

Expected: FAIL — 모듈 없거나 기존 인라인 폼 관련 테스트 실패.

- [ ] **Step 3: AddressList 수정**

`apps/frontend/src/components/my-page/AddressList.tsx`를 아래로 교체:

```tsx
'use client';

import { useState } from 'react';
import AddressForm from '@/components/address/AddressForm';
import type { Address, CreateAddressDto } from '@/lib/types/user';

interface Props {
  addresses: Address[];
  onAdd: (dto: CreateAddressDto) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onSetDefault: (id: string) => Promise<void>;
}

export default function AddressList({ addresses, onAdd, onDelete, onSetDefault }: Props) {
  const [isAdding, setIsAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await onDelete(id);
    } finally {
      setDeletingId(null);
    }
  };

  const handleSetDefault = async (id: string) => {
    setSettingDefaultId(id);
    try {
      await onSetDefault(id);
    } finally {
      setSettingDefaultId(null);
    }
  };

  const handleAdd = async (dto: CreateAddressDto) => {
    await onAdd(dto);
    setIsAdding(false);
  };

  return (
    <div className="space-y-4">
      {addresses.length === 0 ? (
        <p className="text-sm text-gray-500">등록된 배송지가 없습니다.</p>
      ) : (
        <ul className="space-y-3">
          {addresses.map((address) => (
            <li key={address.id} className="rounded-lg border border-gray-200 px-4 py-3">
              <div className="flex items-start justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900">{address.name}</p>
                    {address.isDefault && (
                      <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-xs font-medium text-indigo-700">
                        기본
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600">
                    {address.recipient} · {address.phone}
                  </p>
                  <p className="text-xs text-gray-500">
                    {address.zipCode} {address.address1}
                    {address.address2 ? ` ${address.address2}` : ''}
                  </p>
                </div>
                <div className="flex gap-2 text-xs">
                  {!address.isDefault && (
                    <button
                      onClick={() => handleSetDefault(address.id)}
                      disabled={settingDefaultId === address.id}
                      aria-label={`${address.name} 기본 배송지로 설정`}
                      className="text-gray-500 hover:text-gray-700 disabled:opacity-50"
                    >
                      기본 설정
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(address.id)}
                    disabled={deletingId === address.id}
                    aria-label={`${address.name} 삭제`}
                    className="text-red-500 hover:text-red-700 disabled:opacity-50"
                  >
                    삭제
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {isAdding ? (
        <AddressForm onSubmit={handleAdd} onCancel={() => setIsAdding(false)} />
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-1 text-sm text-indigo-600 hover:underline"
        >
          + 배송지 추가
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 4: 통과 확인**

```bash
cd apps/frontend && npx vitest run --reporter=dot src/components/my-page/AddressList.test.tsx
```

Expected: 7개 테스트 PASS.

- [ ] **Step 5: 커밋**

```bash
git add apps/frontend/src/components/my-page/AddressList.tsx apps/frontend/src/components/my-page/AddressList.test.tsx
git commit -m "refactor: AddressList 기존 인라인 폼을 AddressForm으로 교체"
```

---

## Task 5: CheckoutContent "새 배송지 추가" 기능 추가

**Files:**

- Modify: `apps/frontend/src/components/checkout/CheckoutContent.tsx`
- Modify: `apps/frontend/src/components/checkout/CheckoutContent.test.tsx`

- [ ] **Step 1: 실패 테스트 추가**

`apps/frontend/src/components/checkout/CheckoutContent.test.tsx` 파일을 수정한다.

파일 상단 기존 `vi.mock` 블록 마지막(`vi.mock('@/components/payments/NaverPayButton', ...)` 뒤)에 아래 두 mock을 추가:

```tsx
vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();
  return {
    ...actual,
    useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  };
});

vi.mock('@/lib/api/users', () => ({
  addAddress: vi.fn(),
}));

vi.mock('@/components/address/AddressForm', () => ({
  default: ({
    onSubmit,
    onCancel,
  }: {
    onSubmit: (dto: unknown) => Promise<void>;
    onCancel: () => void;
  }) => (
    <div data-testid="address-form">
      <button
        onClick={() =>
          onSubmit({
            name: '새집',
            recipient: '홍길동',
            phone: '010-0000-0000',
            zipCode: '06236',
            address1: '서울 강남구 테헤란로 152',
          })
        }
      >
        새 주소 제출
      </button>
      <button onClick={onCancel}>새 주소 취소</button>
    </div>
  ),
}));
```

기존 import 블록(파일 76번째 줄 근처)에 추가:

```tsx
import { addAddress } from '@/lib/api/users';
```

기존 `describe('배송지 선택', ...)` 블록 내부 마지막에 다음 테스트를 추가:

```tsx
it('"새 배송지 추가" 버튼이 배송지 목록이 있을 때 노출된다', () => {
  setMockItems([mockCartItem()]);
  (useAddresses as ReturnType<typeof vi.fn>).mockReturnValue({
    data: [mockAddress()],
    isLoading: false,
  });
  render(<CheckoutContent />);
  expect(screen.getByRole('button', { name: '새 배송지 추가' })).toBeInTheDocument();
});

it('"새 배송지 추가" 버튼이 배송지가 없을 때도 노출된다', () => {
  setMockItems([mockCartItem()]);
  (useAddresses as ReturnType<typeof vi.fn>).mockReturnValue({
    data: [],
    isLoading: false,
  });
  render(<CheckoutContent />);
  expect(screen.getByRole('button', { name: '새 배송지 추가' })).toBeInTheDocument();
});

it('"새 배송지 추가" 클릭 시 AddressForm이 노출된다', async () => {
  setMockItems([mockCartItem()]);
  (useAddresses as ReturnType<typeof vi.fn>).mockReturnValue({
    data: [],
    isLoading: false,
  });
  render(<CheckoutContent />);
  await userEvent.click(screen.getByRole('button', { name: '새 배송지 추가' }));
  expect(screen.getByTestId('address-form')).toBeInTheDocument();
});

it('새 배송지 추가 완료 시 addAddress API 호출 후 폼 닫힘', async () => {
  const addAddressMock = vi.fn().mockResolvedValue({
    id: 'addr-new',
    name: '새집',
    recipient: '홍길동',
    phone: '010-0000-0000',
    zipCode: '06236',
    address1: '서울 강남구 테헤란로 152',
    address2: null,
    isDefault: false,
    userId: 'user-1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  (addAddress as ReturnType<typeof vi.fn>).mockImplementation(addAddressMock);
  setMockItems([mockCartItem()]);
  (useAddresses as ReturnType<typeof vi.fn>).mockReturnValue({
    data: [],
    isLoading: false,
  });
  render(<CheckoutContent />);
  await userEvent.click(screen.getByRole('button', { name: '새 배송지 추가' }));
  await userEvent.click(screen.getByRole('button', { name: '새 주소 제출' }));
  expect(addAddressMock).toHaveBeenCalledOnce();
  expect(screen.queryByTestId('address-form')).not.toBeInTheDocument();
});
```

- [ ] **Step 2: 실패 확인**

```bash
cd apps/frontend && npx vitest run --reporter=dot src/components/checkout/CheckoutContent.test.tsx
```

Expected: 새로 추가한 4개 테스트 FAIL (기존 테스트는 통과 유지).

- [ ] **Step 3: CheckoutContent 수정**

`apps/frontend/src/components/checkout/CheckoutContent.tsx` 파일 상단 import에 추가:

```tsx
import { useQueryClient } from '@tanstack/react-query';
import AddressForm from '@/components/address/AddressForm';
import { addAddress } from '@/lib/api/users';
import { queryKeys } from '@/lib/api/query-keys';
import type { CreateAddressDto } from '@/lib/types/user';
```

`export default function CheckoutContent()` 함수 내부, 기존 state 선언들 다음에 추가:

```tsx
const queryClient = useQueryClient();
const [isAddingAddress, setIsAddingAddress] = useState(false);

const handleAddAddress = async (dto: CreateAddressDto) => {
  const newAddress = await addAddress(dto);
  await queryClient.invalidateQueries({ queryKey: queryKeys.users.addresses });
  setSelectedAddressId(newAddress.id);
  setIsAddingAddress(false);
};
```

"배송지 선택" section (`<section>` 내부)을 아래로 교체. 변경 포인트는 두 곳: ① 빈 배송지 안내 아래 버튼 추가, ② 배송지 목록 아래 버튼 추가, ③ `isAddingAddress` 시 AddressForm 표시:

```tsx
{
  /* 배송지 선택 */
}
<section>
  <h2 className="mb-3 text-base font-semibold text-gray-800">배송지 선택</h2>
  {isAddressLoading ? (
    <div className="space-y-2">
      {[...Array(2)].map((_, i) => (
        <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-100" />
      ))}
    </div>
  ) : (
    <>
      {!addresses || addresses.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-4 text-center text-sm text-gray-500">
          등록된 배송지가 없습니다.{' '}
          <Link href="/my-page" className="text-indigo-600 hover:underline">
            마이페이지에서 추가
          </Link>
          하세요.
        </div>
      ) : (
        <ul className="space-y-2">
          {addresses.map((address) => {
            const isSelected = resolvedAddressId === address.id;
            return (
              <li key={address.id}>
                <label
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${
                    isSelected
                      ? 'border-indigo-400 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="address"
                    value={address.id}
                    checked={isSelected}
                    onChange={() => setSelectedAddressId(address.id)}
                    className="mt-0.5"
                    aria-label={`${address.name} 선택`}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{address.name}</span>
                      {address.isDefault && (
                        <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-xs font-medium text-indigo-700">
                          기본
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {address.recipient} · {address.phone}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {address.zipCode} {address.address1}
                      {address.address2 ? ` ${address.address2}` : ''}
                    </p>
                  </div>
                </label>
              </li>
            );
          })}
        </ul>
      )}

      {isAddingAddress ? (
        <div className="mt-3">
          <AddressForm onSubmit={handleAddAddress} onCancel={() => setIsAddingAddress(false)} />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsAddingAddress(true)}
          className="mt-3 flex items-center gap-1 text-sm text-indigo-600 hover:underline"
        >
          + 새 배송지 추가
        </button>
      )}
    </>
  )}
</section>;
```

> **주의:** 기존 CheckoutContent의 "배송지 선택" section 전체(로딩 스켈레톤 포함)를 위 코드로 교체한다. 기존 코드에서 address 목록 렌더링 부분(`addresses.map(...)`)을 확인하고 radio input의 기존 `onChange` 핸들러를 그대로 유지한다.

- [ ] **Step 4: 통과 확인**

```bash
cd apps/frontend && npx vitest run --reporter=dot src/components/checkout/CheckoutContent.test.tsx
```

Expected: 전체 테스트 PASS (기존 + 신규 4개).

- [ ] **Step 5: 전체 테스트 통과 확인**

```bash
cd apps/frontend && npx vitest run --reporter=dot src/components/address/ src/components/my-page/AddressList.test.tsx src/components/checkout/CheckoutContent.test.tsx
```

Expected: 전체 PASS.

- [ ] **Step 6: 커밋**

```bash
git add apps/frontend/src/components/checkout/CheckoutContent.tsx apps/frontend/src/components/checkout/CheckoutContent.test.tsx
git commit -m "feat: 결제 화면에 새 배송지 추가 기능 구현"
```
