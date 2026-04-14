import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Pagination from './Pagination';

describe('Pagination', () => {
  it('totalPages가 1이면 아무것도 렌더링하지 않는다', () => {
    const { container } = render(<Pagination page={1} totalPages={1} onChange={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('페이지 버튼들을 렌더링한다', () => {
    render(<Pagination page={2} totalPages={4} onChange={vi.fn()} />);

    expect(screen.getByRole('button', { name: '1페이지' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '2페이지' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '3페이지' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '4페이지' })).toBeInTheDocument();
  });

  it('현재 페이지에 aria-current="page" 속성이 있다', () => {
    render(<Pagination page={2} totalPages={3} onChange={vi.fn()} />);

    const currentPage = screen.getByRole('button', { name: '2페이지' });
    expect(currentPage).toHaveAttribute('aria-current', 'page');
  });

  it('첫 페이지에서 이전 버튼이 비활성화된다', () => {
    render(<Pagination page={1} totalPages={3} onChange={vi.fn()} />);

    expect(screen.getByRole('button', { name: '이전 페이지' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '다음 페이지' })).not.toBeDisabled();
  });

  it('마지막 페이지에서 다음 버튼이 비활성화된다', () => {
    render(<Pagination page={3} totalPages={3} onChange={vi.fn()} />);

    expect(screen.getByRole('button', { name: '다음 페이지' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '이전 페이지' })).not.toBeDisabled();
  });

  it('페이지 클릭 시 onChange가 해당 페이지 번호로 호출된다', async () => {
    const handleChange = vi.fn();
    render(<Pagination page={1} totalPages={3} onChange={handleChange} />);

    await userEvent.click(screen.getByRole('button', { name: '3페이지' }));

    expect(handleChange).toHaveBeenCalledWith(3);
  });

  it('이전 버튼 클릭 시 page - 1로 호출된다', async () => {
    const handleChange = vi.fn();
    render(<Pagination page={3} totalPages={5} onChange={handleChange} />);

    await userEvent.click(screen.getByRole('button', { name: '이전 페이지' }));

    expect(handleChange).toHaveBeenCalledWith(2);
  });

  it('다음 버튼 클릭 시 page + 1로 호출된다', async () => {
    const handleChange = vi.fn();
    render(<Pagination page={2} totalPages={5} onChange={handleChange} />);

    await userEvent.click(screen.getByRole('button', { name: '다음 페이지' }));

    expect(handleChange).toHaveBeenCalledWith(3);
  });
});
