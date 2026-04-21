import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/lib/hooks/useAdminUsers', () => ({
  useAdminUsers: vi.fn(),
  useApproveUser: vi.fn(),
  useRejectUser: vi.fn(),
}));

import AdminUsersPage from './page';
import { useAdminUsers, useApproveUser, useRejectUser } from '@/lib/hooks/useAdminUsers';
import type { AdminUser } from '@/lib/types/admin';

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeUser(overrides: Partial<AdminUser> = {}): AdminUser {
  return {
    id: 'user-1',
    email: 'user@test.com',
    name: '홍길동',
    status: 'PENDING',
    role: 'CUSTOMER',
    createdAt: '2026-04-01T00:00:00.000Z',
    updatedAt: '2026-04-01T00:00:00.000Z',
    ...overrides,
  };
}

const mockApproveMutate = vi.fn();
const mockRejectMutate = vi.fn();

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('AdminUsersPage', () => {
  beforeEach(() => {
    (useAdminUsers as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    });
    (useApproveUser as ReturnType<typeof vi.fn>).mockReturnValue({
      mutate: mockApproveMutate,
      isPending: false,
    });
    (useRejectUser as ReturnType<typeof vi.fn>).mockReturnValue({
      mutate: mockRejectMutate,
      isPending: false,
    });
    mockApproveMutate.mockReset();
    mockRejectMutate.mockReset();
  });

  it('상태 필터 버튼(전체/PENDING/APPROVED/REJECTED)이 렌더링된다', () => {
    render(<AdminUsersPage />);

    expect(screen.getByRole('button', { name: '전체' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'PENDING' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'APPROVED' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'REJECTED' })).toBeInTheDocument();
  });

  it('로딩 중에는 로딩 표시를 보여준다', () => {
    (useAdminUsers as ReturnType<typeof vi.fn>).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });

    render(<AdminUsersPage />);
    expect(screen.getByText('불러오는 중...')).toBeInTheDocument();
  });

  it('회원 목록이 테이블로 렌더링된다', () => {
    (useAdminUsers as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [
        makeUser({ id: 'u1', name: '홍길동', email: 'hong@test.com', status: 'PENDING' }),
        makeUser({ id: 'u2', name: '김철수', email: 'kim@test.com', status: 'APPROVED' }),
      ],
      isLoading: false,
      isError: false,
    });

    render(<AdminUsersPage />);

    expect(screen.getByText('홍길동')).toBeInTheDocument();
    expect(screen.getByText('hong@test.com')).toBeInTheDocument();
    expect(screen.getByText('김철수')).toBeInTheDocument();
    expect(screen.getByText('kim@test.com')).toBeInTheDocument();
  });

  it('PENDING 회원에게만 승인/거절 버튼이 표시된다', () => {
    (useAdminUsers as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [
        makeUser({ id: 'u1', name: '홍길동', status: 'PENDING' }),
        makeUser({ id: 'u2', name: '김철수', status: 'APPROVED' }),
      ],
      isLoading: false,
      isError: false,
    });

    render(<AdminUsersPage />);

    expect(screen.getAllByRole('button', { name: '승인' })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: '거절' })).toHaveLength(1);
  });

  it('승인 버튼 클릭 시 확인 다이얼로그가 표시된다', async () => {
    (useAdminUsers as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [makeUser({ id: 'u1', name: '홍길동', status: 'PENDING' })],
      isLoading: false,
      isError: false,
    });

    const user = userEvent.setup();
    render(<AdminUsersPage />);

    await user.click(screen.getByRole('button', { name: '승인' }));

    expect(screen.getByText(/홍길동.*승인/)).toBeInTheDocument();
  });

  it('승인 다이얼로그에서 확인을 누르면 approveUser가 호출된다', async () => {
    (useAdminUsers as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [makeUser({ id: 'u1', name: '홍길동', status: 'PENDING' })],
      isLoading: false,
      isError: false,
    });

    const user = userEvent.setup();
    render(<AdminUsersPage />);

    await user.click(screen.getByRole('button', { name: '승인' }));
    await user.click(screen.getByRole('button', { name: '확인' }));

    expect(mockApproveMutate).toHaveBeenCalledWith('u1');
  });

  it('거절 버튼 클릭 시 확인 다이얼로그가 표시된다', async () => {
    (useAdminUsers as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [makeUser({ id: 'u1', name: '홍길동', status: 'PENDING' })],
      isLoading: false,
      isError: false,
    });

    const user = userEvent.setup();
    render(<AdminUsersPage />);

    await user.click(screen.getByRole('button', { name: '거절' }));

    expect(screen.getByText(/홍길동.*거절/)).toBeInTheDocument();
  });

  it('거절 다이얼로그에서 확인을 누르면 rejectUser가 호출된다', async () => {
    (useAdminUsers as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [makeUser({ id: 'u1', name: '홍길동', status: 'PENDING' })],
      isLoading: false,
      isError: false,
    });

    const user = userEvent.setup();
    render(<AdminUsersPage />);

    await user.click(screen.getByRole('button', { name: '거절' }));
    await user.click(screen.getByRole('button', { name: '확인' }));

    expect(mockRejectMutate).toHaveBeenCalledWith('u1');
  });

  it('다이얼로그에서 취소를 누르면 API가 호출되지 않는다', async () => {
    (useAdminUsers as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [makeUser({ id: 'u1', name: '홍길동', status: 'PENDING' })],
      isLoading: false,
      isError: false,
    });

    const user = userEvent.setup();
    render(<AdminUsersPage />);

    await user.click(screen.getByRole('button', { name: '승인' }));
    await user.click(screen.getByRole('button', { name: '취소' }));

    expect(mockApproveMutate).not.toHaveBeenCalled();
  });

  it('PENDING 필터 버튼 클릭 시 useAdminUsers가 PENDING 인수로 호출된다', async () => {
    const user = userEvent.setup();
    render(<AdminUsersPage />);

    await user.click(screen.getByRole('button', { name: 'PENDING' }));

    await waitFor(() => {
      expect(useAdminUsers).toHaveBeenCalledWith('PENDING');
    });
  });

  it('회원이 없을 때 빈 상태 메시지가 표시된다', () => {
    (useAdminUsers as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    });

    render(<AdminUsersPage />);
    expect(screen.getByText('회원이 없습니다.')).toBeInTheDocument();
  });
});
