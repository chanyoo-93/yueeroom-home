# 회원가입 이용약관·개인정보 처리방침 동의 UI 개선 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 회원가입 폼에 이용약관과 개인정보 처리방침을 각각 별도 체크박스로 표시하고, 두 문서 모두 링크로 열람 가능하게 한다.

**Architecture:** 프론트엔드 폼에만 변경이 국한된다. 백엔드는 기존 `termsAgreed: boolean` 필드를 그대로 사용하므로 API·DB 스키마 변경 없음. 폼에서 두 체크박스(`termsOfServiceAgreed`, `privacyAgreed`)가 모두 true일 때 `termsAgreed: true`를 API에 전송한다.

**Tech Stack:** Next.js 15, react-hook-form, TypeScript, Vitest + Testing Library

---

## 파일 구조

| 파일                                           | 작업 | 내용                          |
| ---------------------------------------------- | ---- | ----------------------------- |
| `apps/frontend/src/app/register/page.tsx`      | 수정 | 두 개의 동의 체크박스 UI 추가 |
| `apps/frontend/src/app/register/page.test.tsx` | 수정 | 새 UI에 맞게 테스트 업데이트  |
| `apps/frontend/src/app/terms/page.test.tsx`    | 생성 | 이용약관 페이지 테스트 추가   |

---

### Task 1: 이용약관 페이지 테스트 추가

현재 `/terms/page.tsx`는 테스트 파일이 없다. 이후 작업을 안전하게 진행하기 위해 먼저 테스트를 작성한다.

**Files:**

- Create: `apps/frontend/src/app/terms/page.test.tsx`

- [ ] **Step 1: 테스트 파일 작성**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import TermsPage from './page';

describe('TermsPage', () => {
  it('이용약관 제목이 렌더링된다', () => {
    render(<TermsPage />);
    expect(screen.getByRole('heading', { name: /이용약관/ })).toBeInTheDocument();
  });

  it('주요 조항 섹션이 포함된다', () => {
    render(<TermsPage />);
    expect(screen.getByText(/목적/)).toBeInTheDocument();
    expect(screen.getByText(/정의/)).toBeInTheDocument();
    expect(screen.getByText(/구매/)).toBeInTheDocument();
  });

  it('개인정보 처리방침 링크가 포함된다', () => {
    render(<TermsPage />);
    const link = screen.getByRole('link', { name: /개인정보 처리방침/ });
    expect(link).toHaveAttribute('href', '/privacy');
  });
});
```

- [ ] **Step 2: 테스트가 통과하는지 확인 (기존 페이지 코드 그대로)**

```bash
cd apps/frontend && npx vitest run --reporter=dot src/app/terms/page.test.tsx
```

예상: PASS (기존 `/terms/page.tsx` 내용이 이미 해당 조건을 충족)

- [ ] **Step 3: 커밋**

```bash
git add apps/frontend/src/app/terms/page.test.tsx
git commit -m "test: 이용약관 페이지 기본 테스트 추가"
```

---

### Task 2: 회원가입 폼 — 두 개의 동의 체크박스로 분리

현재 단일 `termsAgreed` 체크박스를 두 개의 별도 체크박스(`termsOfServiceAgreed`, `privacyAgreed`)로 교체한다.

**Files:**

- Modify: `apps/frontend/src/app/register/page.tsx`

- [ ] **Step 1: 먼저 실패하는 테스트를 확인**

현재 테스트는 `getByLabelText(/개인정보 수집·이용/)` 하나만 확인한다. 이용약관 체크박스가 없다는 걸 증명하는 테스트가 실패할 것이다. 다음 Task 3에서 테스트를 먼저 업데이트하고, 그 다음 구현한다. (이 Task에서는 구현 코드를 작성한다.)

- [ ] **Step 2: `page.tsx` 수정 — RegisterForm 타입 변경**

`apps/frontend/src/app/register/page.tsx` 파일에서 `RegisterForm` 인터페이스를 다음으로 교체:

```typescript
interface RegisterForm {
  name: string;
  email: string;
  password: string;
  passwordConfirm: string;
  termsOfServiceAgreed: boolean;
  privacyAgreed: boolean;
}
```

- [ ] **Step 3: `onSubmit`에서 API 페이로드 수정**

`onSubmit` 함수에서 API 호출 부분을 다음으로 교체:

```typescript
await apiClient.post('/auth/register', {
  name: data.name,
  email: data.email,
  password: data.password,
  termsAgreed: data.termsOfServiceAgreed && data.privacyAgreed,
});
```

- [ ] **Step 4: 폼 UI — 기존 단일 체크박스 블록을 두 개로 교체**

`apps/frontend/src/app/register/page.tsx` 파일의 기존 체크박스 블록(이용약관 관련 `<div className="rounded border p-3">` 전체)을 다음으로 교체:

```tsx
<div className="space-y-2 rounded border p-3">
  <div className="flex items-start gap-2">
    <input
      id="termsOfServiceAgreed"
      type="checkbox"
      className="mt-0.5"
      {...register('termsOfServiceAgreed', {
        validate: (value) => value === true || '이용약관에 동의해주세요.',
      })}
    />
    <label htmlFor="termsOfServiceAgreed" className="text-sm">
      이용약관에 동의합니다. (필수){' '}
      <Link href="/terms" className="text-blue-600 underline" target="_blank">
        이용약관 보기
      </Link>
    </label>
  </div>
  {errors.termsOfServiceAgreed && (
    <p role="alert" className="mt-1 text-sm text-red-600">
      {errors.termsOfServiceAgreed.message}
    </p>
  )}

  <div className="flex items-start gap-2">
    <input
      id="privacyAgreed"
      type="checkbox"
      className="mt-0.5"
      {...register('privacyAgreed', {
        validate: (value) => value === true || '개인정보 처리방침에 동의해주세요.',
      })}
    />
    <label htmlFor="privacyAgreed" className="text-sm">
      개인정보 처리방침에 동의합니다. (필수){' '}
      <Link href="/privacy" className="text-blue-600 underline" target="_blank">
        처리방침 보기
      </Link>
    </label>
  </div>
  {errors.privacyAgreed && (
    <p role="alert" className="mt-1 text-sm text-red-600">
      {errors.privacyAgreed.message}
    </p>
  )}
</div>
```

- [ ] **Step 5: 수정 후 전체 파일 최종 상태 확인**

수정 후 `apps/frontend/src/app/register/page.tsx`의 전체 모습:

```tsx
'use client';

import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import { apiClient } from '@/lib/api/client';

interface RegisterForm {
  name: string;
  email: string;
  password: string;
  passwordConfirm: string;
  termsOfServiceAgreed: boolean;
  privacyAgreed: boolean;
}

export default function RegisterPage() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>();

  const onSubmit = async (data: RegisterForm) => {
    try {
      await apiClient.post('/auth/register', {
        name: data.name,
        email: data.email,
        password: data.password,
        termsAgreed: data.termsOfServiceAgreed && data.privacyAgreed,
      });
      router.push('/pending');
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        setError('email', { message: '이미 사용 중인 이메일입니다.' });
      } else {
        setError('root', { message: '가입 신청 중 오류가 발생했습니다.' });
      }
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-center text-2xl font-bold">회원가입 신청</h1>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div>
            <label htmlFor="name" className="block text-sm font-medium">
              이름
            </label>
            <input
              id="name"
              type="text"
              className="mt-1 w-full rounded border px-3 py-2"
              {...register('name', {
                required: '이름을 입력해주세요.',
                minLength: { value: 2, message: '이름은 최소 2자 이상이어야 합니다.' },
                maxLength: { value: 50, message: '이름은 50자 이내로 입력해주세요.' },
              })}
            />
            {errors.name && (
              <p role="alert" className="mt-1 text-sm text-red-600">
                {errors.name.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium">
              이메일
            </label>
            <input
              id="email"
              type="email"
              className="mt-1 w-full rounded border px-3 py-2"
              {...register('email', {
                required: '이메일을 입력해주세요.',
                pattern: {
                  value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
                  message: '올바른 이메일 형식이 아닙니다.',
                },
              })}
            />
            {errors.email && (
              <p role="alert" className="mt-1 text-sm text-red-600">
                {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium">
              비밀번호
            </label>
            <input
              id="password"
              type="password"
              className="mt-1 w-full rounded border px-3 py-2"
              {...register('password', {
                required: '비밀번호를 입력해주세요.',
                minLength: { value: 8, message: '비밀번호는 최소 8자 이상이어야 합니다.' },
                maxLength: { value: 100, message: '비밀번호는 100자 이내로 입력해주세요.' },
                pattern: {
                  value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/,
                  message: '비밀번호는 영문 대/소문자, 숫자, 특수문자를 포함해야 합니다.',
                },
              })}
            />
            {errors.password && (
              <p role="alert" className="mt-1 text-sm text-red-600">
                {errors.password.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="passwordConfirm" className="block text-sm font-medium">
              비밀번호 확인
            </label>
            <input
              id="passwordConfirm"
              type="password"
              className="mt-1 w-full rounded border px-3 py-2"
              {...register('passwordConfirm', {
                required: '비밀번호 확인을 입력해주세요.',
                validate: (value) => value === watch('password') || '비밀번호가 일치하지 않습니다.',
                deps: ['password'],
              })}
            />
            {errors.passwordConfirm && (
              <p role="alert" className="mt-1 text-sm text-red-600">
                {errors.passwordConfirm.message}
              </p>
            )}
          </div>

          <div className="space-y-2 rounded border p-3">
            <div className="flex items-start gap-2">
              <input
                id="termsOfServiceAgreed"
                type="checkbox"
                className="mt-0.5"
                {...register('termsOfServiceAgreed', {
                  validate: (value) => value === true || '이용약관에 동의해주세요.',
                })}
              />
              <label htmlFor="termsOfServiceAgreed" className="text-sm">
                이용약관에 동의합니다. (필수){' '}
                <Link href="/terms" className="text-blue-600 underline" target="_blank">
                  이용약관 보기
                </Link>
              </label>
            </div>
            {errors.termsOfServiceAgreed && (
              <p role="alert" className="mt-1 text-sm text-red-600">
                {errors.termsOfServiceAgreed.message}
              </p>
            )}

            <div className="flex items-start gap-2">
              <input
                id="privacyAgreed"
                type="checkbox"
                className="mt-0.5"
                {...register('privacyAgreed', {
                  validate: (value) => value === true || '개인정보 처리방침에 동의해주세요.',
                })}
              />
              <label htmlFor="privacyAgreed" className="text-sm">
                개인정보 처리방침에 동의합니다. (필수){' '}
                <Link href="/privacy" className="text-blue-600 underline" target="_blank">
                  처리방침 보기
                </Link>
              </label>
            </div>
            {errors.privacyAgreed && (
              <p role="alert" className="mt-1 text-sm text-red-600">
                {errors.privacyAgreed.message}
              </p>
            )}
          </div>

          {errors.root && (
            <p role="alert" className="text-sm text-red-600">
              {errors.root.message}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded bg-blue-600 py-2 text-white disabled:opacity-50"
          >
            가입 신청
          </button>
        </form>
      </div>
    </main>
  );
}
```

---

### Task 3: 회원가입 페이지 테스트 업데이트

기존 `page.test.tsx`를 새 UI에 맞게 전면 업데이트한다.

**Files:**

- Modify: `apps/frontend/src/app/register/page.test.tsx`

- [ ] **Step 1: 실패하는 테스트 먼저 확인 (구현 전)**

Task 2의 구현이 완료된 상태에서 기존 테스트를 실행해 어떤 테스트가 실패하는지 확인:

```bash
cd apps/frontend && npx vitest run --reporter=dot src/app/register/page.test.tsx
```

예상: 기존 테스트들이 실패 (레이블 텍스트 변경, 체크박스 id 변경)

- [ ] **Step 2: 테스트 파일 전체 교체**

`apps/frontend/src/app/register/page.test.tsx` 전체를 다음으로 교체:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('@/lib/api/client', () => ({
  apiClient: { post: vi.fn() },
}));

import RegisterPage from './page';
import { apiClient } from '@/lib/api/client';

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('이름/이메일/비밀번호/비밀번호 확인 필드와 두 개의 동의 체크박스, 제출 버튼이 렌더링된다', () => {
    render(<RegisterPage />);
    expect(screen.getByLabelText('이름')).toBeInTheDocument();
    expect(screen.getByLabelText('이메일')).toBeInTheDocument();
    expect(screen.getByLabelText('비밀번호')).toBeInTheDocument();
    expect(screen.getByLabelText('비밀번호 확인')).toBeInTheDocument();
    expect(screen.getByLabelText(/이용약관에 동의합니다/)).toBeInTheDocument();
    expect(screen.getByLabelText(/개인정보 처리방침에 동의합니다/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '가입 신청' })).toBeInTheDocument();
  });

  it('이용약관 보기 링크가 /terms를 가리킨다', () => {
    render(<RegisterPage />);
    const link = screen.getByRole('link', { name: '이용약관 보기' });
    expect(link).toHaveAttribute('href', '/terms');
  });

  it('처리방침 보기 링크가 /privacy를 가리킨다', () => {
    render(<RegisterPage />);
    const link = screen.getByRole('link', { name: '처리방침 보기' });
    expect(link).toHaveAttribute('href', '/privacy');
  });

  it('빈 폼 제출 시 필수 입력 오류 메시지를 표시한다', async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);

    await user.click(screen.getByRole('button', { name: '가입 신청' }));

    expect(await screen.findByText('이름을 입력해주세요.')).toBeInTheDocument();
    expect(screen.getByText('이메일을 입력해주세요.')).toBeInTheDocument();
    expect(screen.getByText('비밀번호를 입력해주세요.')).toBeInTheDocument();
    expect(screen.getByText('비밀번호 확인을 입력해주세요.')).toBeInTheDocument();
    expect(screen.getByText('이용약관에 동의해주세요.')).toBeInTheDocument();
    expect(screen.getByText('개인정보 처리방침에 동의해주세요.')).toBeInTheDocument();
  });

  it('이용약관 미동의 시 오류 메시지를 표시한다', async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);

    await user.type(screen.getByLabelText('이름'), '홍길동');
    await user.type(screen.getByLabelText('이메일'), 'test@example.com');
    await user.type(screen.getByLabelText('비밀번호'), 'Password1!');
    await user.type(screen.getByLabelText('비밀번호 확인'), 'Password1!');
    await user.click(screen.getByLabelText(/개인정보 처리방침에 동의합니다/));
    await user.click(screen.getByRole('button', { name: '가입 신청' }));

    expect(await screen.findByText('이용약관에 동의해주세요.')).toBeInTheDocument();
  });

  it('개인정보 처리방침 미동의 시 오류 메시지를 표시한다', async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);

    await user.type(screen.getByLabelText('이름'), '홍길동');
    await user.type(screen.getByLabelText('이메일'), 'test@example.com');
    await user.type(screen.getByLabelText('비밀번호'), 'Password1!');
    await user.type(screen.getByLabelText('비밀번호 확인'), 'Password1!');
    await user.click(screen.getByLabelText(/이용약관에 동의합니다/));
    await user.click(screen.getByRole('button', { name: '가입 신청' }));

    expect(await screen.findByText('개인정보 처리방침에 동의해주세요.')).toBeInTheDocument();
  });

  it('이름이 2자 미만이면 오류 메시지를 표시한다', async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);

    await user.type(screen.getByLabelText('이름'), '홍');
    await user.type(screen.getByLabelText('이메일'), 'test@example.com');
    await user.type(screen.getByLabelText('비밀번호'), 'Password1!');
    await user.type(screen.getByLabelText('비밀번호 확인'), 'Password1!');
    await user.click(screen.getByRole('button', { name: '가입 신청' }));

    expect(await screen.findByText('이름은 최소 2자 이상이어야 합니다.')).toBeInTheDocument();
  });

  it('비밀번호가 복잡성 규칙을 충족하지 않으면 오류 메시지를 표시한다', async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);

    await user.type(screen.getByLabelText('이름'), '홍길동');
    await user.type(screen.getByLabelText('이메일'), 'test@example.com');
    await user.type(screen.getByLabelText('비밀번호'), 'password123');
    await user.type(screen.getByLabelText('비밀번호 확인'), 'password123');
    await user.click(screen.getByRole('button', { name: '가입 신청' }));

    expect(
      await screen.findByText('비밀번호는 영문 대/소문자, 숫자, 특수문자를 포함해야 합니다.'),
    ).toBeInTheDocument();
  });

  it('비밀번호 확인이 일치하지 않으면 오류 메시지를 표시한다', async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);

    await user.type(screen.getByLabelText('이름'), '홍길동');
    await user.type(screen.getByLabelText('이메일'), 'test@example.com');
    await user.type(screen.getByLabelText('비밀번호'), 'Password1!');
    await user.type(screen.getByLabelText('비밀번호 확인'), 'different123');
    await user.click(screen.getByRole('button', { name: '가입 신청' }));

    expect(await screen.findByText('비밀번호가 일치하지 않습니다.')).toBeInTheDocument();
  });

  it('유효한 입력 제출 시 termsAgreed: true로 가입 신청 API를 호출한다', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      data: { message: '가입 신청이 완료되었습니다.' },
    });
    render(<RegisterPage />);

    await user.type(screen.getByLabelText('이름'), '홍길동');
    await user.type(screen.getByLabelText('이메일'), 'test@example.com');
    await user.type(screen.getByLabelText('비밀번호'), 'Password1!');
    await user.type(screen.getByLabelText('비밀번호 확인'), 'Password1!');
    await user.click(screen.getByLabelText(/이용약관에 동의합니다/));
    await user.click(screen.getByLabelText(/개인정보 처리방침에 동의합니다/));
    await user.click(screen.getByRole('button', { name: '가입 신청' }));

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/auth/register', {
        name: '홍길동',
        email: 'test@example.com',
        password: 'Password1!',
        termsAgreed: true,
      });
    });
  });

  it('가입 신청 성공 시 /pending으로 리다이렉트한다', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      data: { message: '가입 신청이 완료되었습니다.' },
    });
    render(<RegisterPage />);

    await user.type(screen.getByLabelText('이름'), '홍길동');
    await user.type(screen.getByLabelText('이메일'), 'test@example.com');
    await user.type(screen.getByLabelText('비밀번호'), 'Password1!');
    await user.type(screen.getByLabelText('비밀번호 확인'), 'Password1!');
    await user.click(screen.getByLabelText(/이용약관에 동의합니다/));
    await user.click(screen.getByLabelText(/개인정보 처리방침에 동의합니다/));
    await user.click(screen.getByRole('button', { name: '가입 신청' }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/pending');
    });
  });

  it('중복 이메일(409) 시 이메일 오류 메시지를 표시한다', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.post).mockRejectedValueOnce({
      response: { status: 409 },
      isAxiosError: true,
    });
    render(<RegisterPage />);

    await user.type(screen.getByLabelText('이름'), '홍길동');
    await user.type(screen.getByLabelText('이메일'), 'duplicate@example.com');
    await user.type(screen.getByLabelText('비밀번호'), 'Password1!');
    await user.type(screen.getByLabelText('비밀번호 확인'), 'Password1!');
    await user.click(screen.getByLabelText(/이용약관에 동의합니다/));
    await user.click(screen.getByLabelText(/개인정보 처리방침에 동의합니다/));
    await user.click(screen.getByRole('button', { name: '가입 신청' }));

    expect(await screen.findByText('이미 사용 중인 이메일입니다.')).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: 테스트 실행하여 모두 통과 확인**

```bash
cd apps/frontend && npx vitest run --reporter=dot src/app/register/page.test.tsx
```

예상: 12개 테스트 모두 PASS

- [ ] **Step 4: 전체 관련 테스트 통과 확인**

```bash
cd apps/frontend && npx vitest run --reporter=dot src/app/register/ src/app/terms/ src/app/privacy/
```

예상: 전체 PASS

- [ ] **Step 5: 커밋**

```bash
git add apps/frontend/src/app/register/page.tsx apps/frontend/src/app/register/page.test.tsx
git commit -m "feat: 회원가입 폼에 이용약관·개인정보 처리방침 동의 체크박스 분리"
```
