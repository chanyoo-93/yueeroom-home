import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/lib/api/client', () => ({
  default: { patch: vi.fn() },
}));

import ProfileForm from './ProfileForm';
import apiClient from '@/lib/api/client';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  name: '홍길동',
  phone: '010-1234-5678',
  status: 'APPROVED',
  role: 'CUSTOMER',
  provider: 'LOCAL',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ProfileForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('이메일, 이름, 전화번호가 표시된다', () => {
    render(<ProfileForm user={mockUser} />);

    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('홍길동')).toBeInTheDocument();
    expect(screen.getByDisplayValue('010-1234-5678')).toBeInTheDocument();
  });

  it('변경 없이 저장 버튼은 비활성화된다', () => {
    render(<ProfileForm user={mockUser} />);

    expect(screen.getByRole('button', { name: '저장' })).toBeDisabled();
  });

  it('이름을 수정하면 저장 버튼이 활성화된다', async () => {
    const user = userEvent.setup();
    render(<ProfileForm user={mockUser} />);

    const nameInput = screen.getByLabelText('이름');
    await user.clear(nameInput);
    await user.type(nameInput, '김철수');

    expect(screen.getByRole('button', { name: '저장' })).toBeEnabled();
  });

  it('이름을 수정하고 저장하면 PATCH /users/me가 호출된다', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.patch).mockResolvedValueOnce({ data: { ...mockUser, name: '김철수' } });

    render(<ProfileForm user={mockUser} />);

    const nameInput = screen.getByLabelText('이름');
    await user.clear(nameInput);
    await user.type(nameInput, '김철수');
    await user.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => {
      expect(apiClient.patch).toHaveBeenCalledWith('/users/me', {
        name: '김철수',
        phone: '010-1234-5678',
      });
    });
  });

  it('저장 성공 시 성공 메시지가 표시된다', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.patch).mockResolvedValueOnce({ data: mockUser });

    render(<ProfileForm user={mockUser} />);

    const nameInput = screen.getByLabelText('이름');
    await user.clear(nameInput);
    await user.type(nameInput, '김철수');
    await user.click(screen.getByRole('button', { name: '저장' }));

    expect(await screen.findByText('프로필이 저장되었습니다.')).toBeInTheDocument();
  });

  it('저장 실패 시 오류 메시지가 표시된다', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.patch).mockRejectedValueOnce(new Error('서버 오류'));

    render(<ProfileForm user={mockUser} />);

    const nameInput = screen.getByLabelText('이름');
    await user.clear(nameInput);
    await user.type(nameInput, '김철수');
    await user.click(screen.getByRole('button', { name: '저장' }));

    expect(await screen.findByText('프로필 저장 중 오류가 발생했습니다.')).toBeInTheDocument();
  });

  it('이름이 1자면 유효성 오류가 표시된다', async () => {
    const user = userEvent.setup();
    render(<ProfileForm user={mockUser} />);

    const nameInput = screen.getByLabelText('이름');
    await user.clear(nameInput);
    await user.type(nameInput, 'a');
    await user.click(screen.getByRole('button', { name: '저장' }));

    expect(await screen.findByText('이름은 2자 이상이어야 합니다.')).toBeInTheDocument();
  });
});
