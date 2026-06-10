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
