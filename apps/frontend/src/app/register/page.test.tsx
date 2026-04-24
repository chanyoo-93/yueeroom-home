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

  it('이름/이메일/비밀번호/비밀번호 확인 필드와 개인정보 동의 체크박스, 제출 버튼이 렌더링된다', () => {
    render(<RegisterPage />);
    expect(screen.getByLabelText('이름')).toBeInTheDocument();
    expect(screen.getByLabelText('이메일')).toBeInTheDocument();
    expect(screen.getByLabelText('비밀번호')).toBeInTheDocument();
    expect(screen.getByLabelText('비밀번호 확인')).toBeInTheDocument();
    expect(screen.getByLabelText(/개인정보 수집·이용/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '가입 신청' })).toBeInTheDocument();
  });

  it('빈 폼 제출 시 필수 입력 오류 메시지를 표시한다', async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);

    await user.click(screen.getByRole('button', { name: '가입 신청' }));

    expect(await screen.findByText('이름을 입력해주세요.')).toBeInTheDocument();
    expect(screen.getByText('이메일을 입력해주세요.')).toBeInTheDocument();
    expect(screen.getByText('비밀번호를 입력해주세요.')).toBeInTheDocument();
    expect(screen.getByText('비밀번호 확인을 입력해주세요.')).toBeInTheDocument();
    expect(screen.getByText('개인정보 수집·이용에 동의해주세요.')).toBeInTheDocument();
  });

  it('개인정보 동의 없이 제출하면 오류 메시지를 표시한다', async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);

    await user.type(screen.getByLabelText('이름'), '홍길동');
    await user.type(screen.getByLabelText('이메일'), 'test@example.com');
    await user.type(screen.getByLabelText('비밀번호'), 'Password1!');
    await user.type(screen.getByLabelText('비밀번호 확인'), 'Password1!');
    await user.click(screen.getByRole('button', { name: '가입 신청' }));

    expect(await screen.findByText('개인정보 수집·이용에 동의해주세요.')).toBeInTheDocument();
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

  it('유효한 입력 제출 시 가입 신청 API를 호출한다', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      data: { message: '가입 신청이 완료되었습니다.' },
    });
    render(<RegisterPage />);

    await user.type(screen.getByLabelText('이름'), '홍길동');
    await user.type(screen.getByLabelText('이메일'), 'test@example.com');
    await user.type(screen.getByLabelText('비밀번호'), 'Password1!');
    await user.type(screen.getByLabelText('비밀번호 확인'), 'Password1!');
    await user.click(screen.getByLabelText(/개인정보 수집·이용/));
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
    await user.click(screen.getByLabelText(/개인정보 수집·이용/));
    await user.click(screen.getByRole('button', { name: '가입 신청' }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/pending');
    });
  });

  it('중복 이메일(409) 시 서버 오류 메시지를 표시한다', async () => {
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
    await user.click(screen.getByLabelText(/개인정보 수집·이용/));
    await user.click(screen.getByRole('button', { name: '가입 신청' }));

    expect(await screen.findByText('이미 사용 중인 이메일입니다.')).toBeInTheDocument();
  });
});
