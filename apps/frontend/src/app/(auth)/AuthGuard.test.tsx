import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

const mockReplace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

vi.mock('@/lib/hooks/useMe', () => ({
  useMe: vi.fn(),
}));

import AuthGuard from './AuthGuard';
import { useMe } from '@/lib/hooks/useMe';

describe('AuthGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('로딩 중이면 children 없이 null을 렌더링한다', () => {
    vi.mocked(useMe).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    } as ReturnType<typeof useMe>);

    const { container } = render(
      <AuthGuard>
        <div>protected content</div>
      </AuthGuard>,
    );

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByText('protected content')).not.toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('인증 오류이면 /login으로 이동한다', async () => {
    vi.mocked(useMe).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    } as ReturnType<typeof useMe>);

    render(
      <AuthGuard>
        <div>protected content</div>
      </AuthGuard>,
    );

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/login');
    });
    expect(screen.queryByText('protected content')).not.toBeInTheDocument();
  });

  it('PENDING 상태이면 /pending으로 이동한다', async () => {
    vi.mocked(useMe).mockReturnValue({
      data: { status: 'PENDING' },
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useMe>);

    render(
      <AuthGuard>
        <div>protected content</div>
      </AuthGuard>,
    );

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/pending');
    });
    expect(screen.queryByText('protected content')).not.toBeInTheDocument();
  });

  it('REJECTED 상태이면 /login으로 이동한다', async () => {
    vi.mocked(useMe).mockReturnValue({
      data: { status: 'REJECTED' },
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useMe>);

    render(
      <AuthGuard>
        <div>protected content</div>
      </AuthGuard>,
    );

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/login');
    });
    expect(screen.queryByText('protected content')).not.toBeInTheDocument();
  });

  it('SUSPENDED 상태이면 /login으로 이동한다', async () => {
    vi.mocked(useMe).mockReturnValue({
      data: { status: 'SUSPENDED' },
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useMe>);

    render(
      <AuthGuard>
        <div>protected content</div>
      </AuthGuard>,
    );

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/login');
    });
    expect(screen.queryByText('protected content')).not.toBeInTheDocument();
  });

  it('APPROVED 상태이면 children을 렌더링한다', async () => {
    vi.mocked(useMe).mockReturnValue({
      data: { status: 'APPROVED' },
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useMe>);

    render(
      <AuthGuard>
        <div>protected content</div>
      </AuthGuard>,
    );

    expect(await screen.findByText('protected content')).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
