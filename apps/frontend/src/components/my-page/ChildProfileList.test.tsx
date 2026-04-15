import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ChildProfileList from './ChildProfileList';
import type { ChildProfile } from '@/lib/types/user';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockChildren: ChildProfile[] = [
  {
    id: 'child-1',
    userId: 'user-1',
    name: '홍아이',
    birthDate: '2022-05-01T00:00:00.000Z',
    gender: null,
    height: null,
    weight: null,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'child-2',
    userId: 'user-1',
    name: '홍둘째',
    birthDate: '2024-03-10T00:00:00.000Z',
    gender: null,
    height: null,
    weight: null,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
];

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ChildProfileList', () => {
  const mockOnAdd = vi.fn();
  const mockOnDelete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('목록 렌더링', () => {
    it('자녀 목록이 표시된다', () => {
      render(
        <ChildProfileList childProfiles={mockChildren} onAdd={mockOnAdd} onDelete={mockOnDelete} />,
      );

      expect(screen.getByText('홍아이')).toBeInTheDocument();
      expect(screen.getByText('홍둘째')).toBeInTheDocument();
    });

    it('생년월일이 YYYY-MM-DD 형식으로 표시된다', () => {
      render(
        <ChildProfileList childProfiles={mockChildren} onAdd={mockOnAdd} onDelete={mockOnDelete} />,
      );

      expect(screen.getByText('2022-05-01')).toBeInTheDocument();
    });

    it('자녀가 없으면 안내 메시지를 표시한다', () => {
      render(<ChildProfileList childProfiles={[]} onAdd={mockOnAdd} onDelete={mockOnDelete} />);

      expect(screen.getByText('등록된 자녀 정보가 없습니다.')).toBeInTheDocument();
    });
  });

  describe('자녀 추가', () => {
    it('자녀 추가 버튼 클릭 시 폼이 나타난다', async () => {
      const user = userEvent.setup();
      render(<ChildProfileList childProfiles={[]} onAdd={mockOnAdd} onDelete={mockOnDelete} />);

      await user.click(screen.getByRole('button', { name: /자녀 추가/ }));

      expect(screen.getByLabelText('이름')).toBeInTheDocument();
      expect(screen.getByLabelText('생년월일')).toBeInTheDocument();
    });

    it('자녀 추가 폼 제출 시 onAdd가 올바른 인자로 호출된다', async () => {
      const user = userEvent.setup();
      mockOnAdd.mockResolvedValueOnce(undefined);

      render(<ChildProfileList childProfiles={[]} onAdd={mockOnAdd} onDelete={mockOnDelete} />);

      await user.click(screen.getByRole('button', { name: /자녀 추가/ }));
      await user.type(screen.getByLabelText('이름'), '새아이');
      await user.type(screen.getByLabelText('생년월일'), '2023-01-01');
      await user.click(screen.getByRole('button', { name: '추가' }));

      await waitFor(() => {
        expect(mockOnAdd).toHaveBeenCalledWith({
          name: '새아이',
          birthDate: '2023-01-01',
        });
      });
    });

    it('폼 제출 성공 후 입력 폼이 닫힌다', async () => {
      const user = userEvent.setup();
      mockOnAdd.mockResolvedValueOnce(undefined);

      render(<ChildProfileList childProfiles={[]} onAdd={mockOnAdd} onDelete={mockOnDelete} />);

      await user.click(screen.getByRole('button', { name: /자녀 추가/ }));
      await user.type(screen.getByLabelText('이름'), '새아이');
      await user.type(screen.getByLabelText('생년월일'), '2023-01-01');
      await user.click(screen.getByRole('button', { name: '추가' }));

      await waitFor(() => {
        expect(screen.queryByLabelText('이름')).not.toBeInTheDocument();
      });
    });

    it('취소 버튼 클릭 시 폼이 닫힌다', async () => {
      const user = userEvent.setup();
      render(<ChildProfileList childProfiles={[]} onAdd={mockOnAdd} onDelete={mockOnDelete} />);

      await user.click(screen.getByRole('button', { name: /자녀 추가/ }));
      await user.click(screen.getByRole('button', { name: '취소' }));

      expect(screen.queryByLabelText('이름')).not.toBeInTheDocument();
    });

    it('이름 없이 제출하면 유효성 오류가 표시된다', async () => {
      const user = userEvent.setup();
      render(<ChildProfileList childProfiles={[]} onAdd={mockOnAdd} onDelete={mockOnDelete} />);

      await user.click(screen.getByRole('button', { name: /자녀 추가/ }));
      await user.click(screen.getByRole('button', { name: '추가' }));

      expect(await screen.findByText('이름을 입력해주세요.')).toBeInTheDocument();
      expect(mockOnAdd).not.toHaveBeenCalled();
    });
  });

  describe('자녀 삭제', () => {
    it('삭제 버튼 클릭 시 onDelete가 해당 id로 호출된다', async () => {
      const user = userEvent.setup();
      mockOnDelete.mockResolvedValueOnce(undefined);

      render(
        <ChildProfileList childProfiles={mockChildren} onAdd={mockOnAdd} onDelete={mockOnDelete} />,
      );

      await user.click(screen.getByRole('button', { name: '홍아이 삭제' }));

      await waitFor(() => {
        expect(mockOnDelete).toHaveBeenCalledWith('child-1');
      });
    });
  });
});
