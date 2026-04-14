import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SortDropdown from './SortDropdown';

describe('SortDropdown', () => {
  it('정렬 옵션 3개를 렌더링한다', () => {
    render(<SortDropdown value="latest" onChange={vi.fn()} />);

    expect(screen.getByRole('combobox', { name: '정렬 기준' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '최신순' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '가격 낮은순' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '가격 높은순' })).toBeInTheDocument();
  });

  it('현재 정렬 값이 선택된 상태로 표시된다', () => {
    render(<SortDropdown value="price_asc" onChange={vi.fn()} />);

    const select = screen.getByRole('combobox', { name: '정렬 기준' });
    expect((select as HTMLSelectElement).value).toBe('price_asc');
  });

  it('정렬 변경 시 onChange가 새 값으로 호출된다', async () => {
    const handleChange = vi.fn();
    render(<SortDropdown value="latest" onChange={handleChange} />);

    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: '정렬 기준' }),
      'price_desc',
    );

    expect(handleChange).toHaveBeenCalledWith('price_desc');
  });
});
